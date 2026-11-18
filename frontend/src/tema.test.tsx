import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { tema, useReducirMovimiento } from './tema';

/** A `matchMedia` whose answer to the reduced-motion query the test controls, and can change later. */
function preferenciaDeMovimiento(reducir: boolean) {
  const oyentes = new Set<() => void>();
  const consulta = { matches: reducir, addEventListener: (_: string, f: () => void) => oyentes.add(f), removeEventListener: (_: string, f: () => void) => oyentes.delete(f) };
  vi.stubGlobal('matchMedia', (query: string) => ({ ...consulta, media: query, matches: query === '(prefers-reduced-motion: reduce)' && consulta.matches }));
  return {
    cambiar(nueva: boolean) {
      consulta.matches = nueva;
      oyentes.forEach((f) => f());
    },
  };
}

describe('tema', () => {
  it('uses the system font, so each platform shows the one it tuned for its screens', () => {
    expect(tema({ reducirMovimiento: false }).token?.fontFamily).toMatch(/^system-ui,/);
  });

  it('never overshoots: the curves that bounce use the same smooth curve as the rest', () => {
    const { token } = tema({ reducirMovimiento: false });

    expect(token?.motion).toBe(true);
    expect(token?.motionEaseOutBack).toBe(token?.motionEaseOut);
    expect(token?.motionEaseInBack).toBe(token?.motionEaseOut);
  });

  it('turns the animations off when the user asked the system to reduce motion', () => {
    expect(tema({ reducirMovimiento: true }).token?.motion).toBe(false);
  });
});

describe('useReducirMovimiento', () => {
  it('follows the system setting, also when it changes while the app is open', () => {
    const preferencia = preferenciaDeMovimiento(false);
    const { result } = renderHook(() => useReducirMovimiento());
    expect(result.current).toBe(false);

    act(() => preferencia.cambiar(true));

    expect(result.current).toBe(true);
  });
});
