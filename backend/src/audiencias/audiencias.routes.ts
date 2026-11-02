import { Router } from 'express';
import { z } from 'zod';
import { abogadoParaAlta, abogadoParaCambio, agendaVisible, assertAbogadoActivo, findAudienciaAccesible, findExpedienteAccesible } from '../access/policies.js';
import type { AuthConfig } from '../auth/config.js';
import { authenticate } from '../auth/middleware.js';
import { objectId, parse, validationError } from '../http/validation.js';
import { AUDIENCIA_ESTADOS, AUDIENCIA_TIPOS, Audiencia } from '../models/index.js';

const crearAudienciaSchema = z.object({
  expedienteId: objectId,
  abogadoId: objectId.optional(),
  fecha: z.coerce.date(),
  hora: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Expected HH:mm'),
  tipo: z.enum(AUDIENCIA_TIPOS),
  esVencimientoFatal: z.boolean().optional(),
});

const editarAudienciaSchema = crearAudienciaSchema
  .omit({ expedienteId: true })
  .extend({ estado: z.enum(AUDIENCIA_ESTADOS) })
  .partial();

/** Hearings and deadlines. There is no DELETE: a hearing is cancelled (estado CANCELADA) so the record stays. */
export function createAudienciasRouter(config: AuthConfig) {
  const router = Router();
  router.use(authenticate(config));

  router.get('/', async (req, res) => {
    const audiencias = await Audiencia.find(await agendaVisible(req.usuario!)).sort({ fecha: 1, hora: 1 });
    res.json({ audiencias });
  });

  router.post('/', async (req, res) => {
    const { abogadoId: solicitado, ...datos } = parse(crearAudienciaSchema, req.body);
    // The case comes in the body, so an unknown one is invalid input (400) rather than a missing resource (404).
    await findExpedienteAccesible(req.usuario!, datos.expedienteId, () =>
      validationError([{ path: 'expedienteId', message: 'Case not found' }]),
    );

    const abogadoId = abogadoParaAlta(req.usuario!, solicitado);
    await assertAbogadoActivo(abogadoId, 'abogadoId');

    const audiencia = await Audiencia.create({ ...datos, abogadoId });
    res.status(201).json({ audiencia });
  });

  router.patch('/:id', async (req, res) => {
    const audiencia = await findAudienciaAccesible(req.usuario!, req.params.id);
    const { abogadoId: solicitado, ...cambios } = parse(editarAudienciaSchema, req.body);
    const abogadoId = abogadoParaCambio(req.usuario!, solicitado);
    if (abogadoId) {
      await assertAbogadoActivo(abogadoId, 'abogadoId');
    }

    audiencia.set({ ...cambios, ...(abogadoId && { abogadoId }) });
    await audiencia.save();
    res.json({ audiencia });
  });

  return router;
}
