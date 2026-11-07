import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { errorDeApi, simularApi } from '../test/api';
import { renderApp } from '../test/render';
import { ABOGADO, ASISTENTE, TITULAR } from '../test/usuarios';

// A Wednesday, fixed so the calendar always opens on November 2026. Only `Date` is faked: timers stay real.
const HOY = new Date('2026-11-04T12:00:00-03:00');

const EXPEDIENTE = { _id: 'e1', numero: '123/2026', caratula: 'Perez, Juan c/ Acme SA s/ despido', abogadoResponsableId: ABOGADO._id };

function audiencia(cambios: Record<string, unknown> = {}) {
  return {
    _id: 'a1',
    expedienteId: EXPEDIENTE,
    abogadoId: { _id: ABOGADO._id, nombre: ABOGADO.nombre },
    // A day is stored as UTC midnight: in Argentina that instant is still the day before.
    fecha: '2026-11-10T00:00:00.000Z',
    hora: '09:30',
    tipo: 'AUDIENCIA',
    estado: 'PENDIENTE',
    esVencimientoFatal: false,
    ...cambios,
  };
}

function agendaCon(audiencias: unknown[], proximas: unknown[] = [], usuario = ABOGADO, otras = {}) {
  return simularApi({
    'GET /api/auth/me': [200, { usuario }],
    'GET /api/audiencias': [200, { audiencias }],
    'GET /api/audiencias/proximas': [200, { audiencias: proximas }],
    ...otras,
  });
}

const dia = (ymd: string) => within(screen.getByTitle(ymd));

/**
 * An open modal, by its title. Under test Ant Design gives every modal the same `aria-labelledby` id,
 * so with two modals open the role query names both after the first one.
 */
async function dialogo(titulo: string) {
  const encabezado = await screen.findByText(titulo, { selector: '.ant-modal-title' });
  return within(encabezado.closest<HTMLElement>('[role="dialog"]')!);
}

