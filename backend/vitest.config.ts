import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Integration tests log in through bcrypt at cost 12 (slow by design) while files run in parallel.
    testTimeout: 30_000,
    hookTimeout: 60_000,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      // Only the tests themselves and their helpers are left out; server.ts and the CLI scripts count, untested or not.
      exclude: ['src/**/*.test.ts', 'src/test/**'],
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage',
      // The assignment asks for 40% of statements. The project's floor sits near the real value, as an alarm:
      // `npm run test:coverage` fails as soon as code lands without tests (ADR 0006).
      thresholds: { statements: 90, branches: 85, functions: 85, lines: 90 },
    },
  },
});
