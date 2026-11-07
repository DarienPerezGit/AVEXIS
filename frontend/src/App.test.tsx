import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { api } from './api';
import { SIN_SESION, errorDeApi, simularApi } from './test/api';
import { renderApp } from './test/render';
import { ABOGADO, ASISTENTE, TITULAR } from './test/usuarios';

const conSesion = (usuario: unknown, otras = {}) => simularApi({ 'GET /api/auth/me': [200, { usuario }], ...otras });
const titulo = (name: string) => screen.findByRole('heading', { name });
const botonDeLogin = () => screen.findByRole('button', { name: 'Entrar' });

describe('session control', () => {
  it('sends to the login whoever has no session, whatever the route', async () => {
    simularApi({ 'GET /api/auth/me': SIN_SESION });

    renderApp('/expedientes');

    expect(await botonDeLogin()).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Expedientes' })).not.toBeInTheDocument();
  });

  it('opens the agenda to a user with a session', async () => {
    conSesion(ABOGADO);

    renderApp();

    expect(await titulo('Agenda')).toBeInTheDocument();
  });

  it('keeps a user who must change the password on that page, without the menu', async () => {
    conSesion({ ...ABOGADO, debeCambiarPassword: true });

    renderApp('/expedientes');

    expect(await titulo('Cambiar contraseña')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Expedientes' })).not.toBeInTheDocument();
  });

  it('goes back to the login when the session ends halfway through', async () => {
    const simulada = conSesion(ABOGADO, { 'GET /api/expedientes': SIN_SESION });
    renderApp();
    await titulo('Agenda');
    simulada.rutas['GET /api/auth/me'] = SIN_SESION;

    await act(() => api('/expedientes').catch(() => {}));

    expect(await botonDeLogin()).toBeInTheDocument();
  });
});

describe('when the API fails while reading the session', () => {
  it('offers to retry instead of sending to the login, since the session may be fine', async () => {
    const simulada = simularApi({ 'GET /api/auth/me': errorDeApi('INTERNAL_ERROR', 500) });
    renderApp();

    const reintentar = await screen.findByRole('button', { name: 'Reintentar' });
    expect(screen.getByText('No pudimos conectar con el servidor.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Entrar' })).not.toBeInTheDocument();

    simulada.rutas['GET /api/auth/me'] = [200, { usuario: ABOGADO }];
    await userEvent.click(reintentar);

    expect(await titulo('Agenda')).toBeInTheDocument();
  });
});

describe('layout', () => {
  it('shows Usuarios in the menu to the firm owner only', async () => {
    conSesion(TITULAR);
    const { unmount } = renderApp();
    expect(await screen.findByRole('link', { name: 'Usuarios' })).toBeInTheDocument();
    unmount();

    conSesion(ASISTENTE);
    renderApp();
    await titulo('Agenda');

    expect(screen.getByRole('link', { name: 'Expedientes' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Usuarios' })).not.toBeInTheDocument();
  });

  it('logs out and goes back to the login', async () => {
    const simulada = conSesion(ABOGADO, { 'POST /api/auth/logout': [204] });
    renderApp();
    await titulo('Agenda');

    await userEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));

    expect(await botonDeLogin()).toBeInTheDocument();
    await waitFor(() => expect(simulada.rutasLlamadas()).toContain('POST /api/auth/logout'));
  });

  it('reaches the voluntary password change from the header, keeping the menu', async () => {
    conSesion(ABOGADO);
    renderApp();
    await titulo('Agenda');

    await userEvent.click(screen.getByRole('link', { name: 'Cambiar contraseña' }));

    expect(await titulo('Cambiar contraseña')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Expedientes' })).toBeInTheDocument();
  });
});

describe('/usuarios', () => {
  it('shows the no-permission page to anyone but the firm owner', async () => {
    conSesion(ABOGADO);

    renderApp('/usuarios');

    expect(await screen.findByText('No tenés permiso para ver esta página.')).toBeInTheDocument();
  });

  it('opens to the firm owner', async () => {
    conSesion(TITULAR);

    renderApp('/usuarios');

    expect(await titulo('Usuarios')).toBeInTheDocument();
  });
});
