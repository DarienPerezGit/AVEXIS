import { describe, expect, it } from 'vitest';
import { useTestDatabase } from '../test/database.js';
import { crearEstudio, crearExpediente } from '../test/factories.js';

useTestDatabase();

async function expedienteDeAna() {
  const estudio = await crearEstudio();
  const expediente = await crearExpediente(estudio.usuarios.abogado._id);
  return { ...estudio, url: `/api/expedientes/${expediente.id}/honorario` };
}

describe('POST /api/expedientes/:id/honorario', () => {
  it('lets the responsible lawyer agree the fee, ignoring an estado sent by the client', async () => {
    const { abogado, url } = await expedienteDeAna();

    const res = await abogado.post(url).send({ montoPactado: 500000, estado: 'PAGADO' });

    expect(res.status).toBe(201);
    expect(res.body.honorario).toMatchObject({ montoPactado: 500000, estado: 'PENDIENTE', montoPagado: 0, saldo: 500000, pagos: [] });
  });

  it('responds 409 for a second fee on the same case and 400 for a negative amount', async () => {
    const { abogado, url } = await expedienteDeAna();
    await abogado.post(url).send({ montoPactado: 500000 });

    const second = await abogado.post(url).send({ montoPactado: 1 });
    const negative = await abogado.post(url).send({ montoPactado: -1 });

    expect(second.status).toBe(409);
    expect(negative.status).toBe(400);
    expect(negative.body.error.details[0].path).toBe('montoPactado');
  });
});

describe('GET /api/expedientes/:id/honorario', () => {
  it('is visible to the responsible lawyer and the owner only', async () => {
    const { abogado, titular, otroAbogado, asistente, url } = await expedienteDeAna();
    await abogado.post(url).send({ montoPactado: 500000 });

    expect((await abogado.get(url)).status).toBe(200);
    expect((await titular.get(url)).body.honorario.montoPactado).toBe(500000);
    expect((await otroAbogado.get(url)).status).toBe(403);
    expect((await asistente.get(url)).status).toBe(403);
    expect((await asistente.post(url).send({ montoPactado: 1 })).status).toBe(403);
  });

  it('responds 404 while the case has no fee', async () => {
    const { titular, url } = await expedienteDeAna();

    expect((await titular.get(url)).status).toBe(404);
  });
});

describe('POST /api/expedientes/:id/honorario/pagos', () => {
  it('records payments signed by the session and derives the paid amount, balance and estado', async () => {
    const { abogado, titular, usuarios, url } = await expedienteDeAna();
    await abogado.post(url).send({ montoPactado: 500000 });

    const partial = await abogado.post(`${url}/pagos`).send({ monto: 200000, usuarioId: usuarios.otroAbogado.id });
    const full = await titular.post(`${url}/pagos`).send({ monto: 300000 });

    expect(partial.status).toBe(201);
    expect(partial.body.honorario).toMatchObject({ estado: 'PARCIAL', montoPagado: 200000, saldo: 300000 });
    expect(partial.body.honorario.pagos[0].usuarioId).toBe(usuarios.abogado.id);
    expect(full.body.honorario).toMatchObject({ estado: 'PAGADO', montoPagado: 500000, saldo: 0 });
    expect(full.body.honorario.pagos[1].usuarioId).toBe(usuarios.titular.id);
  });

  it('responds 404 without a fee, 400 for a non-positive amount and 403 to the assistant', async () => {
    const { abogado, asistente, url } = await expedienteDeAna();

    expect((await abogado.post(`${url}/pagos`).send({ monto: 100 })).status).toBe(404);
    await abogado.post(url).send({ montoPactado: 500000 });
    expect((await abogado.post(`${url}/pagos`).send({ monto: 0 })).status).toBe(400);
    expect((await asistente.post(`${url}/pagos`).send({ monto: 100 })).status).toBe(403);
  });
});
