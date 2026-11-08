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

/** Deleting is only for a client loaded by mistake, and the API leaves it to the firm owner. */
export const puedeEliminarClientes = (usuario: Usuario) => usuario.esTitular;

/** Same rule as the API (ADR 0002): a lawyer opens their own cases; the titular and the assistant, any. */
const actuaSoloSobreLoPropio = (usuario: Usuario) => usuario.rol === 'ABOGADO' && !usuario.esTitular;

/** Whether a case can be opened. A lawyer may attend a hearing on a colleague's case without being able to open it. */
export const puedeVerExpediente = (usuario: Usuario, expediente: { abogadoResponsableId: string }) =>
  !actuaSoloSobreLoPropio(usuario) || expediente.abogadoResponsableId === usuario._id;

/** Choosing who carries a case is a professional decision, so the assistant does not open cases (ADR 0001). */
export const puedeAbrirExpedientes = (usuario: Usuario) => usuario.rol === 'ABOGADO';

/** Whether a case can be edited or archived: by a lawyer who may open it, so the titular or its responsible lawyer. */
export const puedeModificarExpediente = (usuario: Usuario, expediente: { abogadoResponsableId: string }) =>
  puedeAbrirExpedientes(usuario) && puedeVerExpediente(usuario, expediente);

/** Fees are economic data: only lawyers see them. Which cases a lawyer reaches is `puedeVerExpediente`'s rule. */
export const veHonorarios = (usuario: Usuario) => usuario.rol === 'ABOGADO';

/** Whether the case list holds other lawyers' cases, so it is worth showing who carries each. */
export const veTodosLosExpedientes = (usuario: Usuario) => !actuaSoloSobreLoPropio(usuario);

/** Whether a form offers to pick the lawyer. The API always assigns a lawyer's work to themselves. */
export const puedeAsignarAbogado = (usuario: Usuario) => !actuaSoloSobreLoPropio(usuario);
