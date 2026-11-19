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
import { codigoValido, datosDeAlta, nuevoSecreto } from './totp.js';
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
    const { email, password, codigo } = req.body ?? {};
    // String() turns a body like { "$ne": null } into plain text, so it cannot act as a query operator.
    const usuario = await Usuario.findOne({ email: String(email) }).select('+passwordHash +totpSecret');
    const passwordMatches = await verifyPassword(password, usuario?.passwordHash);
    if (!usuario || !passwordMatches) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }
    // Checked after the password, so only someone who knows it learns the account is disabled.
    if (!usuario.activo) {
      throw new AppError(403, 'ACCOUNT_DISABLED', 'This account is disabled. Contact the firm owner.');
    }

    // 2FA is opt-in. Without a code the password alone opens nothing; the client asks for it and sends everything again.
    if (usuario.totpActivo) {
      if (codigo === undefined) {
        res.json({ requiereTotp: true });
        return;
      }
      if (!codigoValido(usuario.totpSecret, usuario.email, codigo)) {
        throw new AppError(401, 'INVALID_TOTP', 'The authenticator code is wrong or expired');
      }
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

  const authenticateStrict = authenticate(config);

  router.post('/me/2fa/setup', authenticateStrict, async (req, res) => {
    const usuario = req.usuario!;
    if (usuario.totpActivo) {
      throw new AppError(409, 'TOTP_ALREADY_ENABLED', 'Two-factor authentication is already enabled');
    }
    // A new secret each time: an abandoned setup leaves nothing enforced, since totpActivo stays false.
    usuario.totpSecret = nuevoSecreto();
    await usuario.save();
    res.json(await datosDeAlta(usuario.totpSecret, usuario.email));
  });

  router.post('/me/2fa/enable', authenticateStrict, async (req, res) => {
    const usuario = await Usuario.findById(req.usuario!.id).select('+totpSecret').orFail();
    if (usuario.totpActivo || !usuario.totpSecret) {
      throw new AppError(409, 'TOTP_NOT_PENDING', 'Start the setup first');
    }
    if (!codigoValido(usuario.totpSecret, usuario.email, req.body?.codigo)) {
      throw new AppError(401, 'INVALID_TOTP', 'The authenticator code is wrong or expired');
    }
    usuario.totpActivo = true;
    await usuario.save();
    res.json({ usuario });
  });

  router.post('/me/2fa/disable', authenticateStrict, async (req, res) => {
    const { password, codigo } = req.body ?? {};
    const usuario = await Usuario.findById(req.usuario!.id).select('+passwordHash +totpSecret').orFail();
    // Both factors, so someone at an unattended open session cannot turn the protection off.
    if (!(await verifyPassword(password, usuario.passwordHash))) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Current password is wrong');
    }
    if (!usuario.totpActivo || !codigoValido(usuario.totpSecret, usuario.email, codigo)) {
      throw new AppError(401, 'INVALID_TOTP', 'The authenticator code is wrong or expired');
    }
    usuario.totpActivo = false;
    usuario.totpSecret = undefined;
    await usuario.save();
    res.json({ usuario });
  });

  return router;
}
