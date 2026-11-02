import request from 'supertest';
import { createApp } from '../app.js';
import type { AppOptions } from '../app.js';
import type { AuthConfig } from '../auth/config.js';
import { hashPassword } from '../auth/password.js';
import { Audiencia, Cliente, Expediente, Usuario } from '../models/index.js';
import type { AudienciaDoc, ExpedienteDoc, Rol } from '../models/index.js';
import type { Types } from 'mongoose';

export const PASSWORD = 'audiencia de los martes';

export const testAuthConfig: AuthConfig = {
  jwtSecret: 'test-secret-that-is-long-enough-for-hs256',
  jwtExpiresIn: '8h',
  secureCookie: false,
  loginRateLimit: { limit: 10, windowMs: 15 * 60 * 1000 },
};

export function createTestApp(overrides: Partial<AuthConfig> = {}, options: Omit<AppOptions, 'auth'> = {}) {
  return createApp({ ...options, auth: { ...testAuthConfig, ...overrides } });
}

// Hashing at cost 12 is slow by design, so the shared test password is hashed once.
let passwordHash: Promise<string> | undefined;

interface UsuarioInput {
  nombre?: string;
  email?: string;
  rol?: Rol;
  esTitular?: boolean;
  activo?: boolean;
  debeCambiarPassword?: boolean;
}

let sequence = 0;

export async function crearUsuario(input: UsuarioInput = {}) {
  passwordHash ??= hashPassword(PASSWORD);
  sequence += 1;
  return Usuario.create({
    nombre: `Usuario ${sequence}`,
    email: `usuario${sequence}@estudio.com`,
    rol: 'ABOGADO',
    ...input,
    passwordHash: await passwordHash,
  });
}

/** Returns a Supertest agent that keeps the session cookie, like a browser would. */
export async function loginComo(app: ReturnType<typeof createApp>, email: string, password = PASSWORD) {
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/login').send({ email, password });
  if (res.status !== 200) {
    throw new Error(`Login failed with ${res.status}: ${JSON.stringify(res.body)}`);
  }
  return agent;
}

/**
 * A firm with one user per cell of the permission matrix, each logged in:
 * the owner, two lawyers (so one can be "someone else's") and an assistant.
 */
export async function crearEstudio(app: ReturnType<typeof createApp> = createTestApp()) {
  const titular = await crearUsuario({ email: 'titular@estudio.com', esTitular: true });
  const abogado = await crearUsuario({ email: 'ana@estudio.com' });
  const otroAbogado = await crearUsuario({ email: 'beto@estudio.com' });
  const asistente = await crearUsuario({ email: 'carla@estudio.com', rol: 'ASISTENTE' });
  const [comoTitular, comoAbogado, comoOtroAbogado, comoAsistente] = await Promise.all(
    [titular, abogado, otroAbogado, asistente].map((usuario) => loginComo(app, usuario.email)),
  );
  return {
    app,
    usuarios: { titular, abogado, otroAbogado, asistente },
    titular: comoTitular!,
    abogado: comoAbogado!,
    otroAbogado: comoOtroAbogado!,
    asistente: comoAsistente!,
  };
}

export async function crearCliente(input: { nombre?: string } = {}) {
  sequence += 1;
  return Cliente.create({
    tipo: 'FISICA',
    nombre: `Cliente ${sequence}`,
    dni: String(20000000 + sequence),
    email: `cliente${sequence}@mail.com`,
    telefono: '1155550000',
    ...input,
  });
}

export async function crearExpediente(
  abogadoResponsableId: Types.ObjectId,
  input: Partial<Omit<ExpedienteDoc, 'abogadoResponsableId'>> = {},
) {
  sequence += 1;
  return Expediente.create({
    numero: `EXP-${sequence}/2026`,
    caratula: `Caratula ${sequence} s/ daños y perjuicios`,
    fuero: 'CIVIL',
    clienteId: input.clienteId ?? (await crearCliente())._id,
    abogadoResponsableId,
    ...input,
  });
}

/** A hearing on `expedienteId`, attended by `abogadoId`. `fecha` is a calendar day, `YYYY-MM-DD`. */
export async function crearAudiencia(
  expedienteId: Types.ObjectId,
  abogadoId: Types.ObjectId,
  fecha: string,
  input: Partial<Omit<AudienciaDoc, 'expedienteId' | 'abogadoId' | 'fecha'>> = {},
) {
  return Audiencia.create({ expedienteId, abogadoId, fecha: new Date(fecha), hora: '09:00', tipo: 'AUDIENCIA', ...input });
}
