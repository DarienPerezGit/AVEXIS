import { Alert, Button, Card, Flex, Form, Input, Typography } from 'antd';
import { useState } from 'react';
import { mensajeDeError } from '../errores';
import { useSesion } from '../sesion';

interface Credenciales {
  email: string;
  password: string;
  codigo?: string;
}

export function Login() {
  const { entrar } = useSesion();
  const [error, setError] = useState<string>();
  const [enviando, setEnviando] = useState(false);
  // The password was right and the account has 2FA: the same form now also asks for the app's code.
  const [pideCodigo, setPideCodigo] = useState(false);

  async function enviar({ email, password, codigo }: Credenciales) {
    setError(undefined);
    setEnviando(true);
    try {
      setPideCodigo(await entrar(email, password, pideCodigo ? codigo : undefined));
    } catch (causa) {
      setError(mensajeDeError(causa));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Flex justify="center" align="center" style={{ minHeight: '100vh', padding: 16 }}>
      <Card style={{ width: 380 }}>
        <Typography.Title level={2}>AVEXIS</Typography.Title>
        <Form layout="vertical" onFinish={enviar} requiredMark={false}>
          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: 'Ingresá tu email.' },
              { type: 'email', message: 'Ese email no es válido.' },
            ]}
          >
            <Input autoComplete="username" />
          </Form.Item>
          <Form.Item label="Contraseña" name="password" rules={[{ required: true, message: 'Ingresá tu contraseña.' }]}>
            <Input.Password autoComplete="current-password" />
          </Form.Item>
          {pideCodigo && (
            <Form.Item
              label="Código de la app de autenticación"
              name="codigo"
              rules={[
                { required: true, message: 'Ingresá el código de tu app.' },
                { pattern: /^\d{6}$/, message: 'Son 6 números.' },
              ]}
            >
              <Input autoComplete="one-time-code" inputMode="numeric" maxLength={6} autoFocus />
            </Form.Item>
          )}
          {error && <Alert type="error" title={error} style={{ marginBottom: 16 }} />}
          <Button type="primary" htmlType="submit" block loading={enviando}>
            {pideCodigo ? 'Verificar' : 'Entrar'}
          </Button>
        </Form>
      </Card>
    </Flex>
  );
}
