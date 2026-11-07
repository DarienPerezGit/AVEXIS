import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { errorDeApi, simularApi } from '../test/api';
import { renderApp } from '../test/render';
import { ABOGADO, ASISTENTE, TITULAR } from '../test/usuarios';

const EXPEDIENTE = {
  _id: 'e1',
  numero: '123/2026',
  caratula: 'Perez, Juan c/ Acme SA s/ despido',
  fuero: 'LABORAL',
  estado: 'EN_TRAMITE',
  clienteId: { _id: 'c1', nombre: 'Perez, Juan' },
  abogadoResponsableId: { _id: ABOGADO._id, nombre: ABOGADO.nombre },
  fechaInicio: '2026-03-03T01:30:00.000Z',
  observaciones: 'Despido sin causa',
};

type Respuesta = [number, unknown?];

function detalleCon(usuario = ABOGADO, otras: Record<string, Respuesta> = {}, expediente: Record<string, unknown> = EXPEDIENTE) {
  return simularApi({
    'GET /api/auth/me': [200, { usuario }],
    'GET /api/expedientes/e1': [200, { expediente }],
    'GET /api/expedientes/e1/movimientos': [200, { movimientos: [] }],
    'GET /api/expedientes/e1/honorario': [404, { error: { code: 'NOT_FOUND', message: 'This case has no fee yet' } }],
    ...otras,
  });
}

const datos = () => within(screen.getByText('Fuero').closest<HTMLElement>('.ant-descriptions')!);

/** An open modal, by its title (see `dialogo` in Agenda.test.tsx for why not by role). */
async function dialogo(titulo: string) {
  const encabezado = await screen.findByText(titulo, { selector: '.ant-modal-title' });
  return within(encabezado.closest<HTMLElement>('[role="dialog"]')!);
}

function movimiento(cambios: Record<string, unknown> = {}) {
  return {
    _id: 'm1',
    tipo: 'ESCRITO',
    descripcion: 'Se presenta demanda',
    fecha: '2026-03-05T14:00:00.000Z',
    usuarioId: { _id: ASISTENTE._id, nombre: ASISTENTE.nombre },
    ...cambios,
  };
}

const MOVIMIENTOS = [
  movimiento({ _id: 'm2', tipo: 'NOTIFICACION', descripcion: 'Se notifica el traslado', fecha: '2026-04-10T14:00:00.000Z' }),
  movimiento(),
];

describe('movimientos', () => {
  it('shows the history newest first, with who loaded each entry, and nothing to edit or delete', async () => {
    detalleCon(ABOGADO, { 'GET /api/expedientes/e1/movimientos': [200, { movimientos: MOVIMIENTOS }] });

    renderApp('/expedientes/e1');

    const entradas = await screen.findAllByText(/^Se (notifica|presenta)/);
    expect(entradas.map((e) => e.textContent)).toEqual(['Se notifica el traslado', 'Se presenta demanda']);
    expect(screen.getByText('10/04/2026 · Notificación · Carla Ruiz')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /eliminar|borrar/i })).not.toBeInTheDocument();
  });

  it('lets anyone who sees the case add an entry, signed by the session', async () => {
    const api = detalleCon(ASISTENTE, { 'POST /api/expedientes/e1/movimientos': [201, { movimiento: { _id: 'm3' } }] });
    renderApp('/expedientes/e1');
    expect(await screen.findByText('Todavía no hay movimientos.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Agregar movimiento' }));
    const formulario = await dialogo('Nuevo movimiento');
    await userEvent.click(formulario.getByRole('combobox', { name: 'Tipo' }));
    await userEvent.click(await screen.findByTitle('Escrito'));
    await userEvent.type(formulario.getByLabelText('Descripción'), 'Se contesta traslado');
    api.rutas['GET /api/expedientes/e1/movimientos'] = [200, { movimientos: [movimiento({ _id: 'm3', descripcion: 'Se contesta traslado' })] }];
    await userEvent.click(formulario.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText('Se contesta traslado')).toBeInTheDocument();
    expect(api.llamadas.find((llamada) => llamada.ruta === 'POST /api/expedientes/e1/movimientos')?.body).toEqual({
      tipo: 'ESCRITO',
      descripcion: 'Se contesta traslado',
    });
  });
});

