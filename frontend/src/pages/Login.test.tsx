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

  describe('with 2FA on', () => {
    const CODIGO = 'Código de la app de autenticación';

    it('asks for the app code after the password and enters with it', async () => {
      const api = simularApi({ 'GET /api/auth/me': SIN_SESION, 'POST /api/auth/login': [200, { requiereTotp: true }] });
      renderApp('/login');

      await ingresar();
      const campo = await screen.findByLabelText(CODIGO);
      expect(screen.queryByRole('heading', { name: 'Agenda' })).not.toBeInTheDocument();

      api.rutas['POST /api/auth/login'] = [200, { usuario: ABOGADO }];
      fireEvent.change(campo, { target: { value: '123456' } });
      await userEvent.click(screen.getByRole('button', { name: 'Verificar' }));

      expect(await screen.findByRole('heading', { name: 'Agenda' })).toBeInTheDocument();
      const envios = api.llamadas.filter(({ ruta }) => ruta === 'POST /api/auth/login');
      expect(envios[1]?.body).toEqual({ email: 'abogado@avexis.demo', password: 'demo avexis 2026', codigo: '123456' });
    });

    it('shows a wrong code and keeps asking for it', async () => {
      const api = simularApi({ 'GET /api/auth/me': SIN_SESION, 'POST /api/auth/login': [200, { requiereTotp: true }] });
      renderApp('/login');
      await ingresar();
      const campo = await screen.findByLabelText(CODIGO);

      api.rutas['POST /api/auth/login'] = errorDeApi('INVALID_TOTP', 401);
      fireEvent.change(campo, { target: { value: '000000' } });
      await userEvent.click(screen.getByRole('button', { name: 'Verificar' }));

      expect(await screen.findByText('El código de la app no es correcto o ya venció.')).toBeInTheDocument();
      expect(screen.getByLabelText(CODIGO)).toBeInTheDocument();
    });

    it('asks for six digits before sending the code', async () => {
      const api = simularApi({ 'GET /api/auth/me': SIN_SESION, 'POST /api/auth/login': [200, { requiereTotp: true }] });
      renderApp('/login');
      await ingresar();
      fireEvent.change(await screen.findByLabelText(CODIGO), { target: { value: '12' } });

      await userEvent.click(screen.getByRole('button', { name: 'Verificar' }));

      expect(await screen.findByText('Son 6 números.')).toBeInTheDocument();
      expect(api.llamadas.filter(({ ruta }) => ruta === 'POST /api/auth/login')).toHaveLength(1);
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
