import { Schema, type Types, model } from 'mongoose'

export const AUDIENCIA_TIPOS = ['AUDIENCIA', 'VENCIMIENTO', 'PERICIA'] as const

export const AUDIENCIA_ESTADOS = ['PENDIENTE', 'REALIZADA', 'CANCELADA'] as const

export type AudienciaTipo = (typeof AUDIENCIA_TIPOS)[number]

export type AudienciaEstado = (typeof AUDIENCIA_ESTADOS)[number]

export interface AudienciaDoc {
  expedienteId: Types.ObjectId
  abogadoId: Types.ObjectId
  fecha: Date
  hora: string
  tipo: AudienciaTipo
  estado: AudienciaEstado
  esVencimientoFatal: boolean
}

const audienciaSchema = new Schema<AudienciaDoc>(
  {
    expedienteId: { type: Schema.Types.ObjectId, ref: 'Expediente', required: true },
    abogadoId: { type: Schema.Types.ObjectId, ref: 'Usuario', required: true },
    fecha: { type: Date, required: true },
    hora: {
      type: String,
      required: true,
      match: /^([01]\d|2[0-3]):[0-5]\d$/,
    },
    tipo: { type: String, enum: AUDIENCIA_TIPOS, required: true },
    estado: { type: String, enum: AUDIENCIA_ESTADOS, default: 'PENDIENTE' },
    esVencimientoFatal: { type: Boolean, default: false },
  },
  { timestamps: true },
)

audienciaSchema.index({ fecha: 1 })

export const Audiencia = model<AudienciaDoc>('Audiencia', audienciaSchema)
