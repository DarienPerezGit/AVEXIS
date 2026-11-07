import { ApiError } from './api';

const GENERICO = 'Algo salió mal. Intentá de nuevo.';

/** Translated by `code`, the stable contract of the API; its `message` is English text meant for developers. */
const MENSAJES: Record<string, string> = {
  INVALID_CREDENTIALS: 'El email o la contraseña no son correctos.',
  ACCOUNT_DISABLED: 'Tu cuenta está desactivada. Hablá con el titular del estudio.',
  TOO_MANY_REQUESTS: 'Demasiados intentos fallidos. Esperá unos minutos.',
  VALIDATION_ERROR: 'Revisá los datos ingresados.',
  DUPLICATE_KEY: 'Ya existe un registro con esos datos.',
  FORBIDDEN: 'No tenés permiso para hacer esto.',
  NOT_FOUND: 'No se encontró lo que buscabas.',
  UNAUTHORIZED: 'Tu sesión terminó. Volvé a entrar.',
  CLIENTE_HAS_EXPEDIENTES: 'No se puede eliminar un cliente que tiene expedientes.',
  CANNOT_CHANGE_OWN_ACCESS: 'No podés cambiar tu propio acceso.',
};

/** The Spanish message for an error. `propios` lets a form be more precise about a code. */
export function mensajeDeError(error: unknown, propios: Record<string, string> = {}): string {
  if (!(error instanceof ApiError)) {
    return GENERICO;
  }
  return propios[error.code] ?? MENSAJES[error.code] ?? GENERICO;
}

/** The invalid fields of a 400, in the shape of Ant Design's `form.setFields`. */
export function camposConError(error: unknown) {
  if (!(error instanceof ApiError)) {
    return [];
  }
  return (error.details ?? []).map(({ path }) => ({ name: path.split('.'), errors: ['Revisá este campo.'] }));
}
