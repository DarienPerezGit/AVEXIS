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

/** Same rule as the API (ADR 0002): a lawyer opens their own cases; the titular and the assistant, any. */
const actuaSoloSobreLoPropio = (usuario: Usuario) => usuario.rol === 'ABOGADO' && !usuario.esTitular;

/** Whether a case can be opened. A lawyer may attend a hearing on a colleague's case without being able to open it. */
export const puedeVerExpediente = (usuario: Usuario, expediente: { abogadoResponsableId: string }) =>
  !actuaSoloSobreLoPropio(usuario) || expediente.abogadoResponsableId === usuario._id;

/** Whether a form offers to pick the lawyer. The API always assigns a lawyer's work to themselves. */
export const puedeAsignarAbogado = (usuario: Usuario) => !actuaSoloSobreLoPropio(usuario);
