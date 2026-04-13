// ==========================================
// FRONTEND LOGGER - Centralized Logging Utility
// ==========================================
// Provides structured, environment-aware logging for the frontend
// Similar to backend StoreLogger/MigrationLogger

/**
 * Frontend Logger Class
 * 
 * Features:
 * - Environment-aware (DEBUG/INFO disabled in production)
 * - Categorized logging (debug, info, warn, error)
 * - Consistent formatting
 * - Performance-friendly (no-op in production for debug/info)
 */
class FrontendLogger {
  constructor() {
    // Check if we're in production mode
    // Production if: NODE_ENV=production OR no debug flags in URL
    this.isProduction = 
      (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production') ||
      (!window.location.search.includes('debug=true') && 
       !window.location.search.includes('verbose=true'));
    
    // Allow override via localStorage
    if (typeof localStorage !== 'undefined') {
      const debugOverride = localStorage.getItem('DEBUG_LOGS');
      if (debugOverride === 'true') {
        this.isProduction = false;
      } else if (debugOverride === 'false') {
        this.isProduction = true;
      }
    }
    
    // Check for specific category debug flags
    this.debugCategories = new Set();
    if (typeof localStorage !== 'undefined') {
      const categories = localStorage.getItem('DEBUG_CATEGORIES');
      if (categories) {
        categories.split(',').forEach(cat => this.debugCategories.add(cat.trim()));
      }
    }
  }
  
  /**
   * Check if a category should be logged
   * @param {string} category - Category name
   * @returns {boolean}
   */
  _shouldLog(category) {
    if (!this.isProduction) return true;
    if (this.debugCategories.has(category)) return true;
    return false;
  }
  
  /**
   * Format log message with category prefix
   * @param {string} level - Log level (debug, info, warn, error)
   * @param {string} category - Category name
   * @param {string} message - Log message
   * @param {any} data - Optional data to log
   * @returns {string}
   */
  _formatMessage(level, category, message, data) {
    const emoji = {
      debug: '🔍',
      info: '✅',
      warn: '⚠️',
      error: '❌'
    }[level] || '📝';
    
    const prefix = `[${category.toUpperCase()}]`;
    return `${emoji} ${prefix} ${message}`;
  }
  
  /**
   * Debug log (only in development or if category enabled)
   * @param {string} category - Category name (e.g., 'GAME SERVICE', 'STORE')
   * @param {string} message - Log message
   * @param {any} data - Optional data to log
   */
  debug(category, message, data = null) {
    if (!this._shouldLog(category)) return;
    
    const formatted = this._formatMessage('debug', category, message, data);
    if (data !== null) {
      console.log(formatted, data);
    } else {
      console.log(formatted);
    }
  }
  
  /**
   * Info log (only in development or if category enabled)
   * @param {string} category - Category name
   * @param {string} message - Log message
   * @param {any} data - Optional data to log
   */
  info(category, message, data = null) {
    if (!this._shouldLog(category)) return;
    
    const formatted = this._formatMessage('info', category, message, data);
    if (data !== null) {
      console.log(formatted, data);
    } else {
      console.log(formatted);
    }
  }
  
  /**
   * Warning log (always shown)
   * @param {string} category - Category name
   * @param {string} message - Log message
   * @param {any} data - Optional data to log
   */
  warn(category, message, data = null) {
    const formatted = this._formatMessage('warn', category, message, data);
    if (data !== null) {
      console.warn(formatted, data);
    } else {
      console.warn(formatted);
    }
  }
  
  /**
   * Error log (always shown)
   * @param {string} category - Category name
   * @param {string} message - Log message
   * @param {any} error - Error object or data
   */
  error(category, message, error = null) {
    const formatted = this._formatMessage('error', category, message, error);
    if (error !== null) {
      console.error(formatted, error);
    } else {
      console.error(formatted);
    }
  }
}

// Create singleton instance
const logger = new FrontendLogger();

// Expose globally
if (typeof window !== 'undefined') {
  window.FrontendLogger = logger;
  
  // Add helper function for easy access
  window.log = {
    debug: (category, message, data) => logger.debug(category, message, data),
    info: (category, message, data) => logger.info(category, message, data),
    warn: (category, message, data) => logger.warn(category, message, data),
    error: (category, message, data) => logger.error(category, message, data),
  };
}

console.log('✅ [LOGGER] Frontend logger initialized', {
  production: logger.isProduction,
  debugCategories: Array.from(logger.debugCategories)
});

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = logger;
}

