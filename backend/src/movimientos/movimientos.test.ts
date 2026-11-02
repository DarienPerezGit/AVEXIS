import { describe, expect, it } from 'vitest';
import { useTestDatabase } from '../test/database.js';
import { crearEstudio, crearExpediente } from '../test/factories.js';

useTestDatabase();

describe('POST /api/expedientes/:id/movimientos', () => {
  it('lets an assistant record an entry on any case, signed with their own session', async () => {
    const { asistente, usuarios } = await crearEstudio();
    const expediente = await crearExpediente(usuarios.abogado._id);

    const res = await asistente
      .post(`/api/expedientes/${expediente.id}/movimientos`)
      .send({ tipo: 'CEDULA', descripcion: 'Se diligencia cedula al demandado', usuarioId: usuarios.titular.id });

    expect(res.status).toBe(201);
    expect(res.body.movimiento).toMatchObject({ tipo: 'CEDULA', expedienteId: expediente.id, usuarioId: usuarios.asistente.id });
  });

  it('lets a lawyer record entries on own cases only', async () => {
    const { abogado, usuarios } = await crearEstudio();
    const own = await crearExpediente(usuarios.abogado._id);
    const foreign = await crearExpediente(usuarios.otroAbogado._id);
    const entry = { tipo: 'ESCRITO', descripcion: 'Contesta traslado' };

    expect((await abogado.post(`/api/expedientes/${own.id}/movimientos`).send(entry)).status).toBe(201);
    expect((await abogado.post(`/api/expedientes/${foreign.id}/movimientos`).send(entry)).status).toBe(403);
  });

  it('responds 400 for an unknown tipo and 404 for an unknown case', async () => {
    const { titular, usuarios } = await crearEstudio();
    const expediente = await crearExpediente(usuarios.abogado._id);

    const badTipo = await titular.post(`/api/expedientes/${expediente.id}/movimientos`).send({ tipo: 'SENTENCIA', descripcion: 'x' });
    const missing = await titular.post('/api/expedientes/650000000000000000000000/movimientos').send({ tipo: 'ESCRITO', descripcion: 'x' });

    expect(badTipo.status).toBe(400);
    expect(badTipo.body.error.details[0].path).toBe('tipo');
    expect(missing.status).toBe(404);
  });
});

describe('GET /api/expedientes/:id/movimientos', () => {
  it('lists the entries newest first to whoever can access the case', async () => {
    const { abogado, otroAbogado, asistente, usuarios } = await crearEstudio();
    const expediente = await crearExpediente(usuarios.abogado._id);
    const url = `/api/expedientes/${expediente.id}/movimientos`;
    await abogado.post(url).send({ tipo: 'ESCRITO', descripcion: 'Demanda', fecha: '2026-03-01' });
    await asistente.post(url).send({ tipo: 'OFICIO', descripcion: 'Oficio al registro', fecha: '2026-04-01' });

    const res = await abogado.get(url);

    expect(res.status).toBe(200);
    expect(res.body.movimientos.map((m: { descripcion: string }) => m.descripcion)).toEqual(['Oficio al registro', 'Demanda']);
    expect((await otroAbogado.get(url)).status).toBe(403);
  });

  it('has no way to edit or delete an entry', async () => {
    const { titular, usuarios } = await crearEstudio();
    const expediente = await crearExpediente(usuarios.abogado._id);
    const created = await titular.post(`/api/expedientes/${expediente.id}/movimientos`).send({ tipo: 'ESCRITO', descripcion: 'Demanda' });
    const url = `/api/expedientes/${expediente.id}/movimientos/${created.body.movimiento._id}`;

    expect((await titular.patch(url).send({ descripcion: 'otra' })).status).toBe(404);
    expect((await titular.delete(url)).status).toBe(404);
  });
});
