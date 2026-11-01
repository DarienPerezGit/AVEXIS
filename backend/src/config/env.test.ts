import { afterEach, describe, expect, it, vi } from 'vitest';

describe('env', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('refuses to start without JWT_SECRET', async () => {
    // An empty value is kept as is: dotenv never overrides a variable that is already set.
    vi.stubEnv('MONGODB_URI', 'mongodb://localhost/test');
    vi.stubEnv('JWT_SECRET', '');

    await expect(import('./env.js')).rejects.toThrow('JWT_SECRET');
  });
});
