import { Schema, type Types, model } from 'mongoose'

export const FUEROS = [
  'CIVIL',
  'LABORAL',
  'PENAL',
  'COMERCIAL',
  'FAMILIA',
  'ADMINISTRATIVO',
] as const

export const EXPEDIENTE_ESTADOS = ['EN_TRAMITE', 'EN_ESPERA', 'ARCHIVADO'] as const

export type Fuero = (typeof FUEROS)[number]

export type ExpedienteEstado = (typeof EXPEDIENTE_ESTADOS)[number]

export interface ExpedienteDoc {
  numero: string
  caratula: string
  fuero: Fuero
  estado: ExpedienteEstado
  clienteId: Types.ObjectId
  abogadoResponsableId: Types.ObjectId
  fechaInicio: Date
  observaciones?: string
}

const expedienteSchema = new Schema<ExpedienteDoc>(
  {
    numero: { type: String, required: true, unique: true, trim: true },
    caratula: { type: String, required: true, trim: true },
    fuero: { type: String, required: true, enum: FUEROS },
    estado: { type: String, enum: EXPEDIENTE_ESTADOS, default: 'EN_TRAMITE' },
    clienteId: { type: Schema.Types.ObjectId, ref: 'Cliente', required: true },
    abogadoResponsableId: { type: Schema.Types.ObjectId, ref: 'Usuario', required: true },
    fechaInicio: { type: Date, default: Date.now },
    observaciones: { type: String, trim: true },
  },
  { timestamps: true },
)

expedienteSchema.index({ estado: 1, fuero: 1 })
expedienteSchema.index({ abogadoResponsableId: 1 })
expedienteSchema.index({ caratula: 'text' })

export const Expediente = model<ExpedienteDoc>('Expediente', expedienteSchema)
