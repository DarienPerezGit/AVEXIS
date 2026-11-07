import react from '@vitejs/plugin-react';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');

  return {
    plugins: [react()],
    server: {
      // Browser and API share one origin in development too, so the SameSite=Strict session cookie just works.
      proxy: { '/api': env.VITE_PROXY_TARGET ?? 'http://localhost:3000' },
    },
    test: {
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts',
      // Ant Design components are slow to render under jsdom while files run in parallel.
      testTimeout: 30_000,
      coverage: {
        provider: 'v8',
        include: ['src/**/*.{ts,tsx}'],
        exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**'],
        reporter: ['text', 'html', 'lcov'],
        reportsDirectory: './coverage',
        // The assignment's floor. It rises once every page exists (ADR 0007).
        thresholds: { statements: 40 },
      },
    },
  };
});
