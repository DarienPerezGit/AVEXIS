import { Router } from 'express';
import type { HydratedDocument } from 'mongoose';
import { z } from 'zod';
import { findExpedienteConAccesoEconomico } from '../access/policies.js';
import type { UsuarioSesion } from '../access/policies.js';
import type { AuthConfig } from '../auth/config.js';
import { authenticate } from '../auth/middleware.js';
import { AppError } from '../errors/app-error.js';
import { parse } from '../http/validation.js';
import { Honorario } from '../models/index.js';
import type { HonorarioDoc } from '../models/index.js';

/** Mounted under /api/expedientes/:expedienteId/honorario. */
type Params = { expedienteId: string };

// estado is not accepted: the model derives it from the payments.
export const crearHonorarioSchema = z.object({ montoPactado: z.number().min(0) });

export const crearPagoSchema = z.object({
  monto: z.number().positive(),
  fecha: z.coerce.date().optional(),
});

/** Adds the amounts derived from the payments, so the client never computes them. */
function conSaldo(honorario: HydratedDocument<HonorarioDoc>) {
  const montoPagado = honorario.montoPagado ?? 0;
  return { ...honorario.toJSON(), montoPagado, saldo: honorario.montoPactado - montoPagado };
}

async function findHonorario(usuario: UsuarioSesion, expedienteId: string) {
  const expediente = await findExpedienteConAccesoEconomico(usuario, expedienteId);
  const honorario = await Honorario.findOne({ expedienteId: expediente._id });
  if (!honorario) {
    throw new AppError(404, 'NOT_FOUND', 'This case has no fee yet');
  }
  return honorario;
}

/** The agreed fee of a case and its payments. Payments are immutable once recorded. */
export function createHonorariosRouter(config: AuthConfig) {
  const router = Router({ mergeParams: true });
  router.use(authenticate(config));

  router.get<Params>('/', async (req, res) => {
    res.json({ honorario: conSaldo(await findHonorario(req.usuario!, req.params.expedienteId)) });
  });

  router.post<Params>('/', async (req, res) => {
    const expediente = await findExpedienteConAccesoEconomico(req.usuario!, req.params.expedienteId);
    const { montoPactado } = parse(crearHonorarioSchema, req.body);
    // A second fee for the same case hits the unique index and answers 409.
    const honorario = await Honorario.create({ expedienteId: expediente._id, montoPactado });
    res.status(201).json({ honorario: conSaldo(honorario) });
  });

  router.post<Params>('/pagos', async (req, res) => {
    const honorario = await findHonorario(req.usuario!, req.params.expedienteId);
    const pago = parse(crearPagoSchema, req.body);
    honorario.pagos.push({ monto: pago.monto, fecha: pago.fecha ?? new Date(), usuarioId: req.usuario!._id });
    await honorario.save();
    res.status(201).json({ honorario: conSaldo(honorario) });
  });

  return router;
}
