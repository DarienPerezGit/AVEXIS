import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from './app.js';
import { useTestDatabase } from './test/database.js';

useTestDatabase();

describe('GET /api/health with the database connected', () => {
  it('responds 200 ok', async () => {
    const res = await request(createApp()).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', database: 'connected' });
  });
});
