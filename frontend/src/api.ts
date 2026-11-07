const BASE_URL = import.meta.env.VITE_API_URL ?? '/api';

export interface DetalleDeError {
  path: string;
  message: string;
}

/** An error answered by the API, or `NETWORK_ERROR` / `UNEXPECTED_RESPONSE` when it could not answer properly. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: DetalleDeError[],
  ) {
    super(message);
  }
}

let alVencerLaSesion = () => {};

/** Registers what to do when the API says there is no valid session. Only `UNAUTHORIZED` counts: see `api`. */
export function configurarSesionVencida(accion: () => void) {
  alVencerLaSesion = accion;
}

interface Opciones {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
}

/**
 * The one place that talks to the API. The session travels in an httpOnly cookie, so no token is handled here.
 * A 401 `INVALID_CREDENTIALS` is a wrong password in a form, not an ended session: it reaches the caller as any error.
 */
export async function api<T>(path: string, { method = 'GET', body }: Opciones = {}): Promise<T> {
  const respuesta = await fetch(`${BASE_URL}${path}`, {
    method,
    credentials: 'include',
    ...(body !== undefined && { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  }).catch(() => {
    throw new ApiError(0, 'NETWORK_ERROR', 'The API could not be reached');
  });

  if (respuesta.status === 204) {
    return undefined as T;
  }

  // A proxy answering for a stopped backend sends HTML, so the body cannot be trusted to be JSON.
  const datos = await respuesta.json().catch(() => null);
  if (datos === null) {
    throw new ApiError(respuesta.status, 'UNEXPECTED_RESPONSE', 'The API answered something that is not JSON');
  }
  if (!respuesta.ok) {
    const { code, message, details } = datos.error;
    if (code === 'UNAUTHORIZED') {
      alVencerLaSesion();
    }
    throw new ApiError(respuesta.status, code, message, details);
  }
  return datos as T;
}
