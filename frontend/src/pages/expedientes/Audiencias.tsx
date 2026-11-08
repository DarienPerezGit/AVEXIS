import { Alert, Button, Flex, Spin, Table } from 'antd';
import type { TableColumnsType } from 'antd';
import dayjs from 'dayjs';
import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api';
import { diaDe, fechaCorta } from '../../agenda';
import type { Audiencia } from '../../agenda';
import { mensajeDeError } from '../../errores';
import { CerrarAudiencia } from '../agenda/CerrarAudiencia';
import { EtiquetaEstado, EtiquetaTipo } from '../agenda/Etiquetas';
import { FormAudiencia } from '../agenda/FormAudiencia';

/**
 * The hearings of one case, filtered in the browser out of the user's agenda: the API has no per-case route,
 * and the agenda is small and already filtered by what each user may see.
 */
export function Audiencias({ expedienteId }: { expedienteId: string }) {
  const [audiencias, setAudiencias] = useState<Audiencia[]>();
  const [error, setError] = useState<string>();
  const [agregando, setAgregando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const res = await api<{ audiencias: Audiencia[] }>('/audiencias');
      setAudiencias(res.audiencias.filter((a) => a.expedienteId._id === expedienteId));
      setError(undefined);
    } catch (causa) {
      setError(mensajeDeError(causa));
    }
  }, [expedienteId]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  if (error) {
    return <Alert type="error" title={error} action={<Button onClick={cargar}>Reintentar</Button>} />;
  }
  if (!audiencias) {
    return <Spin />;
  }

  const columnas: TableColumnsType<Audiencia> = [
    { title: 'Fecha', key: 'fecha', render: (_valor, a) => fechaCorta(diaDe(a)) },
    { title: 'Hora', dataIndex: 'hora' },
    { title: 'Tipo', key: 'tipo', render: (_valor, a) => <EtiquetaTipo tipo={a.tipo} /> },
    { title: 'Abogado', key: 'abogado', render: (_valor, a) => a.abogadoId.nombre },
    { title: 'Estado', key: 'estado', render: (_valor, a) => <EtiquetaEstado estado={a.estado} /> },
    { title: 'Acciones', key: 'acciones', render: (_valor, a) => <CerrarAudiencia audiencia={a} onCambio={cargar} /> },
  ];

  return (
    <Flex vertical gap={16}>
      <Button type="primary" onClick={() => setAgregando(true)} style={{ alignSelf: 'flex-start' }}>
        Agregar audiencia
      </Button>
      <Table rowKey="_id" columns={columnas} dataSource={audiencias} locale={{ emptyText: 'Este expediente no tiene audiencias.' }} scroll={{ x: true }} />
      {agregando && (
        <FormAudiencia
          // Today on the browser's clock, as the agenda does.
          fecha={dayjs().format('YYYY-MM-DD')}
          expedienteId={expedienteId}
          onCerrar={() => setAgregando(false)}
          onGuardada={() => {
            setAgregando(false);
            void cargar();
          }}
        />
      )}
    </Flex>
  );
}
