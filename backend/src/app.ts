import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import type { Express } from 'express';
import { createAudienciasRouter } from './audiencias/audiencias.routes.js';
import { createAuthRouter } from './auth/auth.routes.js';
import type { AuthConfig } from './auth/config.js';
import { createClientesRouter } from './clientes/clientes.routes.js';
import { databaseState } from './config/database.js';
import { errorHandler } from './errors/error-handler.js';
import { createErrorLogger } from './errors/logger.js';
import { createExpedientesRouter } from './expedientes/expedientes.routes.js';
import { createHonorariosRouter } from './honorarios/honorarios.routes.js';
import { createMovimientosRouter } from './movimientos/movimientos.routes.js';
import { createUsuariosRouter } from './usuarios/usuarios.routes.js';

export interface AppOptions {
  logDir?: string;
  /** Mounts the auth and user management routes. */
  auth?: AuthConfig;
  /** Extra origins allowed to call the API with credentials. Empty means same origin only. */
  corsOrigins?: string[];
  /** Registers routes before the error handlers, so they are covered by them. */
  configure?: (app: Express) => void;
}

export function createApp({ logDir = 'logs', auth, corsOrigins = [], configure }: AppOptions = {}) {
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
    app.use('/api/auth', createAuthRouter(auth));
    app.use('/api/usuarios', createUsuariosRouter(auth));
    app.use('/api/clientes', createClientesRouter(auth));
    app.use('/api/expedientes/:expedienteId/movimientos', createMovimientosRouter(auth));
    app.use('/api/expedientes/:expedienteId/honorario', createHonorariosRouter(auth));
    app.use('/api/expedientes', createExpedientesRouter(auth));
    app.use('/api/audiencias', createAudienciasRouter(auth));
  }

  configure?.(app);

  app.use((_req, res) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
  });
  app.use(errorHandler(createErrorLogger(logDir)));

  return app;
}
