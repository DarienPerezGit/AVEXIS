import { ConfigProvider } from 'antd';
import type { ThemeConfig } from 'antd';
import esES from 'antd/locale/es_ES';
import { useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';

/** The platform's own font first: it already brings the sizes, spacing and legibility tuned for each screen. */
const FUENTE_DEL_SISTEMA = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

/**
 * Settles fast and smooth, with no overshoot: a bounce only makes sense after a gesture that carried momentum,
 * and this app has none, just clicks on menus, modals and forms.
 */
const SIN_REBOTE = 'cubic-bezier(0.32, 0.72, 0, 1)';

/** How the app looks, in one place. Colors stay Ant Design's; this sets type, corners and motion. */
export function tema({ reducirMovimiento }: { reducirMovimiento: boolean }): ThemeConfig {
  return {
    token: {
      fontFamily: FUENTE_DEL_SISTEMA,
      borderRadius: 8,
      motion: !reducirMovimiento,
      motionEaseOut: SIN_REBOTE,
      motionEaseInOut: SIN_REBOTE,
      motionEaseOutCirc: SIN_REBOTE,
      motionEaseInOutCirc: SIN_REBOTE,
      motionEaseOutBack: SIN_REBOTE,
      motionEaseInBack: SIN_REBOTE,
    },
  };
}

const REDUCIR_MOVIMIENTO = '(prefers-reduced-motion: reduce)';

function suscribirse(avisar: () => void) {
  const consulta = window.matchMedia(REDUCIR_MOVIMIENTO);
  consulta.addEventListener('change', avisar);
  return () => consulta.removeEventListener('change', avisar);
}

/** Whether the user asked the system for less motion. Read live, so changing the setting applies without reloading. */
export function useReducirMovimiento() {
  return useSyncExternalStore(suscribirse, () => window.matchMedia(REDUCIR_MOVIMIENTO).matches);
}

/** Ant Design's configuration for the whole app: Spanish texts and the theme above. */
export function Tema({ children }: { children: ReactNode }) {
  const reducirMovimiento = useReducirMovimiento();
  return (
    <ConfigProvider locale={esES} theme={tema({ reducirMovimiento })}>
      {children}
    </ConfigProvider>
  );
}
