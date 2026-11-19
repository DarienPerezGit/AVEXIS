import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { errorDeApi, simularApi } from '../test/api';
import { renderApp } from '../test/render';
import { ABOGADO } from '../test/usuarios';

const ALTA = { otpauthUrl: 'otpauth://totp/AVEXIS:x', qr: 'data:image/png;base64,AAAA', secret: 'JBSWY3DPEHPK3PXP' };
const CON_TOTP = { ...ABOGADO, totpActivo: true };

async function escribirCodigo(codigo: string) {
  fireEvent.change(await screen.findByLabelText('Código'), { target: { value: codigo } });
}

describe('seguridad', () => {
  it('walks through enabling 2FA: the QR and the key, then the code', async () => {
    const api = simularApi({
      'GET /api/auth/me': [200, { usuario: ABOGADO }],
      'POST /api/auth/me/2fa/setup': [200, ALTA],
      'POST /api/auth/me/2fa/enable': [200, { usuario: CON_TOTP }],
    });
    renderApp('/seguridad');
    expect(await screen.findByText('Desactivada')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Activar' }));
    expect(await screen.findByAltText('Código QR para la app de autenticación')).toHaveAttribute('src', ALTA.qr);
    expect(screen.getByText(ALTA.secret)).toBeInTheDocument();

    api.rutas['GET /api/auth/me'] = [200, { usuario: CON_TOTP }];
    await escribirCodigo('123456');
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }));

    expect(await screen.findByText('Activada')).toBeInTheDocument();
    expect(api.llamadas.find(({ ruta }) => ruta === 'POST /api/auth/me/2fa/enable')?.body).toEqual({ codigo: '123456' });
  });

  it('shows a wrong code in the form and keeps the QR to try again', async () => {
    simularApi({
      'GET /api/auth/me': [200, { usuario: ABOGADO }],
      'POST /api/auth/me/2fa/setup': [200, ALTA],
      'POST /api/auth/me/2fa/enable': errorDeApi('INVALID_TOTP', 401),
    });
    renderApp('/seguridad');
    await userEvent.click(await screen.findByRole('button', { name: 'Activar' }));
    await escribirCodigo('000000');

    await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }));

    expect(await screen.findByText('El código de la app no es correcto o ya venció.')).toBeInTheDocument();
    expect(screen.getByAltText('Código QR para la app de autenticación')).toBeInTheDocument();
  });

  it('asks for six digits before calling the API, and Cancelar goes back', async () => {
    const { rutasLlamadas } = simularApi({ 'GET /api/auth/me': [200, { usuario: ABOGADO }], 'POST /api/auth/me/2fa/setup': [200, ALTA] });
    renderApp('/seguridad');
    await userEvent.click(await screen.findByRole('button', { name: 'Activar' }));
    await escribirCodigo('12ab');

    await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }));

    expect(await screen.findByText('Son 6 números.')).toBeInTheDocument();
    expect(rutasLlamadas()).not.toContain('POST /api/auth/me/2fa/enable');
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByRole('button', { name: 'Activar' })).toBeInTheDocument();
  });

  it('shows a setup that fails', async () => {
    simularApi({ 'GET /api/auth/me': [200, { usuario: ABOGADO }], 'POST /api/auth/me/2fa/setup': errorDeApi('TOTP_ALREADY_ENABLED', 409) });
    renderApp('/seguridad');

    await userEvent.click(await screen.findByRole('button', { name: 'Activar' }));

    expect(await screen.findByText('La verificación en dos pasos ya está activada.')).toBeInTheDocument();
  });

  it('disables 2FA with the password and a code', async () => {
    const api = simularApi({
      'GET /api/auth/me': [200, { usuario: CON_TOTP }],
      'POST /api/auth/me/2fa/disable': [200, { usuario: ABOGADO }],
    });
    renderApp('/seguridad');
    expect(await screen.findByText('Activada')).toBeInTheDocument();

    api.rutas['GET /api/auth/me'] = [200, { usuario: ABOGADO }];
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'demo avexis 2026' } });
    await escribirCodigo('123456');
    await userEvent.click(screen.getByRole('button', { name: 'Desactivar' }));

    expect(await screen.findByText('Desactivada')).toBeInTheDocument();
    expect(api.llamadas.find(({ ruta }) => ruta === 'POST /api/auth/me/2fa/disable')?.body).toEqual({ password: 'demo avexis 2026', codigo: '123456' });
  });

  it('says the password is wrong when disabling with a bad one', async () => {
    simularApi({ 'GET /api/auth/me': [200, { usuario: CON_TOTP }], 'POST /api/auth/me/2fa/disable': errorDeApi('INVALID_CREDENTIALS', 401) });
    renderApp('/seguridad');
    fireEvent.change(await screen.findByLabelText('Contraseña'), { target: { value: 'otra' } });
    await escribirCodigo('123456');

    await userEvent.click(screen.getByRole('button', { name: 'Desactivar' }));

    expect(await screen.findByText('La contraseña no es correcta.')).toBeInTheDocument();
  });
});
