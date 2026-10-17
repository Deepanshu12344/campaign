export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly fields?: Record<string, string[]>;

  constructor(statusCode: number, code: string, message: string, fields?: Record<string, string[]>) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.fields = fields;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad request', code = 'BAD_REQUEST', fields?: Record<string, string[]>) {
    super(400, code, message, fields);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', fields?: Record<string, string[]>) {
    super(400, 'VALIDATION_ERROR', message, fields);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required', code = 'UNAUTHORIZED') {
    super(401, code, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access forbidden', code = 'FORBIDDEN') {
    super(403, code, message);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', code = 'NOT_FOUND') {
    super(404, code, message);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource conflict', code = 'CONFLICT') {
    super(409, code, message);
  }
}

export class CampaignNotFundingError extends AppError {
  constructor(message = 'Campaign is not currently in FUNDING status') {
    super(400, 'CAMPAIGN_NOT_FUNDING', message);
  }
}

export class IllegalTransitionError extends AppError {
  constructor(message = 'Illegal lifecycle transition') {
    super(409, 'ILLEGAL_TRANSITION', message);
  }
}

export class PreconditionFailedError extends AppError {
  constructor(message = 'Precondition failed', fields?: Record<string, string[]>) {
    super(409, 'PRECONDITION_FAILED', message, fields);
  }
}

