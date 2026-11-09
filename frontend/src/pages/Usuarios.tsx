import { Alert, Button, Flex, Space, Table, Tag, Typography } from 'antd';
import type { TableColumnsType } from 'antd';
import { useEffect, useState } from 'react';
import { api } from '../api';
import { mensajeDeError } from '../errores';
import type { Usuario } from '../permisos';
import { useSesion } from '../sesion';
import { ROLES } from '../usuarios';
import { EditarUsuario } from './usuarios/EditarUsuario';
import { NuevoUsuario } from './usuarios/NuevoUsuario';
import { ResetearPassword } from './usuarios/ResetearPassword';

const columnasDeDatos: TableColumnsType<Usuario> = [
  { title: 'Nombre', dataIndex: 'nombre' },
  { title: 'Email', dataIndex: 'email' },
  { title: 'Rol', key: 'rol', render: (_valor, u) => ROLES[u.rol].etiqueta },
  { title: 'Titular', key: 'titular', render: (_valor, u) => u.esTitular && <Tag color="gold">Titular</Tag> },
  { title: 'Estado', key: 'estado', render: (_valor, u) => (u.activo ? <Tag color="green">Activo</Tag> : <Tag>Inactivo</Tag>) },
  { title: 'Cambio de contraseña', key: 'password', render: (_valor, u) => u.debeCambiarPassword && <Tag color="orange">Pendiente</Tag> },
];

/** The firm's users, managed by the titular. There is no public sign-up: every account starts here. */
/** The modal open over the table, if any, with the user it acts on. */
type Abierto = { accion: 'crear' } | { accion: 'editar' | 'resetear'; usuario: Usuario };

export function Usuarios() {
  const { usuario: yo } = useSesion();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string>();
  const [recargas, setRecargas] = useState(0);
  const [abierto, setAbierto] = useState<Abierto>();

  useEffect(() => {
    setCargando(true);
    api<{ usuarios: Usuario[] }>('/usuarios')
      .then((res) => {
        setUsuarios(res.usuarios);
        setError(undefined);
      })
      .catch((causa: unknown) => setError(mensajeDeError(causa)))
      .finally(() => setCargando(false));
  }, [recargas]);

  const cerrar = () => setAbierto(undefined);
  const guardado = () => {
    setAbierto(undefined);
    setRecargas((n) => n + 1);
  };

  const columnas: TableColumnsType<Usuario> = [
    ...columnasDeDatos,
    {
      title: 'Acciones',
      key: 'acciones',
      // The API refuses changes to one's own access (409 CANNOT_CHANGE_OWN_ACCESS), so at least one titular always
      // remains. One's own password is changed from "Cambiar contraseña", knowing the current one.
      render: (_valor, u) =>
        u._id !== yo?._id && (
          <Space>
            <Button size="small" onClick={() => setAbierto({ accion: 'editar', usuario: u })}>
              Editar
            </Button>
            <Button size="small" onClick={() => setAbierto({ accion: 'resetear', usuario: u })}>
              Resetear contraseña
            </Button>
          </Space>
        ),
    },
  ];

  return (
    <Flex vertical gap={16}>
      <Flex justify="space-between" align="center" wrap gap={8}>
        <Typography.Title level={2} style={{ margin: 0 }}>
          Usuarios
        </Typography.Title>
        <Button type="primary" onClick={() => setAbierto({ accion: 'crear' })}>
          Nuevo usuario
        </Button>
      </Flex>
      {abierto?.accion === 'crear' && <NuevoUsuario onCerrar={cerrar} onGuardado={guardado} />}
      {abierto?.accion === 'editar' && <EditarUsuario usuario={abierto.usuario} onCerrar={cerrar} onGuardado={guardado} />}
      {abierto?.accion === 'resetear' && <ResetearPassword usuario={abierto.usuario} onCerrar={cerrar} onGuardado={guardado} />}
      {error && <Alert type="error" title={error} />}
      <Table rowKey="_id" columns={columnas} dataSource={usuarios} loading={cargando} pagination={false} scroll={{ x: true }} />
    </Flex>
  );
}
