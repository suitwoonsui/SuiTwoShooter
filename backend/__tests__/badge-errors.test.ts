// ==========================================
// Badge Errors Tests
// ==========================================

import { BadgeError, BadgeErrorCode, success, failure } from '../lib/sui/badge-errors';

describe('BadgeError', () => {
  describe('constructor', () => {
    it('should create error with code and message', () => {
      const error = new BadgeError(BadgeErrorCode.INVALID_ADDRESS, 'Invalid address');
      expect(error.code).toBe(BadgeErrorCode.INVALID_ADDRESS);
      expect(error.message).toBe('Invalid address');
      expect(error.name).toBe('BadgeError');
    });

    it('should create error with details', () => {
      const details = { address: '0x123' };
      const error = new BadgeError(BadgeErrorCode.INVALID_ADDRESS, 'Invalid address', details);
      expect(error.details).toEqual(details);
    });
  });

  describe('toJSON', () => {
    it('should convert error to JSON', () => {
      const error = new BadgeError(BadgeErrorCode.INVALID_ADDRESS, 'Invalid address', { address: '0x123' });
      const json = error.toJSON();
      expect(json).toEqual({
        code: BadgeErrorCode.INVALID_ADDRESS,
        message: 'Invalid address',
        details: { address: '0x123' },
      });
    });

    it('should omit details if not provided', () => {
      const error = new BadgeError(BadgeErrorCode.INVALID_ADDRESS, 'Invalid address');
      const json = error.toJSON();
      expect(json).not.toHaveProperty('details');
    });
  });

  describe('fromUnknown', () => {
    it('should return BadgeError if already a BadgeError', () => {
      const original = new BadgeError(BadgeErrorCode.INVALID_ADDRESS, 'Invalid address');
      const result = BadgeError.fromUnknown(original);
      expect(result).toBe(original);
    });

    it('should convert Error to BadgeError', () => {
      const original = new Error('Test error');
      const result = BadgeError.fromUnknown(original, 'Context');
      expect(result.code).toBe(BadgeErrorCode.UNKNOWN_ERROR);
      expect(result.message).toBe('Context: Test error');
      expect(result.details).toHaveProperty('originalError', 'Error');
    });

    it('should convert unknown value to BadgeError', () => {
      const result = BadgeError.fromUnknown('string error', 'Context');
      expect(result.code).toBe(BadgeErrorCode.UNKNOWN_ERROR);
      expect(result.message).toBe('Context: Unknown error');
      expect(result.details).toHaveProperty('originalError', 'string error');
    });
  });

  describe('is', () => {
    it('should return true for matching code', () => {
      const error = new BadgeError(BadgeErrorCode.INVALID_ADDRESS, 'Invalid address');
      expect(error.is(BadgeErrorCode.INVALID_ADDRESS)).toBe(true);
    });

    it('should return false for non-matching code', () => {
      const error = new BadgeError(BadgeErrorCode.INVALID_ADDRESS, 'Invalid address');
      expect(error.is(BadgeErrorCode.INVALID_TIER)).toBe(false);
    });
  });
});

describe('Result helpers', () => {
  describe('success', () => {
    it('should create success result', () => {
      const result = success({ badgeId: '0x123', tier: 1 });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ badgeId: '0x123', tier: 1 });
      }
    });
  });

  describe('failure', () => {
    it('should create failure result from BadgeError', () => {
      const error = new BadgeError(BadgeErrorCode.INVALID_ADDRESS, 'Invalid address');
      const result = failure(error);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(error);
      }
    });

    it('should create failure result from code and message', () => {
      const result = failure(BadgeErrorCode.INVALID_ADDRESS, 'Invalid address', { address: '0x123' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe(BadgeErrorCode.INVALID_ADDRESS);
        expect(result.error.message).toBe('Invalid address');
        expect(result.error.details).toEqual({ address: '0x123' });
      }
    });
  });
});

