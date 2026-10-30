import 'dotenv/config';

const REQUIRED = ['MONGODB_URI', 'JWT_SECRET'] as const;

for (const name of REQUIRED) {
  if (!process.env[name]) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3000),
  mongodbUri: process.env.MONGODB_URI as string,
  jwtSecret: process.env.JWT_SECRET as string,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '1h',
  logDir: process.env.LOG_DIR ?? 'logs',
} as const;
