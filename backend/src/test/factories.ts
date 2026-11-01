import request from 'supertest';
import { createApp } from '../app.js';
import type { AppOptions } from '../app.js';
import type { AuthConfig } from '../auth/config.js';
import { hashPassword } from '../auth/password.js';
import { Usuario } from '../models/index.js';
import type { Rol } from '../models/index.js';

export const PASSWORD = 'audiencia de los martes';

export const testAuthConfig: AuthConfig = {
  jwtSecret: 'test-secret-that-is-long-enough-for-hs256',
  jwtExpiresIn: '8h',
  secureCookie: false,
  loginRateLimit: { limit: 10, windowMs: 15 * 60 * 1000 },
};

export function createTestApp(overrides: Partial<AuthConfig> = {}, configure?: AppOptions['configure']) {
  return createApp({ auth: { ...testAuthConfig, ...overrides }, configure });
}

// Hashing at cost 12 is slow by design, so the shared test password is hashed once.
let passwordHash: Promise<string> | undefined;

interface UsuarioInput {
  nombre?: string;
  email?: string;
  rol?: Rol;
  esTitular?: boolean;
  activo?: boolean;
  debeCambiarPassword?: boolean;
}

let sequence = 0;

export async function crearUsuario(input: UsuarioInput = {}) {
  passwordHash ??= hashPassword(PASSWORD);
  sequence += 1;
  return Usuario.create({
    nombre: `Usuario ${sequence}`,
    email: `usuario${sequence}@estudio.com`,
    rol: 'ABOGADO',
    ...input,
    passwordHash: await passwordHash,
  });
}

/** Returns a Supertest agent that keeps the session cookie, like a browser would. */
export async function loginComo(app: ReturnType<typeof createApp>, email: string, password = PASSWORD) {
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/login').send({ email, password });
  if (res.status !== 200) {
    throw new Error(`Login failed with ${res.status}: ${JSON.stringify(res.body)}`);
  }
  return agent;
}
