import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { useTestDatabase } from './test/database.js';
import { crearEstudio, crearUsuario, createTestApp, loginComo } from './test/factories.js';

useTestDatabase();

const RESOURCES = ['/api/clientes', '/api/expedientes', '/api/audiencias'];

describe('domain endpoints', () => {
  it('respond 401 without a session', async () => {
    const app = createTestApp();

    for (const url of RESOURCES) {
      expect((await request(app).get(url)).status).toBe(401);
    }
  });

  it('respond 403 PASSWORD_CHANGE_REQUIRED until the user replaces the initial password', async () => {
    const app = createTestApp();
    await crearUsuario({ email: 'nuevo@estudio.com', debeCambiarPassword: true });
    const agent = await loginComo(app, 'nuevo@estudio.com');

    for (const url of RESOURCES) {
      const res = await agent.get(url);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('PASSWORD_CHANGE_REQUIRED');
    }
  });

  it('respond 400 INVALID_ID for a malformed id in the path', async () => {
    const { titular } = await crearEstudio();

    const responses = [
      await titular.get('/api/expedientes/no-es-un-id'),
      await titular.patch('/api/expedientes/no-es-un-id').send({ estado: 'EN_ESPERA' }),
      await titular.get('/api/expedientes/no-es-un-id/movimientos'),
      await titular.get('/api/expedientes/no-es-un-id/honorario'),
      await titular.patch('/api/audiencias/no-es-un-id').send({ estado: 'REALIZADA' }),
    ];

    for (const res of responses) {
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_ID');
    }
  });
});
