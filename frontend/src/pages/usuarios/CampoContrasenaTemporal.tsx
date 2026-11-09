import { Form, Input } from 'antd';
import { LONGITUD_CONTRASENA } from '../../usuarios';

/** The temporary password the titular hands over, shared by the create and reset forms. */
export function CampoContrasenaTemporal() {
  return (
    <Form.Item label="Contraseña temporal" name="password" rules={[{ required: true, message: 'Ingresá una contraseña temporal.' }, LONGITUD_CONTRASENA]}>
      <Input.Password autoComplete="new-password" />
    </Form.Item>
  );
}