describe('audiencias', () => {
  const caso = (id: string, numero: string) => ({ _id: id, numero, caratula: `Caso ${numero}`, abogadoResponsableId: ABOGADO._id });

  function audiencia(id: string, expediente: ReturnType<typeof caso>, hora: string) {
    return {
      _id: id,
      expedienteId: expediente,
      abogadoId: { _id: ABOGADO._id, nombre: ABOGADO.nombre },
      fecha: '2026-11-10T00:00:00.000Z',
      hora,
      tipo: 'AUDIENCIA',
      estado: 'PENDIENTE',
      esVencimientoFatal: false,
    };
  }

  async function abrirPestana() {
    renderApp('/expedientes/e1');
    await userEvent.click(await screen.findByRole('tab', { name: 'Audiencias' }));
  }

  it("lists only this case's hearings out of the whole agenda", async () => {
    detalleCon(ABOGADO, {
      'GET /api/audiencias': [200, { audiencias: [audiencia('a1', caso('e1', '123/2026'), '09:30'), audiencia('a2', caso('e9', '999/2026'), '11:00')] }],
    });

    await abrirPestana();

    expect(await screen.findByText('09:30')).toBeInTheDocument();
    expect(screen.getByText('10/11/2026')).toBeInTheDocument();
    expect(screen.queryByText('11:00')).not.toBeInTheDocument();
  });

  it('opens the new-hearing form with this case already picked', async () => {
    detalleCon(ABOGADO, {
      'GET /api/expedientes?limit=100': [200, { data: [EXPEDIENTE] }],
    });
    await abrirPestana();

    await userEvent.click(await screen.findByRole('button', { name: 'Agregar audiencia' }));

    const formulario = await dialogo('Nueva audiencia');
    expect(await formulario.findByTitle('123/2026 · Perez, Juan c/ Acme SA s/ despido')).toBeInTheDocument();
  });
});

describe('honorarios', () => {
  const HONORARIO = {
    _id: 'h1',
    montoPactado: 500000,
    montoPagado: 200000,
    saldo: 300000,
    estado: 'PARCIAL',
    pagos: [{ _id: 'p1', monto: 200000, fecha: '2026-05-04T15:00:00.000Z', usuarioId: { _id: ABOGADO._id, nombre: ABOGADO.nombre } }],
  };

  async function abrirPestana() {
    renderApp('/expedientes/e1');
    await userEvent.click(await screen.findByRole('tab', { name: 'Honorarios' }));
  }

  it('shows the agreed fee, what was paid, the balance and each payment', async () => {
    detalleCon(ABOGADO, { 'GET /api/expedientes/e1/honorario': [200, { honorario: HONORARIO }] });

    await abrirPestana();

    expect(await screen.findByText('$ 500.000,00')).toBeInTheDocument();
    expect(screen.getAllByText('$ 200.000,00')).toHaveLength(2);
    expect(screen.getByText('$ 300.000,00')).toBeInTheDocument();
    expect(screen.getByText('Parcial')).toBeInTheDocument();
    expect(screen.getByText('04/05/2026')).toBeInTheDocument();
  });

  it('offers to agree a fee when the case has none yet, instead of showing an error', async () => {
    const api = detalleCon(TITULAR, { 'POST /api/expedientes/e1/honorario': [201, { honorario: { ...HONORARIO, montoPagado: 0, saldo: 500000, estado: 'PENDIENTE', pagos: [] } }] });
    await abrirPestana();
    expect(await screen.findByText('Todavía no se pactaron honorarios.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Registrar honorario' }));
    const formulario = await dialogo('Registrar honorario');
    await userEvent.type(formulario.getByLabelText('Monto pactado'), '500000');
    api.rutas['GET /api/expedientes/e1/honorario'] = [200, { honorario: { ...HONORARIO, montoPagado: 0, saldo: 500000, estado: 'PENDIENTE', pagos: [] } }];
    await userEvent.click(formulario.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findAllByText('$ 500.000,00')).toHaveLength(2);
    expect(api.llamadas.find((llamada) => llamada.ruta === 'POST /api/expedientes/e1/honorario')?.body).toEqual({ montoPactado: 500000 });
  });

  it('records a payment', async () => {
    const api = detalleCon(ABOGADO, {
      'GET /api/expedientes/e1/honorario': [200, { honorario: HONORARIO }],
      'POST /api/expedientes/e1/honorario/pagos': [201, { honorario: { ...HONORARIO } }],
    });
    await abrirPestana();

    await userEvent.click(await screen.findByRole('button', { name: 'Registrar pago' }));
    const formulario = await dialogo('Registrar pago');
    await userEvent.type(formulario.getByLabelText('Monto'), '50000');
    await userEvent.click(formulario.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(api.rutasLlamadas()).toContain('POST /api/expedientes/e1/honorario/pagos'));
    expect(api.llamadas.find((llamada) => llamada.ruta === 'POST /api/expedientes/e1/honorario/pagos')?.body).toEqual({ monto: 50000 });
  });

  it('is not offered to the assistant, who has no access to fees', async () => {
    const api = detalleCon(ASISTENTE);
    renderApp('/expedientes/e1');

    expect(await screen.findByRole('tab', { name: 'Movimientos' })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Honorarios' })).not.toBeInTheDocument();
    expect(api.rutasLlamadas()).not.toContain('GET /api/expedientes/e1/honorario');
  });
});

