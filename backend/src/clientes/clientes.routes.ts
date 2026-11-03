import { Router } from 'express';
import { z } from 'zod';
import type { AuthConfig } from '../auth/config.js';
import { authenticate, requireTitular } from '../auth/middleware.js';
import { AppError } from '../errors/app-error.js';
import { parse } from '../http/validation.js';
import { Cliente, Expediente } from '../models/index.js';

const contacto = {
  nombre: z.string().trim().min(1),
  email: z.email(),
  telefono: z.string().trim().min(1),
  direccion: z.string().trim().optional(),
};

export const crearClienteSchema = z.discriminatedUnion('tipo', [
  z.object({ tipo: z.literal('FISICA'), dni: z.string().trim().min(1), ...contacto }),
  z.object({ tipo: z.literal('JURIDICA'), cuit: z.string().trim().min(1), ...contacto }),
]);

// Identity (tipo, DNI, CUIT) is fixed once registered; only the name and contact details can be corrected.
export const editarClienteSchema = z.object(contacto).partial();

/** Escapes user text so a search matches it literally instead of as a regular expression. */
const escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const listarClientesSchema = z.object({ q: z.string().trim().optional() });

async function findCliente(id: string) {
  const cliente = await Cliente.findById(id);
  if (!cliente) {
    throw new AppError(404, 'NOT_FOUND', 'Client not found');
  }
  return cliente;
}

/** Clients are shared by the whole firm: every role registers and reads them. */
export function createClientesRouter(config: AuthConfig) {
  const router = Router();
  router.use(authenticate(config));

  router.post('/', async (req, res) => {
    const cliente = await Cliente.create(parse(crearClienteSchema, req.body));
    res.status(201).json({ cliente });
  });

  router.get('/', async (req, res) => {
    const { q } = parse(listarClientesSchema, req.query);
    const pattern = q ? new RegExp(escapeRegex(q), 'i') : undefined;
    const filter = pattern ? { $or: [{ nombre: pattern }, { dni: pattern }, { cuit: pattern }] } : {};
    const clientes = await Cliente.find(filter).sort({ nombre: 1 });
    res.json({ clientes });
  });

  router.get('/:id', async (req, res) => {
    res.json({ cliente: await findCliente(req.params.id) });
  });

  router.patch('/:id', async (req, res) => {
    const cliente = await findCliente(req.params.id);
    cliente.set(parse(editarClienteSchema, req.body));
    await cliente.save();
    res.json({ cliente });
  });

  // The only hard delete in the API: a client loaded by mistake. Once it has cases it is part of their history.
  router.delete<{ id: string }>('/:id', requireTitular, async (req, res) => {
    const cliente = await findCliente(req.params.id);
    if (await Expediente.exists({ clienteId: cliente._id })) {
      throw new AppError(409, 'CLIENTE_HAS_EXPEDIENTES', 'A client with cases cannot be deleted');
    }
    await cliente.deleteOne();
    res.status(204).end();
  });

  return router;
}
