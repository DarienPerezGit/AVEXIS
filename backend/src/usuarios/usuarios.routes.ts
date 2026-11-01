import { Router } from 'express';
import type { AuthConfig } from '../auth/config.js';
import { authenticate, requireTitular } from '../auth/middleware.js';
import { assertPasswordPolicy, hashPassword, replacePassword } from '../auth/password.js';
import { AppError } from '../errors/app-error.js';
import { Usuario } from '../models/index.js';

async function findUsuario(id: string) {
  const usuario = await Usuario.findById(id);
  if (!usuario) {
    throw new AppError(404, 'NOT_FOUND', 'User not found');
  }
  return usuario;
}

/** User management. There is no public sign-up: only the firm owner creates users. */
export function createUsuariosRouter(config: AuthConfig) {
  const router = Router();
  router.use(authenticate(config), requireTitular);

  router.post('/', async (req, res) => {
    // Fields are picked one by one, so a request cannot set activo or debeCambiarPassword itself.
    const { nombre, email, rol, esTitular, password } = req.body ?? {};
    assertPasswordPolicy(password);

    const usuario = await Usuario.create({
      nombre,
      email,
      rol,
      esTitular,
      passwordHash: await hashPassword(password),
      debeCambiarPassword: true,
    });
    res.status(201).json({ usuario });
  });

  router.get('/', async (_req, res) => {
    const usuarios = await Usuario.find().sort({ nombre: 1 });
    res.json({ usuarios });
  });

  router.patch('/:id', async (req, res) => {
    const usuario = await findUsuario(req.params.id);
    // Only the firm-level settings change here; personal data and the password have their own flows.
    const { rol, esTitular, activo } = req.body ?? {};
    const changes = Object.fromEntries(Object.entries({ rol, esTitular, activo }).filter(([, value]) => value !== undefined));

    // Whoever edits users is an active firm owner (requireTitular). Barring them from changing their own
    // access means at least one active owner always remains, so the firm can never lock itself out.
    if (usuario.id === req.usuario!.id && Object.keys(changes).length > 0) {
      throw new AppError(409, 'CANNOT_CHANGE_OWN_ACCESS', 'You cannot change your own role, owner status or active status');
    }

    usuario.set(changes);
    await usuario.save();
    res.json({ usuario });
  });

  router.post('/:id/reset-password', async (req, res) => {
    const usuario = await findUsuario(req.params.id);
    const { password } = req.body ?? {};
    assertPasswordPolicy(password);

    await replacePassword(usuario, password, true);
    res.status(204).end();
  });

  return router;
}
