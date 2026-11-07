import { Card, Flex, Tag, Typography } from 'antd';
import type { Audiencia } from '../../agenda';
import { Caratula } from './Caratula';
import { EtiquetaEstado, EtiquetaTipo } from './Etiquetas';
import { CerrarAudiencia } from './CerrarAudiencia';

/** One hearing with everything needed to attend it. */
export function TarjetaAudiencia({ audiencia, onCambio }: { audiencia: Audiencia; onCambio: () => Promise<void> }) {
  const { expedienteId: expediente, abogadoId: abogado } = audiencia;

  return (
    <Card size="small">
      <Flex vertical gap={4}>
        <Typography.Text strong>
          <Caratula expediente={expediente} />
        </Typography.Text>
        <Typography.Text type="secondary">{`Expte. ${expediente.numero} · ${audiencia.hora} · ${abogado.nombre}`}</Typography.Text>
        <Flex gap={4} wrap>
          <EtiquetaTipo tipo={audiencia.tipo} />
          {audiencia.esVencimientoFatal && <Tag color="red">Fatal</Tag>}
          <EtiquetaEstado estado={audiencia.estado} />
        </Flex>
        <CerrarAudiencia audiencia={audiencia} onCambio={onCambio} />
      </Flex>
    </Card>
  );
}
