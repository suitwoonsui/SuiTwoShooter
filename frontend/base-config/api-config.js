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
      // Game API (Next routes) on 3001. Platform (3000) is wallet bundle only — do not send game APIs there.
      config.gameBackendUrl = 'http://localhost:3001/api';
      config.backendUrl = config.gameBackendUrl;
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

      // Wallet bundle URL is NOT derived from the game API base. It comes from Aqueduct Platform
      // (PLATFORM_BACKEND_URL on the game backend) via GET /api/config → platform estuary/connect.
      // Optional override: <meta name="wallet-module-url" content="..." /> for debugging only.
    }
  } else {
    // Fallback for non-browser environments (e.g. SSR); align with game backend default.
    config.backendUrl = 'http://localhost:3001/api';
    config.walletModuleUrl = 'http://localhost:3000/wallet-api.umd.cjs';
  }
  
  return config;
};

/** Game backend GET /api/config (proxies platform estuary/connect → walletModuleUrl). */
function hydrateWalletModuleUrlFromGameBackend(gameApiBase) {
  if (!gameApiBase || typeof fetch === 'undefined') return;
  try {
    const u = new URL(String(gameApiBase), window.location.origin);
    const path = u.pathname.replace(/\/+$/, '');
    const configPath = path.endsWith('/api') ? `${path}/config` : '/api/config';
    const configUrl = `${u.origin}${configPath}?source=base-config`;
    fetch(configUrl, { method: 'GET', cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (json && json.success === true && typeof json.walletModuleUrl === 'string' && json.walletModuleUrl.length > 0) {
          if (!json.walletModuleUrl.includes('localhost')) {
            window.GAME_CONFIG.WALLET_MODULE_URL = json.walletModuleUrl;
            console.log('🔧 [BASE CONFIG] Wallet module URL from game /api/config:', json.walletModuleUrl);
          }
        }
      })
      .catch(() => {});
  } catch (_e) {
    // ignore
  }
}

// Initialize global config immediately when script loads
(function() {
  if (typeof window === 'undefined') return;
  
  const config = getConfig();
  window.GAME_CONFIG = window.GAME_CONFIG || {};
  window.GAME_CONFIG.API_BASE_URL = config.backendUrl;
  window.GAME_CONFIG.GAME_BACKEND_URL = config.gameBackendUrl || config.backendUrl;
  // Kept for older callers; must be the game API base — only WALLET_MODULE_URL may point at the platform host.
  window.GAME_CONFIG.BASE_BACKEND_URL = config.gameBackendUrl || config.backendUrl;
  window.GAME_CONFIG.WALLET_MODULE_URL = config.walletModuleUrl;

  const isLocalhost =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1';
  if (!isLocalhost && config.backendUrl && !config.walletModuleUrl) {
    hydrateWalletModuleUrlFromGameBackend(config.backendUrl);
  }
  
  // Helper function to get the correct backend URL for a given endpoint
  window.GAME_CONFIG.getBackendUrl = function(_endpoint) {
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

