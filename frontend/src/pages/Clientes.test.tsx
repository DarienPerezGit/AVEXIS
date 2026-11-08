import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { errorDeApi, simularApi } from '../test/api';
import { renderApp } from '../test/render';
import { ABOGADO, ASISTENTE, TITULAR } from '../test/usuarios';

function cliente(cambios: Record<string, unknown> = {}) {
  return {
    _id: 'c1',
    tipo: 'FISICA',
    nombre: 'Perez, Juan',
    dni: '30111222',
    email: 'juan@example.com',
    telefono: '11 4444-5555',
    ...cambios,
  };
}

const ACME = cliente({ _id: 'c2', tipo: 'JURIDICA', nombre: 'Acme SA', dni: undefined, cuit: '30-71234567-9', email: 'legales@acme.example', telefono: '11 5555-6666' });

function listaCon(clientes: unknown[], usuario = TITULAR, otras = {}) {
  return simularApi({
    'GET /api/auth/me': [200, { usuario }],
    'GET /api/clientes': [200, { clientes }],
    ...otras,
  });
}

/** An open modal, by its title (see `dialogo` in Agenda.test.tsx for why not by role). */
async function dialogo(titulo: string) {
  const encabezado = await screen.findByText(titulo, { selector: '.ant-modal-title' });
  return within(encabezado.closest<HTMLElement>('[role="dialog"]')!);
}

const hayDialogo = (titulo: string) => screen.queryByText(titulo, { selector: '.ant-modal-title' }) !== null;

const fila = (texto: string) => within(screen.getByText(texto).closest<HTMLElement>('tr')!);

