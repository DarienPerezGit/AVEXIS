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

  describe('2FA code', () => {
    const CODIGO = 'Código de verificación (si activaste el 2FA)';

    it('is on the form from the start, optional, and sent with the password in one request', async () => {
      const api = simularApi({ 'GET /api/auth/me': SIN_SESION, 'POST /api/auth/login': [200, { usuario: ABOGADO }] });
      renderApp('/login');

      fireEvent.change(await screen.findByLabelText('Email'), { target: { value: 'abogado@avexis.demo' } });
      fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'demo avexis 2026' } });
      fireEvent.change(screen.getByLabelText(CODIGO), { target: { value: '123456' } });
      await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));

      expect(await screen.findByRole('heading', { name: 'Agenda' })).toBeInTheDocument();
      const envios = api.llamadas.filter(({ ruta }) => ruta === 'POST /api/auth/login');
      expect(envios).toHaveLength(1);
      expect(envios[0]?.body).toEqual({ email: 'abogado@avexis.demo', password: 'demo avexis 2026', codigo: '123456' });
    });

    it('tells a 2FA account that signs in without the code to type it, and keeps the form', async () => {
      simularApi({ 'GET /api/auth/me': SIN_SESION, 'POST /api/auth/login': [200, { requiereTotp: true }] });
      renderApp('/login');

      await ingresar();

      expect(await screen.findByText('Tu cuenta tiene la verificación en dos pasos activada. Ingresá el código de tu app.')).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Agenda' })).not.toBeInTheDocument();
      expect(screen.getByLabelText(CODIGO)).toHaveFocus();
    });

    it('shows a wrong code in the form', async () => {
      simularApi({ 'GET /api/auth/me': SIN_SESION, 'POST /api/auth/login': errorDeApi('INVALID_TOTP', 401) });
      renderApp('/login');
      fireEvent.change(await screen.findByLabelText('Email'), { target: { value: 'abogado@avexis.demo' } });
      fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'demo avexis 2026' } });
      fireEvent.change(screen.getByLabelText(CODIGO), { target: { value: '000000' } });

      await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));

      expect(await screen.findByText('El código de la app no es correcto o ya venció.')).toBeInTheDocument();
    });

    it('asks for six digits when a code is typed, before calling the API', async () => {
      const { rutasLlamadas } = simularApi({ 'GET /api/auth/me': SIN_SESION });
      renderApp('/login');
      fireEvent.change(await screen.findByLabelText('Email'), { target: { value: 'abogado@avexis.demo' } });
      fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'demo avexis 2026' } });
      fireEvent.change(screen.getByLabelText(CODIGO), { target: { value: '12' } });

      await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));

      expect(await screen.findByText('Son 6 números.')).toBeInTheDocument();
      expect(rutasLlamadas()).not.toContain('POST /api/auth/login');
    });
  });

  it('asks for the fields before calling the API', async () => {
    const { rutasLlamadas } = simularApi({ 'GET /api/auth/me': SIN_SESION });
    renderApp('/login');

    await userEvent.click(await screen.findByRole('button', { name: 'Entrar' }));

    expect(await screen.findByText('Ingresá tu email.')).toBeInTheDocument();
    expect(rutasLlamadas()).not.toContain('POST /api/auth/login');
  });
});
