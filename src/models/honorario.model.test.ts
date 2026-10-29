import { Types } from 'mongoose'
import { describe, expect, it } from 'vitest'
import { Honorario } from './honorario.model'

const buildFee = () => ({
  expedienteId: new Types.ObjectId(),
  montoPactado: 100000,
})

describe('Honorario', () => {
  it('ignores a caller-supplied estado and derives PENDIENTE while nothing is paid', async () => {
    const fee = new Honorario({ ...buildFee(), estado: 'PAGADO' })

    await fee.validate()

    expect(fee.estado).toBe('PENDIENTE')
  })

  it('derives PARCIAL when the payments cover only part of the agreed amount', async () => {
    const fee = new Honorario({
      ...buildFee(),
      pagos: [{ monto: 40000, usuarioId: new Types.ObjectId() }],
      estado: 'PAGADO',
    })

    await fee.validate()

    expect(fee.estado).toBe('PARCIAL')
  })

  it('derives PAGADO once the payments reach or exceed the agreed amount', async () => {
    const exactAmount = new Honorario({
      ...buildFee(),
      pagos: [
        { monto: 60000, usuarioId: new Types.ObjectId() },
        { monto: 40000, usuarioId: new Types.ObjectId() },
      ],
      estado: 'PENDIENTE',
    })
    const overpaid = new Honorario({
      ...buildFee(),
      pagos: [{ monto: 150000, usuarioId: new Types.ObjectId() }],
      estado: 'PENDIENTE',
    })

    await exactAmount.validate()
    await overpaid.validate()

    expect(exactAmount.estado).toBe('PAGADO')
    expect(overpaid.estado).toBe('PAGADO')
  })

  it('exposes montoPagado as the sum of the recorded payments', () => {
    const withPayments = new Honorario({
      ...buildFee(),
      pagos: [
        { monto: 25000, usuarioId: new Types.ObjectId() },
        { monto: 65000, usuarioId: new Types.ObjectId() },
      ],
    })
    const withoutPayments = new Honorario(buildFee())

    expect(withPayments.montoPagado).toBe(90000)
    expect(withoutPayments.montoPagado).toBe(0)
  })

  it('rejects a fee missing expedienteId or montoPactado', async () => {
    for (const field of ['expedienteId', 'montoPactado'] as const) {
      const incomplete: Record<string, unknown> = { ...buildFee() }
      delete incomplete[field]

      await expect(new Honorario(incomplete).validate()).rejects.toThrow(field)
    }
  })

  it('rejects a negative agreed amount', async () => {
    const fee = new Honorario({ ...buildFee(), montoPactado: -1 })

    await expect(fee.validate()).rejects.toThrow(/montoPactado/)
  })

  it('rejects a payment below one cent or without the user that registered it', async () => {
    const belowOneCent = new Honorario({
      ...buildFee(),
      pagos: [{ monto: 0.001, usuarioId: new Types.ObjectId() }],
    })
    const withoutUser = new Honorario({
      ...buildFee(),
      pagos: [{ monto: 5000 }],
    })

    await expect(belowOneCent.validate()).rejects.toThrow(/pagos/)
    await expect(withoutUser.validate()).rejects.toThrow(/usuarioId/)
  })

  it('allows only one fee record per case', () => {
    const uniqueKeys = Honorario.schema
      .indexes()
      .filter(([, options]) => options.unique === true)
      .map(([fields]) => Object.keys(fields))

    expect(uniqueKeys).toEqual(expect.arrayContaining([['expedienteId']]))
  })

  it('starts a new fee record as PENDIENTE before validation runs', () => {
    const fee = new Honorario(buildFee())

    expect(fee.estado).toBe('PENDIENTE')
  })
})
