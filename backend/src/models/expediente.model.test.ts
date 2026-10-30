import { Types } from 'mongoose'
import { describe, expect, it } from 'vitest'
import { Expediente } from './expediente.model'

const buildCase = () => ({
  numero: 'EXP-2026-0001',
  caratula: 'Gomez, Juan c. Transportes Sur S.A. s/ danos y perjuicios',
  fuero: 'CIVIL',
  clienteId: new Types.ObjectId(),
  abogadoResponsableId: new Types.ObjectId(),
})

describe('Expediente', () => {
  it('accepts a case with its fuero and both responsible parties', async () => {
    await expect(new Expediente(buildCase()).validate()).resolves.toBeUndefined()
  })

  it('rejects a case missing numero, caratula, fuero, clienteId or abogadoResponsableId', async () => {
    for (const field of [
      'numero',
      'caratula',
      'fuero',
      'clienteId',
      'abogadoResponsableId',
    ] as const) {
      const incomplete: Record<string, unknown> = { ...buildCase() }
      delete incomplete[field]

      await expect(new Expediente(incomplete).validate()).rejects.toThrow(field)
    }
  })

  it('rejects a fuero outside the six supported jurisdictions', async () => {
    const caseRecord = new Expediente({ ...buildCase(), fuero: 'MILITAR' })

    await expect(caseRecord.validate()).rejects.toThrow(/fuero/)
  })

  it('starts every new case in EN_TRAMITE', () => {
    const caseRecord = new Expediente(buildCase())

    expect(caseRecord.estado).toBe('EN_TRAMITE')
  })

  it('records the filing start date as now when none is supplied', () => {
    const caseRecord = new Expediente(buildCase())

    expect(caseRecord.fechaInicio).toBeInstanceOf(Date)
    expect(Math.abs(Date.now() - caseRecord.fechaInicio.getTime())).toBeLessThan(5000)
  })

  it('declares indexes for the estado plus fuero filter, the responsible lawyer and caratula search', () => {
    const indexes = Expediente.schema.indexes()

    expect(indexes).toEqual(
      expect.arrayContaining([
        [{ estado: 1, fuero: 1 }, expect.any(Object)],
        [{ abogadoResponsableId: 1 }, expect.any(Object)],
        [{ caratula: 'text' }, expect.any(Object)],
      ]),
    )
  })

  it('allows only one case per judicial file number', () => {
    const uniqueKeys = Expediente.schema
      .indexes()
      .filter(([, options]) => options.unique === true)
      .map(([fields]) => Object.keys(fields))

    expect(uniqueKeys).toEqual(expect.arrayContaining([['numero']]))
  })
})
