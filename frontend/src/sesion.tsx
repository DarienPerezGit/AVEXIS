import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { ApiError, api, configurarSesionVencida } from './api';
import type { Usuario } from './permisos';

interface Sesion {
  usuario: Usuario | null;
  /** True until the first `/auth/me` answers, so no page decides before knowing who is here. */
  cargando: boolean;
  /** The API could not say who is here. It does not mean there is no session, so the login is not the answer. */
  falloLaCarga: boolean;
  cargar: () => Promise<void>;
  entrar: (email: string, password: string) => Promise<void>;
  salir: () => Promise<void>;
  recargar: () => Promise<void>;
}

const SesionContext = createContext<Sesion | null>(null);

/** Who is logged in. The API is the source: the cookie is httpOnly, so `/auth/me` is the only way to know. */
export function SesionProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(true);

  const [falloLaCarga, setFalloLaCarga] = useState(false);

  const recargar = useCallback(async () => {
    const res = await api<{ usuario: Usuario }>('/auth/me');
    setUsuario(res.usuario);
  }, []);

  const cargar = useCallback(async () => {
    setCargando(true);
    setFalloLaCarga(false);
    try {
      await recargar();
    } catch (error) {
      // UNAUTHORIZED already cleared the user in `api`. Anything else says nothing about the session.
      setFalloLaCarga(!(error instanceof ApiError && error.code === 'UNAUTHORIZED'));
    } finally {
      setCargando(false);
    }
  }, [recargar]);

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
    void cargar();
  }, [cargar]);

  const sesion = useMemo(
    () => ({ usuario, cargando, falloLaCarga, cargar, entrar, salir, recargar }),
    [usuario, cargando, falloLaCarga, cargar, entrar, salir, recargar],
  );

  return <SesionContext.Provider value={sesion}>{children}</SesionContext.Provider>;
}

export function useSesion() {
  const sesion = useContext(SesionContext);
  if (!sesion) {
    throw new Error('useSesion must be used inside SesionProvider');
  }
  return sesion;
}
