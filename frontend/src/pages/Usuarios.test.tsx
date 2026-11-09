import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { errorDeApi, simularApi } from '../test/api';
import { renderApp } from '../test/render';
import { ABOGADO, ASISTENTE, TITULAR } from '../test/usuarios';

// Only the firm owner reaches this page; App.test.tsx checks that anyone else gets the no-permission page.

function listaCon(usuarios: unknown[], otras = {}) {
  return simularApi({
    'GET /api/auth/me': [200, { usuario: TITULAR }],
    'GET /api/usuarios': [200, { usuarios }],
    ...otras,
  });
}

/** An open modal, by its title (see `dialogo` in Agenda.test.tsx for why not by role). */
async function dialogo(titulo: string) {
  const encabezado = await screen.findByText(titulo, { selector: '.ant-modal-title' });
  return within(encabezado.closest<HTMLElement>('[role="dialog"]')!);
}

const hayDialogo = (titulo: string) => screen.queryByText(titulo, { selector: '.ant-modal-title' }) !== null;

const llamadaA = (api: ReturnType<typeof listaCon>, ruta: string) => api.llamadas.find((llamada) => llamada.ruta === ruta);

const TEMPORAL = 'temporal de prueba 2026';

/** The table row of a user. Their name may also be in the header, as the one logged in. */
const fila = (nombre: string) => within(screen.getByText(nombre, { selector: 'td' }).closest<HTMLElement>('tr')!);

