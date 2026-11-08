export type TipoCliente = 'FISICA' | 'JURIDICA';

export interface Cliente {
  _id: string;
  tipo: TipoCliente;
  nombre: string;
  dni?: string;
  cuit?: string;
  email: string;
  telefono: string;
  direccion?: string;
}

export const TIPOS_CLIENTE: Record<TipoCliente, { etiqueta: string }> = {
  FISICA: { etiqueta: 'Persona física' },
  JURIDICA: { etiqueta: 'Persona jurídica' },
};
