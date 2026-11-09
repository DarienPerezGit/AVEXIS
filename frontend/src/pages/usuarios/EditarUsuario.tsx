import { App as AntApp, Checkbox, Form, Modal } from 'antd';
import { useState } from 'react';
import { api } from '../../api';
import { camposConError, mensajeDeError } from '../../errores';
import type { Usuario } from '../../permisos';
import { CamposDeAcceso } from './CamposDeAcceso';

type Valores = Pick<Usuario, 'rol' | 'esTitular' | 'activo'>;

interface Props {
  usuario: Usuario;
  onCerrar: () => void;
  onGuardado: () => void;
}

/**
 * Changes a user's access: rol, owner status and whether they may log in. Deactivating keeps the account, so the
 * user's authorship stays in the history. A mistake here cuts someone's access, so deactivating asks first.
 */
export function EditarUsuario({ usuario, onCerrar, onGuardado }: Props) {
  const { message, modal } = AntApp.useApp();
  const [form] = Form.useForm();
  const [enviando, setEnviando] = useState(false);

  async function enviar(valores: Valores) {
    setEnviando(true);
    try {
      // Rol and owner status always travel together: the API checks them as a pair (a titular must be a lawyer).
      await api(`/usuarios/${usuario._id}`, { method: 'PATCH', body: valores });
      message.success('Usuario actualizado.');
      onGuardado();
    } catch (error) {
      form.setFields(camposConError(error));
      message.error(mensajeDeError(error));
    } finally {
      setEnviando(false);
    }
  }

  function guardar(valores: Valores) {
    if (!usuario.activo || valores.activo) {
      return enviar(valores);
    }
    modal.confirm({
      title: `¿Desactivar a ${usuario.nombre}?`,
      content: (
        <>
          <p>No va a poder entrar al sistema. Lo que hizo queda en el historial.</p>
          {/* A warning, not a block: the cases are reassigned by hand from each expediente. */}
          {usuario.rol === 'ABOGADO' && <p>Revisá sus expedientes abiertos y reasignalos desde cada expediente.</p>}
        </>
      ),
      okText: 'Sí, desactivar',
      okButtonProps: { danger: true },
      cancelText: 'Cancelar',
      onOk: () => enviar(valores),
    });
  }

  return (
    <Modal open title="Editar usuario" okText="Guardar" cancelText="Cancelar" onOk={form.submit} confirmLoading={enviando} onCancel={onCerrar}>
      <Form form={form} layout="vertical" initialValues={{ rol: usuario.rol, esTitular: usuario.esTitular, activo: usuario.activo }} onFinish={guardar}>
        <CamposDeAcceso form={form} />
        <Form.Item name="activo" valuePropName="checked">
          <Checkbox>Activo</Checkbox>
        </Form.Item>
      </Form>
    </Modal>
  );
}
