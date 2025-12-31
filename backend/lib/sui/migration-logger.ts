// ==========================================
// Migration Logger - Centralized logging for migration service
// ==========================================

/**
 * Centralized logging utility for migration service operations
 * Provides structured logging with consistent formatting
 */
export class MigrationLogger {
  private static debugEnabled = process.env.DEBUG_MIGRATION === 'true';
  
  /**
   * Log debug messages (only if DEBUG_MIGRATION is enabled)
   * @param message - Log message
   * @param data - Optional data to log
   */
  static debug(message: string, data?: any): void {
    if (this.debugEnabled) {
      if (data !== undefined) {
        console.log(`[MIGRATION DEBUG] ${message}`, data);
      } else {
        console.log(`[MIGRATION DEBUG] ${message}`);
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
      console.log(`[MIGRATION] ${message}`, data);
    } else {
      console.log(`[MIGRATION] ${message}`);
    }
  }
  
  /**
   * Log warning messages
   * @param message - Log message
   * @param data - Optional data to log
   */
  static warn(message: string, data?: any): void {
    if (data !== undefined) {
      console.warn(`[MIGRATION WARN] ${message}`, data);
    } else {
      console.warn(`[MIGRATION WARN] ${message}`);
    }
  }
  
  /**
   * Log error messages
   * @param message - Log message
   * @param error - Optional error object
   */
  static error(message: string, error?: any): void {
    if (error !== undefined) {
      console.error(`[MIGRATION ERROR] ${message}`, error);
    } else {
      console.error(`[MIGRATION ERROR] ${message}`);
    }
  }
  
  /**
   * Log inventory migration messages
   * @param message - Log message
   * @param data - Optional migration data
   */
  static inventory(message: string, data?: any): void {
    if (data !== undefined) {
      console.log(`[MIGRATION INVENTORY] ${message}`, data);
    } else {
      console.log(`[MIGRATION INVENTORY] ${message}`);
    }
  }
  
  /**
   * Log stats migration messages
   * @param message - Log message
   * @param data - Optional migration data
   */
  static stats(message: string, data?: any): void {
    if (data !== undefined) {
      console.log(`[MIGRATION STATS] ${message}`, data);
    } else {
      console.log(`[MIGRATION STATS] ${message}`);
    }
  }
  
  /**
   * Log transaction-related messages
   * @param message - Log message
   * @param data - Optional transaction data
   */
  static transaction(message: string, data?: any): void {
    if (data !== undefined) {
      console.log(`[MIGRATION TX] ${message}`, data);
    } else {
      console.log(`[MIGRATION TX] ${message}`);
    }
  }
  
  /**
   * Check if debug logging is enabled
   */
  static isDebugEnabled(): boolean {
    return this.debugEnabled;
  }
}

