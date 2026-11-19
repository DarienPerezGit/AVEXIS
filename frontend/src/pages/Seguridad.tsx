import { App as AntApp, Alert, Button, Card, Flex, Form, Image, Input, Tag, Typography } from 'antd';
import { useState } from 'react';
import { api } from '../api';
import { mensajeDeError } from '../errores';
import { useSesion } from '../sesion';

interface Alta {
  qr: string;
  secret: string;
}

const CODIGO = [
  { required: true, message: 'Ingresá el código de tu app.' },
  { pattern: /^\d{6}$/, message: 'Son 6 números.' },
];

/** Opt-in two-factor authentication with an authenticator app (TOTP). */
export function Seguridad() {
  const { usuario, recargar } = useSesion();
  const { message } = AntApp.useApp();
  const [alta, setAlta] = useState<Alta>();
  const [error, setError] = useState<string>();
  const [enviando, setEnviando] = useState(false);

  async function correr(accion: () => Promise<void>) {
    setError(undefined);
    setEnviando(true);
    try {
      await accion();
    } catch (causa) {
      setError(mensajeDeError(causa, { INVALID_CREDENTIALS: 'La contraseña no es correcta.' }));
    } finally {
      setEnviando(false);
    }
  }

  const empezar = () => correr(async () => setAlta(await api<Alta>('/auth/me/2fa/setup', { method: 'POST' })));

  const activar = ({ codigo }: { codigo: string }) =>
    correr(async () => {
      await api('/auth/me/2fa/enable', { method: 'POST', body: { codigo } });
      setAlta(undefined);
      await recargar();
      message.success('Verificación en dos pasos activada.');
    });

  const desactivar = ({ password, codigo }: { password: string; codigo: string }) =>
    correr(async () => {
      await api('/auth/me/2fa/disable', { method: 'POST', body: { password, codigo } });
      await recargar();
      message.success('Verificación en dos pasos desactivada.');
    });

  return (
    <Flex justify="center" style={{ padding: 16 }}>
      <Card style={{ width: 460 }}>
        <Typography.Title level={2}>Seguridad</Typography.Title>
        <Flex align="center" gap={8} style={{ marginBottom: 16 }}>
          <Typography.Text strong>Verificación en dos pasos</Typography.Text>
          {usuario?.totpActivo ? <Tag color="green">Activada</Tag> : <Tag>Desactivada</Tag>}
        </Flex>
        {error && <Alert type="error" title={error} style={{ marginBottom: 16 }} />}

        {!usuario?.totpActivo && !alta && (
          <>
            <Typography.Paragraph>
              Además de la contraseña, al entrar te pedimos un código de 6 números de una app como Google Authenticator.
            </Typography.Paragraph>
            <Button type="primary" onClick={empezar} loading={enviando}>
              Activar
            </Button>
          </>
        )}

        {!usuario?.totpActivo && alta && (
          <Form layout="vertical" onFinish={activar} requiredMark={false}>
            <Typography.Paragraph>Escaneá este código QR con tu app de autenticación y escribí el código que te muestra.</Typography.Paragraph>
            <Flex justify="center">
              <Image src={alta.qr} alt="Código QR para la app de autenticación" width={200} preview={false} />
            </Flex>
            <Typography.Paragraph type="secondary" style={{ textAlign: 'center' }}>
              Si no podés escanearlo, cargá esta clave a mano: <Typography.Text code>{alta.secret}</Typography.Text>
            </Typography.Paragraph>
            <Form.Item label="Código" name="codigo" rules={CODIGO}>
              <Input autoComplete="one-time-code" inputMode="numeric" maxLength={6} />
            </Form.Item>
            <Flex gap={8}>
              <Button type="primary" htmlType="submit" loading={enviando}>
                Confirmar
              </Button>
              <Button disabled={enviando} onClick={() => setAlta(undefined)}>
                Cancelar
              </Button>
            </Flex>
          </Form>
        )}

        {usuario?.totpActivo && (
          <Form layout="vertical" onFinish={desactivar} requiredMark={false}>
            <Typography.Paragraph>Para desactivarla necesitás tu contraseña y un código de la app.</Typography.Paragraph>
            <Form.Item label="Contraseña" name="password" rules={[{ required: true, message: 'Ingresá tu contraseña.' }]}>
              <Input.Password autoComplete="current-password" />
            </Form.Item>
            <Form.Item label="Código" name="codigo" rules={CODIGO}>
              <Input autoComplete="one-time-code" inputMode="numeric" maxLength={6} />
            </Form.Item>
            <Button danger htmlType="submit" loading={enviando}>
              Desactivar
            </Button>
          </Form>
        )}
      </Card>
    </Flex>
  );
}
