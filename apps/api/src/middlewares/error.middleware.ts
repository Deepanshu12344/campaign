import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.fields ? { fields: err.fields } : {}),
      },
    });
    return;
  }

  // Handle Prisma unique constraint error
  if (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: string }).code === 'P2002'
  ) {
    res.status(409).json({
      error: {
        code: 'CONFLICT',
        message: 'A unique constraint was violated',
      },
    });
    return;
  }

  // Handle JSON parse error from express.json()
  if (err instanceof SyntaxError && 'status' in err && (err as { status: number }).status === 400) {
    res.status(400).json({
      error: {
        code: 'INVALID_JSON',
        message: 'Malformed JSON payload',
      },
    });
    return;
  }

  // Unknown/internal error
  const isProd = process.env.NODE_ENV === 'production';
  const message = isProd
    ? 'An internal server error occurred. Please try again later.'
    : err instanceof Error
      ? err.message
      : 'Internal Server Error';

  console.error('Unhandled server error:', err);

  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message,
    },
  });
}
