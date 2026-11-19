import * as OTPAuth from 'otpauth';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { Usuario } from '../models/index.js';
import { useTestDatabase } from '../test/database.js';
import { PASSWORD, crearEstudio, crearUsuario, createTestApp, loginComo } from '../test/factories.js';

useTestDatabase();

const codigoDe = (secret: string, offsetSteps = 0) =>
  new OTPAuth.TOTP({ secret: OTPAuth.Secret.fromBase32(secret), digits: 6, period: 30 }).generate({
    timestamp: Date.now() + offsetSteps * 30_000,
  });

/** A user with 2FA already on; returns the secret the "phone" holds. */
async function conTotpActivo(email = 'ana@estudio.com') {
  const secret = new OTPAuth.Secret({ size: 20 }).base32;
  await crearUsuario({ email, totpSecret: secret, totpActivo: true });
  return secret;
}

describe('POST /api/auth/me/2fa/setup and /enable', () => {
  it('returns a QR and the secret, and turns 2FA on only after a correct code', async () => {
    const app = createTestApp();
    await crearUsuario({ email: 'ana@estudio.com' });
    const agent = await loginComo(app, 'ana@estudio.com');

    const setup = await agent.post('/api/auth/me/2fa/setup');
    expect(setup.status).toBe(200);
    expect(setup.body.qr).toMatch(/^data:image\/png;base64,/);
    expect(setup.body.otpauthUrl).toMatch(/^otpauth:\/\/totp\/AVEXIS:ana%40estudio\.com\?/);
    expect((await Usuario.findOne({ email: 'ana@estudio.com' }))!.totpActivo).toBe(false);

    const wrong = await agent.post('/api/auth/me/2fa/enable').send({ codigo: '000000' });
    expect(wrong.status).toBe(401);
    expect(wrong.body.error.code).toBe('INVALID_TOTP');

    const ok = await agent.post('/api/auth/me/2fa/enable').send({ codigo: codigoDe(setup.body.secret) });
    expect(ok.status).toBe(200);
    expect(ok.body.usuario.totpActivo).toBe(true);
    expect(ok.body.usuario.totpSecret).toBeUndefined();
  });

  it('refuses to enable without a setup, and to set up twice', async () => {
    const app = createTestApp();
    await crearUsuario({ email: 'ana@estudio.com' });
    const agent = await loginComo(app, 'ana@estudio.com');

    const sinSetup = await agent.post('/api/auth/me/2fa/enable').send({ codigo: '123456' });
    expect(sinSetup.status).toBe(409);

    const setup = await agent.post('/api/auth/me/2fa/setup');
    await agent.post('/api/auth/me/2fa/enable').send({ codigo: codigoDe(setup.body.secret) });
    const otraVez = await agent.post('/api/auth/me/2fa/setup');
    expect(otraVez.status).toBe(409);
    expect(otraVez.body.error.code).toBe('TOTP_ALREADY_ENABLED');
  });

  it('requires a session', async () => {
    const res = await request(createTestApp()).post('/api/auth/me/2fa/setup');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/login with 2FA on', () => {
  it('asks for the code instead of opening a session when only the password is sent', async () => {
    await conTotpActivo();

    const res = await request(createTestApp()).post('/api/auth/login').send({ email: 'ana@estudio.com', password: PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ requiereTotp: true });
    expect(res.headers['set-cookie']).toBeUndefined();
  });

  it('opens the session with a right code, also one step off, and rejects a wrong one', async () => {
    const secret = await conTotpActivo();
    const app = createTestApp();
    const login = (codigo: unknown) => request(app).post('/api/auth/login').send({ email: 'ana@estudio.com', password: PASSWORD, codigo });

    const ok = await login(codigoDe(secret));
    const stepOff = await login(codigoDe(secret, -1));
    const wrong = await login('000000');
    const notDigits = await login({ $ne: null });
    const farOff = await login(codigoDe(secret, 5));

    expect(ok.status).toBe(200);
    expect(ok.headers['set-cookie']?.[0]).toMatch(/^token=/);
    expect(stepOff.status).toBe(200);
    for (const res of [wrong, notDigits, farOff]) {
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_TOTP');
      expect(res.headers['set-cookie']).toBeUndefined();
    }
  });

  it('does not reveal anything about the code when the password is wrong', async () => {
    const secret = await conTotpActivo();

    const res = await request(createTestApp())
      .post('/api/auth/login')
      .send({ email: 'ana@estudio.com', password: 'not the right password', codigo: codigoDe(secret) });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('counts wrong codes against the failed-login limit', async () => {
    await conTotpActivo();
    const app = createTestApp({ loginRateLimit: { limit: 2, windowMs: 60_000 } });
    const attempt = () => request(app).post('/api/auth/login').send({ email: 'ana@estudio.com', password: PASSWORD, codigo: '000000' });

    const statuses = [(await attempt()).status, (await attempt()).status, (await attempt()).status];

    expect(statuses).toEqual([401, 401, 429]);
  });
});

describe('POST /api/auth/me/2fa/disable', () => {
  it('needs the password and a code, then login goes back to password only', async () => {
    const secret = await conTotpActivo();
    const app = createTestApp();
    const agent = request.agent(app);
    await agent.post('/api/auth/login').send({ email: 'ana@estudio.com', password: PASSWORD, codigo: codigoDe(secret) });

    const badPassword = await agent.post('/api/auth/me/2fa/disable').send({ password: 'not the right password', codigo: codigoDe(secret) });
    const badCode = await agent.post('/api/auth/me/2fa/disable').send({ password: PASSWORD, codigo: '000000' });
    const ok = await agent.post('/api/auth/me/2fa/disable').send({ password: PASSWORD, codigo: codigoDe(secret) });
    const after = await request(app).post('/api/auth/login').send({ email: 'ana@estudio.com', password: PASSWORD });

    expect(badPassword.body.error.code).toBe('INVALID_CREDENTIALS');
    expect(badCode.body.error.code).toBe('INVALID_TOTP');
    expect(ok.status).toBe(200);
    expect(ok.body.usuario.totpActivo).toBe(false);
    expect(after.body.usuario).toBeDefined();
    expect(after.headers['set-cookie']?.[0]).toMatch(/^token=/);
  });

  it('refuses when 2FA is not on', async () => {
    const app = createTestApp();
    await crearUsuario({ email: 'ana@estudio.com' });
    const agent = await loginComo(app, 'ana@estudio.com');

    const res = await agent.post('/api/auth/me/2fa/disable').send({ password: PASSWORD, codigo: '123456' });

    expect(res.status).toBe(401);
  });
});

describe('POST /api/usuarios/:id/reset-2fa', () => {
  it('lets the owner remove a user’s 2FA and ends that user’s sessions', async () => {
    const estudio = await crearEstudio();
    const secret = new OTPAuth.Secret({ size: 20 }).base32;
    await Usuario.updateOne({ _id: estudio.usuarios.abogado._id }, { totpSecret: secret, totpActivo: true });

    const res = await estudio.titular.post(`/api/usuarios/${estudio.usuarios.abogado.id}/reset-2fa`);
    const sinSesion = await estudio.abogado.get('/api/auth/me');
    const login = await request(estudio.app).post('/api/auth/login').send({ email: 'ana@estudio.com', password: PASSWORD });

    expect(res.status).toBe(204);
    expect(sinSesion.status).toBe(401);
    expect(login.body.usuario).toBeDefined();
  });

  it('is only for the owner and 404s on an unknown user', async () => {
    const estudio = await crearEstudio();

    const notOwner = await estudio.abogado.post(`/api/usuarios/${estudio.usuarios.asistente.id}/reset-2fa`);
    const unknown = await estudio.titular.post('/api/usuarios/64b000000000000000000000/reset-2fa');

    expect(notOwner.status).toBe(403);
    expect(unknown.status).toBe(404);
  });
});
