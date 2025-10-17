/**
 * Error Handling System
 *
 * Provides structured error classes and centralized error handling
 */

import { logger } from './logger';

/**
 * Base application error class
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly context?: Record<string, any>;

  constructor(
    message: string,
    code: string,
    statusCode = 500,
    isOperational = true,
    context?: Record<string, any>,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.context = context;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Business logic error (e.g., invalid state, business rule violation)
 */
export class BusinessError extends AppError {
  constructor(message: string, code = 'BUSINESS_ERROR', context?: Record<string, any>) {
    super(message, code, 400, true, context);
  }
}

/**
 * Validation error (e.g., invalid input)
 */
export class ValidationError extends AppError {
  public readonly fields?: Record<string, string[]>;

  constructor(message: string, fields?: Record<string, string[]>, context?: Record<string, any>) {
    super(message, 'VALIDATION_ERROR', 400, true, context);
    this.fields = fields;
  }
}

/**
 * Authentication error
 */
export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required', context?: Record<string, any>) {
    super(message, 'AUTH_ERROR', 401, true, context);
  }
}

/**
 * Authorization error (user doesn't have permission)
 */
export class AuthorizationError extends AppError {
  constructor(message = 'Unauthorized access', context?: Record<string, any>) {
    super(message, 'FORBIDDEN', 403, true, context);
  }
}

/**
 * Not found error
 */
export class NotFoundError extends AppError {
  constructor(resource: string, context?: Record<string, any>) {
    super(`${resource} not found`, 'NOT_FOUND', 404, true, context);
  }
}

/**
 * Network error (API call failed)
 */
export class NetworkError extends AppError {
  constructor(message = 'Network request failed', context?: Record<string, any>) {
    super(message, 'NETWORK_ERROR', 0, true, context);
  }
}

/**
 * Database/Firestore error
 */
export class DatabaseError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'DATABASE_ERROR', 500, true, context);
  }
}

/**
 * Rate limit error
 */
export class RateLimitError extends AppError {
  public readonly retryAfter?: number;

  constructor(retryAfter?: number, context?: Record<string, any>) {
    super('Rate limit exceeded', 'RATE_LIMIT', 429, true, context);
    this.retryAfter = retryAfter;
  }
}

/**
 * Map Firebase error codes to app errors
 */
export const mapFirebaseError = (error: any): AppError => {
  const code = error.code || '';
  const message = error.message || 'An unknown error occurred';

  switch (code) {
    case 'permission-denied':
      return new AuthorizationError('Access denied. Please check your account permissions.', {
        firebaseCode: code,
      });

    case 'unauthenticated':
      return new AuthenticationError('Please sign in to continue', { firebaseCode: code });

    case 'not-found':
      return new NotFoundError('Resource', { firebaseCode: code });

    case 'already-exists':
      return new BusinessError('Resource already exists', 'ALREADY_EXISTS', { firebaseCode: code });

    case 'resource-exhausted':
      return new RateLimitError(undefined, { firebaseCode: code });

    case 'failed-precondition':
      return new BusinessError(
        'Operation cannot be performed in current state',
        'FAILED_PRECONDITION',
        { firebaseCode: code },
      );

    case 'aborted':
      return new BusinessError('Operation was aborted', 'ABORTED', { firebaseCode: code });

    case 'out-of-range':
      return new ValidationError('Value is out of valid range', undefined, { firebaseCode: code });

    case 'unimplemented':
      return new AppError('Feature not implemented', 'NOT_IMPLEMENTED', 501, true, {
        firebaseCode: code,
      });

    case 'unavailable':
      return new NetworkError('Service temporarily unavailable', { firebaseCode: code });

    case 'deadline-exceeded':
      return new NetworkError('Request timeout', { firebaseCode: code });

    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return new AuthenticationError('Invalid email or password', { firebaseCode: code });

    case 'auth/email-already-in-use':
      return new BusinessError('Email address is already in use', 'EMAIL_IN_USE', {
        firebaseCode: code,
      });

    case 'auth/weak-password':
      return new ValidationError(
        'Password is too weak',
        { password: ['Password must be at least 6 characters'] },
        { firebaseCode: code },
      );

    case 'auth/invalid-email':
      return new ValidationError(
        'Invalid email address',
        { email: ['Email address is invalid'] },
        { firebaseCode: code },
      );

    case 'auth/user-disabled':
      return new AuthorizationError('Your account has been disabled', { firebaseCode: code });

    case 'auth/too-many-requests':
      return new RateLimitError(60, { firebaseCode: code });

    default:
      return new AppError(message, code || 'UNKNOWN_ERROR', 500, false, {
        firebaseCode: code,
        originalMessage: message,
      });
  }
};

/**
 * Global error handler
 */
export class ErrorHandler {
  /**
   * Handle error and return user-friendly message
   */
  static handle(error: any): { message: string; shouldReport: boolean } {
    let appError: AppError;

    // Convert to AppError if needed
    if (error instanceof AppError) {
      appError = error;
    } else if (error.code && error.code.includes('auth/')) {
      appError = mapFirebaseError(error);
    } else if (error.code) {
      // Firebase error
      appError = mapFirebaseError(error);
    } else if (error instanceof Error) {
      appError = new AppError(error.message, 'UNKNOWN_ERROR', 500, false);
    } else {
      appError = new AppError('An unexpected error occurred', 'UNKNOWN_ERROR', 500, false);
    }

    // Log the error
    if (appError.isOperational) {
      logger.error(appError.message, appError, {
        code: appError.code,
        statusCode: appError.statusCode,
        context: appError.context,
      });
    } else {
      logger.critical('Non-operational error occurred', appError, {
        code: appError.code,
        context: appError.context,
      });
    }

    return {
      message: this.getUserFriendlyMessage(appError),
      shouldReport: !appError.isOperational,
    };
  }

  /**
   * Get user-friendly error message
   */
  private static getUserFriendlyMessage(error: AppError): string {
    // Return the error message for operational errors
    if (error.isOperational) {
      return error.message;
    }

    // Generic message for non-operational errors
    return 'An unexpected error occurred. Our team has been notified.';
  }

  /**
   * Check if error should be reported to monitoring service
   */
  static shouldReport(error: AppError): boolean {
    return !error.isOperational || error.statusCode >= 500;
  }
}

/**
 * React error boundary helper
 */
export const logErrorBoundaryError = (error: Error, errorInfo: React.ErrorInfo) => {
  logger.critical('React Error Boundary caught error', error, {
    componentStack: errorInfo.componentStack,
  });
};
