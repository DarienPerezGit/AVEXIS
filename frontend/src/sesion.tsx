import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { api, configurarSesionVencida } from './api';
import type { Usuario } from './permisos';

interface Sesion {
  usuario: Usuario | null;
  /** True until the first `/auth/me` answers, so no page decides before knowing who is here. */
  cargando: boolean;
  entrar: (email: string, password: string) => Promise<void>;
  salir: () => Promise<void>;
  recargar: () => Promise<void>;
}

const SesionContext = createContext<Sesion | null>(null);

/** Who is logged in. The API is the source: the cookie is httpOnly, so `/auth/me` is the only way to know. */
export function SesionProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(true);

  const recargar = useCallback(async () => {
    try {
      const res = await api<{ usuario: Usuario }>('/auth/me');
      setUsuario(res.usuario);
    } catch {
      setUsuario(null);
    } finally {
      setCargando(false);
    }
  }, []);

  const entrar = useCallback(async (email: string, password: string) => {
    const res = await api<{ usuario: Usuario }>('/auth/login', { method: 'POST', body: { email, password } });
    setUsuario(res.usuario);
  }, []);

  const salir = useCallback(async () => {
    await api('/auth/logout', { method: 'POST' });
    setUsuario(null);
  }, []);

  useEffect(() => {
    configurarSesionVencida(() => setUsuario(null));
    void recargar();
  }, [recargar]);

  const sesion = useMemo(() => ({ usuario, cargando, entrar, salir, recargar }), [usuario, cargando, entrar, salir, recargar]);

  return <SesionContext.Provider value={sesion}>{children}</SesionContext.Provider>;
}

export function useSesion() {
  const sesion = useContext(SesionContext);
  if (!sesion) {
    throw new Error('useSesion must be used inside SesionProvider');
  }
  return sesion;
}
