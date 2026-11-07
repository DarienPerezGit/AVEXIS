export interface Usuario {
  _id: string;
  nombre: string;
  email: string;
  rol: 'ABOGADO' | 'ASISTENTE';
  esTitular: boolean;
  activo: boolean;
  debeCambiarPassword: boolean;
}

/**
 * What each profile can do, in one place. This only hides what a role cannot use: the API enforces the real
 * permissions (ADR 0002), so nothing here is a security check.
 */
export const puedeAdministrarUsuarios = (usuario: Usuario) => usuario.esTitular;
