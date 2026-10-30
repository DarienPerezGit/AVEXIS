import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Error as MongooseError } from 'mongoose';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from './app.js';
import { Cliente } from './models/cliente.model.js';

let logDir: string;

beforeEach(() => {
  logDir = mkdtempSync(join(tmpdir(), 'avexis-logs-'));
});

afterEach(() => {
  rmSync(logDir, { recursive: true, force: true });
});

function appThatFailsWith(error: unknown) {
  return createApp({
    logDir,
    configure: (app) => {
      app.get('/boom', () => {
        throw error;
      });
    },
  });
}

describe('error handling', () => {
  it('responds 500 as JSON without the stack and writes the error to logs/error.log', async () => {
    const res = await request(appThatFailsWith(new Error('kaboom'))).get('/boom');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
    expect(JSON.stringify(res.body)).not.toContain('kaboom');

    const entry = JSON.parse(readFileSync(join(logDir, 'error.log'), 'utf8').trim().split('\n')[0]);
    expect(entry.method).toBe('GET');
    expect(entry.path).toBe('/boom');
    expect(entry.err.message).toBe('kaboom');
    expect(entry.err.stack).toContain('kaboom');
    expect(new Date(entry.time).getTime()).not.toBeNaN();
  });

  it('responds 400 for a Mongoose validation error', async () => {
    const validationError = await new Cliente({}).validate().catch((e: unknown) => e);

    const res = await request(appThatFailsWith(validationError)).get('/boom');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(JSON.stringify(res.body)).not.toContain('stack');
  });

  it('responds 409 for a duplicate key error', async () => {
    const duplicateKeyError = Object.assign(new Error('E11000 duplicate key error'), {
      code: 11000,
      keyValue: { email: 'ana@estudio.com' },
    });

    const res = await request(appThatFailsWith(duplicateKeyError)).get('/boom');

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('DUPLICATE_KEY');
    expect(res.body.error.message).toContain('email');
  });

  it('responds 400 for a Mongoose cast error', async () => {
    const castError = new MongooseError.CastError('ObjectId', 'not-an-id', '_id');

    const res = await request(appThatFailsWith(castError)).get('/boom');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_ID');
  });

  it('responds 404 as JSON for an unknown route', async () => {
    const res = await request(createApp({ logDir })).get('/api/does-not-exist');

    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toContain('application/json');
    expect(res.body).toEqual({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
  });
});