describe('usuarios page', () => {
  it('shows each user with their email, rol, owner status, state and pending password change', async () => {
    listaCon([ABOGADO, { ...ASISTENTE, activo: false, debeCambiarPassword: true }, TITULAR]);

    renderApp('/usuarios');

    expect(await screen.findByText('Ana Diaz', { selector: 'td' })).toBeInTheDocument();
    const ana = fila('Ana Diaz');
    expect(ana.getByText('abogado@avexis.demo')).toBeInTheDocument();
    expect(ana.getByText('Abogado')).toBeInTheDocument();
    expect(ana.getByText('Activo')).toBeInTheDocument();
    const carla = fila('Carla Ruiz');
    expect(carla.getByText('Asistente')).toBeInTheDocument();
    expect(carla.getByText('Inactivo')).toBeInTheDocument();
    expect(carla.getByText('Pendiente')).toBeInTheDocument();
    expect(fila('Zoe Titular').getByText('Titular')).toBeInTheDocument();
    expect(ana.queryByText('Titular')).not.toBeInTheDocument();
    expect(ana.queryByText('Pendiente')).not.toBeInTheDocument();
  });

  it('creates a user with a temporary password and reloads the list', async () => {
    const nuevo = { ...ABOGADO, _id: '9', nombre: 'Luis Gomez', email: 'luis@avexis.demo', debeCambiarPassword: true };
    const api = listaCon([TITULAR], { 'POST /api/usuarios': [201, { usuario: nuevo }] });
    renderApp('/usuarios');
    await userEvent.click(await screen.findByRole('button', { name: 'Nuevo usuario' }));
    const modal = await dialogo('Nuevo usuario');

    await userEvent.type(modal.getByLabelText('Nombre'), 'Luis Gomez');
    await userEvent.type(modal.getByLabelText('Email'), 'luis@avexis.demo');
    await userEvent.type(modal.getByLabelText('Contraseña temporal'), TEMPORAL);
    api.rutas['GET /api/usuarios'] = [200, { usuarios: [nuevo, TITULAR] }];
    await userEvent.click(modal.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText('Luis Gomez', { selector: 'td' })).toBeInTheDocument();
    expect(api.llamadas.find((llamada) => llamada.ruta === 'POST /api/usuarios')?.body).toEqual({
      nombre: 'Luis Gomez',
      email: 'luis@avexis.demo',
      rol: 'ABOGADO',
      esTitular: false,
      password: TEMPORAL,
    });
    await waitFor(() => expect(hayDialogo('Nuevo usuario')).toBe(false));
  });

  it('marks the email when another user already has it', async () => {
    listaCon([TITULAR], { 'POST /api/usuarios': errorDeApi('DUPLICATE_KEY', 409) });
    renderApp('/usuarios');
    await userEvent.click(await screen.findByRole('button', { name: 'Nuevo usuario' }));
    const modal = await dialogo('Nuevo usuario');

    await userEvent.type(modal.getByLabelText('Nombre'), 'Ana Diaz');
    await userEvent.type(modal.getByLabelText('Email'), 'abogado@avexis.demo');
    await userEvent.type(modal.getByLabelText('Contraseña temporal'), TEMPORAL);
    await userEvent.click(modal.getByRole('button', { name: 'Guardar' }));

    expect(await modal.findByText('Ya existe un usuario con ese email.')).toBeInTheDocument();
    expect(hayDialogo('Nuevo usuario')).toBe(true);
  });

  it("does not offer to edit or reset the titular's own account", async () => {
    listaCon([ABOGADO, TITULAR]);

    renderApp('/usuarios');

    expect(await screen.findByText('Ana Diaz', { selector: 'td' })).toBeInTheDocument();
    expect(fila('Ana Diaz').getByRole('button', { name: 'Editar' })).toBeInTheDocument();
    expect(fila('Zoe Titular').queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument();
    expect(fila('Zoe Titular').queryByRole('button', { name: 'Resetear contraseña' })).not.toBeInTheDocument();
  });

  it('turns the owner status off and locks it when assistant is chosen', async () => {
    const socia = { ...ABOGADO, esTitular: true };
    const api = listaCon([socia, TITULAR], { 'PATCH /api/usuarios/2': [200, { usuario: { ...socia, rol: 'ASISTENTE', esTitular: false } }] });
    renderApp('/usuarios');
    expect(await screen.findByText('Ana Diaz', { selector: 'td' })).toBeInTheDocument();

    await userEvent.click(fila('Ana Diaz').getByRole('button', { name: 'Editar' }));
    const modal = await dialogo('Editar usuario');
    expect(modal.getByRole('checkbox', { name: 'Titular del estudio' })).toBeChecked();
    await userEvent.click(modal.getByRole('radio', { name: 'Asistente' }));
    expect(modal.getByRole('checkbox', { name: 'Titular del estudio' })).not.toBeChecked();
    expect(modal.getByRole('checkbox', { name: 'Titular del estudio' })).toBeDisabled();
    api.rutas['GET /api/usuarios'] = [200, { usuarios: [{ ...socia, rol: 'ASISTENTE', esTitular: false }, TITULAR] }];
    await userEvent.click(modal.getByRole('button', { name: 'Guardar' }));

    expect(await fila('Ana Diaz').findByText('Asistente')).toBeInTheDocument();
    expect(llamadaA(api, 'PATCH /api/usuarios/2')?.body).toEqual({ rol: 'ASISTENTE', esTitular: false, activo: true });
  });

  it('asks before deactivating a lawyer and reminds to review their open cases', async () => {
    const api = listaCon([ABOGADO, TITULAR], { 'PATCH /api/usuarios/2': [200, { usuario: { ...ABOGADO, activo: false } }] });
    renderApp('/usuarios');
    expect(await screen.findByText('Ana Diaz', { selector: 'td' })).toBeInTheDocument();

    await userEvent.click(fila('Ana Diaz').getByRole('button', { name: 'Editar' }));
    const modal = await dialogo('Editar usuario');
    await userEvent.click(modal.getByRole('checkbox', { name: 'Activo' }));
    await userEvent.click(modal.getByRole('button', { name: 'Guardar' }));
    const confirmar = await dialogo('¿Desactivar a Ana Diaz?');
    expect(confirmar.getByText(/revisá sus expedientes abiertos/i)).toBeInTheDocument();
    expect(llamadaA(api, 'PATCH /api/usuarios/2')).toBeUndefined();
    api.rutas['GET /api/usuarios'] = [200, { usuarios: [{ ...ABOGADO, activo: false }, TITULAR] }];
    await userEvent.click(confirmar.getByRole('button', { name: 'Sí, desactivar' }));

    expect(await fila('Ana Diaz').findByText('Inactivo')).toBeInTheDocument();
    expect(llamadaA(api, 'PATCH /api/usuarios/2')?.body).toEqual({ rol: 'ABOGADO', esTitular: false, activo: false });
  });

  it('does not mention cases when deactivating an assistant, and sends nothing if cancelled', async () => {
    const api = listaCon([ASISTENTE, TITULAR]);
    renderApp('/usuarios');
    expect(await screen.findByText('Carla Ruiz', { selector: 'td' })).toBeInTheDocument();

    await userEvent.click(fila('Carla Ruiz').getByRole('button', { name: 'Editar' }));
    const modal = await dialogo('Editar usuario');
    await userEvent.click(modal.getByRole('checkbox', { name: 'Activo' }));
    await userEvent.click(modal.getByRole('button', { name: 'Guardar' }));
    const confirmar = await dialogo('¿Desactivar a Carla Ruiz?');
    expect(confirmar.queryByText(/expedientes/i)).not.toBeInTheDocument();
    await userEvent.click(confirmar.getByRole('button', { name: 'Cancelar' }));

    expect(hayDialogo('Editar usuario')).toBe(true);
    expect(llamadaA(api, 'PATCH /api/usuarios/3')).toBeUndefined();
  });

  it('resets a password to a new temporary one', async () => {
    const api = listaCon([ABOGADO, TITULAR], { 'POST /api/usuarios/2/reset-password': [204] });
    renderApp('/usuarios');
    expect(await screen.findByText('Ana Diaz', { selector: 'td' })).toBeInTheDocument();

    await userEvent.click(fila('Ana Diaz').getByRole('button', { name: 'Resetear contraseña' }));
    const modal = await dialogo('Resetear contraseña de Ana Diaz');
    await userEvent.type(modal.getByLabelText('Contraseña temporal'), TEMPORAL);
    api.rutas['GET /api/usuarios'] = [200, { usuarios: [{ ...ABOGADO, debeCambiarPassword: true }, TITULAR] }];
    await userEvent.click(modal.getByRole('button', { name: 'Guardar' }));

    expect(await fila('Ana Diaz').findByText('Pendiente')).toBeInTheDocument();
    expect(llamadaA(api, 'POST /api/usuarios/2/reset-password')?.body).toEqual({ password: TEMPORAL });
    await waitFor(() => expect(hayDialogo('Resetear contraseña de Ana Diaz')).toBe(false));
  });
});
