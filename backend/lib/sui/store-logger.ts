// ==========================================
// Store Logger - Centralized logging for store service
// ==========================================

/**
 * Centralized logging utility for store service operations
 * Provides structured logging with consistent formatting
 */
export class StoreLogger {
  private static debugEnabled = process.env.DEBUG_STORE === 'true';
  
  /**
   * Log debug messages (only if DEBUG_STORE is enabled)
   * @param message - Log message
   * @param data - Optional data to log
   */
  static debug(message: string, data?: any): void {
    if (this.debugEnabled) {
      if (data !== undefined) {
        console.log(`[STORE DEBUG] ${message}`, data);
      } else {
        console.log(`[STORE DEBUG] ${message}`);
      }
    }
  }
  
  /**
   * Log info messages
   * @param message - Log message
   * @param data - Optional data to log
   */
  static info(message: string, data?: any): void {
    if (data !== undefined) {
      console.log(`[STORE] ${message}`, data);
    } else {
      console.log(`[STORE] ${message}`);
    }
  }
  
  /**
   * Log warning messages
   * @param message - Log message
   * @param data - Optional data to log
   */
  static warn(message: string, data?: any): void {
    if (data !== undefined) {
      console.warn(`[STORE WARN] ${message}`, data);
    } else {
      console.warn(`[STORE WARN] ${message}`);
    }
  }
  
  /**
   * Log error messages
   * @param message - Log message
   * @param error - Optional error object
   */
  static error(message: string, error?: any): void {
    if (error !== undefined) {
      console.error(`[STORE ERROR] ${message}`, error);
    } else {
      console.error(`[STORE ERROR] ${message}`);
    }
  }
  
  /**
   * Log transaction-related messages
   * @param message - Log message
   * @param data - Optional transaction data
   */
  static transaction(message: string, data?: any): void {
    if (data !== undefined) {
      console.log(`[STORE TX] ${message}`, data);
    } else {
      console.log(`[STORE TX] ${message}`);
    }
  }
  
  /**
   * Log inventory-related messages
   * @param message - Log message
   * @param data - Optional inventory data
   */
  static inventory(message: string, data?: any): void {
    if (data !== undefined) {
      console.log(`[STORE INVENTORY] ${message}`, data);
    } else {
      console.log(`[STORE INVENTORY] ${message}`);
    }
  }
  
  /**
   * Log purchase-related messages
   * @param message - Log message
   * @param data - Optional purchase data
   */
  static purchase(message: string, data?: any): void {
    if (data !== undefined) {
      console.log(`[STORE PURCHASE] ${message}`, data);
    } else {
      console.log(`[STORE PURCHASE] ${message}`);
    }
  }
  
  /**
   * Check if debug logging is enabled
   */
  static isDebugEnabled(): boolean {
    return this.debugEnabled;
  }
}

