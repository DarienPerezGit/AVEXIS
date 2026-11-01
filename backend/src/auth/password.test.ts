import { describe, expect, it } from 'vitest';
import { assertPasswordPolicy } from './password.js';

describe('assertPasswordPolicy', () => {
  it('accepts passwords from 15 to 64 characters with no composition rules', () => {
    expect(() => assertPasswordPolicy('a'.repeat(15))).not.toThrow();
    expect(() => assertPasswordPolicy('audiencia de los martes')).not.toThrow();
    expect(() => assertPasswordPolicy('a'.repeat(64))).not.toThrow();
  });

  it('rejects passwords shorter than 15 or longer than 64 characters', () => {
    expect(() => assertPasswordPolicy('a'.repeat(14))).toThrow(/15/);
    expect(() => assertPasswordPolicy('a'.repeat(65))).toThrow(/64/);
  });

  it('rejects passwords over the 72 bytes bcrypt reads, even under 64 characters', () => {
    // "á" takes 2 bytes in UTF-8: 40 characters are 80 bytes.
    expect(() => assertPasswordPolicy('á'.repeat(40))).toThrow(/72 bytes/);
  });

  it('rejects anything that is not a string', () => {
    expect(() => assertPasswordPolicy(undefined)).toThrow();
    expect(() => assertPasswordPolicy(123456789012345)).toThrow();
  });
});
