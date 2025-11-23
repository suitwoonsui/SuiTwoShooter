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
    // 1. Try meta tags first (for static HTML configuration)
    const backendMeta = document.querySelector('meta[name="backend-url"]');
    const walletMeta = document.querySelector('meta[name="wallet-module-url"]');
    
    if (backendMeta) {
      config.backendUrl = backendMeta.getAttribute('content');
    }
    if (walletMeta) {
      config.walletModuleUrl = walletMeta.getAttribute('content');
    }
    
    // 2. Check if we're in production (Vercel)
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    
    // Production if: 
    // - vercel.app domain, OR
    // - https protocol (Vercel uses HTTPS), OR  
    // - not localhost/127.0.0.1 and not local network IPs
    const isProduction = hostname.includes('vercel.app') || 
                        protocol === 'https:' ||
                        (hostname !== 'localhost' && 
                         hostname !== '127.0.0.1' && 
                         !hostname.startsWith('192.168.') && 
                         !hostname.startsWith('10.') &&
                         hostname !== '0.0.0.0');
    
    // 3. Set defaults based on environment
    if (!config.backendUrl) {
      // Default to Vercel backend URL (can be overridden via meta tag or localhost detection)
      // For local development, you can add a meta tag to override this
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        // Only use localhost if explicitly running locally
        config.backendUrl = 'http://localhost:3000/api';
      } else {
        // Use Vercel backend for all other cases (production, staging, etc.)
        config.backendUrl = 'https://sui-two-shooter-backend-sui-integra.vercel.app/api';
      }
    }
    
    if (!config.walletModuleUrl) {
      // Default to Vercel wallet module URL (can be overridden via meta tag or localhost detection)
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        // Only use local path if explicitly running locally
        config.walletModuleUrl = 'wallet-module/dist/wallet-api.umd.cjs';
      } else {
        // Use Vercel wallet module for all other cases (production, staging, etc.)
        config.walletModuleUrl = 'https://sui-two-shooter-wallet-module-test.vercel.app/wallet-api.umd.cjs';
      }
    }
  } else {
    // Fallback for non-browser environments
    config.backendUrl = 'http://localhost:3000/api';
    config.walletModuleUrl = 'wallet-module/dist/wallet-api.umd.cjs';
  }
  
  return config;
};

// Initialize global config immediately when script loads
(function() {
  if (typeof window === 'undefined') return;
  
  const config = getConfig();
  window.GAME_CONFIG = window.GAME_CONFIG || {};
  window.GAME_CONFIG.API_BASE_URL = config.backendUrl;
  window.GAME_CONFIG.WALLET_MODULE_URL = config.walletModuleUrl;
  
  // Log configuration for debugging
  const isProd = window.location.hostname.includes('vercel.app') || 
                 window.location.protocol === 'https:' ||
                 (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1');
  console.log('🔧 [CONFIG] API Base URL:', window.GAME_CONFIG.API_BASE_URL);
  console.log('🔧 [CONFIG] Wallet Module URL:', window.GAME_CONFIG.WALLET_MODULE_URL);
  console.log('🔧 [CONFIG] Hostname:', window.location.hostname);
  console.log('🔧 [CONFIG] Protocol:', window.location.protocol);
  console.log('🔧 [CONFIG] Is Production:', isProd);
  
  // Verify config is set correctly
  if (!window.GAME_CONFIG.API_BASE_URL || window.GAME_CONFIG.API_BASE_URL.includes('localhost')) {
    if (isProd) {
      console.error('❌ [CONFIG] ERROR: Production detected but using localhost URL!');
      console.error('❌ [CONFIG] This should not happen. Config:', window.GAME_CONFIG);
    }
  }
})();

// Note: This file is loaded as a regular script (not ES module), so we don't use export
// The config is available via window.GAME_CONFIG

