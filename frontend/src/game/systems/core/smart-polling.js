// ==========================================
// SMART POLLING UTILITY
// ==========================================
// Provides intelligent polling with early exit capabilities
// Replaces fixed setTimeout delays with adaptive waiting

// Use FrontendLogger if available, fallback to console
var log = (typeof window !== 'undefined' && window.FrontendLogger) 
  ? {
      debug: (cat, msg, data) => window.FrontendLogger.debug(cat, msg, data),
      info: (cat, msg, data) => window.FrontendLogger.info(cat, msg, data),
      warn: (cat, msg, data) => window.FrontendLogger.warn(cat, msg, data),
      error: (cat, msg, data) => window.FrontendLogger.error(cat, msg, data),
    }
  : {
      debug: () => {},
      info: (cat, msg, data) => console.log(`[${cat}] ${msg}`, data || ''),
      warn: (cat, msg, data) => console.warn(`[${cat}] ${msg}`, data || ''),
      error: (cat, msg, data) => console.error(`[${cat}] ${msg}`, data || ''),
    };

/**
 * Smart Polling Utility
 * Polls a condition function until it returns true, with configurable intervals and timeouts
 * Exits early when condition is met, reducing average wait time
 */
class SmartPolling {
  /**
   * Poll until condition is met
   * @param {Function} conditionFn - Function that returns truthy value when condition is met
   * @param {Object} options - Polling options
   * @param {number} options.interval - Check interval in milliseconds (default: 500)
   * @param {number} options.maxWait - Maximum wait time in milliseconds (default: 5000)
   * @param {number} options.timeout - Total timeout in milliseconds (default: 10000)
   * @param {Function} options.onCheck - Optional callback called on each check
   * @param {string} options.context - Optional context string for logging
   * @returns {Promise<any>} Result from conditionFn when condition is met
   * @throws {Error} If timeout is reached
   */
  static async pollUntil(conditionFn, options = {}) {
    const {
      interval = 500,
      maxWait = 5000,
      timeout = 10000,
      onCheck = null,
      context = 'POLLING'
    } = options;
    
    if (typeof conditionFn !== 'function') {
      throw new Error('conditionFn must be a function');
    }
    
    const startTime = Date.now();
    const timeoutTime = startTime + timeout;
    let checkCount = 0;
    
    log.debug('SMART POLLING', `Starting polling${context ? ` (${context})` : ''}`, {
      interval,
      maxWait,
      timeout
    });
    
    while (Date.now() < timeoutTime) {
      checkCount++;
      
      try {
        const result = await conditionFn();
        if (result) {
          const elapsed = Date.now() - startTime;
          log.debug('SMART POLLING', `Condition met after ${elapsed}ms (${checkCount} checks)${context ? ` (${context})` : ''}`);
          return result;
        }
      } catch (error) {
        log.warn('SMART POLLING', `Error in condition function${context ? ` (${context})` : ''}`, error);
        // Continue polling despite error
      }
      
      // Call onCheck callback if provided
      if (onCheck && typeof onCheck === 'function') {
        try {
          onCheck(checkCount, Date.now() - startTime);
        } catch (error) {
          log.warn('SMART POLLING', 'Error in onCheck callback', error);
        }
      }
      
      const elapsed = Date.now() - startTime;
      
      // Don't wait longer than maxWait
      if (elapsed >= maxWait) {
        log.debug('SMART POLLING', `Max wait time reached (${maxWait}ms)${context ? ` (${context})` : ''}`);
        break;
      }
      
      // Wait for next check interval
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    
    const elapsed = Date.now() - startTime;
    const error = new Error(`Polling timeout after ${elapsed}ms (${checkCount} checks)${context ? ` (${context})` : ''}`);
    log.warn('SMART POLLING', error.message);
    throw error;
  }
  
  /**
   * Wait for a specific amount of time (replacement for setTimeout in Promises)
   * @param {number} ms - Milliseconds to wait
   * @returns {Promise<void>}
   */
  static wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Wait for a condition with a simple timeout
   * @param {Function} conditionFn - Function that returns truthy when ready
   * @param {number} timeout - Maximum wait time in milliseconds
   * @param {number} interval - Check interval in milliseconds
   * @returns {Promise<any>}
   */
  static async waitFor(conditionFn, timeout = 5000, interval = 500) {
    return this.pollUntil(conditionFn, { interval, maxWait: timeout, timeout });
  }
}

// Expose globally
if (typeof window !== 'undefined') {
  window.SmartPolling = SmartPolling;
  // Convenience function
  window.pollUntil = (conditionFn, options) => SmartPolling.pollUntil(conditionFn, options);
  window.waitFor = (conditionFn, timeout, interval) => SmartPolling.waitFor(conditionFn, timeout, interval);
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SmartPolling;
}

log.info('SMART POLLING', 'Smart polling utility loaded');

