import { describe, expect, it } from 'vitest'
import { Usuario } from './usuario.model'

describe('Usuario', () => {
  it('accepts a lawyer with every required field', async () => {
    const user = new Usuario({
      nombre: 'Ana Perez',
      email: 'ana@estudio.com',
      passwordHash: 'hashed-secret',
      rol: 'ABOGADO',
    })

    await expect(user.validate()).resolves.toBeUndefined()
  })

  it('rejects a lawyer that is missing nombre, email, passwordHash or rol', async () => {
    const complete = {
      nombre: 'Ana Perez',
      email: 'ana@estudio.com',
      passwordHash: 'hashed-secret',
      rol: 'ABOGADO',
    }

    for (const field of ['nombre', 'email', 'passwordHash', 'rol'] as const) {
      const incomplete: Record<string, unknown> = { ...complete }
      delete incomplete[field]

      await expect(new Usuario(incomplete).validate()).rejects.toThrow(field)
    }
  })

  it('rejects a role outside the ABOGADO and ASISTENTE set', async () => {
    const user = new Usuario({
      nombre: 'Ana Perez',
      email: 'ana@estudio.com',
      passwordHash: 'hashed-secret',
      rol: 'SOCIO',
    })

    await expect(user.validate()).rejects.toThrow(/rol/)
  })

  it('rejects an email without a valid address shape', async () => {
    for (const email of ['ana@', 'ana estudio.com', 'ana.estudio.com', '@estudio.com']) {
      const user = new Usuario({
        nombre: 'Ana Perez',
        email,
        passwordHash: 'hashed-secret',
        rol: 'ABOGADO',
      })

      await expect(user.validate()).rejects.toThrow(/email/)
    }
  })

  it('defaults a new user to active', () => {
    const user = new Usuario({
      nombre: 'Ana Perez',
      email: 'ana@estudio.com',
      passwordHash: 'hashed-secret',
      rol: 'ASISTENTE',
    })

    expect(user.activo).toBe(true)
  })

  it('serializes an id and never leaks passwordHash or the version key', () => {
    const user = new Usuario({
      nombre: '  Ana Perez  ',
      email: '  ANA@Estudio.COM  ',
      passwordHash: 'hashed-secret',
      rol: 'ABOGADO',
    })

    const json = user.toJSON()

    expect(json).toMatchObject({
      id: String(user._id),
      nombre: 'Ana Perez',
      email: 'ana@estudio.com',
      rol: 'ABOGADO',
      activo: true,
    })
    expect(json).not.toHaveProperty('passwordHash')
    expect(json).not.toHaveProperty('__v')
  })

  it('allows only one account per email address', () => {
    const uniqueKeys = Usuario.schema
      .indexes()
      .filter(([, options]) => options.unique === true)
      .map(([fields]) => Object.keys(fields))

    expect(uniqueKeys).toEqual(expect.arrayContaining([['email']]))
  })
})
