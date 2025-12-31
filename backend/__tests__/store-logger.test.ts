// ==========================================
// Store Logger Tests
// ==========================================

import { StoreLogger } from '../lib/sui/store-logger';

describe('StoreLogger', () => {
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
    it('should log when DEBUG_STORE is enabled', () => {
      process.env.DEBUG_STORE = 'true';
      StoreLogger.debug('Test message', { data: 'test' });
      expect(consoleLogSpy).toHaveBeenCalledWith('[STORE DEBUG] Test message', { data: 'test' });
    });

    it('should not log when DEBUG_STORE is disabled', () => {
      delete process.env.DEBUG_STORE;
      StoreLogger.debug('Test message');
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('should log debug without data', () => {
      process.env.DEBUG_STORE = 'true';
      StoreLogger.debug('Test message');
      expect(consoleLogSpy).toHaveBeenCalledWith('[STORE DEBUG] Test message');
    });
  });

  describe('info', () => {
    it('should always log info messages', () => {
      StoreLogger.info('Info message', { data: 'test' });
      expect(consoleLogSpy).toHaveBeenCalledWith('[STORE] Info message', { data: 'test' });
    });

    it('should log info without data', () => {
      StoreLogger.info('Info message');
      expect(consoleLogSpy).toHaveBeenCalledWith('[STORE] Info message');
    });
  });

  describe('warn', () => {
    it('should log warning messages', () => {
      StoreLogger.warn('Warning message', { data: 'test' });
      expect(consoleWarnSpy).toHaveBeenCalledWith('[STORE WARN] Warning message', { data: 'test' });
    });

    it('should log warning without data', () => {
      StoreLogger.warn('Warning message');
      expect(consoleWarnSpy).toHaveBeenCalledWith('[STORE WARN] Warning message');
    });
  });

  describe('error', () => {
    it('should log error messages', () => {
      const error = new Error('Test error');
      StoreLogger.error('Error message', error);
      expect(consoleErrorSpy).toHaveBeenCalledWith('[STORE ERROR] Error message', error);
    });

    it('should log error without error object', () => {
      StoreLogger.error('Error message');
      expect(consoleErrorSpy).toHaveBeenCalledWith('[STORE ERROR] Error message');
    });
  });

  describe('transaction', () => {
    it('should log transaction messages', () => {
      StoreLogger.transaction('Transaction message', { txId: '0x123' });
      expect(consoleLogSpy).toHaveBeenCalledWith('[STORE TX] Transaction message', { txId: '0x123' });
    });

    it('should log transaction without data', () => {
      StoreLogger.transaction('Transaction message');
      expect(consoleLogSpy).toHaveBeenCalledWith('[STORE TX] Transaction message');
    });
  });

  describe('inventory', () => {
    it('should log inventory messages', () => {
      StoreLogger.inventory('Inventory message', { itemId: 'extraLives_1', quantity: 5 });
      expect(consoleLogSpy).toHaveBeenCalledWith('[STORE INVENTORY] Inventory message', { itemId: 'extraLives_1', quantity: 5 });
    });

    it('should log inventory without data', () => {
      StoreLogger.inventory('Inventory message');
      expect(consoleLogSpy).toHaveBeenCalledWith('[STORE INVENTORY] Inventory message');
    });
  });

  describe('purchase', () => {
    it('should log purchase messages', () => {
      StoreLogger.purchase('Purchase message', { playerAddress: '0x123', total: 100 });
      expect(consoleLogSpy).toHaveBeenCalledWith('[STORE PURCHASE] Purchase message', { playerAddress: '0x123', total: 100 });
    });

    it('should log purchase without data', () => {
      StoreLogger.purchase('Purchase message');
      expect(consoleLogSpy).toHaveBeenCalledWith('[STORE PURCHASE] Purchase message');
    });
  });

  describe('isDebugEnabled', () => {
    it('should return true when DEBUG_STORE is enabled', () => {
      process.env.DEBUG_STORE = 'true';
      expect(StoreLogger.isDebugEnabled()).toBe(true);
    });

    it('should return false when DEBUG_STORE is disabled', () => {
      delete process.env.DEBUG_STORE;
      expect(StoreLogger.isDebugEnabled()).toBe(false);
    });
  });
});

