import dayjs from 'dayjs';
import 'dayjs/locale/es';

dayjs.locale('es');

export type TipoAudiencia = 'AUDIENCIA' | 'VENCIMIENTO' | 'PERICIA';
export type EstadoAudiencia = 'PENDIENTE' | 'REALIZADA' | 'CANCELADA';

/** A hearing as `GET /api/audiencias` answers it, with its case and attendee expanded. */
export interface Audiencia {
  _id: string;
  expedienteId: { _id: string; numero: string; caratula: string; abogadoResponsableId: string };
  abogadoId: { _id: string; nombre: string };
  /** A calendar day stored as UTC midnight. Read it with `diaDe`. */
  fecha: string;
  hora: string;
  tipo: TipoAudiencia;
  estado: EstadoAudiencia;
  esVencimientoFatal: boolean;
}

/** An item of the alert: days are counted by the API, in the firm's zone (ADR 0003). */
export interface Proxima extends Audiencia {
  diasRestantes: number;
  urgente: boolean;
}

/**
 * The day of a hearing, `YYYY-MM-DD`. Its first 10 characters, never `new Date(fecha)`: that instant is UTC midnight,
 * which in Argentina is still the day before.
 */
export const diaDe = (audiencia: Audiencia) => audiencia.fecha.slice(0, 10);

/** `DD/MM/YYYY`, from a `YYYY-MM-DD` day. */
export const fechaCorta = (dia: string) => dia.split('-').reverse().join('/');

/** "Martes 10 de noviembre". dayjs reads a bare `YYYY-MM-DD` as a local day, so no zone shifts it. */
export function fechaLarga(dia: string) {
  const texto = dayjs(dia).format('dddd D [de] MMMM');
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/**
 * The first party of a carátula, short enough for a calendar cell: "Perez, Juan c/ Acme SA s/ despido" and
 * "Acosta, Sofia s/ sucesion" (a case with no defendant) are "Perez, Juan" and "Acosta, Sofia".
 */
export const caratulaCorta = (caratula: string) => caratula.split(/\s+[cs]\/\s*/i)[0];

export const TIPOS: Record<TipoAudiencia, { etiqueta: string; color: string }> = {
  AUDIENCIA: { etiqueta: 'Audiencia', color: 'blue' },
  VENCIMIENTO: { etiqueta: 'Vencimiento', color: 'orange' },
  PERICIA: { etiqueta: 'Pericia', color: 'purple' },
};

export const ESTADOS: Record<EstadoAudiencia, { etiqueta: string; color: string }> = {
  PENDIENTE: { etiqueta: 'Pendiente', color: 'gold' },
  REALIZADA: { etiqueta: 'Realizada', color: 'green' },
  CANCELADA: { etiqueta: 'Cancelada', color: 'default' },
};
