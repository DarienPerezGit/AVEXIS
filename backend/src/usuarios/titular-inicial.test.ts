import { describe, expect, it } from 'vitest';
import { useTestDatabase } from '../test/database.js';
import { crearUsuario, createTestApp, loginComo } from '../test/factories.js';
import { crearTitularInicial } from './titular-inicial.js';

useTestDatabase();

const TITULAR = { nombre: 'Marta Sosa', email: 'marta@estudio.com', password: 'clave inicial del estudio' };

describe('crearTitularInicial', () => {
  it('creates the first firm owner, who must replace the initial password before working', async () => {
    const result = await crearTitularInicial(TITULAR);
    const agent = await loginComo(createTestApp(), TITULAR.email, TITULAR.password);

    const me = await agent.get('/api/auth/me');
    const blocked = await agent.get('/api/usuarios');

    expect(result).toEqual({ creado: true });
    expect(me.body.usuario).toMatchObject({ rol: 'ABOGADO', esTitular: true, debeCambiarPassword: true });
    expect(blocked.body.error.code).toBe('PASSWORD_CHANGE_REQUIRED');
  });

  it('does nothing once the firm has an active owner', async () => {
    await crearUsuario({ email: 'duena@estudio.com', esTitular: true });

    const result = await crearTitularInicial(TITULAR);

    expect(result).toEqual({ creado: false });
    await expect(loginComo(createTestApp(), TITULAR.email, TITULAR.password)).rejects.toThrow();
  });

  it('still installs an owner when the only existing one is deactivated', async () => {
    await crearUsuario({ email: 'duena@estudio.com', esTitular: true, activo: false });

    expect(await crearTitularInicial(TITULAR)).toEqual({ creado: true });
  });

  it('rejects a password that breaks the policy', async () => {
    await expect(crearTitularInicial({ ...TITULAR, password: 'corta' })).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  it('explains the conflict when an inactive user already has that email', async () => {
    await crearUsuario({ email: TITULAR.email, activo: false });

    await expect(crearTitularInicial(TITULAR)).rejects.toThrow(/already has the email marta@estudio.com/);
  });
});
