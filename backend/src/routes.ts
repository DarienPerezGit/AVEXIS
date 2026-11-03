import type { Router } from 'express';
import { createAudienciasRouter } from './audiencias/audiencias.routes.js';
import type { Clock } from './audiencias/calendario.js';
import { createAuthRouter } from './auth/auth.routes.js';
import type { AuthConfig } from './auth/config.js';
import { createClientesRouter } from './clientes/clientes.routes.js';
import { createExpedientesRouter } from './expedientes/expedientes.routes.js';
import { createHonorariosRouter } from './honorarios/honorarios.routes.js';
import { createMovimientosRouter } from './movimientos/movimientos.routes.js';
import { createUsuariosRouter } from './usuarios/usuarios.routes.js';

export interface MountedRouter {
  /** Express mount path, e.g. `/api/expedientes/:expedienteId/movimientos`. */
  path: string;
  router: Router;
}

/**
 * Every API router and where it is mounted, in mounting order. One table, so the documentation test can rebuild
 * the full list of real routes (Express 5 does not keep mount paths) and check none is missing from the OpenAPI spec.
 */
export function createApiRouters(auth: AuthConfig, clock?: Clock): MountedRouter[] {
  return [
    { path: '/api/auth', router: createAuthRouter(auth) },
    { path: '/api/usuarios', router: createUsuariosRouter(auth) },
    { path: '/api/clientes', router: createClientesRouter(auth) },
    // Nested routers go before /api/expedientes, so its authentication does not run twice for them.
    { path: '/api/expedientes/:expedienteId/movimientos', router: createMovimientosRouter(auth) },
    { path: '/api/expedientes/:expedienteId/honorario', router: createHonorariosRouter(auth) },
    { path: '/api/expedientes', router: createExpedientesRouter(auth) },
    { path: '/api/audiencias', router: createAudienciasRouter(auth, clock) },
  ];
}
