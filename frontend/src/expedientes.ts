import dayjs from 'dayjs';

/**
 * `DD/MM/YYYY` of an instant (a case's start, a movimiento, a payment), on the browser's clock. Unlike a hearing's
 * day, these are real instants, so `slice(0, 10)` would show the UTC day: after 21:00 in Argentina, tomorrow.
 */
export const fechaDe = (instante: string) => dayjs(instante).format('DD/MM/YYYY');

/** The instant a form's `YYYY-MM-DD` stands for: that day's local midnight, so `fechaDe` shows the same day back. */
export const instanteDe = (dia: string) => dayjs(dia).toISOString();

export type Fuero = 'CIVIL' | 'LABORAL' | 'PENAL' | 'COMERCIAL' | 'FAMILIA' | 'ADMINISTRATIVO';
export type EstadoExpediente = 'EN_TRAMITE' | 'EN_ESPERA' | 'ARCHIVADO';

/** A case as `GET /api/expedientes` answers it, with its client and lawyer expanded. */
export interface Expediente {
  _id: string;
  numero: string;
  caratula: string;
  fuero: Fuero;
  estado: EstadoExpediente;
  clienteId: { _id: string; nombre: string };
  abogadoResponsableId: { _id: string; nombre: string };
  fechaInicio: string;
  observaciones?: string;
}

export const FUEROS: Record<Fuero, { etiqueta: string }> = {
  CIVIL: { etiqueta: 'Civil' },
  LABORAL: { etiqueta: 'Laboral' },
  PENAL: { etiqueta: 'Penal' },
  COMERCIAL: { etiqueta: 'Comercial' },
  FAMILIA: { etiqueta: 'Familia' },
  ADMINISTRATIVO: { etiqueta: 'Administrativo' },
};

export type TipoMovimiento = 'ESCRITO' | 'RESOLUCION' | 'NOTIFICACION' | 'CEDULA' | 'OFICIO' | 'AUDIENCIA' | 'OTRO';

/** An entry of a case's history, as `GET /api/expedientes/:id/movimientos` answers it. */
export interface Movimiento {
  _id: string;
  tipo: TipoMovimiento;
  descripcion: string;
  fecha: string;
  usuarioId: { _id: string; nombre: string };
}

export const TIPOS_MOVIMIENTO: Record<TipoMovimiento, { etiqueta: string }> = {
  ESCRITO: { etiqueta: 'Escrito' },
  RESOLUCION: { etiqueta: 'Resolución' },
  NOTIFICACION: { etiqueta: 'Notificación' },
  CEDULA: { etiqueta: 'Cédula' },
  OFICIO: { etiqueta: 'Oficio' },
  AUDIENCIA: { etiqueta: 'Audiencia' },
  OTRO: { etiqueta: 'Otro' },
};

export type EstadoHonorario = 'PENDIENTE' | 'PARCIAL' | 'PAGADO';

/** A case's fee as `GET /api/expedientes/:id/honorario` answers it. The API derives what was paid, the balance and the estado. */
export interface Honorario {
  _id: string;
  montoPactado: number;
  montoPagado: number;
  saldo: number;
  estado: EstadoHonorario;
  pagos: { _id: string; monto: number; fecha: string; usuarioId: { _id: string; nombre: string } }[];
}

export const ESTADOS_HONORARIO: Record<EstadoHonorario, { etiqueta: string; color: string }> = {
  PENDIENTE: { etiqueta: 'Pendiente', color: 'gold' },
  PARCIAL: { etiqueta: 'Parcial', color: 'blue' },
  PAGADO: { etiqueta: 'Pagado', color: 'green' },
};

const PESOS = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' });

/** "$ 500.000,00". */
export const pesos = (monto: number) => PESOS.format(monto);

export const ESTADOS_EXPEDIENTE: Record<EstadoExpediente, { etiqueta: string; color: string }> = {
  EN_TRAMITE: { etiqueta: 'En trámite', color: 'blue' },
  EN_ESPERA: { etiqueta: 'En espera', color: 'gold' },
  ARCHIVADO: { etiqueta: 'Archivado', color: 'default' },
};
