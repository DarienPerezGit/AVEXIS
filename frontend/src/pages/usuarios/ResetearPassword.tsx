import { App as AntApp, Form, Modal } from 'antd';
import { useState } from 'react';
import { api } from '../../api';
import { camposConError, mensajeDeError } from '../../errores';
import type { Usuario } from '../../permisos';
import { CampoContrasenaTemporal } from './CampoContrasenaTemporal';

interface Props {
  usuario: Usuario;
  onCerrar: () => void;
  onGuardado: () => void;
}

/** For a user who forgot their password: a new temporary one that the API makes them change on their next login. */
export function ResetearPassword({ usuario, onCerrar, onGuardado }: Props) {
  const { message } = AntApp.useApp();
  const [form] = Form.useForm();
  const [enviando, setEnviando] = useState(false);

  async function guardar({ password }: { password: string }) {
    setEnviando(true);
    try {
      await api(`/usuarios/${usuario._id}/reset-password`, { method: 'POST', body: { password } });
      message.success('Contraseña reseteada. Pasale la contraseña temporal.');
      onGuardado();
    } catch (error) {
      form.setFields(camposConError(error));
      message.error(mensajeDeError(error));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal open title={`Resetear contraseña de ${usuario.nombre}`} okText="Guardar" cancelText="Cancelar" onOk={form.submit} confirmLoading={enviando} onCancel={onCerrar}>
      <Form form={form} layout="vertical" requiredMark={false} onFinish={guardar}>
        <CampoContrasenaTemporal />
      </Form>
    </Modal>
  );
}
