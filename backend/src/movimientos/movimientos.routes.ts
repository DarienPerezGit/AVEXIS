import { Router } from 'express';
import { z } from 'zod';
import { findExpedienteAccesible } from '../access/policies.js';
import type { AuthConfig } from '../auth/config.js';
import { authenticate } from '../auth/middleware.js';
import { conNombre } from '../http/populate.js';
import { parse } from '../http/validation.js';
import { MOVIMIENTO_TIPOS, Movimiento } from '../models/index.js';

/** Mounted under /api/expedientes/:expedienteId/movimientos. */
type Params = { expedienteId: string };

export const crearMovimientoSchema = z.object({
  tipo: z.enum(MOVIMIENTO_TIPOS),
  descripcion: z.string().trim().min(1),
  fecha: z.coerce.date().optional(),
});

/**
 * A case's procedural history. Entries are immutable: there is no PATCH or DELETE,
 * a mistake is corrected with a new entry.
 */
export function createMovimientosRouter(config: AuthConfig) {
  const router = Router({ mergeParams: true });
  router.use(authenticate(config));

  router.get<Params>('/', async (req, res) => {
    const expediente = await findExpedienteAccesible(req.usuario!, req.params.expedienteId);
    const movimientos = await Movimiento.find({ expedienteId: expediente._id }).sort({ fecha: -1, _id: -1 }).populate(conNombre('usuarioId'));
    res.json({ movimientos });
  });

  router.post<Params>('/', async (req, res) => {
    const expediente = await findExpedienteAccesible(req.usuario!, req.params.expedienteId);
    const datos = parse(crearMovimientoSchema, req.body);
    // Who loaded the entry comes from the session, never from the body, so the record can be trusted.
    const movimiento = await Movimiento.create({ ...datos, expedienteId: expediente._id, usuarioId: req.usuario!._id });
    res.status(201).json({ movimiento });
  });

  return router;
}
