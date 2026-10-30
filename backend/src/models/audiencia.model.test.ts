import { Types } from 'mongoose'
import { describe, expect, it } from 'vitest'
import { Audiencia } from './audiencia.model'

const buildHearing = () => ({
  expedienteId: new Types.ObjectId(),
  abogadoId: new Types.ObjectId(),
  fecha: new Date('2026-11-10T00:00:00.000Z'),
  hora: '09:30',
  tipo: 'AUDIENCIA',
})

describe('Audiencia', () => {
  it('accepts a hearing scheduled with a date and time', async () => {
    await expect(new Audiencia(buildHearing()).validate()).resolves.toBeUndefined()
  })

  it('rejects a scheduling missing expedienteId, abogadoId, fecha, hora or tipo', async () => {
    for (const field of ['expedienteId', 'abogadoId', 'fecha', 'hora', 'tipo'] as const) {
      const incomplete: Record<string, unknown> = { ...buildHearing() }
      delete incomplete[field]

      await expect(new Audiencia(incomplete).validate()).rejects.toThrow(field)
    }
  })

  it('accepts the 24 hour boundary times 00:00 and 23:59', async () => {
    for (const hora of ['00:00', '23:59', '14:05']) {
      await expect(new Audiencia({ ...buildHearing(), hora }).validate()).resolves.toBeUndefined()
    }
  })

  it('rejects hora values that are not zero padded 24 hour times', async () => {
    for (const hora of ['9:30', '24:00', '14:60', '14:5', '1430']) {
      await expect(new Audiencia({ ...buildHearing(), hora }).validate()).rejects.toThrow(/hora/)
    }
  })

  it('rejects a tipo outside AUDIENCIA, VENCIMIENTO and PERICIA', async () => {
    const hearing = new Audiencia({ ...buildHearing(), tipo: 'MEDIACION' })

    await expect(hearing.validate()).rejects.toThrow(/tipo/)
  })

  it('schedules everything as pending and not fatal by default', () => {
    const hearing = new Audiencia(buildHearing())

    expect(hearing.estado).toBe('PENDIENTE')
    expect(hearing.esVencimientoFatal).toBe(false)
  })

  it('indexes the agenda by fecha', () => {
    expect(Audiencia.schema.indexes()).toEqual(
      expect.arrayContaining([[{ fecha: 1 }, expect.any(Object)]]),
    )
  })
})
