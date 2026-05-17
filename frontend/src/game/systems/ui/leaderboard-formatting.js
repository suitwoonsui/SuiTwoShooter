// ==========================================
// LEADERBOARD FORMATTING - Display Utilities
// ==========================================

// Use FrontendLogger if available, fallback to console
// Use var to allow redeclaration when multiple scripts are loaded
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

log.info('LEADERBOARD FORMATTING', 'Leaderboard formatting module loaded');

/**
 * Format wallet address (truncate)
 * @param {string} address - Wallet address
 * @returns {string} Formatted address
 */
function formatAddress(address) {
  if (!address || address.length < 10) return address || '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Format player name (return if provided, empty string if not)
 * @param {Object} entry - Leaderboard entry
 * @returns {string} Player name or empty string
 */
function formatPlayerName(entry) {
  if (!entry || typeof entry !== 'object') return '';
  const raw =
    (typeof entry.playerName === 'string' && entry.playerName) ||
    (typeof entry.displayName === 'string' && entry.displayName) ||
    '';
  const s = raw.trim();
  return s || '';
}

/**
 * Format stat value based on category
 * @param {number} value - Stat value
 * @param {string} field - Field name
 * @returns {string} Formatted value
 */
function formatStatValue(value, field) {
  if (value === undefined || value === null) return '0';
  
  switch (field) {
    case 'distance':
      return `${Math.round(value).toLocaleString()}m`;
    case 'score':
    case 'coins':
    case 'bossesDefeated':
    case 'enemiesDefeated':
    case 'longestCoinStreak':
      return Math.round(value).toLocaleString();
    default:
      return value.toLocaleString();
  }
}

// Expose globally
if (typeof window !== 'undefined') {
  window.formatAddress = formatAddress;
  window.formatPlayerName = formatPlayerName;
  window.formatStatValue = formatStatValue;
}

