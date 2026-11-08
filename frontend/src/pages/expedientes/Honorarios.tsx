import { App as AntApp, Alert, Button, Empty, Flex, Form, InputNumber, Modal, Spin, Statistic, Table, Tag } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { ApiError, api } from '../../api';
import { camposConError, mensajeDeError } from '../../errores';
import { ESTADOS_HONORARIO, fechaDe, pesos } from '../../expedientes';
import type { Honorario } from '../../expedientes';

type Formulario = 'honorario' | 'pago';

/** `ruta` is what each form adds to the case's fee route: the fee itself is posted to that route as is. */

const FORMULARIOS: Record<Formulario, { titulo: string; campo: string; etiqueta: string; ruta: string; exito: string }> = {
  honorario: { titulo: 'Registrar honorario', campo: 'montoPactado', etiqueta: 'Monto pactado', ruta: '', exito: 'Honorario registrado.' },
  pago: { titulo: 'Registrar pago', campo: 'monto', etiqueta: 'Monto', ruta: '/pagos', exito: 'Pago registrado.' },
};

/**
 * The agreed fee of a case and its payments. Payments cannot be edited once recorded. A 404 is not an error:
 * it means no fee was agreed yet, so the tab offers to register one.
 */
export function Honorarios({ expedienteId }: { expedienteId: string }) {
  const { message } = AntApp.useApp();
  const [form] = Form.useForm();
  /** `null` once the API said the case has no fee yet. */
  const [honorario, setHonorario] = useState<Honorario | null>();
  const [error, setError] = useState<string>();
  const [abierto, setAbierto] = useState<Formulario>();
  const [enviando, setEnviando] = useState(false);

  const ruta = `/expedientes/${expedienteId}/honorario`;

  const cargar = useCallback(async () => {
    try {
      const res = await api<{ honorario: Honorario }>(ruta);
      setHonorario(res.honorario);
      setError(undefined);
    } catch (causa) {
      if (causa instanceof ApiError && causa.code === 'NOT_FOUND') {
        setHonorario(null);
      } else {
        setError(mensajeDeError(causa));
      }
    }
  }, [ruta]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function guardar(valores: Record<string, number>) {
    const formulario = FORMULARIOS[abierto!];
    setEnviando(true);
    try {
      await api(`${ruta}${formulario.ruta}`, { method: 'POST', body: valores });
      message.success(formulario.exito);
      setAbierto(undefined);
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
  if (honorario === undefined) {
    return <Spin />;
  }

  const formulario = abierto && FORMULARIOS[abierto];

  return (
    <>
      {honorario === null ? (
        <Empty description="Todavía no se pactaron honorarios.">
          <Button type="primary" onClick={() => setAbierto('honorario')}>
            Registrar honorario
          </Button>
        </Empty>
      ) : (
        <Flex vertical gap={16}>
          <Flex gap={32} wrap align="center">
            <Statistic title="Pactado" value={pesos(honorario.montoPactado)} />
            <Statistic title="Pagado" value={pesos(honorario.montoPagado)} />
            <Statistic title="Saldo" value={pesos(honorario.saldo)} />
            <Tag color={ESTADOS_HONORARIO[honorario.estado].color}>{ESTADOS_HONORARIO[honorario.estado].etiqueta}</Tag>
          </Flex>
          {honorario.saldo > 0 && (
            <Button type="primary" onClick={() => setAbierto('pago')} style={{ alignSelf: 'flex-start' }}>
              Registrar pago
            </Button>
          )}
          <Table
            rowKey="_id"
            dataSource={honorario.pagos}
            pagination={false}
            locale={{ emptyText: 'Todavía no hay pagos.' }}
            columns={[
              { title: 'Fecha', key: 'fecha', render: (_valor, p) => fechaDe(p.fecha) },
              { title: 'Monto', key: 'monto', render: (_valor, p) => pesos(p.monto) },
              { title: 'Registró', key: 'usuario', render: (_valor, p) => p.usuarioId.nombre },
            ]}
          />
        </Flex>
      )}

      <Modal open={formulario !== undefined} title={formulario?.titulo} okText="Guardar" cancelText="Cancelar" onOk={form.submit} confirmLoading={enviando} onCancel={() => setAbierto(undefined)}>
        {formulario && (
          <Form form={form} layout="vertical" requiredMark={false} onFinish={guardar}>
            <Form.Item label={formulario.etiqueta} name={formulario.campo} rules={[{ required: true, message: 'Ingresá el monto.' }]}>
              <InputNumber min={abierto === 'pago' ? 0.01 : 0} prefix="$" style={{ width: '100%' }} />
            </Form.Item>
          </Form>
        )}
      </Modal>
    </>
  );
}
