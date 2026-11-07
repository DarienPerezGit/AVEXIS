import { describe, expect, it } from 'vitest';
import { Usuario } from '../models/index.js';
import { useTestDatabase } from '../test/database.js';
import { crearCliente, crearEstudio, crearExpediente } from '../test/factories.js';

useTestDatabase();

async function nuevoExpediente(input: Record<string, unknown> = {}) {
  const cliente = await crearCliente();
  return { numero: '1234/2026', caratula: 'Diaz c/ Ruiz s/ daños', fuero: 'CIVIL', clienteId: cliente.id, ...input };
}

describe('POST /api/expedientes', () => {
  it('assigns a case opened by a lawyer to that lawyer, whatever the body says', async () => {
    const { abogado, usuarios } = await crearEstudio();

    const res = await abogado.post('/api/expedientes').send(await nuevoExpediente({ abogadoResponsableId: usuarios.otroAbogado.id }));

    expect(res.status).toBe(201);
    expect(res.body.expediente).toMatchObject({ numero: '1234/2026', estado: 'EN_TRAMITE', abogadoResponsableId: usuarios.abogado.id });
  });

  it('lets the firm owner open a case for another lawyer', async () => {
    const { titular, usuarios } = await crearEstudio();

    const res = await titular.post('/api/expedientes').send(await nuevoExpediente({ abogadoResponsableId: usuarios.otroAbogado.id }));

    expect(res.status).toBe(201);
    expect(res.body.expediente.abogadoResponsableId).toBe(usuarios.otroAbogado.id);
  });

  it('responds 400 when the client or the responsible lawyer is not valid', async () => {
    const { titular, usuarios } = await crearEstudio();

    const unknownClient = await titular.post('/api/expedientes').send(await nuevoExpediente({ clienteId: '650000000000000000000000' }));
    const assistantInCharge = await titular.post('/api/expedientes').send(await nuevoExpediente({ abogadoResponsableId: usuarios.asistente.id }));

    expect(unknownClient.status).toBe(400);
    expect(unknownClient.body.error.details[0].path).toBe('clienteId');
    expect(assistantInCharge.status).toBe(400);
    expect(assistantInCharge.body.error.details[0].path).toBe('abogadoResponsableId');
  });

  it('responds 403 to an assistant', async () => {
    const { asistente } = await crearEstudio();

    const res = await asistente.post('/api/expedientes').send(await nuevoExpediente());

    expect(res.status).toBe(403);
  });

  it('responds 409 when the case number already exists', async () => {
    const { abogado } = await crearEstudio();
    await abogado.post('/api/expedientes').send(await nuevoExpediente());

    const res = await abogado.post('/api/expedientes').send(await nuevoExpediente());

    expect(res.status).toBe(409);
  });
});

const numeros = (res: { body: { data: { numero: string }[] } }) => res.body.data.map((e) => e.numero).sort();

describe('GET /api/expedientes', () => {
  it('shows a lawyer only their own cases, and the owner and the assistant every case', async () => {
    const { titular, abogado, asistente, usuarios } = await crearEstudio();
    await crearExpediente(usuarios.abogado._id, { numero: 'A-1' });
    await crearExpediente(usuarios.otroAbogado._id, { numero: 'B-1' });

    expect(numeros(await abogado.get('/api/expedientes'))).toEqual(['A-1']);
    expect(numeros(await titular.get('/api/expedientes'))).toEqual(['A-1', 'B-1']);
    expect(numeros(await asistente.get('/api/expedientes'))).toEqual(['A-1', 'B-1']);
  });

  it('paginates newest first with a default limit of 20 and reports the total', async () => {
    const { titular, usuarios } = await crearEstudio();
    for (let day = 1; day <= 25; day += 1) {
      await crearExpediente(usuarios.abogado._id, { numero: `N-${day}`, fechaInicio: new Date(2026, 0, day) });
    }

    const first = await titular.get('/api/expedientes');
    const last = await titular.get('/api/expedientes').query({ page: 3, limit: 10 });

    expect(first.status).toBe(200);
    expect(first.body).toMatchObject({ page: 1, limit: 20, total: 25 });
    expect(first.body.data).toHaveLength(20);
    expect(first.body.data[0].numero).toBe('N-25');
    expect(last.body).toMatchObject({ page: 3, limit: 10, total: 25 });
    expect(last.body.data.map((e: { numero: string }) => e.numero)).toEqual(['N-5', 'N-4', 'N-3', 'N-2', 'N-1']);
  });

  it('responds 400 when limit exceeds 100 or page is not a positive number', async () => {
    const { titular } = await crearEstudio();

    const tooMany = await titular.get('/api/expedientes').query({ limit: 101 });
    const badPage = await titular.get('/api/expedientes').query({ page: 0 });

    expect(tooMany.status).toBe(400);
    expect(tooMany.body.error.details[0].path).toBe('limit');
    expect(badPage.status).toBe(400);
  });

  it('combines estado, fuero and caratula search with the role visibility', async () => {
    const { abogado, usuarios } = await crearEstudio();
    await crearExpediente(usuarios.abogado._id, { numero: 'A-1', caratula: 'Perez c/ Banco s/ cobro', fuero: 'COMERCIAL' });
    await crearExpediente(usuarios.abogado._id, { numero: 'A-2', caratula: 'Perez c/ Gomez s/ desalojo', fuero: 'CIVIL' });
    await crearExpediente(usuarios.abogado._id, { numero: 'A-3', caratula: 'Perez c/ Banco s/ ejecucion', fuero: 'COMERCIAL', estado: 'ARCHIVADO' });
    await crearExpediente(usuarios.otroAbogado._id, { numero: 'B-1', caratula: 'Perez c/ Banco s/ amparo', fuero: 'COMERCIAL' });

    const res = await abogado.get('/api/expedientes').query({ q: 'banco', fuero: 'COMERCIAL', estado: 'EN_TRAMITE' });

    expect(res.body.total).toBe(1);
    expect(numeros(res)).toEqual(['A-1']);
  });
});

