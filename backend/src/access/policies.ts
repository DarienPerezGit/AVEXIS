import type { FilterQuery, HydratedDocument } from 'mongoose';
import { AppError } from '../errors/app-error.js';
import { validationError } from '../http/validation.js';
import { Audiencia, Expediente, Usuario } from '../models/index.js';
import type { AudienciaDoc, ExpedienteDoc, UsuarioDoc } from '../models/index.js';

/**
 * The firm's permission matrix (ADR 0001), in one place:
 * - The titular sees and operates on the whole firm.
 * - An ABOGADO sees and operates only on the cases they are responsible for, and on their own agenda.
 * - An ASISTENTE (procuracion) sees every case and loads clients, movimientos and audiencias on any of them,
 *   but does not open or edit cases and has no access to honorarios.
 * Routes call these functions instead of checking roles themselves.
 *
 * Order of checks: authentication, then the role (it does not depend on the resource, so it reveals nothing),
 * then existence (404), then access to that resource (403), then the body (400).
 */
export type UsuarioSesion = HydratedDocument<UsuarioDoc>;

/** Lawyers who are not the titular only act on their own cases. */
const actuaSoloSobreLoPropio = (usuario: UsuarioSesion) => usuario.rol === 'ABOGADO' && !usuario.esTitular;

/**
 * The lawyer a new case or hearing is assigned to. Lawyers cannot load work onto someone else, so they are
 * always assigned themselves; the titular and the assistant pick anyone, and default to themselves.
 */
export function abogadoParaAlta(usuario: UsuarioSesion, solicitado: string | undefined): string {
  return actuaSoloSobreLoPropio(usuario) ? usuario.id : (solicitado ?? usuario.id);
}

/** The lawyer an update reassigns to, or undefined for no change. A lawyer's request to reassign is ignored. */
export function abogadoParaCambio(usuario: UsuarioSesion, solicitado: string | undefined): string | undefined {
  return actuaSoloSobreLoPropio(usuario) ? undefined : solicitado;
}

/** Only an active ABOGADO can carry a case or attend a hearing; anyone else is invalid input for `path`. */
export async function assertAbogadoActivo(id: string, path: string) {
  if (!(await Usuario.exists({ _id: id, rol: 'ABOGADO', activo: true }))) {
    throw validationError([{ path, message: 'Must be an active lawyer of the firm' }]);
  }
}

/** Mongo filter for the cases a user may see. Listing filters are added on top of it, never instead of it. */
export function expedientesVisibles(usuario: UsuarioSesion): FilterQuery<ExpedienteDoc> {
  return actuaSoloSobreLoPropio(usuario) ? { abogadoResponsableId: usuario._id } : {};
}

const caseNotFound = () => new AppError(404, 'NOT_FOUND', 'Case not found');

/**
 * Loads a case the user may act on: `notFound` (404 by default) if it does not exist,
 * 403 if it belongs to another lawyer. A case referenced from a request body passes a 400 instead.
 */
export async function findExpedienteAccesible(usuario: UsuarioSesion, id: string, notFound: () => Error = caseNotFound) {
  const expediente = await Expediente.findById(id);
  if (!expediente) {
    throw notFound();
  }
  if (actuaSoloSobreLoPropio(usuario) && !expediente.abogadoResponsableId.equals(usuario._id)) {
    throw new AppError(403, 'FORBIDDEN', 'You can only access your own cases');
  }
  return expediente;
}

/** Loads a case for its economic data (honorarios): only the responsible lawyer and the titular, never the assistant. */
export async function findExpedienteConAccesoEconomico(usuario: UsuarioSesion, id: string) {
  if (usuario.rol !== 'ABOGADO') {
    throw new AppError(403, 'FORBIDDEN', 'Only the responsible lawyer and the firm owner can access fees');
  }
  return findExpedienteAccesible(usuario, id);
}

/**
 * Mongo filter for the agenda a user sees. A lawyer sees the hearings they attend and every hearing on their
 * own cases, since they answer for the whole case even when a colleague attends. The titular and the assistant see all.
 * The same rule decides which hearings a lawyer may edit, so they edit exactly what they see.
 */
export async function agendaVisible(usuario: UsuarioSesion): Promise<FilterQuery<AudienciaDoc>> {
  if (!actuaSoloSobreLoPropio(usuario)) {
    return {};
  }
  const propios = await Expediente.find(expedientesVisibles(usuario)).distinct('_id');
  return { $or: [{ abogadoId: usuario._id }, { expedienteId: { $in: propios } }] };
}

/** Loads a hearing the user may act on: one in their agenda (see `agendaVisible`). */
export async function findAudienciaAccesible(usuario: UsuarioSesion, id: string) {
  const audiencia = await Audiencia.findById(id);
  if (!audiencia) {
    throw new AppError(404, 'NOT_FOUND', 'Hearing not found');
  }
  if (actuaSoloSobreLoPropio(usuario) && !audiencia.abogadoId.equals(usuario._id)) {
    await findExpedienteAccesible(usuario, audiencia.expedienteId.toString());
  }
  return audiencia;
}
