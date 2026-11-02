import { describe, expect, it } from 'vitest';
import { useTestDatabase } from '../test/database.js';
import { crearAudiencia, crearEstudio, crearExpediente, createTestApp } from '../test/factories.js';

useTestDatabase();

// 22:00 in Buenos Aires is already the next day in UTC, so every test also guards against counting days in UTC.
const AHORA = new Date('2026-12-10T22:00:00-03:00');

async function estudioConReloj() {
  const estudio = await crearEstudio(createTestApp({}, { clock: () => AHORA }));
  const expediente = await crearExpediente(estudio.usuarios.abogado._id);
  /** A hearing on Ana's case that Ana attends. */
  const agendar = (fecha: string, input: Parameters<typeof crearAudiencia>[3] = {}) =>
    crearAudiencia(expediente._id, estudio.usuarios.abogado._id, fecha, input);
  return { ...estudio, expediente, agendar };
}

interface Proxima {
  fecha: string;
  hora: string;
  diasRestantes: number;
  urgente: boolean;
  esVencimientoFatal: boolean;
}

describe('GET /api/audiencias/proximas', () => {
  it('tells how many days are left and flags as urgent what is due within two days', async () => {
    const { abogado, agendar } = await estudioConReloj();
    await agendar('2026-12-12');
    await agendar('2026-12-13');

    const res = await abogado.get('/api/audiencias/proximas');

    expect(res.status).toBe(200);
    expect(res.body.audiencias.map((a: Proxima) => [a.fecha.slice(0, 10), a.diasRestantes, a.urgente])).toEqual([
      ['2026-12-12', 2, true],
      ['2026-12-13', 3, false],
    ]);
  });

  it('puts fatal deadlines first within the same day, then orders by time', async () => {
    const { abogado, agendar } = await estudioConReloj();
    await agendar('2026-12-11', { hora: '08:00' });
    await agendar('2026-12-11', { hora: '12:00', tipo: 'VENCIMIENTO', esVencimientoFatal: true });
    await agendar('2026-12-11', { hora: '10:00' });
    await agendar('2026-12-12', { hora: '07:00', tipo: 'VENCIMIENTO', esVencimientoFatal: true });

    const res = await abogado.get('/api/audiencias/proximas');

    expect(res.body.audiencias.map((a: Proxima) => [a.fecha.slice(0, 10), a.hora, a.esVencimientoFatal])).toEqual([
      ['2026-12-11', '12:00', true],
      ['2026-12-11', '08:00', false],
      ['2026-12-11', '10:00', false],
      ['2026-12-12', '07:00', true],
    ]);
  });

  it('includes today (at the firm, not in UTC) through the last day of the window, and only pending ones', async () => {
    const { abogado, agendar } = await estudioConReloj();
    await agendar('2026-12-09');
    await agendar('2026-12-10');
    await agendar('2026-12-17');
    await agendar('2026-12-18');
    await agendar('2026-12-14', { estado: 'REALIZADA' });
    await agendar('2026-12-15', { estado: 'CANCELADA' });

    const res = await abogado.get('/api/audiencias/proximas');

    expect(res.body.audiencias.map((a: Proxima) => [a.fecha.slice(0, 10), a.diasRestantes])).toEqual([
      ['2026-12-10', 0],
      ['2026-12-17', 7],
    ]);
  });

  it('shows a lawyer only their agenda and the assistant the whole firm', async () => {
    const { abogado, otroAbogado, asistente, agendar, usuarios } = await estudioConReloj();
    const foreign = await crearExpediente(usuarios.otroAbogado._id);
    await agendar('2026-12-11');
    await crearAudiencia(foreign._id, usuarios.otroAbogado._id, '2026-12-12');

    const fechas = async (agent: typeof abogado) =>
      (await agent.get('/api/audiencias/proximas')).body.audiencias.map((a: Proxima) => a.fecha.slice(0, 10));

    expect(await fechas(abogado)).toEqual(['2026-12-11']);
    expect(await fechas(otroAbogado)).toEqual(['2026-12-12']);
    expect(await fechas(asistente)).toEqual(['2026-12-11', '2026-12-12']);
  });

  it('widens the window with dias up to 30 and rejects values out of range', async () => {
    const { abogado, agendar } = await estudioConReloj();
    await agendar('2026-12-30');

    const wide = await abogado.get('/api/audiencias/proximas').query({ dias: 30 });
    const tooWide = await abogado.get('/api/audiencias/proximas').query({ dias: 31 });
    const zero = await abogado.get('/api/audiencias/proximas').query({ dias: 0 });

    expect(wide.body.audiencias.map((a: Proxima) => a.diasRestantes)).toEqual([20]);
    expect(tooWide.status).toBe(400);
    expect(tooWide.body.error.details[0].path).toBe('dias');
    expect(zero.status).toBe(400);
  });
});
