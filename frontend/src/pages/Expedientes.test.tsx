import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { errorDeApi, simularApi } from '../test/api';
import { renderApp } from '../test/render';
import { ABOGADO, ASISTENTE, TITULAR } from '../test/usuarios';

const CLIENTE = { _id: 'c1', nombre: 'Perez, Juan' };

function expediente(cambios: Record<string, unknown> = {}) {
  return {
    _id: 'e1',
    numero: '123/2026',
    caratula: 'Perez, Juan c/ Acme SA s/ despido',
    fuero: 'LABORAL',
    estado: 'EN_TRAMITE',
    clienteId: CLIENTE,
    abogadoResponsableId: { _id: ABOGADO._id, nombre: ABOGADO.nombre },
    fechaInicio: '2026-03-02T00:00:00.000Z',
    ...cambios,
  };
}

const PRIMERA_PAGINA = 'GET /api/expedientes?page=1&limit=20';

function listaCon(expedientes: unknown[], usuario = TITULAR, otras = {}) {
  return simularApi({
    'GET /api/auth/me': [200, { usuario }],
    [PRIMERA_PAGINA]: [200, { data: expedientes, page: 1, limit: 20, total: expedientes.length }],
    ...otras,
  });
}

const fila = (texto: string) => within(screen.getByText(texto).closest<HTMLElement>('tr')!);

async function elegir(campo: string, opcion: string, dentro: ReturnType<typeof within> = screen) {
  await userEvent.click(dentro.getByRole('combobox', { name: campo }));
  // The open dropdown is the last one in the page: a filter with the same options may be rendered behind the modal.
  const opciones = await screen.findAllByTitle(opcion);
  await userEvent.click(opciones[opciones.length - 1]);
}

/** An open modal, by its title (see `dialogo` in Agenda.test.tsx for why not by role). */
async function dialogo(titulo: string) {
  const encabezado = await screen.findByText(titulo, { selector: '.ant-modal-title' });
  return within(encabezado.closest<HTMLElement>('[role="dialog"]')!);
}

const hayDialogo = (titulo: string) => screen.queryByText(titulo, { selector: '.ant-modal-title' }) !== null;

describe('expedientes list', () => {
  it('shows each case with its client, fuero, estado and lawyer', async () => {
    listaCon([expediente()]);

    renderApp('/expedientes');

    expect(await screen.findByText('123/2026')).toBeInTheDocument();
    const caso = fila('123/2026');
    expect(caso.getByText('Perez, Juan c/ Acme SA s/ despido')).toBeInTheDocument();
    expect(caso.getByText('Perez, Juan')).toBeInTheDocument();
    expect(caso.getByText('Laboral')).toBeInTheDocument();
    expect(caso.getByText('En trámite')).toBeInTheDocument();
    expect(caso.getByText('Ana Diaz')).toBeInTheDocument();
  });

  it('hides the lawyer column from a plain lawyer, who only sees their own cases', async () => {
    listaCon([expediente()], ABOGADO);

    renderApp('/expedientes');

    expect(await screen.findByText('123/2026')).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Abogado' })).not.toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Cliente' })).toBeInTheDocument();
  });

  it('searches when Enter is pressed, since the API matches whole words', async () => {
    const api = listaCon([expediente()], TITULAR, {
      'GET /api/expedientes?page=1&limit=20&q=Gomez': [200, { data: [expediente({ _id: 'e2', numero: '456/2026' })], page: 1, limit: 20, total: 1 }],
    });
    renderApp('/expedientes');
    await screen.findByText('123/2026');

    await userEvent.type(screen.getByPlaceholderText('Buscar por carátula'), 'Gomez');
    expect(api.rutasLlamadas()).not.toContain('GET /api/expedientes?page=1&limit=20&q=G');

    await userEvent.keyboard('{Enter}');
    expect(await screen.findByText('456/2026')).toBeInTheDocument();
    expect(screen.queryByText('123/2026')).not.toBeInTheDocument();
  });

  it('asks the API for the estado and fuero picked', async () => {
    const api = listaCon([expediente()], TITULAR, {
      'GET /api/expedientes?page=1&limit=20&estado=ARCHIVADO': [200, { data: [], page: 1, limit: 20, total: 0 }],
      'GET /api/expedientes?page=1&limit=20&estado=ARCHIVADO&fuero=CIVIL': [200, { data: [], page: 1, limit: 20, total: 0 }],
    });
    renderApp('/expedientes');
    await screen.findByText('123/2026');

    await elegir('Estado', 'Archivado');
    expect(await screen.findByText('No hay expedientes que coincidan.')).toBeInTheDocument();
    await elegir('Fuero', 'Civil');

    await waitFor(() => expect(api.rutasLlamadas()).toContain('GET /api/expedientes?page=1&limit=20&estado=ARCHIVADO&fuero=CIVIL'));
  });

  it('asks the API for the next page', async () => {
    const veinte = Array.from({ length: 20 }, (_, i) => expediente({ _id: `e${i}`, numero: `${i}/2026` }));
    listaCon([], TITULAR, {
      [PRIMERA_PAGINA]: [200, { data: veinte, page: 1, limit: 20, total: 21 }],
      'GET /api/expedientes?page=2&limit=20': [200, { data: [expediente({ _id: 'e20', numero: '20/2026' })], page: 2, limit: 20, total: 21 }],
    });
    renderApp('/expedientes');
    await screen.findByText('0/2026');

    await userEvent.click(screen.getByText('2', { selector: '.ant-pagination-item a' }));

    expect(await screen.findByText('20/2026')).toBeInTheDocument();
    expect(screen.queryByText('0/2026')).not.toBeInTheDocument();
  });

  it.each([
    ['the firm owner', TITULAR, true],
    ['a lawyer', ABOGADO, true],
    ['the assistant', ASISTENTE, false],
  ])('offers a new case to %s only if they can open one', async (_quien, usuario, ofrece) => {
    listaCon([expediente()], usuario);

    renderApp('/expedientes');

    expect(await screen.findByText('123/2026')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Nuevo expediente' }) !== null).toBe(ofrece);
  });
});

