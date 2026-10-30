import { describe, expect, it } from 'vitest'
import { Cliente } from './cliente.model'

const naturalPerson = {
  tipo: 'FISICA',
  nombre: 'Juan Gomez',
  dni: '30123456',
  email: 'juan@correo.com',
  telefono: '1145678901',
}

describe('Cliente', () => {
  it('accepts a natural person with a dni', async () => {
    await expect(new Cliente(naturalPerson).validate()).resolves.toBeUndefined()
  })

  it('rejects a natural person without a dni', async () => {
    const withoutDni: Record<string, unknown> = { ...naturalPerson }
    delete withoutDni.dni

    await expect(new Cliente(withoutDni).validate()).rejects.toThrow(/dni/)
  })

  it('accepts a legal person identified by cuit and no dni', async () => {
    const client = new Cliente({
      tipo: 'JURIDICA',
      nombre: 'Estudio Societario S.R.L.',
      cuit: '30-71234567-8',
      email: 'contacto@societario.com',
      telefono: '1145678902',
    })

    await expect(client.validate()).resolves.toBeUndefined()
  })

  it('rejects a legal person without a cuit', async () => {
    const client = new Cliente({
      tipo: 'JURIDICA',
      nombre: 'Estudio Societario S.R.L.',
      email: 'contacto@societario.com',
      telefono: '1145678902',
    })

    await expect(client.validate()).rejects.toThrow(/cuit/)
  })

  it('rejects a tipo outside the FISICA and JURIDICA set', async () => {
    const client = new Cliente({ ...naturalPerson, tipo: 'ORGANISMO' })

    await expect(client.validate()).rejects.toThrow(/tipo/)
  })

  it('rejects an email without a valid address shape', async () => {
    const client = new Cliente({ ...naturalPerson, email: 'juan.correo.com' })

    await expect(client.validate()).rejects.toThrow(/email/)
  })

  it('declares dni and cuit as sparse unique indexes so missing values never collide', () => {
    const sparseUniqueKeys = Cliente.schema
      .indexes()
      .filter(([, options]) => options.unique === true && options.sparse === true)
      .map(([fields]) => Object.keys(fields))

    expect(sparseUniqueKeys).toEqual(expect.arrayContaining([['dni'], ['cuit']]))
  })
})
