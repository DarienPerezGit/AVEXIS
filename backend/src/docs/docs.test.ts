import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { useTestDatabase } from '../test/database.js';
import { createApiRouters } from '../routes.js';
import { crearUsuario, createTestApp, loginComo, testAuthConfig } from '../test/factories.js';

useTestDatabase();

describe('API documentation', () => {
  it('serves an OpenAPI 3 document and the Swagger UI', async () => {
    const app = createTestApp();

    const spec = await request(app).get('/api/docs/openapi.json');
    const ui = await request(app).get('/api/docs/');

    expect(spec.status).toBe(200);
    expect(spec.body.openapi).toMatch(/^3\./);
    expect(spec.body.components.securitySchemes.cookieAuth).toMatchObject({ type: 'apiKey', in: 'cookie', name: 'token' });
    expect(ui.status).toBe(200);
    expect(ui.text).toContain('swagger-ui');
  });

  it('documents every real route, and nothing that does not exist', async () => {
    const spec = (await request(createTestApp()).get('/api/docs/openapi.json')).body;
    const documented = Object.entries(spec.paths as Record<string, object>).flatMap(([path, methods]) =>
      Object.keys(methods).map((method) => `${method.toUpperCase()} ${path}`),
    );

    // Rebuilt from the mount table plus each router's own routes; Express syntax `:id` becomes OpenAPI `{id}`.
    const real = createApiRouters(testAuthConfig).flatMap(({ path, router }) =>
      router.stack
        .filter((layer) => layer.route)
        .flatMap((layer) => {
          const route = layer.route as unknown as { path: string; methods: Record<string, boolean> };
          const fullPath = `${path}${route.path === '/' ? '' : route.path}`.replace(/:(\w+)/g, '{$1}');
          return Object.keys(route.methods).map((method) => `${method.toUpperCase()} ${fullPath}`);
        }),
    );

    expect([...documented].sort()).toEqual(['GET /api/health', ...real].sort());
  });

  it('documents the status each operation really answers without a session', async () => {
    const app = createTestApp();
    const spec = (await request(app).get('/api/docs/openapi.json')).body;

    for (const [path, methods] of Object.entries(spec.paths as Record<string, Record<string, { responses: object }>>)) {
      for (const [method, op] of Object.entries(methods)) {
        const url = path.replace(/\{\w+\}/g, '650000000000000000000000');
        const res = await request(app)[method as 'get'](url);
        expect.soft(Object.keys(op.responses), `${method.toUpperCase()} ${path} answered ${res.status}`).toContain(String(res.status));
      }
    }
  });

  it('lets a login made through the documented endpoint call a protected one, as Swagger UI does', async () => {
    const app = createTestApp();
    await crearUsuario({ email: 'ana@estudio.com' });

    const agent = await loginComo(app, 'ana@estudio.com');

    expect((await agent.get('/api/expedientes')).status).toBe(200);
  });
});
