import { vi } from 'vitest';

type Respuesta = [status: number, cuerpo?: unknown];

export const errorDeApi = (code: string, status: number): Respuesta => [status, { error: { code, message: 'English text' } }];

export const SIN_SESION = errorDeApi('UNAUTHORIZED', 401);

/** The agenda is the home page, so every test that lands there gets an empty one unless it says otherwise. */
const AGENDA_VACIA: Record<string, Respuesta> = {
  'GET /api/audiencias': [200, { audiencias: [] }],
  'GET /api/audiencias/proximas': [200, { audiencias: [] }],
};

/**
 * Replaces `fetch`, the boundary with the API, so tests render real components against answers of the real shape.
 * `rutas` maps "METHOD /api/path" to its answer and can change during a test.
 */
export function simularApi(propias: Record<string, Respuesta>) {
  const rutas = { ...AGENDA_VACIA, ...propias };
  const llamadas: { ruta: string; body: unknown; init?: RequestInit }[] = [];

  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    const ruta = `${init?.method ?? 'GET'} ${url}`;
    llamadas.push({ ruta, init, body: init?.body ? JSON.parse(init.body as string) : undefined });
    const [status, cuerpo] = rutas[ruta] ?? errorDeApi('NOT_FOUND', 404);
    return new Response(cuerpo === undefined ? null : JSON.stringify(cuerpo), { status });
  });

  return { rutas, llamadas, rutasLlamadas: () => llamadas.map((llamada) => llamada.ruta) };
}

