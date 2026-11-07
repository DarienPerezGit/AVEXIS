import { Button, Empty, Flex, Modal, Result, Segmented, Spin, Typography } from 'antd';
import dayjs from 'dayjs';
import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { diaDe, fechaLarga } from '../agenda';
import type { Audiencia, Proxima } from '../agenda';
import { mensajeDeError } from '../errores';
import { AvisoProximas } from './agenda/AvisoProximas';
import { Calendario, Leyenda } from './agenda/Calendario';
import { FormAudiencia } from './agenda/FormAudiencia';
import { Lista } from './agenda/Lista';
import { TarjetaAudiencia } from './agenda/TarjetaAudiencia';

export function Agenda() {
  const [audiencias, setAudiencias] = useState<Audiencia[]>([]);
  const [proximas, setProximas] = useState<Proxima[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string>();
  const [diaAbierto, setDiaAbierto] = useState<string>();
  /** The day the new-hearing form opens on, while it is open. */
  const [altaEl, setAltaEl] = useState<string>();
  const [vista, setVista] = useState<'Calendario' | 'Lista'>('Calendario');

  const cargar = useCallback(async () => {
    setError(undefined);
    try {
      const [agenda, aviso] = await Promise.all([
        api<{ audiencias: Audiencia[] }>('/audiencias'),
        api<{ audiencias: Proxima[] }>('/audiencias/proximas'),
      ]);
      setAudiencias(agenda.audiencias);
      setProximas(aviso.audiencias);
    } catch (causa) {
      setError(mensajeDeError(causa));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  if (cargando) {
    return <Spin />;
  }
  if (error) {
    return <Result status="error" title="No pudimos cargar la agenda." subTitle={error} extra={<Button onClick={cargar}>Reintentar</Button>} />;
  }

  const delDia = audiencias.filter((a) => diaDe(a) === diaAbierto);

  return (
    <Flex vertical gap={16}>
      <Flex justify="space-between" align="center" wrap gap={8}>
        <Typography.Title level={2} style={{ margin: 0 }}>
          Agenda
        </Typography.Title>
        {/* Today on the browser's clock, never toISOString(): after 21:00 in Argentina that is already tomorrow in UTC. */}
        <Button type="primary" onClick={() => setAltaEl(dayjs().format('YYYY-MM-DD'))}>
          Nueva audiencia
        </Button>
      </Flex>
      <AvisoProximas proximas={proximas} />
      <Segmented options={['Calendario', 'Lista']} value={vista} onChange={setVista} style={{ alignSelf: 'flex-start' }} />
      {vista === 'Calendario' ? (
        <>
          <Calendario audiencias={audiencias} onElegirDia={setDiaAbierto} />
          <Leyenda />
        </>
      ) : (
        <Lista audiencias={audiencias} onCambio={cargar} />
      )}

      <Modal
        open={diaAbierto !== undefined}
        title={diaAbierto && fechaLarga(diaAbierto)}
        onCancel={() => setDiaAbierto(undefined)}
        footer={
          <Button type="primary" onClick={() => setAltaEl(diaAbierto)}>
            Agregar audiencia
          </Button>
        }
      >
        <Flex vertical gap={8}>
          {delDia.length === 0 ? (
            <Empty description="No hay audiencias este día." />
          ) : (
            delDia.map((a) => <TarjetaAudiencia key={a._id} audiencia={a} onCambio={cargar} />)
          )}
        </Flex>
      </Modal>

      {altaEl && (
        <FormAudiencia
          fecha={altaEl}
          onCerrar={() => setAltaEl(undefined)}
          onGuardada={() => {
            setAltaEl(undefined);
            void cargar();
          }}
        />
      )}
    </Flex>
  );
}
