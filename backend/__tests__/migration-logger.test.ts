// ==========================================
// Migration Logger Tests
// ==========================================

import { MigrationLogger } from '../lib/sui/migration-logger';

describe('MigrationLogger', () => {
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
    it('should log when DEBUG_MIGRATION is enabled', () => {
      process.env.DEBUG_MIGRATION = 'true';
      MigrationLogger.debug('Test message', { data: 'test' });
      expect(consoleLogSpy).toHaveBeenCalledWith('[MIGRATION DEBUG] Test message', { data: 'test' });
    });

    it('should not log when DEBUG_MIGRATION is disabled', () => {
      delete process.env.DEBUG_MIGRATION;
      MigrationLogger.debug('Test message');
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('should log debug without data', () => {
      process.env.DEBUG_MIGRATION = 'true';
      MigrationLogger.debug('Test message');
      expect(consoleLogSpy).toHaveBeenCalledWith('[MIGRATION DEBUG] Test message');
    });
  });

  describe('info', () => {
    it('should always log info messages', () => {
      MigrationLogger.info('Info message', { data: 'test' });
      expect(consoleLogSpy).toHaveBeenCalledWith('[MIGRATION] Info message', { data: 'test' });
    });

    it('should log info without data', () => {
      MigrationLogger.info('Info message');
      expect(consoleLogSpy).toHaveBeenCalledWith('[MIGRATION] Info message');
    });
  });

  describe('warn', () => {
    it('should log warning messages', () => {
      MigrationLogger.warn('Warning message', { data: 'test' });
      expect(consoleWarnSpy).toHaveBeenCalledWith('[MIGRATION WARN] Warning message', { data: 'test' });
    });

    it('should log warning without data', () => {
      MigrationLogger.warn('Warning message');
      expect(consoleWarnSpy).toHaveBeenCalledWith('[MIGRATION WARN] Warning message');
    });
  });

  describe('error', () => {
    it('should log error messages', () => {
      const error = new Error('Test error');
      MigrationLogger.error('Error message', error);
      expect(consoleErrorSpy).toHaveBeenCalledWith('[MIGRATION ERROR] Error message', error);
    });

    it('should log error without error object', () => {
      MigrationLogger.error('Error message');
      expect(consoleErrorSpy).toHaveBeenCalledWith('[MIGRATION ERROR] Error message');
    });
  });

  describe('inventory', () => {
    it('should log inventory migration messages', () => {
      MigrationLogger.inventory('Inventory migration message', { playerAddress: '0x123' });
      expect(consoleLogSpy).toHaveBeenCalledWith('[MIGRATION INVENTORY] Inventory migration message', { playerAddress: '0x123' });
    });

    it('should log inventory without data', () => {
      MigrationLogger.inventory('Inventory migration message');
      expect(consoleLogSpy).toHaveBeenCalledWith('[MIGRATION INVENTORY] Inventory migration message');
    });
  });

  describe('stats', () => {
    it('should log stats migration messages', () => {
      MigrationLogger.stats('Stats migration message', { playerAddress: '0x123', score: 1000 });
      expect(consoleLogSpy).toHaveBeenCalledWith('[MIGRATION STATS] Stats migration message', { playerAddress: '0x123', score: 1000 });
    });

    it('should log stats without data', () => {
      MigrationLogger.stats('Stats migration message');
      expect(consoleLogSpy).toHaveBeenCalledWith('[MIGRATION STATS] Stats migration message');
    });
  });

  describe('transaction', () => {
    it('should log transaction messages', () => {
      MigrationLogger.transaction('Transaction message', { txId: '0x123' });
      expect(consoleLogSpy).toHaveBeenCalledWith('[MIGRATION TX] Transaction message', { txId: '0x123' });
    });

    it('should log transaction without data', () => {
      MigrationLogger.transaction('Transaction message');
      expect(consoleLogSpy).toHaveBeenCalledWith('[MIGRATION TX] Transaction message');
    });
  });

  describe('isDebugEnabled', () => {
    it('should return true when DEBUG_MIGRATION is enabled', () => {
      process.env.DEBUG_MIGRATION = 'true';
      expect(MigrationLogger.isDebugEnabled()).toBe(true);
    });

    it('should return false when DEBUG_MIGRATION is disabled', () => {
      delete process.env.DEBUG_MIGRATION;
      expect(MigrationLogger.isDebugEnabled()).toBe(false);
    });
  });
});

