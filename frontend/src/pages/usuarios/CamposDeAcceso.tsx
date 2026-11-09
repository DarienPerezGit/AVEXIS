import { Checkbox, Form, Radio } from 'antd';
import type { FormInstance } from 'antd';
import { opciones } from '../../opciones';
import { ROLES } from '../../usuarios';

/**
 * Rol and owner status, shared by the create and edit forms. The API only accepts a titular who is a lawyer, so
 * choosing assistant turns the owner status off and locks it instead of letting the save fail.
 */
export function CamposDeAcceso({ form }: { form: FormInstance }) {
  const esAsistente = Form.useWatch('rol', form) === 'ASISTENTE';

  return (
    <>
      <Form.Item label="Rol" name="rol">
        <Radio.Group options={opciones(ROLES)} onChange={(e) => e.target.value === 'ASISTENTE' && form.setFieldValue('esTitular', false)} />
      </Form.Item>
      <Form.Item name="esTitular" valuePropName="checked">
        <Checkbox disabled={esAsistente}>Titular del estudio</Checkbox>
      </Form.Item>
    </>
  );
}
