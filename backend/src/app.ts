import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import type { Express } from 'express';
import type { Clock } from './audiencias/calendario.js';
import type { AuthConfig } from './auth/config.js';
import { databaseState } from './config/database.js';
import { createDocsRouter } from './docs/docs.routes.js';
import { errorHandler } from './errors/error-handler.js';
import { createErrorLogger } from './errors/logger.js';
import { createApiRouters } from './routes.js';

export interface AppOptions {
  logDir?: string;
  /** Mounts the auth and user management routes. */
  auth?: AuthConfig;
  /** Extra origins allowed to call the API with credentials. Empty means same origin only. */
  corsOrigins?: string[];
  clock?: Clock;
  /** Registers routes before the error handlers, so they are covered by them. */
  configure?: (app: Express) => void;
}

export function createApp({ logDir = 'logs', auth, corsOrigins = [], clock, configure }: AppOptions = {}) {
  const app = express();
  app.use(helmet());
  // Front and API share one origin, so cross-origin calls are refused unless an origin is listed explicitly.
  app.use(cors({ origin: corsOrigins, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());

  app.get('/api/health', (_req, res) => {
    const database = databaseState();
    res.status(database === 'connected' ? 200 : 503).json({ status: database === 'connected' ? 'ok' : 'degraded', database });
  });

  if (auth) {
    for (const { path, router } of createApiRouters(auth, clock)) {
      app.use(path, router);
    }
    app.use('/api/docs', createDocsRouter());
  }

  configure?.(app);

  app.use((_req, res) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
  });
  app.use(errorHandler(createErrorLogger(logDir)));

  return app;
}
