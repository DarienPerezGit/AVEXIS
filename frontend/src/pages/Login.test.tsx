import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { SIN_SESION, errorDeApi, simularApi } from '../test/api';
import { renderApp } from '../test/render';
import { ABOGADO } from '../test/usuarios';

async function ingresar() {
  fireEvent.change(await screen.findByLabelText('Email'), { target: { value: 'abogado@avexis.demo' } });
  fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'demo avexis 2026' } });
  await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));
}

describe('login', () => {
  it('enters the agenda with the right credentials', async () => {
    const { llamadas } = simularApi({ 'GET /api/auth/me': SIN_SESION, 'POST /api/auth/login': [200, { usuario: ABOGADO }] });
    renderApp('/login');

    await ingresar();

    expect(await screen.findByRole('heading', { name: 'Agenda' })).toBeInTheDocument();
    expect(llamadas.find(({ ruta }) => ruta === 'POST /api/auth/login')?.body).toEqual({ email: 'abogado@avexis.demo', password: 'demo avexis 2026' });
  });

  it('sends a user who must change the password to that page', async () => {
    simularApi({ 'GET /api/auth/me': SIN_SESION, 'POST /api/auth/login': [200, { usuario: { ...ABOGADO, debeCambiarPassword: true } }] });
    renderApp('/login');

    await ingresar();

    expect(await screen.findByRole('heading', { name: 'Cambiar contraseña' })).toBeInTheDocument();
  });

  it.each([
    ['INVALID_CREDENTIALS', 401, 'El email o la contraseña no son correctos.'],
    ['ACCOUNT_DISABLED', 403, 'Tu cuenta está desactivada. Hablá con el titular del estudio.'],
    ['TOO_MANY_REQUESTS', 429, 'Demasiados intentos fallidos. Esperá unos minutos.'],
  ])('shows %s in the form and stays on the page', async (code, status, mensaje) => {
    simularApi({ 'GET /api/auth/me': SIN_SESION, 'POST /api/auth/login': errorDeApi(code, status) });
    renderApp('/login');

    await ingresar();

    expect(await screen.findByText(mensaje)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument();
  });

  it('asks for the fields before calling the API', async () => {
    const { rutasLlamadas } = simularApi({ 'GET /api/auth/me': SIN_SESION });
    renderApp('/login');

    await userEvent.click(await screen.findByRole('button', { name: 'Entrar' }));

    expect(await screen.findByText('Ingresá tu email.')).toBeInTheDocument();
    expect(rutasLlamadas()).not.toContain('POST /api/auth/login');
  });
});
