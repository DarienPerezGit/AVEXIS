import { describe, expect, it } from 'vitest';
import { puedeAbrirExpedientes, puedeAdministrarUsuarios,puedeAsignarAbogado, puedeVerExpediente, veTodosLosExpedientes } from './permisos';
import { ABOGADO, ASISTENTE, TITULAR } from './test/usuarios';

describe('puedeAdministrarUsuarios', () => {
  it('is only for the firm owner', () => {
    expect(puedeAdministrarUsuarios(TITULAR)).toBe(true);
    expect(puedeAdministrarUsuarios(ABOGADO)).toBe(false);
    expect(puedeAdministrarUsuarios(ASISTENTE)).toBe(false);
  });
});

describe('puedeVerExpediente', () => {
  const propio = { abogadoResponsableId: ABOGADO._id };
  const ajeno = { abogadoResponsableId: '9' };

  it('lets a lawyer open only the cases they are responsible for', () => {
    expect(puedeVerExpediente(ABOGADO, propio)).toBe(true);
    expect(puedeVerExpediente(ABOGADO, ajeno)).toBe(false);
  });

  it('lets the firm owner and the assistant open any case', () => {
    expect(puedeVerExpediente(TITULAR, ajeno)).toBe(true);
    expect(puedeVerExpediente(ASISTENTE, ajeno)).toBe(true);
  });
});

describe('veTodosLosExpedientes', () => {
  it('is for the firm owner and the assistant; a lawyer only sees their own cases', () => {
    expect(veTodosLosExpedientes(TITULAR)).toBe(true);
    expect(veTodosLosExpedientes(ASISTENTE)).toBe(true);
    expect(veTodosLosExpedientes(ABOGADO)).toBe(false);
  });
});

describe('puedeAbrirExpedientes', () => {
  it('is for lawyers, the firm owner among them; the assistant does not open cases', () => {
    expect(puedeAbrirExpedientes(TITULAR)).toBe(true);
    expect(puedeAbrirExpedientes(ABOGADO)).toBe(true);
    expect(puedeAbrirExpedientes(ASISTENTE)).toBe(false);
  });
});

describe('puedeAsignarAbogado', () => {
  it('is for the firm owner and the assistant; a lawyer always works for themselves', () => {
    expect(puedeAsignarAbogado(TITULAR)).toBe(true);
    expect(puedeAsignarAbogado(ASISTENTE)).toBe(true);
    expect(puedeAsignarAbogado(ABOGADO)).toBe(false);
  });
});
