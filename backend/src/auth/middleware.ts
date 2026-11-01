import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import type { JwtPayload } from 'jsonwebtoken';
import type { HydratedDocument } from 'mongoose';
import { AppError } from '../errors/app-error.js';
import { Usuario } from '../models/index.js';
import type { Rol, UsuarioDoc } from '../models/index.js';
import type { AuthConfig } from './config.js';

export const SESSION_COOKIE = 'token';

/** Claims besides `sub`. Only the session version: roles and status are read from the database. */
export interface SessionPayload {
  ver: number;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      usuario?: HydratedDocument<UsuarioDoc>;
    }
  }
}

const unauthorized = () => new AppError(401, 'UNAUTHORIZED', 'Authentication required');

/**
 * Verifies the session cookie and loads the user from the database on every request,
 * so deactivations and role changes apply immediately instead of when the token expires.
 */
export function authenticate(
  config: AuthConfig,
  { allowPendingPasswordChange = false }: { allowPendingPasswordChange?: boolean } = {},
): RequestHandler {
  return async (req, _res, next) => {
    const token: unknown = req.cookies?.[SESSION_COOKIE];
    if (typeof token !== 'string') {
      throw unauthorized();
    }

    let payload: JwtPayload & Partial<SessionPayload>;
    try {
      payload = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] }) as JwtPayload;
    } catch {
      throw unauthorized();
    }

    const usuario = payload.sub ? await Usuario.findById(payload.sub) : null;
    // A token from before the last password change or reset no longer counts.
    if (!usuario?.activo || payload.ver !== usuario.versionSesion) {
      throw unauthorized();
    }
    // Blocked by default, so a new route cannot forget the check; only the password change flow opts out.
    if (usuario.debeCambiarPassword && !allowPendingPasswordChange) {
      throw new AppError(403, 'PASSWORD_CHANGE_REQUIRED', 'Change your password before continuing');
    }

    req.usuario = usuario;
    next();
  };
}

/** Must run after `authenticate`. Firm owners are the only ones who manage users. */
export const requireTitular: RequestHandler = (req, _res, next) => {
  if (!req.usuario?.esTitular) {
    throw new AppError(403, 'FORBIDDEN', 'Only the firm owner can perform this action');
  }
  next();
};

/** Must run after `authenticate`. */
export function authorize(...roles: Rol[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.usuario || !roles.includes(req.usuario.rol)) {
      throw new AppError(403, 'FORBIDDEN', 'Your role cannot perform this action');
    }
    next();
  };
}
