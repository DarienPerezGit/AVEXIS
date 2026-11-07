import { Router } from 'express';
import { z } from 'zod';
import { abogadoParaAlta, abogadoParaCambio, assertAbogadoActivo, expedientesVisibles, findExpedienteAccesible } from '../access/policies.js';
import type { AuthConfig } from '../auth/config.js';
import { authenticate, authorize } from '../auth/middleware.js';
import { conNombre } from '../http/populate.js';
import { objectId, parse, validationError } from '../http/validation.js';
import { Cliente, EXPEDIENTE_ESTADOS, Expediente, FUEROS } from '../models/index.js';

export const crearExpedienteSchema = z.object({
  numero: z.string().trim().min(1),
  caratula: z.string().trim().min(1),
  fuero: z.enum(FUEROS),
  estado: z.enum(EXPEDIENTE_ESTADOS).optional(),
  clienteId: objectId,
  abogadoResponsableId: objectId.optional(),
  fechaInicio: z.coerce.date().optional(),
  observaciones: z.string().trim().optional(),
});

export const listarExpedientesSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  // Capped so nobody can pull the whole database in one request.
  limit: z.coerce.number().int().min(1).max(100).default(20),
  estado: z.enum(EXPEDIENTE_ESTADOS).optional(),
  fuero: z.enum(FUEROS).optional(),
  q: z.string().trim().min(1).optional(),
});

export const editarExpedienteSchema = crearExpedienteSchema
  .pick({ caratula: true, fuero: true, estado: true, observaciones: true, abogadoResponsableId: true })
  .partial();

const POPULATE_NOMBRES = [conNombre('clienteId'), conNombre('abogadoResponsableId')];

export function createExpedientesRouter(config: AuthConfig) {
  const router = Router();
  router.use(authenticate(config));

  // Choosing who carries a case is a professional decision, so assistants cannot open cases.
  router.post('/', authorize('ABOGADO'), async (req, res) => {
    const { abogadoResponsableId: solicitado, ...datos } = parse(crearExpedienteSchema, req.body);
    const abogadoResponsableId = abogadoParaAlta(req.usuario!, solicitado);

    if (!(await Cliente.exists({ _id: datos.clienteId }))) {
      throw validationError([{ path: 'clienteId', message: 'Client not found' }]);
    }
    await assertAbogadoActivo(abogadoResponsableId, 'abogadoResponsableId');

    const expediente = await Expediente.create({ ...datos, abogadoResponsableId });
    res.status(201).json({ expediente });
  });

  router.get('/', async (req, res) => {
    const { page, limit, estado, fuero, q } = parse(listarExpedientesSchema, req.query);
    const filter = {
      ...expedientesVisibles(req.usuario!),
      ...(estado && { estado }),
      ...(fuero && { fuero }),
      ...(q && { $text: { $search: q } }),
    };

    const [data, total] = await Promise.all([
      Expediente.find(filter).sort({ fechaInicio: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).populate(POPULATE_NOMBRES),
      Expediente.countDocuments(filter),
    ]);
    res.json({ data, page, limit, total });
  });

  router.get('/:id', async (req, res) => {
    // Populated after the access check, which compares the raw ids.
    const expediente = await findExpedienteAccesible(req.usuario!, req.params.id);
    res.json({ expediente: await expediente.populate(POPULATE_NOMBRES) });
  });

  // No DELETE: a case is archived (estado ARCHIVADO) so its history is kept.
  router.patch<{ id: string }>('/:id', authorize('ABOGADO'), async (req, res) => {
    const expediente = await findExpedienteAccesible(req.usuario!, req.params.id);
    const { abogadoResponsableId: solicitado, ...cambios } = parse(editarExpedienteSchema, req.body);
    const abogadoResponsableId = abogadoParaCambio(req.usuario!, solicitado);
    if (abogadoResponsableId) {
      await assertAbogadoActivo(abogadoResponsableId, 'abogadoResponsableId');
    }

    expediente.set({ ...cambios, ...(abogadoResponsableId && { abogadoResponsableId }) });
    await expediente.save();
    res.json({ expediente });
  });

  return router;
}
