import type { Usuario } from './permisos';

export type Rol = Usuario['rol'];

export const ROLES: Record<Rol, { etiqueta: string }> = {
  ABOGADO: { etiqueta: 'Abogado' },
  ASISTENTE: { etiqueta: 'Asistente' },
};

/** The API's password policy (backend/src/auth/password.ts), checked here only to answer before sending. */
export const LONGITUD_CONTRASENA = { min: 15, max: 64, message: 'Debe tener entre 15 y 64 caracteres.' };
