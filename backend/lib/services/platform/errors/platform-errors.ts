// ==========================================
// Platform Errors — Standardized error handling for platform services.
// Mirrors Aqueduct Platform lib/services/platform/errors/platform-errors.
// Callers can use this path or @platform/lib/sui/platform-errors (when available).
// ==========================================

export enum PlatformErrorCode {
  CONFIG_MISSING = 'CONFIG_MISSING',
  CONFIG_INVALID = 'CONFIG_INVALID',
  INVALID_INPUT = 'INVALID_INPUT',
  INVALID_ADDRESS = 'INVALID_ADDRESS',
  INVALID_TIER = 'INVALID_TIER',
  INVALID_BADGE_ID = 'INVALID_BADGE_ID',
  INVALID_SESSION_ID = 'INVALID_SESSION_ID',
  BADGE_NOT_FOUND = 'BADGE_NOT_FOUND',
  BADGE_ALREADY_EXISTS = 'BADGE_ALREADY_EXISTS',
  BADGE_OWNERSHIP_MISMATCH = 'BADGE_OWNERSHIP_MISMATCH',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  TRANSACTION_BUILD_FAILED = 'TRANSACTION_BUILD_FAILED',
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  GAS_ESTIMATE_FAILED = 'GAS_ESTIMATE_FAILED',
  IMAGE_LOAD_FAILED = 'IMAGE_LOAD_FAILED',
  IMAGE_VALIDATION_FAILED = 'IMAGE_VALIDATION_FAILED',
  IMAGE_TOO_LARGE = 'IMAGE_TOO_LARGE',
  BLOCKCHAIN_QUERY_FAILED = 'BLOCKCHAIN_QUERY_FAILED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  ADMIN_REQUIRED = 'ADMIN_REQUIRED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  PLATFORM_ERROR = 'PLATFORM_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export class PlatformError extends Error {
  constructor(public code: PlatformErrorCode, message: string, public details?: any) {
    super(message);
    this.name = 'PlatformError';
    if (Error.captureStackTrace) Error.captureStackTrace(this, PlatformError);
  }
  toJSON(): { code: PlatformErrorCode; message: string; details?: any } {
    return { code: this.code, message: this.message, ...(this.details && { details: this.details }) };
  }
  static fromUnknown(error: unknown, context?: string): PlatformError {
    if (error instanceof PlatformError) return error;
    if (error instanceof Error) {
      return new PlatformError(PlatformErrorCode.UNKNOWN_ERROR, context ? context + ': ' + error.message : error.message, { originalError: error.name, stack: error.stack });
    }
    return new PlatformError(PlatformErrorCode.UNKNOWN_ERROR, context ? context + ': Unknown error' : 'Unknown error', { originalError: String(error) });
  }
  is(code: PlatformErrorCode): boolean {
    return this.code === code;
  }
}

export type PlatformResult<T> = { success: true; data: T } | { success: false; error: PlatformError };
export function success<T>(data: T): PlatformResult<T> {
  return { success: true, data };
}
export function failure(error: PlatformError): PlatformResult<never>;
export function failure(code: PlatformErrorCode, message: string, details?: any): PlatformResult<never>;
export function failure(errorOrCode: PlatformError | PlatformErrorCode, message?: string, details?: any): PlatformResult<never> {
  if (errorOrCode instanceof PlatformError) return { success: false, error: errorOrCode };
  return { success: false, error: new PlatformError(errorOrCode, message!, details) };
}
