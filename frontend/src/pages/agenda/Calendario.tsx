import { Button, Calendar, Flex, Space, Tag, Typography } from 'antd';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import { useState } from 'react';
import { TIPOS, caratulaCorta, diaDe } from '../../agenda';
import type { Audiencia, TipoAudiencia } from '../../agenda';
import { EtiquetaTipo } from './Etiquetas';

const VISIBLES_POR_DIA = 3;

const etiqueta = { display: 'block', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } as const;

/** A cancelled hearing stays on its day, since the record is kept, but crossed out so nobody attends it. */
const cancelada = { textDecoration: 'line-through', opacity: 0.6 } as const;

interface Props {
  audiencias: Audiencia[];
  onElegirDia: (dia: string) => void;
}

/** The month view: up to three hearings per day, colored by type. */
export function Calendario({ audiencias, onElegirDia }: Props) {
  const [mes, setMes] = useState(() => dayjs());

  function contenidoDelDia(fecha: Dayjs) {
    const delDia = audiencias.filter((a) => diaDe(a) === fecha.format('YYYY-MM-DD'));
    const ocultas = delDia.length - VISIBLES_POR_DIA;
    return (
      <>
        {delDia.slice(0, VISIBLES_POR_DIA).map((a) => (
          <Tag key={a._id} color={TIPOS[a.tipo].color} style={a.estado === 'CANCELADA' ? { ...etiqueta, ...cancelada } : etiqueta}>
            {`${a.hora} ${caratulaCorta(a.expedienteId.caratula)}`}
          </Tag>
        ))}
        {ocultas > 0 && <Typography.Text type="secondary">{`+${ocultas} más`}</Typography.Text>}
      </>
    );
  }

  return (
    <Calendar
      value={mes}
      onSelect={(fecha, { source }) => {
        setMes(fecha);
        if (source === 'date') {
          onElegirDia(fecha.format('YYYY-MM-DD'));
        }
      }}
      cellRender={(fecha, info) => (info.type === 'date' ? contenidoDelDia(fecha) : info.originNode)}
      headerRender={() => (
        <Flex justify="space-between" align="center" wrap gap={8} style={{ marginBottom: 12 }}>
          <Space>
            <Button aria-label="Mes anterior" onClick={() => setMes(mes.subtract(1, 'month'))}>
              ‹
            </Button>
            <Typography.Title level={4} style={{ margin: 0, textTransform: 'capitalize' }}>
              {mes.format('MMMM YYYY')}
            </Typography.Title>
            <Button aria-label="Mes siguiente" onClick={() => setMes(mes.add(1, 'month'))}>
              ›
            </Button>
          </Space>
          <Button onClick={() => setMes(dayjs())}>Hoy</Button>
        </Flex>
      )}
    />
  );
}

export function Leyenda() {
  return (
    <Space wrap>
      {(Object.keys(TIPOS) as TipoAudiencia[]).map((tipo) => (
        <EtiquetaTipo key={tipo} tipo={tipo} />
      ))}
      <Typography.Text type="secondary" delete>
        Cancelada
      </Typography.Text>
    </Space>
  );
}
