import { z } from 'zod';

/** Source of the current time. Injected so tests fix the day instead of depending on the real clock. */
export type Clock = () => Date;

export const relojReal: Clock = () => new Date();

/** The firm works in Argentina; procedural days are counted there, not where the server runs. No daylight saving. */
export const ZONA_ESTUDIO = 'America/Argentina/Buenos_Aires';

const DIA_MS = 24 * 60 * 60 * 1000;

// en-CA formats dates as YYYY-MM-DD.
const formatoDia = new Intl.DateTimeFormat('en-CA', { timeZone: ZONA_ESTUDIO, year: 'numeric', month: '2-digit', day: '2-digit' });

/**
 * Today's calendar day at the firm, as UTC midnight: the same shape `Audiencia.fecha` is stored in,
 * so days can be compared and subtracted directly.
 */
export function hoyEnEstudio(ahora: Date) {
  return new Date(`${formatoDia.format(ahora)}T00:00:00Z`);
}

/**
 * A calendar day, `YYYY-MM-DD`, stored as UTC midnight. A hearing is a day plus a local time (`hora`),
 * so a full timestamp is rejected: it would duplicate the time and bring in a time zone.
 */
export const diaCalendario = z.iso.date().transform((dia) => new Date(`${dia}T00:00:00Z`));

/** Due today, tomorrow or the day after: procedural terms are counted in days, so urgency is too. */
export const DIAS_URGENTE = 2;

export const esUrgente = (diasRestantes: number) => diasRestantes <= DIAS_URGENTE;

export const sumarDias = (dia: Date, dias: number) => new Date(dia.getTime() + dias * DIA_MS);

export const diasEntre = (desde: Date, hasta: Date) => Math.round((hasta.getTime() - desde.getTime()) / DIA_MS);