const hayDialogo = (titulo: string) => screen.queryByText(titulo, { selector: '.ant-modal-title' }) !== null;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(HOY);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('calendar', () => {
  it('shows a hearing on its own day, although in Argentina the stored instant is the day before', async () => {
    agendaCon([audiencia()]);

    renderApp();

    expect(await screen.findByText('09:30 Perez, Juan')).toBeInTheDocument();
    expect(dia('2026-11-10').getByText('09:30 Perez, Juan')).toBeInTheDocument();
    expect(dia('2026-11-09').queryByText('09:30 Perez, Juan')).not.toBeInTheDocument();
  });

  it('shows three hearings a day and counts the rest', async () => {
    const horas = ['08:00', '09:00', '10:00', '11:00', '12:00'];
    agendaCon(horas.map((hora, i) => audiencia({ _id: `a${i}`, hora })));

    renderApp();

    expect(await screen.findByText('+2 más')).toBeInTheDocument();
    expect(dia('2026-11-10').getAllByText(/Perez, Juan/)).toHaveLength(3);
    expect(screen.queryByText('11:00 Perez, Juan')).not.toBeInTheDocument();
  });

  it('shortens the carátula to the party before "c/" or "s/"', async () => {
    agendaCon([
      audiencia(),
      audiencia({ _id: 'a2', hora: '11:00', expedienteId: { ...EXPEDIENTE, caratula: 'Acosta, Sofia s/ sucesion' } }),
    ]);

    renderApp();

    expect(await screen.findByText('09:30 Perez, Juan')).toBeInTheDocument();
    expect(screen.getByText('11:00 Acosta, Sofia')).toBeInTheDocument();
  });

  it('moves between months and back to today', async () => {
    agendaCon([audiencia({ fecha: '2026-12-01T00:00:00.000Z' })]);
    renderApp();
    expect(await screen.findByRole('heading', { name: 'noviembre 2026' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Mes siguiente' }));
    expect(screen.getByRole('heading', { name: 'diciembre 2026' })).toBeInTheDocument();
    expect(dia('2026-12-01').getByText('09:30 Perez, Juan')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Hoy' }));
    expect(screen.getByRole('heading', { name: 'noviembre 2026' })).toBeInTheDocument();
  });

  it('opens a day with its hearings and a button to add one', async () => {
    agendaCon([audiencia()]);
    renderApp();
    await screen.findByText('09:30 Perez, Juan');

    await userEvent.click(screen.getByText('09:30 Perez, Juan'));

    const detalle = await dialogo('Martes 10 de noviembre');
    expect(detalle.getByRole('link', { name: EXPEDIENTE.caratula })).toHaveAttribute('href', '/expedientes/e1');
    expect(detalle.getByText('Expte. 123/2026 · 09:30 · Ana Diaz')).toBeInTheDocument();
    expect(detalle.getByText('Audiencia')).toBeInTheDocument();
    expect(detalle.getByText('Pendiente')).toBeInTheDocument();
    expect(detalle.getByRole('button', { name: 'Agregar audiencia' })).toBeInTheDocument();
  });

  it('says so when a day has no hearings', async () => {
    agendaCon([]);
    renderApp();
    await screen.findByRole('heading', { name: 'noviembre 2026' });

    await userEvent.click(screen.getByTitle('2026-11-12'));

    const detalle = await dialogo('Jueves 12 de noviembre');
    expect(detalle.getByText('No hay audiencias este día.')).toBeInTheDocument();
  });
});

describe('upcoming deadlines alert', () => {
  const proxima = (cambios: Record<string, unknown>) => ({ ...audiencia(), diasRestantes: 6, urgente: false, ...cambios });
  const aviso = () => screen.findByRole('alert');

  it('turns red when something is urgent or a fatal deadline, and says how many days are left', async () => {
    agendaCon([], [
      proxima({ _id: 'p1', diasRestantes: 0, urgente: true }),
      proxima({ _id: 'p2', diasRestantes: 1, urgente: true, hora: '11:00' }),
      proxima({ _id: 'p3', diasRestantes: 5, tipo: 'VENCIMIENTO', esVencimientoFatal: true, hora: '23:59' }),
    ]);

    renderApp();

    const alerta = await aviso();
    expect(alerta).toHaveClass('ant-alert-error');
    expect(within(alerta).getByText('Hoy · 09:30 · Perez, Juan c/ Acme SA s/ despido')).toBeInTheDocument();
    expect(within(alerta).getByText('Mañana · 11:00 · Perez, Juan c/ Acme SA s/ despido')).toBeInTheDocument();
    expect(within(alerta).getByText('En 5 días · 23:59 · Perez, Juan c/ Acme SA s/ despido · Vencimiento fatal')).toBeInTheDocument();
  });

  it('stays yellow when nothing is urgent', async () => {
    agendaCon([], [proxima({})]);

    renderApp();

    expect(await aviso()).toHaveClass('ant-alert-warning');
  });

  it('does not show up when nothing is coming', async () => {
    agendaCon([audiencia()], []);

    renderApp();
    await screen.findByText('09:30 Perez, Juan');

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('when the agenda cannot load', () => {
  it('explains it and retries', async () => {
    const simulada = agendaCon([], [], ABOGADO, { 'GET /api/audiencias/proximas': errorDeApi('INTERNAL_ERROR', 500) });
    renderApp();

    expect(await screen.findByText('No pudimos cargar la agenda.')).toBeInTheDocument();

    simulada.rutas['GET /api/audiencias/proximas'] = [200, { audiencias: [] }];
    simulada.rutas['GET /api/audiencias'] = [200, { audiencias: [audiencia()] }];
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByText('09:30 Perez, Juan')).toBeInTheDocument();
  });
});

describe('list view', () => {
  const GOMEZ = audiencia({
    _id: 'a2',
    expedienteId: { _id: 'e2', numero: '456/2026', caratula: 'Gomez, Maria c/ Banco SA s/ danos', abogadoResponsableId: '9' },
    abogadoId: { _id: '9', nombre: 'Bruno Sosa' },
    fecha: '2026-11-02T00:00:00.000Z',
    tipo: 'PERICIA',
    estado: 'REALIZADA',
  });
  const LOPEZ = audiencia({
    _id: 'a3',
    expedienteId: { ...EXPEDIENTE, _id: 'e3', numero: '789/2026', caratula: 'Lopez, Ana c/ Fisco s/ cobro' },
    fecha: '2026-11-20T00:00:00.000Z',
    tipo: 'VENCIMIENTO',
    estado: 'CANCELADA',
  });

  async function abrirLista() {
    agendaCon([GOMEZ, audiencia(), LOPEZ]);
    renderApp();
    await screen.findByText('09:30 Perez, Juan');
    await userEvent.click(screen.getByText('Lista'));
    return screen.getByRole('table');
  }

  // Data rows: the header row has no cells, and Ant Design adds a hidden row to measure columns.
  const filas = () =>
    within(screen.getByRole('table'))
      .getAllByRole('row')
      .filter((fila) => fila.getAttribute('aria-hidden') !== 'true' && within(fila).queryAllByRole('cell').length > 0);

  async function elegir(filtro: string, opcion: string) {
    await userEvent.click(screen.getByRole('combobox', { name: filtro }));
    await userEvent.click(await screen.findByTitle(opcion));
  }

  it('starts on the calendar and lists every hearing with its data on the list', async () => {
    agendaCon([GOMEZ, audiencia(), LOPEZ]);
    renderApp();
    await screen.findByText('09:30 Perez, Juan');
    expect(screen.queryByRole('columnheader', { name: 'Carátula' })).not.toBeInTheDocument();

    await userEvent.click(screen.getByText('Lista'));
    const tabla = within(screen.getByRole('table'));

    expect(filas()).toHaveLength(3);
    const perez = within(filas()[1]);
    expect(perez.getByText('10/11/2026')).toBeInTheDocument();
    expect(perez.getByText('09:30')).toBeInTheDocument();
    expect(perez.getByText('123/2026')).toBeInTheDocument();
    expect(perez.getByText(EXPEDIENTE.caratula)).toBeInTheDocument();
    expect(perez.getByText('Ana Diaz')).toBeInTheDocument();
    expect(tabla.getByText('Bruno Sosa')).toBeInTheDocument();
  });

  it('filters by state, type and lawyer', async () => {
    await abrirLista();

    await elegir('Estado', 'Realizada');
    expect(filas()).toHaveLength(1);
    expect(within(filas()[0]).getByText('Bruno Sosa')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Quitar filtros' }));
    await elegir('Tipo', 'Vencimiento');
    expect(filas()).toHaveLength(1);
    expect(within(filas()[0]).getByText('789/2026')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Quitar filtros' }));
    await elegir('Abogado', 'Ana Diaz');
    expect(filas()).toHaveLength(2);
  });

  it('searches by carátula or case number', async () => {
    await abrirLista();
    const buscar = screen.getByPlaceholderText('Buscar por carátula o expediente');

    await userEvent.type(buscar, 'gomez');
    expect(filas()).toHaveLength(1);
    expect(within(filas()[0]).getByText('456/2026')).toBeInTheDocument();

    await userEvent.clear(buscar);
    await userEvent.type(buscar, '789');
    expect(filas()).toHaveLength(1);
    expect(within(filas()[0]).getByText('Lopez, Ana c/ Fisco s/ cobro')).toBeInTheDocument();
  });
});

describe('link to the case', () => {
  // A lawyer attending a hearing on a colleague's case: they see what it is about, but cannot open the case.
  const AJENA = audiencia({
    _id: 'a9',
    expedienteId: { _id: 'e9', numero: '999/2026', caratula: 'Ruiz, Pablo c/ Otro s/ cobro', abogadoResponsableId: '9' },
  });

  async function listaComo(usuario: typeof ABOGADO) {
    agendaCon([audiencia(), AJENA], [], usuario);
    renderApp();
    await screen.findByText('09:30 Perez, Juan');
    await userEvent.click(screen.getByText('Lista'));
  }

  it('links a lawyer only to the cases they are responsible for', async () => {
    await listaComo(ABOGADO);

    expect(screen.getByRole('link', { name: EXPEDIENTE.caratula })).toHaveAttribute('href', '/expedientes/e1');
    expect(screen.getByText('Ruiz, Pablo c/ Otro s/ cobro')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Ruiz, Pablo c/ Otro s/ cobro' })).not.toBeInTheDocument();
  });

  it.each([
    ['assistant', ASISTENTE],
    ['firm owner', TITULAR],
  ])('links the %s to every case', async (_perfil, usuario) => {
    await listaComo(usuario);

    expect(screen.getByRole('link', { name: 'Ruiz, Pablo c/ Otro s/ cobro' })).toHaveAttribute('href', '/expedientes/e9');
  });
});

describe('closing a hearing', () => {
  async function abrirDiaDiez(audiencias = [audiencia()]) {
    const simulada = agendaCon(audiencias, [], ABOGADO, { 'PATCH /api/audiencias/a1': [200, { audiencia: {} }] });
    renderApp();
    await userEvent.click(await screen.findByText(/^09:30 /));
    const detalle = await dialogo('Martes 10 de noviembre');
    return { simulada, detalle };
  }

  const patches = (simulada: ReturnType<typeof agendaCon>) => simulada.llamadas.filter((l) => l.ruta.startsWith('PATCH'));

  it('marks a pending hearing as held and shows the new state', async () => {
    const { simulada, detalle } = await abrirDiaDiez();
    simulada.rutas['GET /api/audiencias'] = [200, { audiencias: [audiencia({ estado: 'REALIZADA' })] }];

    await userEvent.click(detalle.getByRole('button', { name: 'Marcar realizada' }));

    expect(await detalle.findByText('Realizada')).toBeInTheDocument();
    expect(patches(simulada)).toEqual([expect.objectContaining({ ruta: 'PATCH /api/audiencias/a1', body: { estado: 'REALIZADA' } })]);
  });

  it('cancels only after confirming', async () => {
    const { simulada, detalle } = await abrirDiaDiez();
    simulada.rutas['GET /api/audiencias'] = [200, { audiencias: [audiencia({ estado: 'CANCELADA' })] }];

    await userEvent.click(detalle.getByRole('button', { name: 'Cancelar audiencia' }));
    expect(patches(simulada)).toHaveLength(0);
    await userEvent.click(await screen.findByRole('button', { name: 'Sí, cancelar' }));

    expect(await detalle.findByText('Cancelada')).toBeInTheDocument();
    expect(patches(simulada)[0]?.body).toEqual({ estado: 'CANCELADA' });
  });

  it('offers nothing to close on a hearing that is no longer pending', async () => {
    const { detalle } = await abrirDiaDiez([audiencia({ estado: 'REALIZADA' })]);

    expect(detalle.queryByRole('button', { name: 'Marcar realizada' })).not.toBeInTheDocument();
    expect(detalle.queryByRole('button', { name: 'Cancelar audiencia' })).not.toBeInTheDocument();
  });

  it('can also close it from the list', async () => {
    const simulada = agendaCon([audiencia()], [], ABOGADO, { 'PATCH /api/audiencias/a1': [200, { audiencia: {} }] });
    renderApp();
    await screen.findByText('09:30 Perez, Juan');
    await userEvent.click(screen.getByText('Lista'));

    await userEvent.click(within(screen.getByRole('table')).getByRole('button', { name: 'Marcar realizada' }));

    await waitFor(() => expect(patches(simulada)).toHaveLength(1));
  });

  it('explains a failure and keeps the hearing as it was', async () => {
    const { simulada, detalle } = await abrirDiaDiez();
    simulada.rutas['PATCH /api/audiencias/a1'] = errorDeApi('FORBIDDEN', 403);

    await userEvent.click(detalle.getByRole('button', { name: 'Marcar realizada' }));

    expect(await screen.findByText('No tenés permiso para hacer esto.')).toBeInTheDocument();
    expect(detalle.getByText('Pendiente')).toBeInTheDocument();
  });
});

describe('adding a hearing', () => {
  const EXPEDIENTES = { data: [EXPEDIENTE], page: 1, limit: 100, total: 1 };
  const OPCION_EXPEDIENTE = '123/2026 · Perez, Juan c/ Acme SA s/ despido';

  function agendaParaAgregar(usuario = ABOGADO, otras = {}) {
    return agendaCon([], [], usuario, {
      'GET /api/expedientes?limit=100': [200, EXPEDIENTES],
      'GET /api/usuarios/abogados': [200, { abogados: [{ _id: ABOGADO._id, nombre: ABOGADO.nombre }] }],
      'POST /api/audiencias': [201, { audiencia: {} }],
      ...otras,
    });
  }

  async function abrirFormularioDelDia(ymd: string) {
    renderApp();
    await screen.findByRole('heading', { name: 'noviembre 2026' });
    await userEvent.click(screen.getByTitle(ymd));
    await userEvent.click(await screen.findByRole('button', { name: 'Agregar audiencia' }));
    return await dialogo('Nueva audiencia');
  }

  async function elegir(formulario: ReturnType<typeof within>, campo: string, opcion: string) {
    await userEvent.click(formulario.getByRole('combobox', { name: campo }));
    await userEvent.click(await screen.findByTitle(opcion));
  }

  const posts = (simulada: ReturnType<typeof agendaCon>) => simulada.llamadas.filter((l) => l.ruta === 'POST /api/audiencias');

  it('saves a fatal deadline on the chosen day, for the lawyer who loads it, and refreshes the agenda', async () => {
    const simulada = agendaParaAgregar();
    const formulario = await abrirFormularioDelDia('2026-11-10');
    expect(formulario.getByLabelText('Fecha')).toHaveValue('2026-11-10');
    expect(formulario.queryByRole('combobox', { name: 'Abogado' })).not.toBeInTheDocument();

    await elegir(formulario, 'Expediente', OPCION_EXPEDIENTE);
    await userEvent.type(formulario.getByLabelText('Hora'), '10:00');
    // A button-style radio hides its input, so the user clicks the visible label.
    await userEvent.click(formulario.getByText('Vencimiento'));
    await userEvent.click(formulario.getByRole('checkbox', { name: 'Vencimiento fatal' }));
    simulada.rutas['GET /api/audiencias'] = [200, { audiencias: [audiencia({ hora: '10:00' })] }];
    await userEvent.click(formulario.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText('Audiencia agregada.')).toBeInTheDocument();
    expect(posts(simulada)[0]?.body).toEqual({ expedienteId: 'e1', fecha: '2026-11-10', hora: '10:00', tipo: 'VENCIMIENTO', esVencimientoFatal: true });
    expect(await screen.findByText('10:00 Perez, Juan')).toBeInTheDocument();
    await waitFor(() => expect(hayDialogo('Nueva audiencia')).toBe(false));
  });

  it('offers the firm owner the lawyer field too', async () => {
    agendaParaAgregar(TITULAR);

    const formulario = await abrirFormularioDelDia('2026-11-10');

    expect(formulario.getByRole('combobox', { name: 'Abogado' })).toBeInTheDocument();
  });

  it('lets the assistant pick the lawyer who attends', async () => {
    const simulada = agendaParaAgregar(ASISTENTE);
    const formulario = await abrirFormularioDelDia('2026-11-10');

    await elegir(formulario, 'Expediente', OPCION_EXPEDIENTE);
    await elegir(formulario, 'Abogado', ABOGADO.nombre);
    await userEvent.type(formulario.getByLabelText('Hora'), '10:00');
    await userEvent.click(formulario.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(posts(simulada)).toHaveLength(1));
    expect(posts(simulada)[0]?.body).toEqual({ expedienteId: 'e1', abogadoId: ABOGADO._id, fecha: '2026-11-10', hora: '10:00', tipo: 'AUDIENCIA', esVencimientoFatal: false });
  });

  it('marks the fields the API rejects and stays open', async () => {
    const rechazo = [400, { error: { code: 'VALIDATION_ERROR', message: 'English text', details: [{ path: 'hora', message: 'Expected HH:mm' }] } }];
    agendaParaAgregar(ABOGADO, { 'POST /api/audiencias': rechazo });
    const formulario = await abrirFormularioDelDia('2026-11-10');

    await elegir(formulario, 'Expediente', OPCION_EXPEDIENTE);
    await userEvent.type(formulario.getByLabelText('Hora'), '10:00');
    await userEvent.click(formulario.getByRole('button', { name: 'Guardar' }));

    expect(await formulario.findByText('Revisá este campo.')).toBeInTheDocument();
    expect(hayDialogo('Nueva audiencia')).toBe(true);
  });

  it('opens from the top of the agenda with today as the date', async () => {
    agendaParaAgregar();
    renderApp();

    await userEvent.click(await screen.findByRole('button', { name: 'Nueva audiencia' }));

    const formulario = await dialogo('Nueva audiencia');
    expect(formulario.getByLabelText('Fecha')).toHaveValue('2026-11-04');
  });
});
