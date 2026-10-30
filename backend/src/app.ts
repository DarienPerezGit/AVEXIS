import express from 'express';
import type { Express } from 'express';
import { databaseState } from './config/database.js';
import { errorHandler } from './errors/error-handler.js';
import { createErrorLogger } from './errors/logger.js';

export interface AppOptions {
  logDir?: string;
  /** Registers routes before the error handlers, so they are covered by them. */
  configure?: (app: Express) => void;
}

export function createApp({ logDir = 'logs', configure }: AppOptions = {}) {
  const app = express();
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    const database = databaseState();
    res.status(database === 'connected' ? 200 : 503).json({ status: database === 'connected' ? 'ok' : 'degraded', database });
  });

  configure?.(app);

  app.use((_req, res) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
  });
  app.use(errorHandler(createErrorLogger(logDir)));

  return app;
}
