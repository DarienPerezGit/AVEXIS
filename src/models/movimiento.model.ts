import { Schema, type Types, model } from 'mongoose'

export const MOVIMIENTO_TIPOS = [
  'ESCRITO',
  'RESOLUCION',
  'NOTIFICACION',
  'AUDIENCIA',
  'OTRO',
] as const

export type MovimientoTipo = (typeof MOVIMIENTO_TIPOS)[number]

export interface MovimientoDoc {
  expedienteId: Types.ObjectId
  usuarioId: Types.ObjectId
  tipo: MovimientoTipo
  descripcion: string
  fecha: Date
}

const movimientoSchema = new Schema<MovimientoDoc>(
  {
    expedienteId: { type: Schema.Types.ObjectId, ref: 'Expediente', required: true },
    usuarioId: { type: Schema.Types.ObjectId, ref: 'Usuario', required: true },
    tipo: { type: String, enum: MOVIMIENTO_TIPOS, required: true },
    descripcion: { type: String, trim: true, required: true },
    fecha: { type: Date, default: Date.now },
  },
  { timestamps: true },
)

movimientoSchema.index({ expedienteId: 1, fecha: -1 })

export const Movimiento = model<MovimientoDoc>('Movimiento', movimientoSchema)
