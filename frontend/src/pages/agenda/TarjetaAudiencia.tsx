import { Card, Flex, Tag, Typography } from 'antd';
import { ESTADOS, TIPOS } from '../../agenda';
import type { Audiencia } from '../../agenda';
import { Caratula } from './Caratula';
import { CerrarAudiencia } from './CerrarAudiencia';

/** One hearing with everything needed to attend it. */
export function TarjetaAudiencia({ audiencia, onCambio }: { audiencia: Audiencia; onCambio: () => void }) {
  const { expedienteId: expediente, abogadoId: abogado } = audiencia;

  return (
    <Card size="small">
      <Flex vertical gap={4}>
        <Typography.Text strong>
          <Caratula expediente={expediente} />
        </Typography.Text>
        <Typography.Text type="secondary">{`Expte. ${expediente.numero} · ${audiencia.hora} · ${abogado.nombre}`}</Typography.Text>
        <Flex gap={4} wrap>
          <Tag color={TIPOS[audiencia.tipo].color}>{TIPOS[audiencia.tipo].etiqueta}</Tag>
          {audiencia.esVencimientoFatal && <Tag color="red">Fatal</Tag>}
          <Tag color={ESTADOS[audiencia.estado].color}>{ESTADOS[audiencia.estado].etiqueta}</Tag>
        </Flex>
        <CerrarAudiencia audiencia={audiencia} onCambio={onCambio} />
      </Flex>
    </Card>
  );
}
