import { Router } from 'express';
import type { CookieOptions, Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import { AppError } from '../errors/app-error.js';
import type { HydratedDocument } from 'mongoose';
import { Usuario } from '../models/index.js';
import type { UsuarioDoc } from '../models/index.js';
import type { AuthConfig } from './config.js';
import { SESSION_COOKIE, authenticate } from './middleware.js';
import type { SessionPayload } from './middleware.js';
import { assertPasswordPolicy, replacePassword, verifyPassword } from './password.js';

export function createAuthRouter(config: AuthConfig) {
  const router = Router();
  // No maxAge: a session cookie the browser drops on close; the token itself expires after jwtExpiresIn.
  const cookieOptions: CookieOptions = { httpOnly: true, secure: config.secureCookie, sameSite: 'strict' };

  function startSession(res: Response, usuario: HydratedDocument<UsuarioDoc>) {
    const payload: SessionPayload = { ver: usuario.versionSesion };
    const token = jwt.sign(payload, config.jwtSecret, {
      subject: usuario.id,
      expiresIn: config.jwtExpiresIn as SignOptions['expiresIn'],
    });
    res.cookie(SESSION_COOKIE, token, cookieOptions);
  }

  // Limits by IP instead of locking accounts: a lockout would let anyone who knows an email block its owner.
  const loginLimiter = rateLimit({
    windowMs: config.loginRateLimit.windowMs,
    limit: config.loginRateLimit.limit,
    skipSuccessfulRequests: true,
    handler: (_req, _res, next) => {
      next(new AppError(429, 'TOO_MANY_REQUESTS', 'Too many failed login attempts. Try again later.'));
    },
  });

  router.post('/login', loginLimiter, async (req, res) => {
    const { email, password } = req.body ?? {};
    // String() turns a body like { "$ne": null } into plain text, so it cannot act as a query operator.
    const usuario = await Usuario.findOne({ email: String(email) }).select('+passwordHash');
    const passwordMatches = await verifyPassword(password, usuario?.passwordHash);
    if (!usuario || !passwordMatches) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }
    // Checked after the password, so only someone who knows it learns the account is disabled.
    if (!usuario.activo) {
      throw new AppError(403, 'ACCOUNT_DISABLED', 'This account is disabled. Contact the firm owner.');
    }

    startSession(res, usuario);
    res.json({ usuario });
  });

  router.post('/logout', (_req, res) => {
    res.clearCookie(SESSION_COOKIE, cookieOptions).status(204).end();
  });

  const authenticateDuringPasswordChange = authenticate(config, { allowPendingPasswordChange: true });

  router.get('/me', authenticateDuringPasswordChange, (req, res) => {
    res.json({ usuario: req.usuario });
  });

  router.patch('/me/password', authenticateDuringPasswordChange, async (req, res) => {
    const { actual, nueva } = req.body ?? {};
    const usuario = await Usuario.findById(req.usuario!.id).select('+passwordHash').orFail();
    // Asking for the current password stops anyone at an unattended open session from taking over the account.
    if (!(await verifyPassword(actual, usuario.passwordHash))) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Current password is wrong');
    }
    assertPasswordPolicy(nueva);

    await replacePassword(usuario, nueva, false);
    // Every earlier token is now void, including this device's; a fresh one keeps it logged in.
    startSession(res, usuario);
    res.status(204).end();
  });

  return router;
}
