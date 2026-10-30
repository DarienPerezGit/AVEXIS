import type { ErrorRequestHandler } from 'express';
import { Error as MongooseError } from 'mongoose';
import type { Logger } from 'pino';
import { AppError } from './app-error.js';

interface ErrorBody {
  status: number;
  code: string;
  message: string;
}

function toErrorBody(err: unknown): ErrorBody {
  if (err instanceof AppError) {
    return { status: err.status, code: err.code, message: err.message };
  }
  if (err instanceof MongooseError.ValidationError) {
    return { status: 400, code: 'VALIDATION_ERROR', message: err.message };
  }
  if (err instanceof MongooseError.CastError) {
    return { status: 400, code: 'INVALID_ID', message: `Invalid value for ${err.path}` };
  }
  if (typeof err === 'object' && err !== null && (err as { code?: unknown }).code === 11000) {
    const fields = Object.keys((err as { keyValue?: object }).keyValue ?? {}).join(', ');
    return { status: 409, code: 'DUPLICATE_KEY', message: `Duplicate value for: ${fields}` };
  }
  return { status: 500, code: 'INTERNAL_ERROR', message: 'Internal server error' };
}

export function errorHandler(logger: Logger): ErrorRequestHandler {
  return (err, req, res, _next) => {
    const { status, code, message } = toErrorBody(err);
    if (status >= 500) {
      logger.error({ method: req.method, path: req.path, err }, 'Unhandled error');
    }
    res.status(status).json({ error: { code, message } });
  };
}
