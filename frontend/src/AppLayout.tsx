import { App as AntApp, Button, Layout, Menu, Typography } from 'antd';
import { Link, Outlet, useLocation } from 'react-router';
import { mensajeDeError } from './errores';
import { puedeAdministrarUsuarios } from './permisos';
import { useSesion } from './sesion';

const encabezado = { display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 16, background: 'transparent' };

export function AppLayout() {
  const { usuario, salir } = useSesion();
  const { pathname } = useLocation();
  const { message } = AntApp.useApp();

  const secciones = [
    { key: '/', label: <Link to="/">Agenda</Link> },
    { key: '/expedientes', label: <Link to="/expedientes">Expedientes</Link> },
    { key: '/clientes', label: <Link to="/clientes">Clientes</Link> },
    ...(usuario && puedeAdministrarUsuarios(usuario) ? [{ key: '/usuarios', label: <Link to="/usuarios">Usuarios</Link> }] : []),
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Layout.Sider breakpoint="lg" collapsedWidth={0}>
        <Typography.Title level={4} style={{ color: 'white', padding: 16, margin: 0 }}>
          AVEXIS
        </Typography.Title>
        <Menu theme="dark" mode="inline" selectedKeys={[pathname]} items={secciones} />
      </Layout.Sider>
      <Layout>
        <Layout.Header style={encabezado}>
          <Typography.Text>{usuario?.nombre}</Typography.Text>
          <Link to="/cambiar-password">Cambiar contraseña</Link>
          <Button onClick={() => salir().catch((error: unknown) => message.error(mensajeDeError(error)))}>Cerrar sesión</Button>
        </Layout.Header>
        <Layout.Content style={{ padding: 24 }}>
          <Outlet />
        </Layout.Content>
      </Layout>
    </Layout>
  );
}
