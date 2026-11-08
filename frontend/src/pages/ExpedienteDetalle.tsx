import { App as AntApp, Button, Descriptions, Flex, Popconfirm, Result, Spin, Tabs, Tag, Typography } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { api } from '../api';
import { mensajeDeError } from '../errores';
import { ESTADOS_EXPEDIENTE, FUEROS, fechaDe } from '../expedientes';
import type { Expediente } from '../expedientes';
import { puedeModificarExpediente, veHonorarios } from '../permisos';
import { useSesion } from '../sesion';
import { Audiencias } from './expedientes/Audiencias';
import { EditarExpediente } from './expedientes/EditarExpediente';
import { Honorarios } from './expedientes/Honorarios';
import { Movimientos } from './expedientes/Movimientos';

/** A lawyer reaches another lawyer's case only by typing its URL: the list and the agenda never link to it. */
const NO_SE_PUEDE_VER = {
  NOT_FOUND: 'Este expediente no existe.',
  INVALID_ID: 'Este expediente no existe.',
  FORBIDDEN: 'No tenés permiso para ver este expediente.',
};

export function ExpedienteDetalle() {
  const { id } = useParams();
  const { usuario } = useSesion();
  const { message } = AntApp.useApp();
  const [expediente, setExpediente] = useState<Expediente>();
  const [editando, setEditando] = useState(false);

  const [error, setError] = useState<string>();

  const cargar = useCallback(async () => {
    try {
      const res = await api<{ expediente: Expediente }>(`/expedientes/${id}`);
      setExpediente(res.expediente);
      setError(undefined);
    } catch (causa) {
      setError(mensajeDeError(causa, NO_SE_PUEDE_VER));
    }
  }, [id]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  if (error) {
    return <Result status="warning" title={error} extra={<Link to="/expedientes">Volver a expedientes</Link>} />;
  }
  if (!expediente) {
    return <Spin />;
  }

  async function archivar() {
    try {
      await api(`/expedientes/${id}`, { method: 'PATCH', body: { estado: 'ARCHIVADO' } });
      message.success('Expediente archivado.');
      await cargar();
    } catch (error) {
      message.error(mensajeDeError(error));
    }
  }

  const estado = ESTADOS_EXPEDIENTE[expediente.estado];
  const modifica = usuario !== null && puedeModificarExpediente(usuario, { abogadoResponsableId: expediente.abogadoResponsableId._id });

  return (
    <Flex vertical gap={16}>
      <Flex justify="space-between" align="center" wrap gap={8}>
        <Typography.Title level={2} style={{ margin: 0 }}>
          {expediente.caratula}
        </Typography.Title>
        {modifica && (
          <Flex gap={8}>
            <Button onClick={() => setEditando(true)}>Editar</Button>
            {/* Archiving keeps the history (there is no delete); it can be undone from Editar. */}
            {expediente.estado !== 'ARCHIVADO' && (
              <Popconfirm title="¿Archivar este expediente?" okText="Sí, archivar" cancelText="Cancelar" onConfirm={archivar}>
                <Button danger>Archivar</Button>
              </Popconfirm>
            )}
          </Flex>
        )}
      </Flex>
      <Descriptions bordered column={{ xs: 1, md: 2 }}>
        <Descriptions.Item label="Número">{expediente.numero}</Descriptions.Item>
        <Descriptions.Item label="Cliente">{expediente.clienteId.nombre}</Descriptions.Item>
        <Descriptions.Item label="Fuero">{FUEROS[expediente.fuero].etiqueta}</Descriptions.Item>
        <Descriptions.Item label="Estado">
          <Tag color={estado.color}>{estado.etiqueta}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Abogado responsable">{expediente.abogadoResponsableId.nombre}</Descriptions.Item>
        <Descriptions.Item label="Fecha de inicio">{fechaDe(expediente.fechaInicio)}</Descriptions.Item>
        <Descriptions.Item label="Observaciones" span="filled">
          {expediente.observaciones || '—'}
        </Descriptions.Item>
      </Descriptions>

      <Tabs
        items={[
          { key: 'movimientos', label: 'Movimientos', children: <Movimientos expedienteId={expediente._id} /> },
          { key: 'audiencias', label: 'Audiencias', children: <Audiencias expedienteId={expediente._id} /> },
          // Not rendered at all for the assistant, not just hidden: the API would answer 403.
          ...(usuario && veHonorarios(usuario) ? [{ key: 'honorarios', label: 'Honorarios', children: <Honorarios expedienteId={expediente._id} /> }] : []),
        ]}
      />

      {editando && (
        <EditarExpediente
          expediente={expediente}
          onCerrar={() => setEditando(false)}
          onGuardado={() => {
            setEditando(false);
            void cargar();
          }}
        />
      )}
    </Flex>
  );
}
