import { Schema, model } from 'mongoose'

export const ROLES = ['ABOGADO', 'ASISTENTE'] as const

export type Rol = (typeof ROLES)[number]

export interface UsuarioDoc {
  nombre: string
  email: string
  passwordHash: string
  rol: Rol
  activo: boolean
}

const usuarioSchema = new Schema<UsuarioDoc>(
  {
    nombre: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    passwordHash: { type: String, required: true, select: false },
    rol: { type: String, required: true, enum: ROLES },
    activo: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform: (_doc, ret: Record<string, unknown>) => {
        delete ret.passwordHash
        delete ret.__v
        return ret
      },
    },
  },
)

export const Usuario = model<UsuarioDoc>('Usuario', usuarioSchema)
