import { Alert, Button, Card, Flex, Form, Input, Typography } from 'antd';
import { useState } from 'react';
import { mensajeDeError } from '../errores';
import { useSesion } from '../sesion';

interface Credenciales {
  email: string;
  password: string;
}

export function Login() {
  const { entrar } = useSesion();
  const [error, setError] = useState<string>();
  const [enviando, setEnviando] = useState(false);

  async function enviar({ email, password }: Credenciales) {
    setError(undefined);
    setEnviando(true);
    try {
      await entrar(email, password);
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
          {error && <Alert type="error" title={error} style={{ marginBottom: 16 }} />}
          <Button type="primary" htmlType="submit" block loading={enviando}>
            Entrar
          </Button>
        </Form>
      </Card>
    </Flex>
  );
}
