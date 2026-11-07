import { describe, expect, it } from 'vitest';
import { useTestDatabase } from '../test/database.js';
import { crearUsuario, createTestApp, loginComo } from '../test/factories.js';

useTestDatabase();

const INITIAL_PASSWORD = 'contrasena inicial del estudio';

async function loginComoTitular(app = createTestApp()) {
  const titular = await crearUsuario({ email: 'titular@estudio.com', esTitular: true });
  return { app, titular, agent: await loginComo(app, 'titular@estudio.com') };
}

describe('POST /api/usuarios', () => {
  it('lets the firm owner create a user who must change the initial password', async () => {
    const { app, agent } = await loginComoTitular();

    const res = await agent
      .post('/api/usuarios')
      .send({ nombre: 'Beto Gomez', email: 'beto@estudio.com', rol: 'ASISTENTE', password: INITIAL_PASSWORD });

    expect(res.status).toBe(201);
    expect(res.body.usuario).toMatchObject({ email: 'beto@estudio.com', rol: 'ASISTENTE', esTitular: false, debeCambiarPassword: true });
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');
    await expect(loginComo(app, 'beto@estudio.com', INITIAL_PASSWORD)).resolves.toBeDefined();
  });

  it('responds 403 to a lawyer who is not the firm owner', async () => {
    const app = createTestApp();
    await crearUsuario({ email: 'ana@estudio.com', rol: 'ABOGADO' });
    const agent = await loginComo(app, 'ana@estudio.com');

    const res = await agent
      .post('/api/usuarios')
      .send({ nombre: 'Beto Gomez', email: 'beto@estudio.com', rol: 'ASISTENTE', password: INITIAL_PASSWORD });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('responds 409 when the email is already taken', async () => {
    const { agent } = await loginComoTitular();
    await crearUsuario({ email: 'beto@estudio.com' });

    const res = await agent
      .post('/api/usuarios')
      .send({ nombre: 'Beto Gomez', email: 'beto@estudio.com', rol: 'ASISTENTE', password: INITIAL_PASSWORD });

    expect(res.status).toBe(409);
  });

  it('responds 400 for an initial password that breaks the policy or a firm owner who is not a lawyer', async () => {
    const { agent } = await loginComoTitular();

    const shortPassword = await agent
      .post('/api/usuarios')
      .send({ nombre: 'Beto Gomez', email: 'beto@estudio.com', rol: 'ASISTENTE', password: 'corta' });
    const assistantOwner = await agent
      .post('/api/usuarios')
      .send({ nombre: 'Beto Gomez', email: 'beto@estudio.com', rol: 'ASISTENTE', esTitular: true, password: INITIAL_PASSWORD });

    expect(shortPassword.status).toBe(400);
    expect(assistantOwner.status).toBe(400);
  });
});

describe('GET /api/usuarios', () => {
  it('lists every user of the firm without password hashes', async () => {
    const { agent } = await loginComoTitular();
    await crearUsuario({ email: 'beto@estudio.com', rol: 'ASISTENTE', activo: false });

    const res = await agent.get('/api/usuarios');

    expect(res.status).toBe(200);
    expect(res.body.usuarios.map((u: { email: string }) => u.email).sort()).toEqual(['beto@estudio.com', 'titular@estudio.com']);
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');
  });

  it('responds 403 to anyone but the firm owner', async () => {
    const app = createTestApp();
    await crearUsuario({ email: 'ana@estudio.com', rol: 'ABOGADO' });
    const agent = await loginComo(app, 'ana@estudio.com');

    expect((await agent.get('/api/usuarios')).status).toBe(403);
  });
});

describe('GET /api/usuarios/abogados', () => {
  async function estudioConAbogados() {
    const app = createTestApp();
    const titular = await crearUsuario({ nombre: 'Zoe Titular', email: 'titular@estudio.com', esTitular: true });
    const ana = await crearUsuario({ nombre: 'Ana Diaz', email: 'ana@estudio.com' });
    await crearUsuario({ nombre: 'Beto Baja', email: 'beto@estudio.com', activo: false });
    await crearUsuario({ nombre: 'Carla Ruiz', email: 'carla@estudio.com', rol: 'ASISTENTE' });
    return { app, titular, ana };
  }

  it('lists only the active lawyers, owner included, by name and without any other field', async () => {
    const { app, titular, ana } = await estudioConAbogados();
    const expected = [
      { _id: ana.id, nombre: 'Ana Diaz' },
      { _id: titular.id, nombre: 'Zoe Titular' },
    ];

    const asOwner = await (await loginComo(app, 'titular@estudio.com')).get('/api/usuarios/abogados');
    const asAssistant = await (await loginComo(app, 'carla@estudio.com')).get('/api/usuarios/abogados');

    expect(asOwner.status).toBe(200);
    expect(asOwner.body.abogados).toEqual(expected);
    expect(asAssistant.status).toBe(200);
    expect(asAssistant.body.abogados).toEqual(expected);
  });

  it('responds 403 to a lawyer who is not the firm owner', async () => {
    const { app } = await estudioConAbogados();

    const res = await (await loginComo(app, 'ana@estudio.com')).get('/api/usuarios/abogados');

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('opens only this route to the assistant: managing users stays with the firm owner', async () => {
    const { app, ana } = await estudioConAbogados();
    const asistente = await loginComo(app, 'carla@estudio.com');

    expect((await asistente.get('/api/usuarios')).status).toBe(403);
    expect((await asistente.post('/api/usuarios').send({})).status).toBe(403);
    expect((await asistente.patch(`/api/usuarios/${ana.id}`).send({ activo: false })).status).toBe(403);
    expect((await asistente.post(`/api/usuarios/${ana.id}/reset-password`).send({ password: INITIAL_PASSWORD })).status).toBe(403);
  });
});

describe('PATCH /api/usuarios/:id', () => {
  it('updates rol, esTitular and activo, and ignores any other field', async () => {
    const { agent } = await loginComoTitular();
    const beto = await crearUsuario({ email: 'beto@estudio.com', rol: 'ASISTENTE' });

    const res = await agent
      .patch(`/api/usuarios/${beto.id}`)
      .send({ rol: 'ABOGADO', esTitular: true, activo: false, email: 'otro@estudio.com', debeCambiarPassword: true });

    expect(res.status).toBe(200);
    expect(res.body.usuario).toMatchObject({ rol: 'ABOGADO', esTitular: true, activo: false, email: 'beto@estudio.com', debeCambiarPassword: false });
  });

  it('responds 409 when the firm owner tries to change their own access, so the firm always keeps an active owner', async () => {
    const { agent, titular } = await loginComoTitular();

    const deactivate = await agent.patch(`/api/usuarios/${titular.id}`).send({ activo: false });
    const unflag = await agent.patch(`/api/usuarios/${titular.id}`).send({ esTitular: false });
    const demote = await agent.patch(`/api/usuarios/${titular.id}`).send({ rol: 'ASISTENTE' });
    const me = await agent.get('/api/auth/me');

    for (const res of [deactivate, unflag, demote]) {
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CANNOT_CHANGE_OWN_ACCESS');
    }
    expect(me.body.usuario).toMatchObject({ activo: true, esTitular: true, rol: 'ABOGADO' });
  });

  it('lets a firm owner deactivate another firm owner', async () => {
    const { agent } = await loginComoTitular();
    const socia = await crearUsuario({ email: 'socia@estudio.com', esTitular: true });

    const res = await agent.patch(`/api/usuarios/${socia.id}`).send({ activo: false });

    expect(res.status).toBe(200);
  });

  it('responds 400 when turning another firm owner into an ASISTENTE without removing esTitular', async () => {
    const { agent } = await loginComoTitular();
    const socia = await crearUsuario({ email: 'socia@estudio.com', esTitular: true });

    const res = await agent.patch(`/api/usuarios/${socia.id}`).send({ rol: 'ASISTENTE' });

    expect(res.status).toBe(400);
  });

  it('responds 404 for a user that does not exist', async () => {
    const { agent } = await loginComoTitular();

    const res = await agent.patch('/api/usuarios/64b7f9f2a1b2c3d4e5f60718').send({ activo: false });

    expect(res.status).toBe(404);
  });
});

describe('POST /api/usuarios/:id/reset-password', () => {
  it('sets a new initial password and forces the user to change it again', async () => {
    const { app, agent } = await loginComoTitular();
    const beto = await crearUsuario({ email: 'beto@estudio.com' });

    const res = await agent.post(`/api/usuarios/${beto.id}/reset-password`).send({ password: INITIAL_PASSWORD });
    const betoAgent = await loginComo(app, 'beto@estudio.com', INITIAL_PASSWORD);
    const me = await betoAgent.get('/api/auth/me');

    expect(res.status).toBe(204);
    expect(me.body.usuario.debeCambiarPassword).toBe(true);
  });

  it('ends every session the user had open', async () => {
    const { app, agent } = await loginComoTitular();
    const beto = await crearUsuario({ email: 'beto@estudio.com' });
    const betoAgent = await loginComo(app, 'beto@estudio.com');

    await agent.post(`/api/usuarios/${beto.id}/reset-password`).send({ password: INITIAL_PASSWORD });

    expect((await betoAgent.get('/api/auth/me')).status).toBe(401);
  });

  it('responds 404 for an unknown user, 400 for a weak password and 403 to anyone but the firm owner', async () => {
    const { app, agent } = await loginComoTitular();
    const beto = await crearUsuario({ email: 'beto@estudio.com' });
    const lawyer = await loginComo(app, 'beto@estudio.com');

    const unknown = await agent.post('/api/usuarios/650000000000000000000000/reset-password').send({ password: INITIAL_PASSWORD });
    const weak = await agent.post(`/api/usuarios/${beto.id}/reset-password`).send({ password: 'corta' });
    const notOwner = await lawyer.post(`/api/usuarios/${beto.id}/reset-password`).send({ password: INITIAL_PASSWORD });

    expect(unknown.status).toBe(404);
    expect(weak.status).toBe(400);
    expect(notOwner.status).toBe(403);
  });
});
