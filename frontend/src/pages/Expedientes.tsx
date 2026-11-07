import { Alert, Button, Flex, Input, Select, Table, Tag, Typography } from 'antd';
import type { TableColumnsType } from 'antd';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { api } from '../api';
import { opciones } from '../agenda';
import { mensajeDeError } from '../errores';
import { ESTADOS_EXPEDIENTE, FUEROS } from '../expedientes';
import type { EstadoExpediente, Expediente, Fuero } from '../expedientes';
import { puedeAbrirExpedientes, veTodosLosExpedientes } from '../permisos';
import { useSesion } from '../sesion';
import { NuevoExpediente } from './expedientes/NuevoExpediente';

const POR_PAGINA = 20;

interface Pagina {
  data: Expediente[];
  total: number;
}

/** What is asked to the API. Changing a filter goes back to the first page. */
interface Consulta {
  page: number;
  estado?: EstadoExpediente;
  fuero?: Fuero;
  q?: string;
}

function rutaDe({ page, estado, fuero, q }: Consulta) {
  const parametros = new URLSearchParams({ page: String(page), limit: String(POR_PAGINA) });
  if (estado) parametros.set('estado', estado);
  if (fuero) parametros.set('fuero', fuero);
  if (q) parametros.set('q', q);
  return `/expedientes?${parametros}`;
}

const columnasDeDatos: TableColumnsType<Expediente> = [
  { title: 'Número', dataIndex: 'numero' },
  { title: 'Carátula', dataIndex: 'caratula' },
  { title: 'Cliente', key: 'cliente', render: (_valor, e) => e.clienteId.nombre },
  { title: 'Fuero', key: 'fuero', render: (_valor, e) => FUEROS[e.fuero].etiqueta },
  { title: 'Estado', key: 'estado', render: (_valor, e) => <Tag color={ESTADOS_EXPEDIENTE[e.estado].color}>{ESTADOS_EXPEDIENTE[e.estado].etiqueta}</Tag> },
];

const columnaAbogado: TableColumnsType<Expediente>[number] = { title: 'Abogado', key: 'abogado', render: (_valor, e) => e.abogadoResponsableId.nombre };

/** The cases, a page at a time: the API paginates and filters, so the browser never loads them all. */
export function Expedientes() {
  const { usuario } = useSesion();
  const navigate = useNavigate();
  const [consulta, setConsulta] = useState<Consulta>({ page: 1 });
  const [pagina, setPagina] = useState<Pagina>({ data: [], total: 0 });
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string>();
  const [creando, setCreando] = useState(false);

  useEffect(() => {
    setCargando(true);
    api<Pagina>(rutaDe(consulta))
      .then((res) => {
        setPagina(res);
        setError(undefined);
      })
      .catch((causa: unknown) => setError(mensajeDeError(causa)))
      .finally(() => setCargando(false));
  }, [consulta]);

  const filtrar = (cambio: Omit<Consulta, 'page'>) => setConsulta((antes) => ({ ...antes, ...cambio, page: 1 }));
  const columnas = usuario && veTodosLosExpedientes(usuario) ? [...columnasDeDatos, columnaAbogado] : columnasDeDatos;

  return (
    <Flex vertical gap={16}>
      <Flex justify="space-between" align="center" wrap gap={8}>
        <Typography.Title level={2} style={{ margin: 0 }}>
          Expedientes
        </Typography.Title>
        {usuario && puedeAbrirExpedientes(usuario) && (
          <Button type="primary" onClick={() => setCreando(true)}>
            Nuevo expediente
          </Button>
        )}
      </Flex>
      {creando && (
        <NuevoExpediente
          onCerrar={() => setCreando(false)}
          onGuardado={() => {
            setCreando(false);
            setConsulta((antes) => ({ ...antes }));
          }}
        />
      )}
      <Flex gap={8} wrap>
        {/* On Enter only: the API's text search matches whole words, so a half-typed word finds nothing. */}
        <Input.Search placeholder="Buscar por carátula" allowClear onSearch={(texto) => filtrar({ q: texto.trim() || undefined })} style={{ width: 280 }} />
        <Select aria-label="Estado" placeholder="Todos los estados" allowClear options={opciones(ESTADOS_EXPEDIENTE)} value={consulta.estado} onChange={(estado) => filtrar({ estado })} style={{ width: 170 }} />
        <Select aria-label="Fuero" placeholder="Todos los fueros" allowClear options={opciones(FUEROS)} value={consulta.fuero} onChange={(fuero) => filtrar({ fuero })} style={{ width: 170 }} />
      </Flex>
      {error && <Alert type="error" title={error} />}
      <Table
        rowKey="_id"
        columns={columnas}
        dataSource={pagina.data}
        loading={cargando}
        locale={{ emptyText: 'No hay expedientes que coincidan.' }}
        pagination={{ current: consulta.page, pageSize: POR_PAGINA, total: pagina.total, showSizeChanger: false }}
        onChange={({ current }) => setConsulta((antes) => ({ ...antes, page: current ?? 1 }))}
        onRow={(e) => ({ onClick: () => navigate(`/expedientes/${e._id}`), style: { cursor: 'pointer' } })}
        scroll={{ x: true }}
      />
    </Flex>
  );
}
