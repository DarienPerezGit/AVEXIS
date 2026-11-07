import { App as AntApp, Button, Popconfirm, Space } from 'antd';
import { useState } from 'react';
import { api } from '../../api';
import type { Audiencia, EstadoAudiencia } from '../../agenda';
import { mensajeDeError } from '../../errores';

interface Props {
  audiencia: Audiencia;
  onCambio: () => void;
}

/**
 * Closes a pending hearing: held, or cancelled after confirming. A hearing is never deleted, so the record stays.
 * Rescheduling is out of scope: a new date is a cancelled hearing plus a new one.
 */
export function CerrarAudiencia({ audiencia, onCambio }: Props) {
  const { message } = AntApp.useApp();
  const [enviando, setEnviando] = useState(false);

  if (audiencia.estado !== 'PENDIENTE') {
    return null;
  }

  async function cerrar(estado: EstadoAudiencia) {
    setEnviando(true);
    try {
      await api(`/audiencias/${audiencia._id}`, { method: 'PATCH', body: { estado } });
      onCambio();
    } catch (error) {
      message.error(mensajeDeError(error));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Space wrap>
      <Button size="small" disabled={enviando} onClick={() => cerrar('REALIZADA')}>
        Marcar realizada
      </Button>
      <Popconfirm title="¿Cancelar esta audiencia?" okText="Sí, cancelar" cancelText="No" onConfirm={() => cerrar('CANCELADA')}>
        <Button size="small" danger disabled={enviando}>
          Cancelar audiencia
        </Button>
      </Popconfirm>
    </Space>
  );
}
