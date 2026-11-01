import jwt from 'jsonwebtoken';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { Usuario } from '../models/index.js';
import { authenticate, authorize } from './middleware.js';
import { useTestDatabase } from '../test/database.js';
import { PASSWORD, crearUsuario, createTestApp, loginComo, testAuthConfig } from '../test/factories.js';

useTestDatabase();

describe('POST /api/auth/login', () => {
  it('responds 200 with the user and sets the session in an httpOnly cookie', async () => {
    const usuario = await crearUsuario({ email: 'ana@estudio.com' });

    const res = await request(createTestApp()).post('/api/auth/login').send({ email: 'ana@estudio.com', password: PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.usuario).toMatchObject({ id: usuario.id, email: 'ana@estudio.com', rol: 'ABOGADO' });
    const cookie = res.headers['set-cookie']?.[0] ?? '';
    expect(cookie).toMatch(/^token=/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Strict/i);
  });

  it('responds 401 with the same body for an unknown email and for a wrong password', async () => {
    await crearUsuario({ email: 'ana@estudio.com' });
    const app = createTestApp();

    const unknownEmail = await request(app).post('/api/auth/login').send({ email: 'nadie@estudio.com', password: PASSWORD });
    const wrongPassword = await request(app).post('/api/auth/login').send({ email: 'ana@estudio.com', password: 'not the right password' });

    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.body).toEqual(wrongPassword.body);
    expect(unknownEmail.headers['set-cookie']).toBeUndefined();
  });

  it('treats a query operator sent as email as a plain value, so it matches nobody', async () => {
    await crearUsuario({ email: 'ana@estudio.com' });

    const res = await request(createTestApp()).post('/api/auth/login').send({ email: { $ne: null }, password: PASSWORD });

    expect(res.status).toBe(401);
  });

  it('responds 429 once an IP exceeds the failed login attempts, without counting successful logins', async () => {
    await crearUsuario({ email: 'ana@estudio.com' });
    const app = createTestApp({ loginRateLimit: { limit: 2, windowMs: 60_000 } });
    const attempt = (password: string) => request(app).post('/api/auth/login').send({ email: 'ana@estudio.com', password });

    const statuses = [];
    for (const password of [PASSWORD, PASSWORD, 'wrong password one', 'wrong password two', PASSWORD]) {
      statuses.push((await attempt(password)).status);
    }
    const blocked = await attempt(PASSWORD);

    expect(statuses).toEqual([200, 200, 401, 401, 429]);
    expect(blocked.body.error.code).toBe('TOO_MANY_REQUESTS');
  });

  it('responds 403 ACCOUNT_DISABLED to a deactivated user only when the password is right', async () => {
    await crearUsuario({ email: 'ana@estudio.com', activo: false });
    const app = createTestApp();

    const rightPassword = await request(app).post('/api/auth/login').send({ email: 'ana@estudio.com', password: PASSWORD });
    const wrongPassword = await request(app).post('/api/auth/login').send({ email: 'ana@estudio.com', password: 'not the right password' });

    expect(rightPassword.status).toBe(403);
    expect(rightPassword.body.error.code).toBe('ACCOUNT_DISABLED');
    expect(rightPassword.headers['set-cookie']).toBeUndefined();
    expect(wrongPassword.status).toBe(401);
  });
});

