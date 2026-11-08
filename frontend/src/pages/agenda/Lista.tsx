import { Button, Flex, Input, Select, Table } from 'antd';
import type { TableColumnsType } from 'antd';
import { useState } from 'react';
import { ESTADOS, TIPOS, diaDe, fechaCorta } from '../../agenda';
import { opciones } from '../../opciones';
import type { Audiencia, EstadoAudiencia, TipoAudiencia } from '../../agenda';
import { Caratula } from './Caratula';
import { CerrarAudiencia } from './CerrarAudiencia';
import { EtiquetaEstado, EtiquetaTipo } from './Etiquetas';

interface Filtros {
  estado?: EstadoAudiencia;
  tipo?: TipoAudiencia;
  abogado?: string;
  texto: string;
}

const SIN_FILTROS: Filtros = { texto: '' };

const columnasDeDatos: TableColumnsType<Audiencia> = [
  { title: 'Fecha', key: 'fecha', render: (_valor, a) => fechaCorta(diaDe(a)) },
  { title: 'Hora', dataIndex: 'hora' },
  { title: 'Tipo', key: 'tipo', render: (_valor, a) => <EtiquetaTipo tipo={a.tipo} /> },
  { title: 'Expediente', key: 'numero', render: (_valor, a) => a.expedienteId.numero },
  { title: 'Carátula', key: 'caratula', render: (_valor, a) => <Caratula expediente={a.expedienteId} /> },
  { title: 'Abogado', key: 'abogado', render: (_valor, a) => a.abogadoId.nombre },
  { title: 'Estado', key: 'estado', render: (_valor, a) => <EtiquetaEstado estado={a.estado} /> },
];

/** Every hearing in a table. Filters run in the browser: the agenda is already loaded whole. */
export function Lista({ audiencias, onCambio }: { audiencias: Audiencia[]; onCambio: () => Promise<void> }) {
  const [filtros, setFiltros] = useState(SIN_FILTROS);
  const cambiar = (cambio: Partial<Filtros>) => setFiltros((antes) => ({ ...antes, ...cambio }));

  // The lawyers who appear in this agenda, so the filter never offers someone with nothing to show.
  const abogados = [...new Map(audiencias.map((a) => [a.abogadoId._id, a.abogadoId.nombre])).entries()].map(([value, label]) => ({ value, label }));

  const columnas: TableColumnsType<Audiencia> = [
    ...columnasDeDatos,
    { title: 'Acciones', key: 'acciones', render: (_valor, a) => <CerrarAudiencia audiencia={a} onCambio={onCambio} /> },
  ];

  const texto = filtros.texto.trim().toLowerCase();
  const visibles = audiencias.filter(
    (a) =>
      (!filtros.estado || a.estado === filtros.estado) &&
      (!filtros.tipo || a.tipo === filtros.tipo) &&
      (!filtros.abogado || a.abogadoId._id === filtros.abogado) &&
      (!texto || a.expedienteId.caratula.toLowerCase().includes(texto) || a.expedienteId.numero.toLowerCase().includes(texto)),
  );

  return (
    <Flex vertical gap={12}>
      <Flex gap={8} wrap>
        <Input.Search
          placeholder="Buscar por carátula o expediente"
          allowClear
          value={filtros.texto}
          onChange={(e) => cambiar({ texto: e.target.value })}
          style={{ width: 280 }}
        />
        <Select aria-label="Estado" placeholder="Todos los estados" allowClear options={opciones(ESTADOS)} value={filtros.estado} onChange={(estado) => cambiar({ estado })} style={{ width: 170 }} />
        <Select aria-label="Tipo" placeholder="Todos los tipos" allowClear options={opciones(TIPOS)} value={filtros.tipo} onChange={(tipo) => cambiar({ tipo })} style={{ width: 170 }} />
        <Select aria-label="Abogado" placeholder="Todos los abogados" allowClear options={abogados} value={filtros.abogado} onChange={(abogado) => cambiar({ abogado })} style={{ width: 200 }} />
        <Button onClick={() => setFiltros(SIN_FILTROS)}>Quitar filtros</Button>
      </Flex>
      <Table rowKey="_id" columns={columnas} dataSource={visibles} locale={{ emptyText: 'No hay audiencias que coincidan.' }} scroll={{ x: true }} />
    </Flex>
  );
}
