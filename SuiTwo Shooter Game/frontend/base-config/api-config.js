/**
 * API Configuration
 * Sets the backend API URL and wallet module URL based on environment
 */

// Get configuration from meta tags, environment, or defaults
const getConfig = () => {
  const config = {
    backendUrl: null,
    walletModuleUrl: null
  };

  if (typeof window !== 'undefined' && window.location) {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    
    // Check if we're running locally FIRST (before checking meta tags)
    // This ensures localhost always uses local services, even if meta tags are set
    const isLocalhost = hostname === 'localhost' || 
                       hostname === '127.0.0.1' || 
                       hostname === '0.0.0.0' ||
                       hostname.startsWith('192.168.') ||
                       hostname.startsWith('10.');
    
    // Production if: 
    // - vercel.app domain, OR
    // - https protocol (Vercel uses HTTPS), OR  
    // - not localhost/127.0.0.1 and not local network IPs
    const isProduction = hostname.includes('vercel.app') || 
                        (protocol === 'https:' && !isLocalhost) ||
                        (!isLocalhost && hostname !== '127.0.0.1');
    
    // 1. If localhost, ALWAYS use local services (ignore meta tags)
    if (isLocalhost) {
      // Game backend runs on port 3001, base backend on 3000
      // Note: Different routes go to different backends
      config.gameBackendUrl = 'http://localhost:3001/api';
      config.baseBackendUrl = 'http://localhost:3000/api';
      config.backendUrl = config.gameBackendUrl; // Default to game backend for backward compatibility
      // Wallet module served from base backend (port 3000)
      // If base backend has built wallet module, use it; otherwise fallback to local file
      config.walletModuleUrl = 'http://localhost:3000/wallet-api.umd.cjs';
    } else {
      // 2. For production, try meta tags first (for static HTML configuration)
      // Use a more robust method to read meta tags (in case script runs before DOM is fully parsed)
      let backendMeta = document.querySelector('meta[name="backend-url"]');
      let walletMeta = document.querySelector('meta[name="wallet-module-url"]');
      
      // If meta tags not found immediately, try reading from head directly
      if (!backendMeta || !walletMeta) {
        const head = document.head || document.getElementsByTagName('head')[0];
        if (head) {
          const allMetas = head.getElementsByTagName('meta');
          for (let i = 0; i < allMetas.length; i++) {
            const meta = allMetas[i];
            if (meta.getAttribute('name') === 'backend-url' && !backendMeta) {
              backendMeta = meta;
            }
            if (meta.getAttribute('name') === 'wallet-module-url' && !walletMeta) {
              walletMeta = meta;
            }
          }
        }
      }
      
      if (backendMeta) {
        config.backendUrl = backendMeta.getAttribute('content');
      }
      if (walletMeta) {
        config.walletModuleUrl = walletMeta.getAttribute('content');
      }
      
      // 3. Set defaults based on environment (if meta tags not set)
      // Use production URLs as defaults for production environments
      if (!config.backendUrl) {
        // Default production backend URL
        config.backendUrl = 'https://sui-two-shooter-backend-sui-integra.vercel.app/api';
      }
      
      if (!config.walletModuleUrl) {
        // Default production wallet module URL (served from base backend)
        // Update this to your base backend URL after deployment
        config.walletModuleUrl = 'https://your-base-backend.vercel.app/wallet-api.umd.cjs';
      }
    }
  } else {
    // Fallback for non-browser environments
    config.backendUrl = 'http://localhost:3000/api';
    config.walletModuleUrl = 'http://localhost:3000/wallet-api.umd.cjs'; // Platform only
  }
  
  return config;
};

// Read app/ecosystem from meta or default (for platform SaaS isolation)
function getAppAndEcosystem() {
  let appId = 'default';
  let ecosystemId = 'suitwo';
  if (typeof document !== 'undefined') {
    const appMeta = document.querySelector('meta[name="app-id"]');
    const ecoMeta = document.querySelector('meta[name="ecosystem-id"]');
    if (appMeta && appMeta.getAttribute('content')) appId = appMeta.getAttribute('content').trim().toLowerCase();
    if (ecoMeta && ecoMeta.getAttribute('content')) ecosystemId = ecoMeta.getAttribute('content').trim().toLowerCase();
  }
  return { appId, ecosystemId };
}

