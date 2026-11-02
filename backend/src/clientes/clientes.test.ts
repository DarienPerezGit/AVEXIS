import { describe, expect, it } from 'vitest';
import { useTestDatabase } from '../test/database.js';
import { crearCliente, crearEstudio, crearExpediente } from '../test/factories.js';

useTestDatabase();

const personaFisica = { tipo: 'FISICA', nombre: 'Laura Diaz', dni: '30111222', email: 'laura@mail.com', telefono: '1155550000' };

describe('POST /api/clientes', () => {
  it('lets a lawyer register an individual client', async () => {
    const { abogado } = await crearEstudio();

    const res = await abogado.post('/api/clientes').send(personaFisica);

    expect(res.status).toBe(201);
    expect(res.body.cliente).toMatchObject({ tipo: 'FISICA', nombre: 'Laura Diaz', dni: '30111222' });
  });

  it('lets an assistant register a company client identified by CUIT', async () => {
    const { asistente } = await crearEstudio();

    const res = await asistente
      .post('/api/clientes')
      .send({ tipo: 'JURIDICA', nombre: 'Acme SA', cuit: '30-71234567-8', email: 'legales@acme.com', telefono: '1144440000' });

    expect(res.status).toBe(201);
    expect(res.body.cliente).toMatchObject({ tipo: 'JURIDICA', cuit: '30-71234567-8' });
  });

  it('responds 400 with one detail per invalid field', async () => {
    const { abogado } = await crearEstudio();

    const res = await abogado.post('/api/clientes').send({ tipo: 'FISICA', nombre: 'Laura Diaz', email: 'no-es-un-email', telefono: '1155550000' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.map((d: { path: string }) => d.path).sort()).toEqual(['dni', 'email']);
  });

  it('responds 409 when the DNI is already registered', async () => {
    const { abogado } = await crearEstudio();
    await abogado.post('/api/clientes').send(personaFisica);

    const res = await abogado.post('/api/clientes').send({ ...personaFisica, email: 'otra@mail.com' });

    expect(res.status).toBe(409);
  });
});

describe('POST /api/clientes duplicates', () => {
  it('responds 409 when the CUIT is already registered', async () => {
    const { abogado } = await crearEstudio();
    const empresa = { tipo: 'JURIDICA', nombre: 'Acme SA', cuit: '30-71234567-8', email: 'legales@acme.com', telefono: '1144440000' };
    await abogado.post('/api/clientes').send(empresa);

    const res = await abogado.post('/api/clientes').send({ ...empresa, nombre: 'Acme Sociedad Anonima' });

    expect(res.status).toBe(409);
  });
});

describe('GET /api/clientes', () => {
  it('lists every client to any role and searches by name, DNI or CUIT', async () => {
    const { abogado, asistente } = await crearEstudio();
    await abogado.post('/api/clientes').send(personaFisica);
    await abogado.post('/api/clientes').send({ ...personaFisica, nombre: 'Mario Ruiz', dni: '28999000', email: 'mario@mail.com' });

    const all = await asistente.get('/api/clientes');
    const byName = await asistente.get('/api/clientes').query({ q: 'laura' });
    const byDni = await asistente.get('/api/clientes').query({ q: '28999' });

    expect(all.status).toBe(200);
    expect(all.body.clientes).toHaveLength(2);
    expect(byName.body.clientes.map((c: { nombre: string }) => c.nombre)).toEqual(['Laura Diaz']);
    expect(byDni.body.clientes.map((c: { nombre: string }) => c.nombre)).toEqual(['Mario Ruiz']);
  });

  it('treats search text literally, not as a regular expression', async () => {
    const { abogado } = await crearEstudio();
    await abogado.post('/api/clientes').send(personaFisica);

    const res = await abogado.get('/api/clientes').query({ q: '.*(' });

    expect(res.status).toBe(200);
    expect(res.body.clientes).toEqual([]);
  });
});

describe('GET /api/clientes/:id', () => {
  it('returns the client, 404 for an unknown id and 400 for a malformed one', async () => {
    const { abogado } = await crearEstudio();
    const created = await abogado.post('/api/clientes').send(personaFisica);

    const found = await abogado.get(`/api/clientes/${created.body.cliente._id}`);
    const missing = await abogado.get('/api/clientes/650000000000000000000000');
    const malformed = await abogado.get('/api/clientes/no-es-un-id');

    expect(found.status).toBe(200);
    expect(found.body.cliente.nombre).toBe('Laura Diaz');
    expect(missing.status).toBe(404);
    expect(malformed.status).toBe(400);
  });
});

describe('PATCH /api/clientes/:id', () => {
  it('lets an assistant correct contact details but not the identity fields', async () => {
    const { asistente } = await crearEstudio();
    const cliente = await crearCliente();

    const res = await asistente.patch(`/api/clientes/${cliente.id}`).send({ telefono: '1166667777', dni: '99999999' });

    expect(res.status).toBe(200);
    expect(res.body.cliente).toMatchObject({ telefono: '1166667777', dni: cliente.dni });
  });

  it('responds 400 for an invalid email', async () => {
    const { abogado } = await crearEstudio();
    const cliente = await crearCliente();

    const res = await abogado.patch(`/api/clientes/${cliente.id}`).send({ email: 'mal' });

    expect(res.status).toBe(400);
    expect(res.body.error.details[0].path).toBe('email');
  });
});

describe('DELETE /api/clientes/:id', () => {
  it('lets the firm owner delete a client without cases', async () => {
    const { titular } = await crearEstudio();
    const cliente = await crearCliente();

    const res = await titular.delete(`/api/clientes/${cliente.id}`);
    const after = await titular.get(`/api/clientes/${cliente.id}`);

    expect(res.status).toBe(204);
    expect(after.status).toBe(404);
  });

  it('responds 409 when the client has cases', async () => {
    const { titular, usuarios } = await crearEstudio();
    const cliente = await crearCliente();
    await crearExpediente(usuarios.abogado._id, { clienteId: cliente._id });

    const res = await titular.delete(`/api/clientes/${cliente.id}`);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CLIENTE_HAS_EXPEDIENTES');
  });

  it('responds 403 to anyone but the firm owner', async () => {
    const { abogado, asistente } = await crearEstudio();
    const cliente = await crearCliente();

    expect((await abogado.delete(`/api/clientes/${cliente.id}`)).status).toBe(403);
    expect((await asistente.delete(`/api/clientes/${cliente.id}`)).status).toBe(403);
  });
});
