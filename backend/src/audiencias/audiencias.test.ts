import { describe, expect, it } from 'vitest';
import { useTestDatabase } from '../test/database.js';
import { crearAudiencia, crearEstudio, crearExpediente, crearUsuario } from '../test/factories.js';

useTestDatabase();

const audiencia = (expedienteId: string, input: Record<string, unknown> = {}) => ({
  expedienteId,
  fecha: '2026-12-10',
  hora: '09:30',
  tipo: 'AUDIENCIA',
  ...input,
});

describe('POST /api/audiencias', () => {
  it('lets an assistant schedule a hearing on any case for the lawyer who attends', async () => {
    const { asistente, usuarios } = await crearEstudio();
    const expediente = await crearExpediente(usuarios.abogado._id);

    const res = await asistente.post('/api/audiencias').send(audiencia(expediente.id, { abogadoId: usuarios.otroAbogado.id }));

    expect(res.status).toBe(201);
    expect(res.body.audiencia).toMatchObject({ expedienteId: expediente.id, abogadoId: usuarios.otroAbogado.id, estado: 'PENDIENTE' });
  });

  it('pins a hearing scheduled by a lawyer to that lawyer, on own cases only', async () => {
    const { abogado, usuarios } = await crearEstudio();
    const own = await crearExpediente(usuarios.abogado._id);
    const foreign = await crearExpediente(usuarios.otroAbogado._id);

    const created = await abogado.post('/api/audiencias').send(audiencia(own.id, { abogadoId: usuarios.otroAbogado.id }));
    const onForeign = await abogado.post('/api/audiencias').send(audiencia(foreign.id));

    expect(created.status).toBe(201);
    expect(created.body.audiencia.abogadoId).toBe(usuarios.abogado.id);
    expect(onForeign.status).toBe(403);
  });

  it('marks a deadline as fatal', async () => {
    const { titular, usuarios } = await crearEstudio();
    const expediente = await crearExpediente(usuarios.abogado._id);

    const res = await titular
      .post('/api/audiencias')
      .send(audiencia(expediente.id, { tipo: 'VENCIMIENTO', esVencimientoFatal: true, abogadoId: usuarios.abogado.id }));

    expect(res.status).toBe(201);
    expect(res.body.audiencia).toMatchObject({ tipo: 'VENCIMIENTO', esVencimientoFatal: true });
  });

  it('responds 400 unless the attendee is an active lawyer and the case exists', async () => {
    const { asistente, usuarios } = await crearEstudio();
    const expediente = await crearExpediente(usuarios.abogado._id);
    const inactive = await crearUsuario({ activo: false });

    const toAssistant = await asistente.post('/api/audiencias').send(audiencia(expediente.id, { abogadoId: usuarios.asistente.id }));
    const toInactive = await asistente.post('/api/audiencias').send(audiencia(expediente.id, { abogadoId: inactive.id }));
    const unknownCase = await asistente
      .post('/api/audiencias')
      .send(audiencia('650000000000000000000000', { abogadoId: usuarios.abogado.id }));
    const badHour = await asistente.post('/api/audiencias').send(audiencia(expediente.id, { abogadoId: usuarios.abogado.id, hora: '25:00' }));

    expect(toAssistant.status).toBe(400);
    expect(toAssistant.body.error.details[0].path).toBe('abogadoId');
    expect(toInactive.status).toBe(400);
    expect(unknownCase.status).toBe(400);
    expect(unknownCase.body.error.details[0].path).toBe('expedienteId');
    expect(badHour.status).toBe(400);
    expect(badHour.body.error.details[0].path).toBe('hora');
  });
});

describe('fecha of a hearing', () => {
  it('accepts only a calendar day, since the local time goes in hora', async () => {
    const { titular, usuarios } = await crearEstudio();
    const expediente = await crearExpediente(usuarios.abogado._id);
    const created = await titular.post('/api/audiencias').send(audiencia(expediente.id, { abogadoId: usuarios.abogado.id }));

    const postWithTime = await titular
      .post('/api/audiencias')
      .send(audiencia(expediente.id, { abogadoId: usuarios.abogado.id, fecha: '2026-12-10T10:00:00-03:00' }));
    const patchWithTime = await titular.patch(`/api/audiencias/${created.body.audiencia._id}`).send({ fecha: '2026-12-15T09:00:00Z' });

    expect(created.body.audiencia.fecha).toBe('2026-12-10T00:00:00.000Z');
    expect(postWithTime.status).toBe(400);
    expect(postWithTime.body.error.details[0].path).toBe('fecha');
    expect(patchWithTime.status).toBe(400);
  });
});

