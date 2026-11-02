import { isValidObjectId } from 'mongoose';
import { z } from 'zod';
import { AppError } from '../errors/app-error.js';
import type { ErrorDetail } from '../errors/app-error.js';

/** Validates input before it reaches Mongoose. Unknown keys are stripped, so a client cannot set server-controlled fields. */
export function parse<Schema extends z.ZodType>(schema: Schema, input: unknown): z.infer<Schema> {
  const result = schema.safeParse(input ?? {});
  if (!result.success) {
    throw validationError(result.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })));
  }
  return result.data;
}

export function validationError(details: ErrorDetail[]) {
  return new AppError(400, 'VALIDATION_ERROR', 'Invalid request data', details);
}

export const objectId = z.string().refine(isValidObjectId, 'Invalid id');