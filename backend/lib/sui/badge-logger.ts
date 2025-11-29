// ==========================================
// Badge Logger - Centralized logging for badge service
// ==========================================

/**
 * Centralized logging utility for badge service operations
 * Replaces scattered DEBUG_BADGE_LOOKUP checks throughout the codebase
 */
export class BadgeLogger {
  private static debugEnabled = process.env.DEBUG_BADGE === 'true' || 
                                process.env.DEBUG_BADGE_LOOKUP === 'true';
  
  /**
   * Log debug messages (only if DEBUG_BADGE is enabled)
   * @param message - Log message
   * @param data - Optional data to log
   */
  static debug(message: string, data?: any): void {
    if (this.debugEnabled) {
      if (data !== undefined) {
        console.log(`[BADGE DEBUG] ${message}`, data);
      } else {
        console.log(`[BADGE DEBUG] ${message}`);
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
      console.log(`[BADGE] ${message}`, data);
    } else {
      console.log(`[BADGE] ${message}`);
    }
  }
  
  /**
   * Log warning messages
   * @param message - Log message
   * @param data - Optional data to log
   */
  static warn(message: string, data?: any): void {
    if (data !== undefined) {
      console.warn(`[BADGE WARN] ${message}`, data);
    } else {
      console.warn(`[BADGE WARN] ${message}`);
    }
  }
  
  /**
   * Log error messages
   * @param message - Log message
   * @param error - Optional error object
   */
  static error(message: string, error?: any): void {
    if (error !== undefined) {
      console.error(`[BADGE ERROR] ${message}`, error);
    } else {
      console.error(`[BADGE ERROR] ${message}`);
    }
  }
  
  /**
   * Log transaction-related messages
   * @param message - Log message
   * @param data - Optional transaction data
   */
  static transaction(message: string, data?: any): void {
    if (data !== undefined) {
      console.log(`[BADGE TX] ${message}`, data);
    } else {
      console.log(`[BADGE TX] ${message}`);
    }
  }
  
  /**
   * Check if debug logging is enabled
   */
  static isDebugEnabled(): boolean {
    return this.debugEnabled;
  }
}