describe('a case that cannot be shown', () => {
  it.each([
    ['does not exist', errorDeApi('NOT_FOUND', 404), 'Este expediente no existe.'],
    ["belongs to another lawyer", errorDeApi('FORBIDDEN', 403), 'No tenés permiso para ver este expediente.'],
  ])('says so when it %s', async (_caso, respuesta, mensaje) => {
    detalleCon(ABOGADO, { 'GET /api/expedientes/e1': respuesta });

    renderApp('/expedientes/e1');

    expect(await screen.findByText(mensaje)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Volver a expedientes' })).toHaveAttribute('href', '/expedientes');
  });
});

describe('expediente detail', () => {
  it('opens from a row of the list', async () => {
    detalleCon(TITULAR, {
      'GET /api/expedientes?page=1&limit=20': [200, { data: [EXPEDIENTE], page: 1, limit: 20, total: 1 }],
    });
    renderApp('/expedientes');

    await userEvent.click(await screen.findByText('123/2026'));

    expect(await screen.findByRole('heading', { name: EXPEDIENTE.caratula })).toBeInTheDocument();
  });

  it("shows the case's data", async () => {
    detalleCon();

    renderApp('/expedientes/e1');

    expect(await screen.findByRole('heading', { name: EXPEDIENTE.caratula })).toBeInTheDocument();
    expect(datos().getByText('123/2026')).toBeInTheDocument();
    expect(datos().getByText('Perez, Juan')).toBeInTheDocument();
    expect(datos().getByText('Laboral')).toBeInTheDocument();
    expect(datos().getByText('En trámite')).toBeInTheDocument();
    expect(datos().getByText('Ana Diaz')).toBeInTheDocument();
    // An instant, read on the firm's clock: 01:30 UTC on 3 March is still 2 March in Argentina.
    expect(datos().getByText('02/03/2026')).toBeInTheDocument();
    expect(datos().getByText('Despido sin causa')).toBeInTheDocument();
  });

  it.each([
    ['the firm owner', TITULAR, true],
    ['the responsible lawyer', ABOGADO, true],
    ['the assistant', ASISTENTE, false],
  ])('offers edit and archive to %s only if they may change the case', async (_quien, usuario, ofrece) => {
    detalleCon(usuario);

    renderApp('/expedientes/e1');

    expect(await screen.findByRole('heading', { name: EXPEDIENTE.caratula })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Editar' }) !== null).toBe(ofrece);
    expect(screen.queryByRole('button', { name: 'Archivar' }) !== null).toBe(ofrece);
  });

  it('archives after confirming and shows the new estado', async () => {
    const api = detalleCon(ABOGADO, { 'PATCH /api/expedientes/e1': [200, { expediente: { _id: 'e1' } }] });
    renderApp('/expedientes/e1');

    await userEvent.click(await screen.findByRole('button', { name: 'Archivar' }));
    expect(api.rutasLlamadas()).not.toContain('PATCH /api/expedientes/e1');
    api.rutas['GET /api/expedientes/e1'] = [200, { expediente: { ...EXPEDIENTE, estado: 'ARCHIVADO' } }];
    await userEvent.click(await screen.findByRole('button', { name: 'Sí, archivar' }));

    expect(await datos().findByText('Archivado')).toBeInTheDocument();
    expect(api.llamadas.find((llamada) => llamada.ruta === 'PATCH /api/expedientes/e1')?.body).toEqual({ estado: 'ARCHIVADO' });
    expect(screen.queryByRole('button', { name: 'Archivar' })).not.toBeInTheDocument();
  });

  it('edits the carátula and shows it', async () => {
    const api = detalleCon(ABOGADO, { 'PATCH /api/expedientes/e1': [200, { expediente: { _id: 'e1' } }] });
    renderApp('/expedientes/e1');
    await userEvent.click(await screen.findByRole('button', { name: 'Editar' }));
    const formulario = await dialogo('Editar expediente');
    expect(formulario.queryByRole('combobox', { name: 'Abogado responsable' })).not.toBeInTheDocument();

    const caratula = formulario.getByLabelText('Carátula');
    await userEvent.clear(caratula);
    await userEvent.type(caratula, 'Perez, Juan c/ Acme SA s/ indemnización');
    api.rutas['GET /api/expedientes/e1'] = [200, { expediente: { ...EXPEDIENTE, caratula: 'Perez, Juan c/ Acme SA s/ indemnización' } }];
    await userEvent.click(formulario.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByRole('heading', { name: 'Perez, Juan c/ Acme SA s/ indemnización' })).toBeInTheDocument();
    expect(api.llamadas.find((llamada) => llamada.ruta === 'PATCH /api/expedientes/e1')?.body).toMatchObject({
      caratula: 'Perez, Juan c/ Acme SA s/ indemnización',
      fuero: 'LABORAL',
    });
  });
});
