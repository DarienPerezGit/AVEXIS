import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { errorDeApi, simularApi } from '../test/api';
import { renderApp } from '../test/render';
import { ABOGADO } from '../test/usuarios';

const NUEVA = 'una contraseña bien larga';
const CAMBIO = 'PATCH /api/auth/me/password';
const PENDIENTE = { ...ABOGADO, debeCambiarPassword: true };

async function completar(actual: string, nueva: string, confirmacion: string) {
  fireEvent.change(await screen.findByLabelText('Contraseña actual'), { target: { value: actual } });
  fireEvent.change(screen.getByLabelText('Contraseña nueva'), { target: { value: nueva } });
  fireEvent.change(screen.getByLabelText('Repetir contraseña nueva'), { target: { value: confirmacion } });
  await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));
}

describe('password change', () => {
  it.each([
    ['too short', 'corta', 'corta', 'Debe tener entre 15 y 64 caracteres.'],
    ['too long', 'x'.repeat(65), 'x'.repeat(65), 'Debe tener entre 15 y 64 caracteres.'],
    ['a different confirmation', NUEVA, 'otra contraseña bien larga', 'Las contraseñas no coinciden.'],
  ])('rejects %s without calling the API', async (_caso, nueva, confirmacion, mensaje) => {
    const { rutasLlamadas } = simularApi({ 'GET /api/auth/me': [200, { usuario: PENDIENTE }] });
    renderApp('/cambiar-password');

    await completar('la actual', nueva, confirmacion);

    expect(await screen.findByText(mensaje)).toBeInTheDocument();
    expect(rutasLlamadas()).not.toContain(CAMBIO);
  });

  it('shows a wrong current password in the form and does not leave the page', async () => {
    simularApi({ 'GET /api/auth/me': [200, { usuario: PENDIENTE }], [CAMBIO]: errorDeApi('INVALID_CREDENTIALS', 401) });
    renderApp('/cambiar-password');

    await completar('la equivocada', NUEVA, NUEVA);

    expect(await screen.findByText('La contraseña actual no es correcta.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Cambiar contraseña' })).toBeInTheDocument();
  });

  it('asks for the user again and enters the agenda once changed', async () => {
    const simulada = simularApi({ 'GET /api/auth/me': [200, { usuario: PENDIENTE }], [CAMBIO]: [204] });
    renderApp('/cambiar-password');
    await screen.findByLabelText('Contraseña actual');
    simulada.rutas['GET /api/auth/me'] = [200, { usuario: ABOGADO }];

    await completar('la actual', NUEVA, NUEVA);

    expect(await screen.findByRole('heading', { name: 'Agenda' })).toBeInTheDocument();
    expect(simulada.llamadas.find(({ ruta }) => ruta === CAMBIO)?.body).toEqual({ actual: 'la actual', nueva: NUEVA });
    expect(simulada.rutasLlamadas().filter((ruta) => ruta === 'GET /api/auth/me')).toHaveLength(2);
  });

  it('reports a failure reading the user again, without claiming success or ending the session', async () => {
    const simulada = simularApi({ 'GET /api/auth/me': [200, { usuario: PENDIENTE }], [CAMBIO]: [204] });
    renderApp('/cambiar-password');
    await screen.findByLabelText('Contraseña actual');
    simulada.rutas['GET /api/auth/me'] = errorDeApi('INTERNAL_ERROR', 500);

    await completar('la actual', NUEVA, NUEVA);

    expect(await screen.findByText('Algo salió mal. Intentá de nuevo.')).toBeInTheDocument();
    expect(screen.queryByText('Contraseña actualizada.')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Cambiar contraseña' })).toBeInTheDocument();
  });

  it('offers only the logout to a user forced to change it', async () => {
    const simulada = simularApi({ 'GET /api/auth/me': [200, { usuario: PENDIENTE }], 'POST /api/auth/logout': [204] });
    renderApp('/cambiar-password');

    await userEvent.click(await screen.findByRole('button', { name: 'Cerrar sesión' }));

    expect(await screen.findByRole('button', { name: 'Entrar' })).toBeInTheDocument();
    await waitFor(() => expect(simulada.rutasLlamadas()).toContain('POST /api/auth/logout'));
  });
});
