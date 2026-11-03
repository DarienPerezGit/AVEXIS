import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { buildOpenApiDocument } from './openapi.js';

const SPEC_URL = '/api/docs/openapi.json';

/** Swagger UI at /api/docs, reading the OpenAPI document from /api/docs/openapi.json. */
export function createDocsRouter() {
  const router = Router();
  const document = buildOpenApiDocument();

  router.get('/openapi.json', (_req, res) => {
    res.json(document);
  });
  // "Try it out" calls the API from the same origin, so the session cookie set by the login travels by itself.
  router.use('/', swaggerUi.serve, swaggerUi.setup(undefined, { swaggerOptions: { url: SPEC_URL } }));

  return router;
}
