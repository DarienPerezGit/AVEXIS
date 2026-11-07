import { describe, expect, it, vi } from 'vitest';
import { ApiError, api, configurarSesionVencida } from './api';
import { SIN_SESION, errorDeApi, simularApi } from './test/api';

describe('api', () => {
  it('sends the session cookie and a JSON body, and returns the parsed answer', async () => {
    const { llamadas } = simularApi({ 'POST /api/clientes': [201, { cliente: { nombre: 'Ruben' } }] });

    const res = await api('/clientes', { method: 'POST', body: { nombre: 'Ruben' } });

    expect(res).toEqual({ cliente: { nombre: 'Ruben' } });
    expect(llamadas[0]?.init?.credentials).toBe('include');
    expect(llamadas[0]?.body).toEqual({ nombre: 'Ruben' });
  });

  it('accepts a 204 without a body', async () => {
    simularApi({ 'POST /api/auth/logout': [204] });

    await expect(api('/auth/logout', { method: 'POST' })).resolves.toBeUndefined();
  });

  it('turns an API error into an ApiError with its status, code and details', async () => {
    const details = [{ path: 'email', message: 'Invalid email address' }];
    simularApi({ 'POST /api/clientes': [400, { error: { code: 'VALIDATION_ERROR', message: 'Invalid', details } }] });

    const error = await api('/clientes', { method: 'POST', body: {} }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 400, code: 'VALIDATION_ERROR', details });
  });

  it('does not break when the answer is not JSON, as when the proxy finds the backend stopped', async () => {
    vi.stubGlobal('fetch', async () => new Response('<html>Bad gateway</html>', { status: 502 }));

    await expect(api('/auth/me')).rejects.toMatchObject({ status: 502, code: 'UNEXPECTED_RESPONSE' });
  });

  it('reports a network failure as an ApiError too', async () => {
    vi.stubGlobal('fetch', async () => {
      throw new TypeError('Failed to fetch');
    });

    await expect(api('/auth/me')).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
  });

  it('ends the session on UNAUTHORIZED, but not on a wrong password', async () => {
    const sesionVencida = vi.fn();
    configurarSesionVencida(sesionVencida);
    simularApi({
      'GET /api/expedientes': SIN_SESION,
      'POST /api/auth/login': errorDeApi('INVALID_CREDENTIALS', 401),
    });

    await api('/auth/login', { method: 'POST', body: {} }).catch(() => {});
    expect(sesionVencida).not.toHaveBeenCalled();

    await api('/expedientes').catch(() => {});
    expect(sesionVencida).toHaveBeenCalledOnce();
  });
});
