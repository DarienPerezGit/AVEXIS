import { App as AntApp, Alert, Form, Input, Modal, Select } from 'antd';
import { useEffect, useState } from 'react';
import { api } from '../../api';
import { opciones } from '../../agenda';
import { camposConError, mensajeDeError } from '../../errores';
import { ESTADOS_EXPEDIENTE, FUEROS } from '../../expedientes';
import type { Expediente } from '../../expedientes';
import { puedeAsignarAbogado } from '../../permisos';
import { useSesion } from '../../sesion';

interface Props {
  expediente: Expediente;
  onCerrar: () => void;
  onGuardado: () => void;
}

/** Edits what the API lets change. The number and the client identify the case, so they stay. */
export function EditarExpediente({ expediente, onCerrar, onGuardado }: Props) {
  const { usuario } = useSesion();
  const { message } = AntApp.useApp();
  const [form] = Form.useForm();
  const [abogados, setAbogados] = useState<{ value: string; label: string }[]>([]);
  const [errorDeCarga, setErrorDeCarga] = useState<string>();
  const [enviando, setEnviando] = useState(false);

  // Only the firm owner reaches this form and reassigns: the API ignores a lawyer's reassignment.
  const reasigna = usuario !== null && puedeAsignarAbogado(usuario);

  useEffect(() => {
    if (reasigna) {
      api<{ abogados: { _id: string; nombre: string }[] }>('/usuarios/abogados')
        .then((res) => setAbogados(res.abogados.map((a) => ({ value: a._id, label: a.nombre }))))
        .catch((error: unknown) => setErrorDeCarga(mensajeDeError(error)));
    }
  }, [reasigna]);

  async function guardar(valores: Record<string, unknown>) {
    setEnviando(true);
    try {
      await api(`/expedientes/${expediente._id}`, { method: 'PATCH', body: valores });
      message.success('Expediente actualizado.');
      onGuardado();
    } catch (error) {
      form.setFields(camposConError(error));
      message.error(mensajeDeError(error));
    } finally {
      setEnviando(false);
    }
  }

  const iniciales = {
    caratula: expediente.caratula,
    fuero: expediente.fuero,
    estado: expediente.estado,
    observaciones: expediente.observaciones ?? '',
    ...(reasigna && { abogadoResponsableId: expediente.abogadoResponsableId._id }),
  };

  return (
    <Modal open title="Editar expediente" okText="Guardar" cancelText="Cancelar" onOk={form.submit} confirmLoading={enviando} onCancel={onCerrar}>
      {errorDeCarga && <Alert type="error" title={errorDeCarga} style={{ marginBottom: 16 }} />}
      <Form form={form} layout="vertical" requiredMark={false} initialValues={iniciales} onFinish={guardar}>
        <Form.Item label="Carátula" name="caratula" rules={[{ required: true, whitespace: true, message: 'Ingresá la carátula.' }]}>
          <Input />
        </Form.Item>
        <Form.Item label="Fuero" name="fuero">
          <Select options={opciones(FUEROS)} />
        </Form.Item>
        <Form.Item label="Estado" name="estado">
          <Select options={opciones(ESTADOS_EXPEDIENTE)} />
        </Form.Item>
        {reasigna && (
          <Form.Item label="Abogado responsable" name="abogadoResponsableId">
            <Select options={abogados} />
          </Form.Item>
        )}
        <Form.Item label="Observaciones" name="observaciones">
          <Input.TextArea rows={3} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
