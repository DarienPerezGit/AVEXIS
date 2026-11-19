import { Schema, model } from 'mongoose'

export const ROLES = ['ABOGADO', 'ASISTENTE'] as const

export type Rol = (typeof ROLES)[number]

export interface UsuarioDoc {
  nombre: string
  email: string
  passwordHash: string
  rol: Rol
  /** Firm owner: an ABOGADO who also manages the firm's users. */
  esTitular: boolean
  activo: boolean
  /** Set on creation and on reset, so the user must pick a password only they know. */
  debeCambiarPassword: boolean
  /** Travels in every token; bumping it on a password change or reset invalidates all earlier tokens. */
  versionSesion: number
  /** Base32 TOTP secret. Stored on setup but only enforced once `totpActivo` is true. */
  totpSecret?: string
  /** Login asks for the authenticator code only when this is true (2FA is opt-in). */
  totpActivo: boolean
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
    esTitular: {
      type: Boolean,
      default: false,
      validate: {
        validator: function (this: UsuarioDoc, esTitular: boolean) {
          return !esTitular || this.rol === 'ABOGADO'
        },
        message: 'Only an ABOGADO can be the firm owner (esTitular)',
      },
    },
    activo: { type: Boolean, default: true },
    debeCambiarPassword: { type: Boolean, default: false },
    versionSesion: { type: Number, default: 0 },
    totpSecret: { type: String, select: false },
    totpActivo: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform: (_doc, ret: Record<string, unknown>) => {
        delete ret.passwordHash
        delete ret.versionSesion
        delete ret.totpSecret
        delete ret.__v
        return ret
      },
    },
  },
)

export const Usuario = model<UsuarioDoc>('Usuario', usuarioSchema)