describe('clientes page', () => {
  it('shows each client with its tipo, DNI or CUIT and contact details', async () => {
    listaCon([cliente(), ACME]);

    renderApp('/clientes');

    expect(await screen.findByText('Perez, Juan')).toBeInTheDocument();
    const juan = fila('Perez, Juan');
    expect(juan.getByText('Persona física')).toBeInTheDocument();
    expect(juan.getByText('30111222')).toBeInTheDocument();
    expect(juan.getByText('juan@example.com')).toBeInTheDocument();
    expect(juan.getByText('11 4444-5555')).toBeInTheDocument();
    const acme = fila('Acme SA');
    expect(acme.getByText('Persona jurídica')).toBeInTheDocument();
    expect(acme.getByText('30-71234567-9')).toBeInTheDocument();
  });

  it('searches as the user types, by name, DNI or CUIT', async () => {
    listaCon([cliente(), ACME], TITULAR, { 'GET /api/clientes?q=acme': [200, { clientes: [ACME] }] });
    renderApp('/clientes');
    expect(await screen.findByText('Perez, Juan')).toBeInTheDocument();

    await userEvent.type(screen.getByPlaceholderText('Buscar por nombre, DNI o CUIT'), 'acme');

    await waitFor(() => expect(screen.queryByText('Perez, Juan')).not.toBeInTheDocument());
    expect(screen.getByText('Acme SA')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('goes back to the first page when the search changes', async () => {
    const veinticinco = Array.from({ length: 25 }, (_, i) => {
      const n = String(i + 1).padStart(2, '0');
      return cliente({ _id: `c${n}`, nombre: `Cliente ${n}`, dni: `200000${n}` });
    });
    listaCon(veinticinco, TITULAR, { 'GET /api/clientes?q=c': [200, { clientes: veinticinco }] });
    renderApp('/clientes');
    expect(await screen.findByText('Cliente 01')).toBeInTheDocument();
    await userEvent.click(screen.getByText('2', { selector: '.ant-pagination-item a' }));
    expect(await screen.findByText('Cliente 25')).toBeInTheDocument();

    await userEvent.type(screen.getByPlaceholderText('Buscar por nombre, DNI o CUIT'), 'c');

    expect(await screen.findByText('Cliente 01')).toBeInTheDocument();
  });

  it('shows 20 clients per page and pages in the browser, with no new request', async () => {
    const veinticinco = Array.from({ length: 25 }, (_, i) => {
      const n = String(i + 1).padStart(2, '0');
      return cliente({ _id: `c${n}`, nombre: `Cliente ${n}`, dni: `200000${n}` });
    });
    const api = listaCon(veinticinco);
    renderApp('/clientes');

    expect(await screen.findByText('Cliente 20')).toBeInTheDocument();
    expect(screen.queryByText('Cliente 21')).not.toBeInTheDocument();

    await userEvent.click(screen.getByText('2', { selector: '.ant-pagination-item a' }));

    expect(await screen.findByText('Cliente 25')).toBeInTheDocument();
    expect(screen.queryByText('Cliente 01')).not.toBeInTheDocument();
    expect(api.rutasLlamadas().filter((ruta) => ruta.startsWith('GET /api/clientes'))).toHaveLength(1);
  });

  it('registers a client, asking for the DNI or the CUIT by tipo, and reloads the list', async () => {
    const api = listaCon([cliente()], TITULAR, { 'POST /api/clientes': [201, { cliente: ACME }] });
    renderApp('/clientes');
    await userEvent.click(await screen.findByRole('button', { name: 'Nuevo cliente' }));
    const modal = await dialogo('Nuevo cliente');
    expect(modal.getByLabelText('DNI')).toBeInTheDocument();
    expect(modal.queryByLabelText('CUIT')).not.toBeInTheDocument();

    await userEvent.click(modal.getByRole('radio', { name: 'Persona jurídica' }));
    expect(modal.queryByLabelText('DNI')).not.toBeInTheDocument();
    await userEvent.type(modal.getByLabelText('Nombre'), 'Acme SA');
    await userEvent.type(modal.getByLabelText('CUIT'), '30-71234567-9');
    await userEvent.type(modal.getByLabelText('Email'), 'legales@acme.example');
    await userEvent.type(modal.getByLabelText('Teléfono'), '11 5555-6666');
    api.rutas['GET /api/clientes'] = [200, { clientes: [cliente(), ACME] }];
    await userEvent.click(modal.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText('Acme SA')).toBeInTheDocument();
    expect(api.llamadas.find((llamada) => llamada.ruta === 'POST /api/clientes')?.body).toEqual({
      tipo: 'JURIDICA',
      nombre: 'Acme SA',
      cuit: '30-71234567-9',
      email: 'legales@acme.example',
      telefono: '11 5555-6666',
    });
    await waitFor(() => expect(hayDialogo('Nuevo cliente')).toBe(false));
  });

  it('marks the DNI when another client already has it', async () => {
    listaCon([], TITULAR, { 'POST /api/clientes': errorDeApi('DUPLICATE_KEY', 409) });
    renderApp('/clientes');
    await userEvent.click(await screen.findByRole('button', { name: 'Nuevo cliente' }));
    const modal = await dialogo('Nuevo cliente');

    await userEvent.type(modal.getByLabelText('Nombre'), 'Perez, Juan');
    await userEvent.type(modal.getByLabelText('DNI'), '30111222');
    await userEvent.type(modal.getByLabelText('Email'), 'juan@example.com');
    await userEvent.type(modal.getByLabelText('Teléfono'), '11 4444-5555');
    await userEvent.click(modal.getByRole('button', { name: 'Guardar' }));

    expect(await modal.findByText('Ya existe un cliente con ese DNI.')).toBeInTheDocument();
    expect(hayDialogo('Nuevo cliente')).toBe(true);
  });

  it('edits the name and contact details, with the tipo and the DNI locked', async () => {
    const api = listaCon([cliente()], TITULAR, { 'PATCH /api/clientes/c1': [200, { cliente: cliente({ telefono: '11 7777-8888' }) }] });
    renderApp('/clientes');
    expect(await screen.findByText('Perez, Juan')).toBeInTheDocument();

    await userEvent.click(fila('Perez, Juan').getByRole('button', { name: 'Editar' }));
    const modal = await dialogo('Editar cliente');
    expect(modal.getByLabelText('Nombre')).toHaveValue('Perez, Juan');
    expect(modal.getByLabelText('DNI')).toBeDisabled();
    expect(modal.getByRole('radio', { name: 'Persona jurídica' })).toBeDisabled();
    const telefono = modal.getByLabelText('Teléfono');
    await userEvent.clear(telefono);
    await userEvent.type(telefono, '11 7777-8888');
    api.rutas['GET /api/clientes'] = [200, { clientes: [cliente({ telefono: '11 7777-8888' })] }];
    await userEvent.click(modal.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText('11 7777-8888')).toBeInTheDocument();
    expect(api.llamadas.find((llamada) => llamada.ruta === 'PATCH /api/clientes/c1')?.body).toEqual({
      nombre: 'Perez, Juan',
      email: 'juan@example.com',
      telefono: '11 7777-8888',
    });
  });

  it.each([ABOGADO, ASISTENTE])('lets $nombre register and edit but not delete', async (usuario) => {
    listaCon([cliente()], usuario);

    renderApp('/clientes');

    expect(await screen.findByText('Perez, Juan')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Nuevo cliente' })).toBeInTheDocument();
    expect(fila('Perez, Juan').getByRole('button', { name: 'Editar' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Eliminar' })).not.toBeInTheDocument();
  });

  it('lets the titular delete a client after confirming', async () => {
    const api = listaCon([cliente(), ACME], TITULAR, { 'DELETE /api/clientes/c1': [204] });
    renderApp('/clientes');
    expect(await screen.findByText('Perez, Juan')).toBeInTheDocument();

    await userEvent.click(fila('Perez, Juan').getByRole('button', { name: 'Eliminar' }));
    api.rutas['GET /api/clientes'] = [200, { clientes: [ACME] }];
    await userEvent.click(await screen.findByRole('button', { name: 'Sí, eliminar' }));

    await waitFor(() => expect(screen.queryByText('Perez, Juan')).not.toBeInTheDocument());
    expect(screen.getByText('Acme SA')).toBeInTheDocument();
    expect(api.rutasLlamadas()).toContain('DELETE /api/clientes/c1');
  });

  it('explains that a client with cases cannot be deleted', async () => {
    listaCon([cliente()], TITULAR, { 'DELETE /api/clientes/c1': errorDeApi('CLIENTE_HAS_EXPEDIENTES', 409) });
    renderApp('/clientes');
    expect(await screen.findByText('Perez, Juan')).toBeInTheDocument();

    await userEvent.click(fila('Perez, Juan').getByRole('button', { name: 'Eliminar' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Sí, eliminar' }));

    expect(await screen.findByText('No se puede eliminar un cliente que tiene expedientes.')).toBeInTheDocument();
    expect(screen.getByText('Perez, Juan')).toBeInTheDocument();
  });

  it('clears the address when it is erased on edit', async () => {
    const api = listaCon([cliente({ direccion: 'Av. Siempreviva 742' })], TITULAR, { 'PATCH /api/clientes/c1': [200, { cliente: cliente() }] });
    renderApp('/clientes');
    expect(await screen.findByText('Perez, Juan')).toBeInTheDocument();

    await userEvent.click(fila('Perez, Juan').getByRole('button', { name: 'Editar' }));
    const modal = await dialogo('Editar cliente');
    await userEvent.clear(modal.getByLabelText('Dirección'));
    await userEvent.click(modal.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(api.rutasLlamadas()).toContain('PATCH /api/clientes/c1'));
    expect(api.llamadas.find((llamada) => llamada.ruta === 'PATCH /api/clientes/c1')?.body).toMatchObject({ direccion: '' });
  });
});
