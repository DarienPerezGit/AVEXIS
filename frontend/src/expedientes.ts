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

export const ESTADOS_EXPEDIENTE: Record<EstadoExpediente, { etiqueta: string; color: string }> = {
  EN_TRAMITE: { etiqueta: 'En trámite', color: 'blue' },
  EN_ESPERA: { etiqueta: 'En espera', color: 'gold' },
  ARCHIVADO: { etiqueta: 'Archivado', color: 'default' },
};
