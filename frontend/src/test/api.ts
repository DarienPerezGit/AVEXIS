import { vi } from 'vitest';

type Respuesta = [status: number, cuerpo?: unknown];

const error = (code: string, status: number): Respuesta => [status, { error: { code, message: 'English text' } }];

export const SIN_SESION = error('UNAUTHORIZED', 401);

/**
 * Replaces `fetch`, the boundary with the API, so tests render real components against answers of the real shape.
 * `rutas` maps "METHOD /api/path" to its answer and can change during a test.
 */
export function simularApi(rutas: Record<string, Respuesta>) {
  const llamadas: { ruta: string; body: unknown; init?: RequestInit }[] = [];

  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    const ruta = `${init?.method ?? 'GET'} ${url}`;
    llamadas.push({ ruta, init, body: init?.body ? JSON.parse(init.body as string) : undefined });
    const [status, cuerpo] = rutas[ruta] ?? error('NOT_FOUND', 404);
    return new Response(cuerpo === undefined ? null : JSON.stringify(cuerpo), { status });
  });

  return { rutas, llamadas, rutasLlamadas: () => llamadas.map((llamada) => llamada.ruta) };
}

export { error as errorDeApi };
