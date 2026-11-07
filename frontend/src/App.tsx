import { Result, Spin, Typography } from 'antd';
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router';
import { AppLayout } from './AppLayout';
import { CambiarPassword } from './pages/CambiarPassword';
import { Login } from './pages/Login';
import { puedeAdministrarUsuarios } from './permisos';
import { useSesion } from './sesion';

const RUTA_CAMBIO = '/cambiar-password';

/** The one place that decides where a user may be, so no page repeats it. */
function ControlDeSesion() {
  const { usuario, cargando } = useSesion();
  const { pathname } = useLocation();

  if (cargando) {
    return <Spin fullscreen />;
  }
  if (!usuario) {
    return <Navigate to="/login" replace />;
  }
  if (!usuario.debeCambiarPassword) {
    return <AppLayout />;
  }
  return pathname === RUTA_CAMBIO ? <Outlet /> : <Navigate to={RUTA_CAMBIO} replace />;
}

function SoloSinSesion() {
  const { usuario, cargando } = useSesion();

  if (cargando) {
    return <Spin fullscreen />;
  }
  return usuario ? <Navigate to="/" replace /> : <Login />;
}

function SoloTitular() {
  const { usuario } = useSesion();

  return usuario && puedeAdministrarUsuarios(usuario) ? <Outlet /> : <Result status="403" title="No tenés permiso para ver esta página." />;
}

/** Filled in by the tickets of each page (#17 to #20). */
const Pendiente = ({ titulo }: { titulo: string }) => <Typography.Title level={2}>{titulo}</Typography.Title>;

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<SoloSinSesion />} />
      <Route element={<ControlDeSesion />}>
        <Route index element={<Pendiente titulo="Agenda" />} />
        <Route path="expedientes" element={<Pendiente titulo="Expedientes" />} />
        <Route path="clientes" element={<Pendiente titulo="Clientes" />} />
        <Route element={<SoloTitular />}>
          <Route path="usuarios" element={<Pendiente titulo="Usuarios" />} />
        </Route>
        <Route path={RUTA_CAMBIO} element={<CambiarPassword />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
