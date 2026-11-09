import { App as AntApp, Form, Input, Modal } from 'antd';
import { useState } from 'react';
import { ApiError, api } from '../../api';
import { camposConError, mensajeDeError } from '../../errores';
import type { Rol } from '../../usuarios';
import { LONGITUD_CONTRASENA } from '../../usuarios';
import { CamposDeAcceso } from './CamposDeAcceso';

interface Valores {
  nombre: string;
  email: string;
  rol: Rol;
  esTitular: boolean;
  password: string;
}

const requerido = (message: string) => [{ required: true, message }];

const EMAIL_REPETIDO = 'Ya existe un usuario con ese email.';

interface Props {
  onCerrar: () => void;
  onGuardado: () => void;
}

/**
 * Creates an account with a temporary password that the titular hands over. The API makes the new user change it
 * on their first login, so the titular never knows the password the user ends up with.
 */
export function NuevoUsuario({ onCerrar, onGuardado }: Props) {
  const { message } = AntApp.useApp();
  const [form] = Form.useForm();
  const [enviando, setEnviando] = useState(false);

  async function guardar(valores: Valores) {
    setEnviando(true);
    try {
      await api('/usuarios', { method: 'POST', body: valores });
      message.success('Usuario creado. Pasale la contraseña temporal.');
      onGuardado();
    } catch (error) {
      form.setFields(camposConError(error));
      // The email is a user's only unique field, and a duplicate comes without details.
      if (error instanceof ApiError && error.code === 'DUPLICATE_KEY') {
        form.setFields([{ name: 'email', errors: [EMAIL_REPETIDO] }]);
      }
      message.error(mensajeDeError(error, { DUPLICATE_KEY: EMAIL_REPETIDO }));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal open title="Nuevo usuario" okText="Guardar" cancelText="Cancelar" onOk={form.submit} confirmLoading={enviando} onCancel={onCerrar}>
      <Form form={form} layout="vertical" requiredMark={false} initialValues={{ rol: 'ABOGADO', esTitular: false }} onFinish={guardar}>
        <Form.Item label="Nombre" name="nombre" rules={requerido('Ingresá el nombre.')}>
          <Input />
        </Form.Item>
        <Form.Item label="Email" name="email" rules={[...requerido('Ingresá el email.'), { type: 'email', message: 'Ingresá un email válido.' }]}>
          <Input />
        </Form.Item>
        <CamposDeAcceso form={form} />
        <Form.Item label="Contraseña temporal" name="password" rules={[...requerido('Ingresá una contraseña temporal.'), LONGITUD_CONTRASENA]}>
          <Input.Password autoComplete="new-password" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
