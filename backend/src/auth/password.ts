import bcrypt from 'bcryptjs';
import type { HydratedDocument } from 'mongoose';
import { AppError } from '../errors/app-error.js';
import type { UsuarioDoc } from '../models/index.js';

// NIST SP 800-63B rev. 4: at least 15 characters for single-factor passwords, no composition rules.
const MIN_LENGTH = 15;
const MAX_LENGTH = 64;
// bcrypt silently ignores everything past 72 bytes.
const MAX_BYTES = 72;
const BCRYPT_COST = 12;

const invalid = (message: string) => new AppError(400, 'VALIDATION_ERROR', message);

export function assertPasswordPolicy(password: unknown): asserts password is string {
  if (typeof password !== 'string') {
    throw invalid('Password must be a string');
  }
  // Counts code points, not UTF-16 units, so an accented letter or an emoji is one character.
  const length = [...password].length;
  if (length < MIN_LENGTH) {
    throw invalid(`Password must have at least ${MIN_LENGTH} characters`);
  }
  if (length > MAX_LENGTH) {
    throw invalid(`Password must have at most ${MAX_LENGTH} characters`);
  }
  if (Buffer.byteLength(password, 'utf8') > MAX_BYTES) {
    throw invalid(`Password must fit in ${MAX_BYTES} bytes; accented letters take two`);
  }
}

export function hashPassword(password: string) {
  return bcrypt.hash(password, BCRYPT_COST);
}

/**
 * Stores a new password and bumps the session version, which logs the user out everywhere.
 * `debeCambiarPassword` is set when someone other than the user chose the password.
 */
export async function replacePassword(usuario: HydratedDocument<UsuarioDoc>, password: string, debeCambiarPassword: boolean) {
  usuario.passwordHash = await hashPassword(password);
  usuario.debeCambiarPassword = debeCambiarPassword;
  usuario.versionSesion += 1;
  await usuario.save();
}

const DUMMY_HASH = bcrypt.hashSync('timing-attack-placeholder', BCRYPT_COST);

/**
 * Without a hash (unknown user) it still compares against a dummy one, so the response
 * time does not reveal whether the user exists (timing attack).
 */
export function verifyPassword(password: unknown, passwordHash: string | undefined) {
  return bcrypt.compare(String(password), passwordHash ?? DUMMY_HASH);
}