describe('names on a case', () => {
  async function expedienteConNombres() {
    const estudio = await crearEstudio();
    await Usuario.updateOne({ _id: estudio.usuarios.abogado._id }, { nombre: 'Ana Diaz' });
    const cliente = await crearCliente({ nombre: 'Ruben Soto' });
    const expediente = await crearExpediente(estudio.usuarios.abogado._id, { clienteId: cliente._id });
    return {
      ...estudio,
      expediente,
      nombres: {
        clienteId: { _id: cliente.id, nombre: 'Ruben Soto' },
        abogadoResponsableId: { _id: estudio.usuarios.abogado.id, nombre: 'Ana Diaz' },
      },
    };
  }

  it('come with the client and the responsible lawyer in the list, and nothing else of them', async () => {
    const { abogado, nombres } = await expedienteConNombres();

    const res = await abogado.get('/api/expedientes');

    expect(res.body.data[0].clienteId).toEqual(nombres.clienteId);
    expect(res.body.data[0].abogadoResponsableId).toEqual(nombres.abogadoResponsableId);
  });

  it('come with the client and the responsible lawyer in the detail, and nothing else of them', async () => {
    const { abogado, expediente, nombres } = await expedienteConNombres();

    const res = await abogado.get(`/api/expedientes/${expediente.id}`);

    expect(res.body.expediente.clienteId).toEqual(nombres.clienteId);
    expect(res.body.expediente.abogadoResponsableId).toEqual(nombres.abogadoResponsableId);
  });
});

describe('GET /api/expedientes/:id', () => {
  it('returns an own case, 403 for another lawyer case and 404 for an unknown one', async () => {
    const { abogado, asistente, usuarios } = await crearEstudio();
    const own = await crearExpediente(usuarios.abogado._id);
    const foreign = await crearExpediente(usuarios.otroAbogado._id);

    expect((await abogado.get(`/api/expedientes/${own.id}`)).body.expediente.numero).toBe(own.numero);
    expect((await abogado.get(`/api/expedientes/${foreign.id}`)).status).toBe(403);
    expect((await asistente.get(`/api/expedientes/${foreign.id}`)).status).toBe(200);
    expect((await abogado.get('/api/expedientes/650000000000000000000000')).status).toBe(404);
  });
});

describe('PATCH /api/expedientes/:id', () => {
  it('lets the responsible lawyer update and archive the case, but not reassign it', async () => {
    const { abogado, usuarios } = await crearEstudio();
    const expediente = await crearExpediente(usuarios.abogado._id);

    const res = await abogado
      .patch(`/api/expedientes/${expediente.id}`)
      .send({ caratula: 'Diaz c/ Ruiz s/ daños y perjuicios', estado: 'ARCHIVADO', abogadoResponsableId: usuarios.otroAbogado.id });

    expect(res.status).toBe(200);
    expect(res.body.expediente).toMatchObject({
      caratula: 'Diaz c/ Ruiz s/ daños y perjuicios',
      estado: 'ARCHIVADO',
      abogadoResponsableId: usuarios.abogado.id,
    });
  });

  it('lets the firm owner reassign the case to another active lawyer', async () => {
    const { titular, usuarios } = await crearEstudio();
    const expediente = await crearExpediente(usuarios.abogado._id);

    const reassigned = await titular.patch(`/api/expedientes/${expediente.id}`).send({ abogadoResponsableId: usuarios.otroAbogado.id });
    const toAssistant = await titular.patch(`/api/expedientes/${expediente.id}`).send({ abogadoResponsableId: usuarios.asistente.id });

    expect(reassigned.status).toBe(200);
    expect(reassigned.body.expediente.abogadoResponsableId).toBe(usuarios.otroAbogado.id);
    expect(toAssistant.status).toBe(400);
  });

  it('responds 403 to another lawyer and to an assistant, and 404 for an unknown case', async () => {
    const { otroAbogado, asistente, titular, usuarios } = await crearEstudio();
    const expediente = await crearExpediente(usuarios.abogado._id);

    expect((await otroAbogado.patch(`/api/expedientes/${expediente.id}`).send({ estado: 'EN_ESPERA' })).status).toBe(403);
    expect((await asistente.patch(`/api/expedientes/${expediente.id}`).send({ estado: 'EN_ESPERA' })).status).toBe(403);
    expect((await titular.patch('/api/expedientes/650000000000000000000000').send({ estado: 'EN_ESPERA' })).status).toBe(404);
  });

  it('responds 400 for an unknown estado', async () => {
    const { abogado, usuarios } = await crearEstudio();
    const expediente = await crearExpediente(usuarios.abogado._id);

    const res = await abogado.patch(`/api/expedientes/${expediente.id}`).send({ estado: 'BORRADO' });

    expect(res.status).toBe(400);
    expect(res.body.error.details[0].path).toBe('estado');
  });
});
