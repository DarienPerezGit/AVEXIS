/**
 * Hosts and database of a MongoDB URI without the credentials or options, so a script can say where it writes.
 * Plain string handling instead of `new URL`: that throws on multi-host URIs and its error message carries the full URI,
 * password included.
 */
export function describeDatabase(uri: string) {
  const sinEsquema = uri.slice(uri.indexOf('://') + 3);
  const sinCredenciales = sinEsquema.slice(sinEsquema.lastIndexOf('@') + 1);
  return sinCredenciales.split('?')[0];
}

/** Like the check in `config/env.ts`, which scripts cannot import because it also requires the JWT secret. */
export function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}
