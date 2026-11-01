import 'dotenv/config';
import type { AuthConfig } from '../auth/config.js';

const REQUIRED = ['MONGODB_URI', 'JWT_SECRET'] as const;

for (const name of REQUIRED) {
  if (!process.env[name]) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
}

const nodeEnv = process.env.NODE_ENV ?? 'development';

const auth: AuthConfig = {
  jwtSecret: process.env.JWT_SECRET as string,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '8h',
  // HTTPS-only cookies in production; plain HTTP is allowed for local development.
  secureCookie: (process.env.COOKIE_SECURE || String(nodeEnv === 'production')) === 'true',
  loginRateLimit: {
    limit: Number(process.env.LOGIN_RATE_LIMIT_MAX || 10),
    windowMs: Number(process.env.LOGIN_RATE_LIMIT_WINDOW_MINUTES || 15) * 60 * 1000,
  },
};

export const env = {
  nodeEnv,
  port: Number(process.env.PORT ?? 3000),
  mongodbUri: process.env.MONGODB_URI as string,
  auth,
  corsOrigins: (process.env.CORS_ORIGINS ?? '').split(',').map((origin) => origin.trim()).filter(Boolean),
  logDir: process.env.LOG_DIR ?? 'logs',
} as const;
