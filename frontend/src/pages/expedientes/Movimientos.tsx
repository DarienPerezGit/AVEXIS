import { App as AntApp, Alert, Button, Empty, Flex, Form, Input, Modal, Select, Spin, Timeline, Typography } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api';
import { opciones } from '../../opciones';
import { camposConError, mensajeDeError } from '../../errores';
import { TIPOS_MOVIMIENTO, fechaDe } from '../../expedientes';
import type { Movimiento } from '../../expedientes';

/**
 * A case's procedural history, newest first as the API sorts it. Entries are immutable (there is no edit or
 * delete): a mistake is corrected with a new entry. Who loaded each one comes from the session, not the form.
 */
export function Movimientos({ expedienteId }: { expedienteId: string }) {
  const { message } = AntApp.useApp();
  const [form] = Form.useForm();
  const [movimientos, setMovimientos] = useState<Movimiento[]>();
  const [error, setError] = useState<string>();
  const [agregando, setAgregando] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const res = await api<{ movimientos: Movimiento[] }>(`/expedientes/${expedienteId}/movimientos`);
      setMovimientos(res.movimientos);
      setError(undefined);
    } catch (causa) {
      setError(mensajeDeError(causa));
    }
  }, [expedienteId]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function guardar(valores: { tipo: string; descripcion: string }) {
    setEnviando(true);
    try {
      await api(`/expedientes/${expedienteId}/movimientos`, { method: 'POST', body: valores });
      message.success('Movimiento agregado.');
      setAgregando(false);
      form.resetFields();
      await cargar();
    } catch (causa) {
      form.setFields(camposConError(causa));
      message.error(mensajeDeError(causa));
    } finally {
      setEnviando(false);
    }
  }

  if (error) {
    return <Alert type="error" title={error} action={<Button onClick={cargar}>Reintentar</Button>} />;
  }
  if (!movimientos) {
    return <Spin />;
  }

  return (
    <Flex vertical gap={16}>
      <Button type="primary" onClick={() => setAgregando(true)} style={{ alignSelf: 'flex-start' }}>
        Agregar movimiento
      </Button>
      {movimientos.length === 0 ? (
        <Empty description="Todavía no hay movimientos." />
      ) : (
        <Timeline
          items={movimientos.map((m) => ({
            key: m._id,
            content: (
              <>
                <Typography.Text type="secondary">{`${fechaDe(m.fecha)} · ${TIPOS_MOVIMIENTO[m.tipo].etiqueta} · ${m.usuarioId.nombre}`}</Typography.Text>
                <Typography.Paragraph style={{ margin: 0 }}>{m.descripcion}</Typography.Paragraph>
              </>
            ),
          }))}
        />
      )}

      <Modal open={agregando} title="Nuevo movimiento" okText="Guardar" cancelText="Cancelar" onOk={form.submit} confirmLoading={enviando} onCancel={() => setAgregando(false)}>
        <Form form={form} layout="vertical" requiredMark={false} onFinish={guardar}>
          <Form.Item label="Tipo" name="tipo" rules={[{ required: true, message: 'Elegí el tipo.' }]}>
            <Select options={opciones(TIPOS_MOVIMIENTO)} />
          </Form.Item>
          <Form.Item label="Descripción" name="descripcion" rules={[{ required: true, whitespace: true, message: 'Contá qué pasó.' }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </Flex>
  );
}