// Initialize global config immediately when script loads
(function() {
  if (typeof window === 'undefined') return;
  
  const config = getConfig();
  const { appId, ecosystemId } = getAppAndEcosystem();
  window.GAME_CONFIG = window.GAME_CONFIG || {};
  window.GAME_CONFIG.API_BASE_URL = config.backendUrl;
  window.GAME_CONFIG.GAME_BACKEND_URL = config.gameBackendUrl || config.backendUrl;
  window.GAME_CONFIG.BASE_BACKEND_URL = config.baseBackendUrl || config.backendUrl;
  window.GAME_CONFIG.WALLET_MODULE_URL = config.walletModuleUrl;
  window.GAME_CONFIG.APP_ID = appId;
  window.GAME_CONFIG.ECOSYSTEM_ID = ecosystemId;
  // Headers for platform API calls (stats, milestones) so app data does not cross (SaaS isolation)
  window.GAME_CONFIG.PLATFORM_HEADERS = {
    'X-App-Id': appId,
    'X-Ecosystem-Id': ecosystemId
  };

  // Wallet / dapp-kit SuiClient: avoid browser → fullnode (CORS + flaky official testnet). Proxy via game backend with failover.
  const gameApiBase = window.GAME_CONFIG.GAME_BACKEND_URL || window.GAME_CONFIG.API_BASE_URL || '';
  const gameOrigin = String(gameApiBase).replace(/\/api\/?$/, '');
  if (gameOrigin) {
    window.WALLET_RPC_PROXY_URL_TESTNET = `${gameOrigin}/api/sui-json-rpc?network=testnet`;
    window.WALLET_RPC_PROXY_URL_MAINNET = `${gameOrigin}/api/sui-json-rpc?network=mainnet`;
  }
  // Badge images are served from the frontend origin (same app) after architecture split
  window.GAME_CONFIG.BADGE_IMAGE_BASE_URL = (typeof window !== 'undefined' && window.location && window.location.origin)
    ? window.location.origin
    : (config.baseBackendUrl || '').replace(/\/api\/?$/, '');
  
  // Helper function to get the correct backend URL for a given endpoint
  // Architecture: Frontend calls game backend (port 3001) for ALL routes
  // Game backend internally proxies to platform backend (port 3000) for shared services
  window.GAME_CONFIG.getBackendUrl = function(endpoint) {
    // ALL routes go to game backend - it will proxy to platform backend internally when needed
    // Game backend handles:
    // - Game-specific routes directly (badges, stats, store, tournaments, etc.)
    // - Platform routes by proxying to platform backend (game-pass, tokens, config, etc.)
    return window.GAME_CONFIG.GAME_BACKEND_URL;
  };
  
  // Log configuration for debugging
  const isProd = window.location.hostname.includes('vercel.app') || 
                 window.location.protocol === 'https:' ||
                 (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1');
  console.log('🔧 [BASE CONFIG] API Base URL:', window.GAME_CONFIG.API_BASE_URL);
  console.log('🔧 [BASE CONFIG] Wallet Module URL:', window.GAME_CONFIG.WALLET_MODULE_URL);
  console.log('🔧 [BASE CONFIG] Hostname:', window.location.hostname);
  console.log('🔧 [BASE CONFIG] Protocol:', window.location.protocol);
  console.log('🔧 [BASE CONFIG] Is Production:', isProd);
  
  // Verify config is set correctly (warn in production if using localhost)
  if (!window.GAME_CONFIG.API_BASE_URL || window.GAME_CONFIG.API_BASE_URL.includes('localhost')) {
    if (isProd) {
      console.warn('⚠️ [BASE CONFIG] Production detected but using localhost URL.');
      console.warn('⚠️ [BASE CONFIG] Apps should set backend-url meta tag for production.');
    }
  }
})();

// Note: This file is loaded as a regular script (not ES module), so we don't use export
// The config is available via window.GAME_CONFIG

