// ==========================================
// Badge Errors - Standardized error handling for badge service
// ==========================================

/**
 * Error codes for badge service operations
 */
export enum BadgeErrorCode {
  // Configuration errors
  CONFIG_MISSING = 'CONFIG_MISSING',
  CONFIG_INVALID = 'CONFIG_INVALID',
  
  // Validation errors
  INVALID_ADDRESS = 'INVALID_ADDRESS',
  INVALID_TIER = 'INVALID_TIER',
  INVALID_BADGE_ID = 'INVALID_BADGE_ID',
  INVALID_SESSION_ID = 'INVALID_SESSION_ID',
  
  // Badge state errors
  BADGE_NOT_FOUND = 'BADGE_NOT_FOUND',
  BADGE_ALREADY_EXISTS = 'BADGE_ALREADY_EXISTS',
  BADGE_OWNERSHIP_MISMATCH = 'BADGE_OWNERSHIP_MISMATCH',
  
  // Transaction errors
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  TRANSACTION_BUILD_FAILED = 'TRANSACTION_BUILD_FAILED',
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  GAS_ESTIMATE_FAILED = 'GAS_ESTIMATE_FAILED',
  
  // Image errors
  IMAGE_LOAD_FAILED = 'IMAGE_LOAD_FAILED',
  IMAGE_VALIDATION_FAILED = 'IMAGE_VALIDATION_FAILED',
  IMAGE_TOO_LARGE = 'IMAGE_TOO_LARGE',
  
  // Network/Blockchain errors
  BLOCKCHAIN_QUERY_FAILED = 'BLOCKCHAIN_QUERY_FAILED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  
  // Permission errors
  UNAUTHORIZED = 'UNAUTHORIZED',
  ADMIN_REQUIRED = 'ADMIN_REQUIRED',
  
  // Unknown errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Standardized error class for badge service
 * Provides consistent error handling across all badge operations
 */
export class BadgeError extends Error {
  constructor(
    public code: BadgeErrorCode,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'BadgeError';
    
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, BadgeError);
    }
  }
  
  /**
   * Convert error to JSON for API responses
   */
  toJSON(): {
    code: BadgeErrorCode;
    message: string;
    details?: any;
  } {
    return {
      code: this.code,
      message: this.message,
      ...(this.details && { details: this.details }),
    };
  }
  
  /**
   * Create a BadgeError from an unknown error
   */
  static fromUnknown(error: unknown, context?: string): BadgeError {
    if (error instanceof BadgeError) {
      return error;
    }
    
    if (error instanceof Error) {
      return new BadgeError(
        BadgeErrorCode.UNKNOWN_ERROR,
        context ? `${context}: ${error.message}` : error.message,
        { originalError: error.name, stack: error.stack }
      );
    }
    
    return new BadgeError(
      BadgeErrorCode.UNKNOWN_ERROR,
      context ? `${context}: Unknown error` : 'Unknown error',
      { originalError: String(error) }
    );
  }
  
  /**
   * Check if error is a specific error code
   */
  is(code: BadgeErrorCode): boolean {
    return this.code === code;
  }
}

/**
 * Result type for badge operations
 * Provides type-safe success/failure handling
 */
export type BadgeResult<T> = 
  | { success: true; data: T }
  | { success: false; error: BadgeError };

/**
 * Helper to create a success result
 */
export function success<T>(data: T): BadgeResult<T> {
  return { success: true, data };
}

/**
 * Helper to create a failure result
 */
export function failure(error: BadgeError): BadgeResult<never>;
export function failure(code: BadgeErrorCode, message: string, details?: any): BadgeResult<never>;
export function failure(
  errorOrCode: BadgeError | BadgeErrorCode,
  message?: string,
  details?: any
): BadgeResult<never> {
  if (errorOrCode instanceof BadgeError) {
    return { success: false, error: errorOrCode };
  }
  return { success: false, error: new BadgeError(errorOrCode, message!, details) };
}

