// ==========================================
// Badge Logger Tests
// ==========================================

import { BadgeLogger } from '../lib/sui/badge-logger';

describe('BadgeLogger', () => {
  const originalEnv = process.env;
  const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
  const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
  const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('debug', () => {
    it('should log when DEBUG_BADGE is enabled', () => {
      process.env.DEBUG_BADGE = 'true';
      BadgeLogger.debug('Test message', { data: 'test' });
      expect(consoleLogSpy).toHaveBeenCalledWith('[BADGE DEBUG] Test message', { data: 'test' });
    });

    it('should not log when DEBUG_BADGE is disabled', () => {
      delete process.env.DEBUG_BADGE;
      delete process.env.DEBUG_BADGE_LOOKUP;
      BadgeLogger.debug('Test message');
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('should log when DEBUG_BADGE_LOOKUP is enabled', () => {
      process.env.DEBUG_BADGE_LOOKUP = 'true';
      BadgeLogger.debug('Test message');
      expect(consoleLogSpy).toHaveBeenCalledWith('[BADGE DEBUG] Test message');
    });
  });

  describe('info', () => {
    it('should always log info messages', () => {
      BadgeLogger.info('Info message', { data: 'test' });
      expect(consoleLogSpy).toHaveBeenCalledWith('[BADGE] Info message', { data: 'test' });
    });

    it('should log info without data', () => {
      BadgeLogger.info('Info message');
      expect(consoleLogSpy).toHaveBeenCalledWith('[BADGE] Info message');
    });
  });

  describe('warn', () => {
    it('should log warning messages', () => {
      BadgeLogger.warn('Warning message', { data: 'test' });
      expect(consoleWarnSpy).toHaveBeenCalledWith('[BADGE WARN] Warning message', { data: 'test' });
    });
  });

  describe('error', () => {
    it('should log error messages', () => {
      const error = new Error('Test error');
      BadgeLogger.error('Error message', error);
      expect(consoleErrorSpy).toHaveBeenCalledWith('[BADGE ERROR] Error message', error);
    });

    it('should log error without error object', () => {
      BadgeLogger.error('Error message');
      expect(consoleErrorSpy).toHaveBeenCalledWith('[BADGE ERROR] Error message');
    });
  });

  describe('transaction', () => {
    it('should log transaction messages', () => {
      BadgeLogger.transaction('Transaction message', { txId: '0x123' });
      expect(consoleLogSpy).toHaveBeenCalledWith('[BADGE TX] Transaction message', { txId: '0x123' });
    });
  });

  describe('isDebugEnabled', () => {
    it('should return true when DEBUG_BADGE is enabled', () => {
      process.env.DEBUG_BADGE = 'true';
      expect(BadgeLogger.isDebugEnabled()).toBe(true);
    });

    it('should return false when DEBUG_BADGE is disabled', () => {
      delete process.env.DEBUG_BADGE;
      delete process.env.DEBUG_BADGE_LOOKUP;
      expect(BadgeLogger.isDebugEnabled()).toBe(false);
    });
  });
});