describe('GET /api/audiencias', () => {
  it('shows a lawyer only their own agenda, and the owner and the assistant the whole firm agenda in date order', async () => {
    const { titular, abogado, asistente, usuarios } = await crearEstudio();
    const expediente = await crearExpediente(usuarios.abogado._id);
    const foreign = await crearExpediente(usuarios.otroAbogado._id);
    await titular.post('/api/audiencias').send(audiencia(foreign.id, { abogadoId: usuarios.otroAbogado.id, fecha: '2026-12-01' }));
    await titular.post('/api/audiencias').send(audiencia(expediente.id, { abogadoId: usuarios.abogado.id, fecha: '2026-12-20' }));
    await titular.post('/api/audiencias').send(audiencia(expediente.id, { abogadoId: usuarios.abogado.id, fecha: '2026-12-05' }));

    const fechas = async (agent: typeof titular) =>
      (await agent.get('/api/audiencias')).body.audiencias.map((a: { fecha: string }) => a.fecha.slice(0, 10));

    expect(await fechas(abogado)).toEqual(['2026-12-05', '2026-12-20']);
    expect(await fechas(titular)).toEqual(['2026-12-01', '2026-12-05', '2026-12-20']);
    expect(await fechas(asistente)).toEqual(['2026-12-01', '2026-12-05', '2026-12-20']);
  });
});

describe('GET /api/audiencias for the responsible lawyer', () => {
  it('also shows hearings on own cases that a colleague attends, and never hearings on cases of another lawyer', async () => {
    const { titular, abogado, otroAbogado, usuarios } = await crearEstudio();
    const own = await crearExpediente(usuarios.abogado._id);
    const foreign = await crearExpediente(usuarios.otroAbogado._id);
    await titular.post('/api/audiencias').send(audiencia(own.id, { abogadoId: usuarios.otroAbogado.id, fecha: '2026-12-02' }));
    await titular.post('/api/audiencias').send(audiencia(foreign.id, { abogadoId: usuarios.otroAbogado.id, fecha: '2026-12-03' }));

    const fechas = async (agent: typeof titular) =>
      (await agent.get('/api/audiencias')).body.audiencias.map((a: { fecha: string }) => a.fecha.slice(0, 10));

    expect(await fechas(abogado)).toEqual(['2026-12-02']);
    expect(await fechas(otroAbogado)).toEqual(['2026-12-02', '2026-12-03']);
  });
});

describe('GET /api/audiencias names', () => {
  it('bring the case and the attendee, with the responsible lawyer id so the agenda knows whether to link the case', async () => {
    const { abogado, usuarios } = await crearEstudio();
    const foreign = await crearExpediente(usuarios.otroAbogado._id, { numero: '77/2026', caratula: 'Soto c/ Vera' });
    await crearAudiencia(foreign._id, usuarios.abogado._id, '2026-12-02');

    const res = await abogado.get('/api/audiencias');

    expect(res.body.audiencias[0].expedienteId).toEqual({
      _id: foreign.id,
      numero: '77/2026',
      caratula: 'Soto c/ Vera',
      abogadoResponsableId: usuarios.otroAbogado.id,
    });
    expect(res.body.audiencias[0].abogadoId).toEqual({ _id: usuarios.abogado.id, nombre: usuarios.abogado.nombre });
  });
});

describe('PATCH /api/audiencias/:id', () => {
  async function agendada() {
    const estudio = await crearEstudio();
    const expediente = await crearExpediente(estudio.usuarios.abogado._id);
    const res = await estudio.abogado.post('/api/audiencias').send(audiencia(expediente.id));
    return { ...estudio, url: `/api/audiencias/${res.body.audiencia._id}` };
  }

  it('lets the lawyer reschedule and then mark the hearing as held', async () => {
    const { abogado, url } = await agendada();

    const rescheduled = await abogado.patch(url).send({ fecha: '2026-12-15', hora: '11:00' });
    const held = await abogado.patch(url).send({ estado: 'REALIZADA' });

    expect(rescheduled.status).toBe(200);
    expect(rescheduled.body.audiencia).toMatchObject({ hora: '11:00' });
    expect(rescheduled.body.audiencia.fecha.slice(0, 10)).toBe('2026-12-15');
    expect(held.body.audiencia.estado).toBe('REALIZADA');
  });

  it('cancels instead of deleting, so the record stays in the agenda', async () => {
    const { asistente, abogado, url } = await agendada();

    const cancelled = await asistente.patch(url).send({ estado: 'CANCELADA' });
    const deleted = await asistente.delete(url);

    expect(cancelled.body.audiencia.estado).toBe('CANCELADA');
    expect(deleted.status).toBe(404);
    expect((await abogado.get('/api/audiencias')).body.audiencias).toHaveLength(1);
  });

  it('lets the assistant reassign the attendee but ignores a lawyer trying to', async () => {
    const { asistente, abogado, usuarios, url } = await agendada();

    const byLawyer = await abogado.patch(url).send({ abogadoId: usuarios.otroAbogado.id });
    const byAssistant = await asistente.patch(url).send({ abogadoId: usuarios.otroAbogado.id });

    expect(byLawyer.body.audiencia.abogadoId).toBe(usuarios.abogado.id);
    expect(byAssistant.body.audiencia.abogadoId).toBe(usuarios.otroAbogado.id);
  });

  it('responds 403 to another lawyer and 404 for an unknown hearing', async () => {
    const { otroAbogado, titular, url } = await agendada();

    expect((await otroAbogado.patch(url).send({ estado: 'REALIZADA' })).status).toBe(403);
    expect((await titular.patch('/api/audiencias/650000000000000000000000').send({ estado: 'REALIZADA' })).status).toBe(404);
  });
});
