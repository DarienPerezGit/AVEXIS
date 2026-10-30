import { Types } from 'mongoose'
import { describe, expect, it } from 'vitest'
import { Movimiento } from './movimiento.model'

const buildEntry = () => ({
  expedienteId: new Types.ObjectId(),
  usuarioId: new Types.ObjectId(),
  tipo: 'ESCRITO',
  descripcion: 'Se presenta demanda con documentacion adjunta',
})

describe('Movimiento', () => {
  it('accepts a procedural entry filed by a user', async () => {
    await expect(new Movimiento(buildEntry()).validate()).resolves.toBeUndefined()
  })

  it('rejects an entry missing expedienteId, usuarioId, tipo or descripcion', async () => {
    for (const field of ['expedienteId', 'usuarioId', 'tipo', 'descripcion'] as const) {
      const incomplete: Record<string, unknown> = { ...buildEntry() }
      delete incomplete[field]

      await expect(new Movimiento(incomplete).validate()).rejects.toThrow(field)
    }
  })

  it('rejects a tipo outside the five documented entry kinds', async () => {
    const entry = new Movimiento({ ...buildEntry(), tipo: 'SENTENCIA' })

    await expect(entry.validate()).rejects.toThrow(/tipo/)
  })

  it('dates a new entry at creation time and indexes by case and date', () => {
    const entry = new Movimiento(buildEntry())

    expect(entry.fecha).toBeInstanceOf(Date)
    expect(Math.abs(Date.now() - entry.fecha.getTime())).toBeLessThan(5000)
    expect(Movimiento.schema.indexes()).toEqual(
      expect.arrayContaining([[{ expedienteId: 1, fecha: -1 }, expect.any(Object)]]),
    )
  })
})
