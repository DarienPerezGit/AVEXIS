import { App as AntApp, Alert, Checkbox, Form, Input, Modal, Radio, Select } from 'antd';
import { useEffect, useState } from 'react';
import { api } from '../../api';
import { TIPOS, opciones } from '../../agenda';
import type { TipoAudiencia } from '../../agenda';
import { camposConError, mensajeDeError } from '../../errores';
import { puedeAsignarAbogado } from '../../permisos';
import { useSesion } from '../../sesion';

interface Valores {
  expedienteId: string;
  abogadoId?: string;
  fecha: string;
  hora: string;
  tipo: TipoAudiencia;
  esVencimientoFatal?: boolean;
}

interface Opcion {
  value: string;
  label: string;
}

interface Expediente {
  _id: string;
  numero: string;
  caratula: string;
}

/** The API's page size cap: enough for a small firm. A bigger one would need a search in this field. */
const EXPEDIENTES_A_OFRECER = 100;

const requerido = (message: string) => [{ required: true, message }];

interface Props {
  /** The day the form opens on, `YYYY-MM-DD`. */
  fecha: string;
  onCerrar: () => void;
  onGuardada: () => void;
}

/**
 * Loads a hearing. Date and time are native inputs: they already speak `YYYY-MM-DD` and `HH:mm`, the API's format,
 * so no time zone is ever involved.
 */
export function FormAudiencia({ fecha, onCerrar, onGuardada }: Props) {
  const { usuario } = useSesion();
  const { message } = AntApp.useApp();
  const [form] = Form.useForm();
  const tipo = Form.useWatch('tipo', form);
  const [expedientes, setExpedientes] = useState<Opcion[]>([]);
  const [abogados, setAbogados] = useState<Opcion[]>([]);
  const [errorDeCarga, setErrorDeCarga] = useState<string>();
  const [enviando, setEnviando] = useState(false);

  const eligeAbogado = usuario !== null && puedeAsignarAbogado(usuario);

  useEffect(() => {
    // A lawyer only gets their own cases back: the API filters what each user sees.
    api<{ data: Expediente[] }>(`/expedientes?limit=${EXPEDIENTES_A_OFRECER}`)
      .then((res) => setExpedientes(res.data.map((e) => ({ value: e._id, label: `${e.numero} · ${e.caratula}` }))))
      .catch((error: unknown) => setErrorDeCarga(mensajeDeError(error)));
    if (eligeAbogado) {
      api<{ abogados: { _id: string; nombre: string }[] }>('/usuarios/abogados')
        .then((res) => setAbogados(res.abogados.map((a) => ({ value: a._id, label: a.nombre }))))
        .catch((error: unknown) => setErrorDeCarga(mensajeDeError(error)));
    }
  }, [eligeAbogado]);

  async function guardar({ esVencimientoFatal, ...valores }: Valores) {
    setEnviando(true);
    try {
      // Only a deadline can be fatal (GLOSSARY).
      await api('/audiencias', { method: 'POST', body: { ...valores, esVencimientoFatal: valores.tipo === 'VENCIMIENTO' && esVencimientoFatal === true } });
      message.success('Audiencia agregada.');
      onGuardada();
    } catch (error) {
      form.setFields(camposConError(error));
      message.error(mensajeDeError(error));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal open title="Nueva audiencia" okText="Guardar" cancelText="Cancelar" onOk={form.submit} confirmLoading={enviando} onCancel={onCerrar}>
      {errorDeCarga && <Alert type="error" title={errorDeCarga} style={{ marginBottom: 16 }} />}
      <Form form={form} layout="vertical" requiredMark={false} initialValues={{ fecha, tipo: 'AUDIENCIA' }} onFinish={guardar}>
        <Form.Item label="Expediente" name="expedienteId" rules={requerido('Elegí el expediente.')}>
          <Select showSearch={{ optionFilterProp: 'label' }} options={expedientes} placeholder="Número o carátula" />
        </Form.Item>
        {eligeAbogado && (
          <Form.Item label="Abogado" name="abogadoId" rules={requerido('Elegí quién asiste.')}>
            <Select options={abogados} placeholder="Quién asiste" />
          </Form.Item>
        )}
        <Form.Item label="Fecha" name="fecha" rules={requerido('Elegí la fecha.')}>
          <Input type="date" />
        </Form.Item>
        <Form.Item label="Hora" name="hora" rules={requerido('Elegí la hora.')}>
          <Input type="time" />
        </Form.Item>
        <Form.Item label="Tipo" name="tipo">
          <Radio.Group optionType="button" options={opciones(TIPOS)} />
        </Form.Item>
        {tipo === 'VENCIMIENTO' && (
          <Form.Item name="esVencimientoFatal" valuePropName="checked">
            <Checkbox>Vencimiento fatal</Checkbox>
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
}
