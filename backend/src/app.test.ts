import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from './app.js';

describe('GET /api/health', () => {
  it('responds 503 with a degraded status while the database is not connected', async () => {
    const res = await request(createApp()).get('/api/health');

    expect(res.status).toBe(503);
    expect(res.body).toEqual({ status: 'degraded', database: 'disconnected' });
  });
});
