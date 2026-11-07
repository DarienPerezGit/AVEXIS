import { App as AntApp, Alert, Form, Input, Modal, Select } from 'antd';
import { useEffect, useState } from 'react';
import { ApiError, api } from '../../api';
import { opciones } from '../../agenda';
import { camposConError, mensajeDeError } from '../../errores';
import { FUEROS, instanteDe } from '../../expedientes';
import type { Fuero } from '../../expedientes';
import { puedeAsignarAbogado } from '../../permisos';
import { useSesion } from '../../sesion';

interface Valores {
  numero: string;
  caratula: string;
  fuero: Fuero;
  clienteId: string;
  abogadoResponsableId?: string;
  fechaInicio?: string;
  observaciones?: string;
}

interface Opcion {
  value: string;
  label: string;
}

const requerido = (message: string) => [{ required: true, message }];

/** The case number is the only unique field of a case, so a duplicate can only be that one. */
const NUMERO_REPETIDO = 'Ya existe un expediente con ese número.';

interface Props {
  onCerrar: () => void;
  onGuardado: () => void;
}

/** Opens a case. Only the firm owner picks the lawyer: the API always gives a lawyer's new case to themselves. */
export function NuevoExpediente({ onCerrar, onGuardado }: Props) {
  const { usuario } = useSesion();
  const { message } = AntApp.useApp();
  const [form] = Form.useForm();
  const [clientes, setClientes] = useState<Opcion[]>([]);
  const [abogados, setAbogados] = useState<Opcion[]>([]);
  const [errorDeCarga, setErrorDeCarga] = useState<string>();
  const [enviando, setEnviando] = useState(false);

  const eligeAbogado = usuario !== null && puedeAsignarAbogado(usuario);

  useEffect(() => {
    api<{ clientes: { _id: string; nombre: string }[] }>('/clientes')
      .then((res) => setClientes(res.clientes.map((c) => ({ value: c._id, label: c.nombre }))))
      .catch((error: unknown) => setErrorDeCarga(mensajeDeError(error)));
    if (eligeAbogado) {
      api<{ abogados: { _id: string; nombre: string }[] }>('/usuarios/abogados')
        .then((res) => setAbogados(res.abogados.map((a) => ({ value: a._id, label: a.nombre }))))
        .catch((error: unknown) => setErrorDeCarga(mensajeDeError(error)));
    }
  }, [eligeAbogado]);

  async function guardar(valores: Valores) {
    setEnviando(true);
    try {
      // A cleared optional field arrives as "", which the API would reject: it is sent as absent.
      const body = { ...valores, fechaInicio: valores.fechaInicio ? instanteDe(valores.fechaInicio) : undefined,observaciones: valores.observaciones?.trim() || undefined };
      await api('/expedientes', { method: 'POST', body });
      message.success('Expediente creado.');
      onGuardado();
    } catch (error) {
      form.setFields(camposConError(error));
      if (error instanceof ApiError && error.code === 'DUPLICATE_KEY') {
        form.setFields([{ name: 'numero', errors: [NUMERO_REPETIDO] }]);
      }
      message.error(mensajeDeError(error, { DUPLICATE_KEY: NUMERO_REPETIDO }));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal open title="Nuevo expediente" okText="Guardar" cancelText="Cancelar" onOk={form.submit} confirmLoading={enviando} onCancel={onCerrar}>
      {errorDeCarga && <Alert type="error" title={errorDeCarga} style={{ marginBottom: 16 }} />}
      <Form form={form} layout="vertical" requiredMark={false} onFinish={guardar}>
        <Form.Item label="Número" name="numero" rules={requerido('Ingresá el número.')}>
          <Input placeholder="123/2026" />
        </Form.Item>
        <Form.Item label="Carátula" name="caratula" rules={requerido('Ingresá la carátula.')}>
          <Input placeholder="Perez, Juan c/ Acme SA s/ despido" />
        </Form.Item>
        <Form.Item label="Fuero" name="fuero" rules={requerido('Elegí el fuero.')}>
          <Select options={opciones(FUEROS)} />
        </Form.Item>
        <Form.Item label="Cliente" name="clienteId" rules={requerido('Elegí el cliente.')}>
          <Select showSearch={{ optionFilterProp: 'label' }} options={clientes} />
        </Form.Item>
        {eligeAbogado && (
          <Form.Item label="Abogado responsable" name="abogadoResponsableId" rules={requerido('Elegí quién lleva el expediente.')}>
            <Select options={abogados} />
          </Form.Item>
        )}
        <Form.Item label="Fecha de inicio" name="fechaInicio" extra="Si la dejás vacía, es hoy.">
          <Input type="date" />
        </Form.Item>
        <Form.Item label="Observaciones" name="observaciones">
          <Input.TextArea rows={3} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
