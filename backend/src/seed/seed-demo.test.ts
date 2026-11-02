import mongoose from 'mongoose';
import { describe, expect, it } from 'vitest';
import { useTestDatabase } from '../test/database.js';
import { crearUsuario, createTestApp, loginComo } from '../test/factories.js';
import { DEMO_PASSWORD, DEMO_USUARIOS, seedDemo } from './seed-demo.js';

useTestDatabase();

const AHORA = new Date('2026-12-10T22:00:00-03:00');

describe('seedDemo', () => {
  it('leaves a demo user per role who can log in without changing the password', async () => {
    await seedDemo({ nodeEnv: 'development', now: AHORA });
    const app = createTestApp();

    for (const usuario of Object.values(DEMO_USUARIOS)) {
      const agent = await loginComo(app, usuario.email, DEMO_PASSWORD);
      const me = await agent.get('/api/auth/me');
      expect(me.body.usuario).toMatchObject({ rol: usuario.rol, debeCambiarPassword: false });
    }
  });

  it('leaves the same documents when it runs twice', async () => {
    // The seed's output is the database itself, so this is the one test that counts documents directly.
    const contar = async () =>
      Object.fromEntries(
        await Promise.all(
          Object.values(mongoose.models).map(async (model) => [model.modelName, await model.countDocuments()] as const),
        ),
      );

    await seedDemo({ nodeEnv: 'development', now: AHORA });
    const first = await contar();
    await seedDemo({ nodeEnv: 'development', now: AHORA });

    expect(await contar()).toEqual(first);
    expect(Object.values(first).every((count) => count > 0)).toBe(true);
  });

  it('schedules hearings within the next 7 days of the day it runs', async () => {
    await seedDemo({ nodeEnv: 'development', now: AHORA });
    const agent = await loginComo(createTestApp({}, { clock: () => AHORA }), DEMO_USUARIOS.titular.email, DEMO_PASSWORD);

    const res = await agent.get('/api/audiencias/proximas');

    expect(res.body.audiencias.length).toBeGreaterThan(0);
    expect(res.body.audiencias.some((a: { urgente: boolean; esVencimientoFatal: boolean }) => a.urgente && a.esVencimientoFatal)).toBe(true);
  });

  it('covers every case state and leaves a fee with a balance due', async () => {
    await seedDemo({ nodeEnv: 'development', now: AHORA });
    const agent = await loginComo(createTestApp(), DEMO_USUARIOS.titular.email, DEMO_PASSWORD);

    for (const estado of ['EN_TRAMITE', 'EN_ESPERA', 'ARCHIVADO']) {
      expect((await agent.get('/api/expedientes').query({ estado })).body.total).toBeGreaterThan(0);
    }
    const expedientes = (await agent.get('/api/expedientes')).body.data as { _id: string }[];
    const saldos = await Promise.all(
      expedientes.map(async (e) => (await agent.get(`/api/expedientes/${e._id}/honorario`)).body.honorario?.saldo ?? 0),
    );
    expect(saldos.some((saldo) => saldo > 0)).toBe(true);
  });

  it('refuses to run in production and leaves the database untouched', async () => {
    const existing = await crearUsuario({ email: 'real@estudio.com', esTitular: true });

    await expect(seedDemo({ nodeEnv: 'production', now: AHORA })).rejects.toThrow(/production/);

    await expect(loginComo(createTestApp(), existing.email)).resolves.toBeDefined();
    await expect(loginComo(createTestApp(), DEMO_USUARIOS.titular.email, DEMO_PASSWORD)).rejects.toThrow();
  });
});