describe('new case', () => {
  const CLIENTES = { 'GET /api/clientes': [200, { clientes: [CLIENTE, { _id: 'c2', nombre: 'Acme SA' }] }] as [number, unknown] };

  async function abrirFormulario(usuario = ABOGADO, otras = {}) {
    const api = listaCon([expediente()], usuario, { ...CLIENTES, ...otras });
    renderApp('/expedientes');
    await userEvent.click(await screen.findByRole('button', { name: 'Nuevo expediente' }));
    return { api, formulario: await dialogo('Nuevo expediente') };
  }

  async function completar(formulario: ReturnType<typeof within>) {
    await userEvent.type(formulario.getByLabelText('Número'), '456/2026');
    await userEvent.type(formulario.getByLabelText('Carátula'), 'Acme SA s/ quiebra');
    await elegir('Fuero', 'Comercial', formulario);
    await elegir('Cliente', 'Acme SA', formulario);
  }

  it('lets a lawyer open a case, always carried by themselves, and reloads the list', async () => {
    const { api, formulario } = await abrirFormulario(ABOGADO, { 'POST /api/expedientes': [201, { expediente: { _id: 'e2' } }] });
    expect(formulario.queryByRole('combobox', { name: 'Abogado responsable' })).not.toBeInTheDocument();

    await completar(formulario);
    await userEvent.click(formulario.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(hayDialogo('Nuevo expediente')).toBe(false));
    const alta = api.llamadas.find((llamada) => llamada.ruta === 'POST /api/expedientes');
    expect(alta?.body).toEqual({ numero: '456/2026', caratula: 'Acme SA s/ quiebra', fuero: 'COMERCIAL', clienteId: 'c2' });
    expect(api.rutasLlamadas().filter((ruta) => ruta === PRIMERA_PAGINA)).toHaveLength(2);
  });

  it('lets the firm owner pick the lawyer in charge', async () => {
    const { api, formulario } = await abrirFormulario(TITULAR, {
      'GET /api/usuarios/abogados': [200, { abogados: [{ _id: ABOGADO._id, nombre: ABOGADO.nombre }] }],
      'POST /api/expedientes': [201, { expediente: { _id: 'e2' } }],
    });

    await completar(formulario);
    await elegir('Abogado responsable', 'Ana Diaz', formulario);
    await userEvent.click(formulario.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(api.rutasLlamadas()).toContain('POST /api/expedientes'));
    expect(api.llamadas.find((llamada) => llamada.ruta === 'POST /api/expedientes')?.body).toMatchObject({ abogadoResponsableId: ABOGADO._id });
  });

  it('marks the number when another case already has it', async () => {
    const { formulario } = await abrirFormulario(ABOGADO, { 'POST /api/expedientes': errorDeApi('DUPLICATE_KEY', 409) });

    await completar(formulario);
    await userEvent.click(formulario.getByRole('button', { name: 'Guardar' }));

    expect(await formulario.findByText('Ya existe un expediente con ese número.')).toBeInTheDocument();
    expect(hayDialogo('Nuevo expediente')).toBe(true);
  });
});
