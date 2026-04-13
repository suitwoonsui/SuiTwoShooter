export enum BadgeErrorCode {
  INVALID_ADDRESS = 'INVALID_ADDRESS',
  UNAUTHORIZED = 'UNAUTHORIZED',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  BLOCKCHAIN_QUERY_FAILED = 'BLOCKCHAIN_QUERY_FAILED',
}

export class BadgeError extends Error {
  public readonly code: BadgeErrorCode;
  public readonly meta?: Record<string, unknown>;

  constructor(code: BadgeErrorCode, message: string, meta?: Record<string, unknown>) {
    super(message);
    this.name = 'BadgeError';
    this.code = code;
    this.meta = meta;
  }
}