describe('GET /api/auth/me', () => {
  it('returns the logged-in user without the password hash', async () => {
    const usuario = await crearUsuario({ email: 'ana@estudio.com' });
    const agent = await loginComo(createTestApp(), 'ana@estudio.com');

    const res = await agent.get('/api/auth/me');

    expect(res.status).toBe(200);
    expect(res.body.usuario).toMatchObject({ id: usuario.id, email: 'ana@estudio.com' });
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');
  });

  it('responds 401 without a session cookie', async () => {
    const res = await request(createTestApp()).get('/api/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('responds 401 for an expired token and for a token signed with another secret', async () => {
    const usuario = await crearUsuario();
    const anHourAgo = Math.floor(Date.now() / 1000) - 3600;
    const expired = jwt.sign({ exp: anHourAgo }, testAuthConfig.jwtSecret, { subject: usuario.id });
    const forged = jwt.sign({}, 'some-other-secret', { subject: usuario.id, expiresIn: '8h' });
    const app = createTestApp();

    const expiredRes = await request(app).get('/api/auth/me').set('Cookie', `token=${expired}`);
    const forgedRes = await request(app).get('/api/auth/me').set('Cookie', `token=${forged}`);

    expect(expiredRes.status).toBe(401);
    expect(forgedRes.status).toBe(401);
  });

  it('responds 401 once the user is deactivated, even with a still valid token', async () => {
    const usuario = await crearUsuario({ email: 'ana@estudio.com' });
    const agent = await loginComo(createTestApp(), 'ana@estudio.com');

    await Usuario.updateOne({ _id: usuario._id }, { activo: false });
    const res = await agent.get('/api/auth/me');

    expect(res.status).toBe(401);
  });
});

describe('PATCH /api/auth/me/password', () => {
  const NEW_PASSWORD = 'vencimiento del jueves';

  it('responds 401 when the current password is wrong', async () => {
    await crearUsuario({ email: 'ana@estudio.com' });
    const agent = await loginComo(createTestApp(), 'ana@estudio.com');

    const res = await agent.patch('/api/auth/me/password').send({ actual: 'not the right password', nueva: NEW_PASSWORD });

    expect(res.status).toBe(401);
  });

  it('responds 400 when the new password breaks the policy', async () => {
    await crearUsuario({ email: 'ana@estudio.com' });
    const agent = await loginComo(createTestApp(), 'ana@estudio.com');

    const res = await agent.patch('/api/auth/me/password').send({ actual: PASSWORD, nueva: 'corta' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('changes the password and clears the forced-change flag', async () => {
    await crearUsuario({ email: 'ana@estudio.com', debeCambiarPassword: true });
    const app = createTestApp();
    const agent = await loginComo(app, 'ana@estudio.com');

    const res = await agent.patch('/api/auth/me/password').send({ actual: PASSWORD, nueva: NEW_PASSWORD });
    const me = await agent.get('/api/auth/me');

    expect(res.status).toBe(204);
    expect(me.body.usuario.debeCambiarPassword).toBe(false);
    await expect(loginComo(app, 'ana@estudio.com', NEW_PASSWORD)).resolves.toBeDefined();
  });

  it('ends the sessions on other devices but keeps the one that made the change', async () => {
    await crearUsuario({ email: 'ana@estudio.com' });
    const app = createTestApp();
    const laptop = await loginComo(app, 'ana@estudio.com');
    const phone = await loginComo(app, 'ana@estudio.com');

    await laptop.patch('/api/auth/me/password').send({ actual: PASSWORD, nueva: NEW_PASSWORD });

    expect((await laptop.get('/api/auth/me')).status).toBe(200);
    expect((await phone.get('/api/auth/me')).status).toBe(401);
  });
});

describe('authorize', () => {
  const appWithLawyerOnlyRoute = () =>
    createTestApp({}, (app) => {
      app.get('/api/solo-abogados', authenticate(testAuthConfig), authorize('ABOGADO'), (_req, res) => {
        res.json({ ok: true });
      });
    });

  it('lets a user with an allowed role through', async () => {
    await crearUsuario({ email: 'ana@estudio.com', rol: 'ABOGADO' });
    const agent = await loginComo(appWithLawyerOnlyRoute(), 'ana@estudio.com');

    const res = await agent.get('/api/solo-abogados');

    expect(res.status).toBe(200);
  });

  it('responds 403 PASSWORD_CHANGE_REQUIRED while the user must change the password, but still serves /me', async () => {
    await crearUsuario({ email: 'ana@estudio.com', debeCambiarPassword: true });
    const agent = await loginComo(appWithLawyerOnlyRoute(), 'ana@estudio.com');

    const protectedRoute = await agent.get('/api/solo-abogados');
    const me = await agent.get('/api/auth/me');

    expect(protectedRoute.status).toBe(403);
    expect(protectedRoute.body.error.code).toBe('PASSWORD_CHANGE_REQUIRED');
    expect(me.status).toBe(200);
  });

  it('responds 403 to a user whose role is not allowed', async () => {
    await crearUsuario({ email: 'beto@estudio.com', rol: 'ASISTENTE' });
    const agent = await loginComo(appWithLawyerOnlyRoute(), 'beto@estudio.com');

    const res = await agent.get('/api/solo-abogados');

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });
});

describe('POST /api/auth/logout', () => {
  it('clears the session cookie so the next request is unauthenticated', async () => {
    await crearUsuario({ email: 'ana@estudio.com' });
    const agent = await loginComo(createTestApp(), 'ana@estudio.com');

    const logout = await agent.post('/api/auth/logout');
    const me = await agent.get('/api/auth/me');

    expect(logout.status).toBe(204);
    expect(me.status).toBe(401);
  });
});
