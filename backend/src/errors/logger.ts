import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import pino from 'pino';

export function createErrorLogger(logDir: string) {
  mkdirSync(logDir, { recursive: true });
  return pino(
    { level: 'error', timestamp: pino.stdTimeFunctions.isoTime },
    pino.destination({ dest: join(logDir, 'error.log'), sync: true }),
  );
}
