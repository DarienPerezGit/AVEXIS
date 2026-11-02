import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Integration tests log in through bcrypt at cost 12 (slow by design) while files run in parallel.
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
