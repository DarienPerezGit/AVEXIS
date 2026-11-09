import { App as AntApp, Alert, Button, Flex, Input, Popconfirm, Space, Table, Typography } from 'antd';
import type { TableColumnsType } from 'antd';
import { useEffect, useState } from 'react';
import { api } from '../api';
import { TIPOS_CLIENTE } from '../clientes';
import type { Cliente } from '../clientes';
import { mensajeDeError } from '../errores';
import { puedeEliminarClientes } from '../permisos';
import { useSesion } from '../sesion';
import { FormCliente } from './clientes/FormCliente';

const POR_PAGINA = 20;

const columnasDeDatos: TableColumnsType<Cliente> = [
  { title: 'Nombre', dataIndex: 'nombre' },
  { title: 'Tipo', key: 'tipo', render: (_valor, c) => TIPOS_CLIENTE[c.tipo].etiqueta },
  { title: 'DNI o CUIT', key: 'documento', render: (_valor, c) => c.dni ?? c.cuit },
  { title: 'Email', dataIndex: 'email' },
  { title: 'Teléfono', dataIndex: 'telefono' },
];

/** The firm's clients. The API returns them all, so the table paginates in the browser. */
export function Clientes() {
  const { usuario } = useSesion();
  const { message } = AntApp.useApp();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string>();
  const [busqueda, setBusqueda] = useState('');
  const [pagina, setPagina] = useState(1);
  const [recargas, setRecargas] = useState(0);
  /** The open form: `true` registers a new client, a client edits that one. */
  const [formulario, setFormulario] = useState<Cliente | true>();

  useEffect(() => {
    // Each keystroke asks again, so an older answer may arrive after a newer one: only the latest is kept.
    let vigente = true;
    const q = busqueda.trim();
    setCargando(true);
    api<{ clientes: Cliente[] }>(q ? `/clientes?${new URLSearchParams({ q })}` : '/clientes')
      .then((res) => {
        if (!vigente) return;
        setClientes(res.clientes);
        setError(undefined);
      })
      .catch((causa: unknown) => vigente && setError(mensajeDeError(causa)))
      .finally(() => vigente && setCargando(false));
    return () => {
      vigente = false;
    };
  }, [busqueda, recargas]);

  const recargar = () => setRecargas((n) => n + 1);
  const puedeEliminar = usuario !== null && puedeEliminarClientes(usuario);

  async function eliminar(cliente: Cliente) {
    try {
      await api(`/clientes/${cliente._id}`, { method: 'DELETE' });
      message.success('Cliente eliminado.');
      recargar();
    } catch (causa) {
      // 409 CLIENTE_HAS_EXPEDIENTES: once a client has cases, they are part of the firm's history.
      message.error(mensajeDeError(causa));
    }
  }

  const columnas: TableColumnsType<Cliente> = [
    ...columnasDeDatos,
    {
      title: 'Acciones',
      key: 'acciones',
      render: (_valor, c) => (
        <Space>
          <Button size="small" onClick={() => setFormulario(c)}>
            Editar
          </Button>
          {puedeEliminar && (
            <Popconfirm title="¿Eliminar este cliente?" description="Solo se puede si no tiene expedientes." okText="Sí, eliminar" cancelText="Cancelar" onConfirm={() => eliminar(c)}>
              <Button size="small" danger>
                Eliminar
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Flex vertical gap={16}>
      <Flex justify="space-between" align="center" wrap gap={8}>
        <Typography.Title level={2} style={{ margin: 0 }}>
          Clientes
        </Typography.Title>
        <Button type="primary" onClick={() => setFormulario(true)}>
          Nuevo cliente
        </Button>
      </Flex>
      {formulario && (
        <FormCliente
          cliente={formulario === true ? undefined : formulario}
          onCerrar={() => setFormulario(undefined)}
          onGuardado={() => {
            setFormulario(undefined);
            recargar();
          }}
        />
      )}
      {/* While typing: the API matches part of the name, DNI or CUIT. */}
      <Input.Search placeholder="Buscar por nombre, DNI o CUIT" allowClear value={busqueda} onChange={(e) => {
          setBusqueda(e.target.value);
          setPagina(1);
        }} style={{ width: 280 }} />
      {error && <Alert type="error" title={error} />}
      <Table rowKey="_id" columns={columnas} dataSource={clientes} loading={cargando} locale={{ emptyText: 'No hay clientes que coincidan.' }} pagination={{ current: pagina, pageSize: POR_PAGINA, showSizeChanger: false, onChange: setPagina }} scroll={{ x: true }} />
    </Flex>
  );
}
