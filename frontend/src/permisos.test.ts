import { describe, expect, it } from 'vitest';
import { puedeAdministrarUsuarios } from './permisos';
import { ABOGADO, ASISTENTE, TITULAR } from './test/usuarios';

describe('puedeAdministrarUsuarios', () => {
  it('is only for the firm owner', () => {
    expect(puedeAdministrarUsuarios(TITULAR)).toBe(true);
    expect(puedeAdministrarUsuarios(ABOGADO)).toBe(false);
    expect(puedeAdministrarUsuarios(ASISTENTE)).toBe(false);
  });
});
