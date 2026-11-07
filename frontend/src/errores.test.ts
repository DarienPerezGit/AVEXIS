import { describe, expect, it } from 'vitest';
import { ApiError } from './api';
import { camposConError, mensajeDeError } from './errores';

const GENERICO = 'Algo salió mal. Intentá de nuevo.';

describe('mensajeDeError', () => {
  it.each([
    ['INVALID_CREDENTIALS', 401, 'El email o la contraseña no son correctos.'],
    ['ACCOUNT_DISABLED', 403, 'Tu cuenta está desactivada. Hablá con el titular del estudio.'],
    ['TOO_MANY_REQUESTS', 429, 'Demasiados intentos fallidos. Esperá unos minutos.'],
    ['DUPLICATE_KEY', 409, 'Ya existe un registro con esos datos.'],
  ])('translates %s by its code, whatever the English message says', (code, status, expected) => {
    expect(mensajeDeError(new ApiError(status, code, 'Some English text'))).toBe(expected);
  });

  it('lets a form say something more precise for a code', () => {
    const error = new ApiError(401, 'INVALID_CREDENTIALS', 'Current password is wrong');

    expect(mensajeDeError(error, { INVALID_CREDENTIALS: 'La contraseña actual no es correcta.' })).toBe('La contraseña actual no es correcta.');
  });

  it('falls back to a generic message for an unknown code, a server error or anything that is not an API error', () => {
    expect(mensajeDeError(new ApiError(400, 'SOMETHING_NEW', 'x'))).toBe(GENERICO);
    expect(mensajeDeError(new ApiError(500, 'INTERNAL_ERROR', 'x'))).toBe(GENERICO);
    expect(mensajeDeError(new Error('boom'))).toBe(GENERICO);
  });

  it('answers a validation error without details, as the password policy sends it', () => {
    expect(mensajeDeError(new ApiError(400, 'VALIDATION_ERROR', 'Password too short'))).toBe('Revisá los datos ingresados.');
  });
});

describe('camposConError', () => {
  it('marks each field of a validation error with a generic Spanish text, since details come in English', () => {
    const error = new ApiError(400, 'VALIDATION_ERROR', 'Invalid request data', [
      { path: 'email', message: 'Invalid email address' },
      { path: 'domicilio.calle', message: 'Required' },
    ]);

    expect(camposConError(error)).toEqual([
      { name: ['email'], errors: ['Revisá este campo.'] },
      { name: ['domicilio', 'calle'], errors: ['Revisá este campo.'] },
    ]);
  });

  it('marks nothing for an error without details', () => {
    expect(camposConError(new ApiError(400, 'VALIDATION_ERROR', 'Password too short'))).toEqual([]);
    expect(camposConError(new Error('boom'))).toEqual([]);
  });
});
