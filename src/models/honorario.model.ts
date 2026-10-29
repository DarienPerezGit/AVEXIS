import { Schema, type Types, model } from 'mongoose'

export const HONORARIO_ESTADOS = ['PENDIENTE', 'PARCIAL', 'PAGADO'] as const

export type HonorarioEstado = (typeof HONORARIO_ESTADOS)[number]

export interface PagoDoc {
  monto: number
  fecha: Date
  usuarioId: Types.ObjectId
}

export interface HonorarioDoc {
  expedienteId: Types.ObjectId
  montoPactado: number
  pagos: PagoDoc[]
  estado: HonorarioEstado
  /** Derived virtual exposing the sum of pagos; never persisted. */
  readonly montoPagado?: number
}

const pagoSchema = new Schema<PagoDoc>(
  {
    monto: { type: Number, required: true, min: 0.01 },
    fecha: { type: Date, default: Date.now },
    usuarioId: { type: Schema.Types.ObjectId, ref: 'Usuario', required: true },
  },
  { _id: false },
)

const honorarioSchema = new Schema<HonorarioDoc>(
  {
    expedienteId: { type: Schema.Types.ObjectId, ref: 'Expediente', required: true, unique: true },
    montoPactado: { type: Number, required: true, min: 0 },
    pagos: { type: [pagoSchema], default: [] },
    estado: { type: String, enum: HONORARIO_ESTADOS, default: 'PENDIENTE' },
  },
  { timestamps: true },
)

const sumPayments = (pagos: PagoDoc[]): number =>
  pagos.reduce((total, pago) => total + (pago.monto ?? 0), 0)

honorarioSchema
  .virtual('montoPagado')
  .get(function () {
    return sumPayments(this.pagos)
  })

honorarioSchema.pre('validate', function (next) {
  const paid = sumPayments(this.pagos)

  if (paid <= 0) {
    this.estado = 'PENDIENTE'
  } else if (paid < this.montoPactado) {
    this.estado = 'PARCIAL'
  } else {
    this.estado = 'PAGADO'
  }

  next()
})

export const Honorario = model<HonorarioDoc>('Honorario', honorarioSchema)
