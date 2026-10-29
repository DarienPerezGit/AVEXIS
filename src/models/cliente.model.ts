import { Schema, model } from 'mongoose'

export const CLIENTE_TIPOS = ['FISICA', 'JURIDICA'] as const

export type ClienteTipo = (typeof CLIENTE_TIPOS)[number]

export interface ClienteDoc {
  tipo: ClienteTipo
  nombre: string
  dni?: string
  cuit?: string
  email: string
  telefono: string
  direccion?: string
}

const clienteSchema = new Schema<ClienteDoc>(
  {
    tipo: { type: String, required: true, enum: CLIENTE_TIPOS },
    nombre: { type: String, required: true, trim: true },
    dni: { type: String, trim: true, unique: true, sparse: true },
    cuit: { type: String, trim: true, unique: true, sparse: true },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    telefono: { type: String, required: true, trim: true },
    direccion: { type: String, trim: true },
  },
  { timestamps: true },
)

clienteSchema.pre('validate', function (next) {
  if (this.tipo === 'FISICA' && !this.dni) {
    this.invalidate('dni', 'dni is required when tipo is FISICA', this.dni)
  }

  if (this.tipo === 'JURIDICA' && !this.cuit) {
    this.invalidate('cuit', 'cuit is required when tipo is JURIDICA', this.cuit)
  }

  next()
})

export const Cliente = model<ClienteDoc>('Cliente', clienteSchema)
