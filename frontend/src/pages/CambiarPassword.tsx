import { App as AntApp, Alert, Button, Card, Flex, Form, Input, Typography } from 'antd';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { api } from '../api';
import { mensajeDeError } from '../errores';
import { useSesion } from '../sesion';

interface Cambio {
  actual: string;
  nueva: string;
}

const LONGITUD_PERMITIDA = { min: 15, max: 64, message: 'Debe tener entre 15 y 64 caracteres.' };

export function CambiarPassword() {
  const { usuario, recargar, salir } = useSesion();
  const { message } = AntApp.useApp();
  const navigate = useNavigate();
  const [error, setError] = useState<string>();
  const [enviando, setEnviando] = useState(false);

  async function enviar({ actual, nueva }: Cambio) {
    setError(undefined);
    setEnviando(true);
    try {
      await api('/auth/me/password', { method: 'PATCH', body: { actual, nueva } });
      // The API renewed the session cookie and cleared the forced change, so the user must be read again.
      await recargar();
      message.success('Contraseña actualizada.');
      navigate('/', { replace: true });
    } catch (causa) {
      setError(mensajeDeError(causa, { INVALID_CREDENTIALS: 'La contraseña actual no es correcta.' }));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Flex justify="center" style={{ padding: 16 }}>
      <Card style={{ width: 420 }}>
        <Typography.Title level={2}>Cambiar contraseña</Typography.Title>
        {usuario?.debeCambiarPassword && (
          <Typography.Paragraph>Antes de seguir, elegí una contraseña que solo sepas vos.</Typography.Paragraph>
        )}
        <Form layout="vertical" onFinish={enviar} requiredMark={false}>
          <Form.Item label="Contraseña actual" name="actual" rules={[{ required: true, message: 'Ingresá tu contraseña actual.' }]}>
            <Input.Password autoComplete="current-password" />
          </Form.Item>
          <Form.Item label="Contraseña nueva" name="nueva" rules={[{ required: true, message: 'Ingresá la contraseña nueva.' }, LONGITUD_PERMITIDA]}>
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Form.Item
            label="Repetir contraseña nueva"
            name="confirmacion"
            dependencies={['nueva']}
            rules={[
              { required: true, message: 'Repetí la contraseña nueva.' },
              ({ getFieldValue }) => ({
                validator: (_regla, valor) =>
                  !valor || getFieldValue('nueva') === valor ? Promise.resolve() : Promise.reject(new Error('Las contraseñas no coinciden.')),
              }),
            ]}
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          {error && <Alert type="error" title={error} style={{ marginBottom: 16 }} />}
          <Flex gap={8}>
            <Button type="primary" htmlType="submit" loading={enviando}>
              Guardar
            </Button>
            {usuario?.debeCambiarPassword && (
              <Button disabled={enviando} onClick={() => salir().catch((causa: unknown) => message.error(mensajeDeError(causa)))}>Cerrar sesión</Button>
            )}
          </Flex>
        </Form>
      </Card>
    </Flex>
  );
}
