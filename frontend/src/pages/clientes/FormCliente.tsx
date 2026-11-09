import { App as AntApp, Form, Input, Modal, Radio } from 'antd';
import { useState } from 'react';
import { ApiError, api } from '../../api';
import { TIPOS_CLIENTE } from '../../clientes';
import type { Cliente, TipoCliente } from '../../clientes';
import { camposConError, mensajeDeError } from '../../errores';
import { opciones } from '../../opciones';

type Valores = Omit<Cliente, '_id'>;

const requerido = (message: string) => [{ required: true, message }];

/** DNI and CUIT are a client's only unique fields, and the form sends one of them, so a duplicate is that one. */
const REPETIDO: Record<TipoCliente, { campo: 'dni' | 'cuit'; mensaje: string }> = {
  FISICA: { campo: 'dni', mensaje: 'Ya existe un cliente con ese DNI.' },
  JURIDICA: { campo: 'cuit', mensaje: 'Ya existe un cliente con ese CUIT.' },
};

interface Props {
  /** The client to edit; without it, the form registers a new one. */
  cliente?: Cliente;
  onCerrar: () => void;
  onGuardado: () => void;
}

/**
 * Registers or edits a client. A person is identified by DNI and a company by CUIT, so the form asks for one by tipo.
 * That identity is fixed once registered (the API ignores it on edit), so editing locks it and sends only the rest.
 */
export function FormCliente({ cliente, onCerrar, onGuardado }: Props) {
  const { message } = AntApp.useApp();
  const [form] = Form.useForm();
  const tipo = Form.useWatch('tipo', form) ?? cliente?.tipo ?? 'FISICA';
  const [enviando, setEnviando] = useState(false);
  const editando = cliente !== undefined;

  async function guardar(valores: Valores) {
    setEnviando(true);
    // On edit an erased address travels as "" so the API clears it; a missing key would keep the old one.
    const contacto = { nombre: valores.nombre, email: valores.email, telefono: valores.telefono, direccion: valores.direccion?.trim() };
    try {
      if (editando) {
        await api(`/clientes/${cliente._id}`, { method: 'PATCH', body: contacto });
      } else {
        const body = { ...contacto, direccion: contacto.direccion || undefined, tipo: valores.tipo, dni: valores.dni, cuit: valores.cuit };
        await api('/clientes', { method: 'POST', body });
      }
      message.success(editando ? 'Cliente actualizado.' : 'Cliente registrado.');
      onGuardado();
    } catch (error) {
      const repetido = REPETIDO[valores.tipo];
      form.setFields(camposConError(error));
      if (error instanceof ApiError && error.code === 'DUPLICATE_KEY') {
        form.setFields([{ name: repetido.campo, errors: [repetido.mensaje] }]);
      }
      message.error(mensajeDeError(error, { DUPLICATE_KEY: repetido.mensaje }));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal open title={editando ? 'Editar cliente' : 'Nuevo cliente'} okText="Guardar" cancelText="Cancelar" onOk={form.submit} confirmLoading={enviando} onCancel={onCerrar}>
      <Form form={form} layout="vertical" requiredMark={false} initialValues={cliente ?? { tipo: 'FISICA' }} onFinish={guardar}>
        <Form.Item label="Tipo" name="tipo">
          <Radio.Group options={opciones(TIPOS_CLIENTE)} disabled={editando} />
        </Form.Item>
        <Form.Item label="Nombre" name="nombre" rules={requerido('Ingresá el nombre.')}>
          <Input />
        </Form.Item>
        {tipo === 'FISICA' ? (
          <Form.Item label="DNI" name="dni" rules={requerido('Ingresá el DNI.')}>
            <Input disabled={editando} />
          </Form.Item>
        ) : (
          <Form.Item label="CUIT" name="cuit" rules={requerido('Ingresá el CUIT.')}>
            <Input disabled={editando} />
          </Form.Item>
        )}
        <Form.Item label="Email" name="email" rules={[...requerido('Ingresá el email.'), { type: 'email', message: 'Ingresá un email válido.' }]}>
          <Input />
        </Form.Item>
        <Form.Item label="Teléfono" name="telefono" rules={requerido('Ingresá el teléfono.')}>
          <Input />
        </Form.Item>
        <Form.Item label="Dirección" name="direccion">
          <Input />
        </Form.Item>
      </Form>
    </Modal>
  );
}
