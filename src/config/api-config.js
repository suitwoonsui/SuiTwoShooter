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
    // Production if: vercel.app domain OR not localhost/127.0.0.1
    const isProduction = hostname.includes('vercel.app') || 
                        (hostname !== 'localhost' && 
                         hostname !== '127.0.0.1' && 
                         !hostname.startsWith('192.168.') && 
                         !hostname.startsWith('10.') &&
                         hostname !== '0.0.0.0');
    
    // 3. Set defaults based on environment
    if (!config.backendUrl) {
      // For Vercel: Set your actual backend URL here or via meta tag
      // You can also set this via Vercel environment variable and inject it at build time
      config.backendUrl = isProduction 
        ? 'https://sui-two-shooter-backend-sui-integra.vercel.app/api'  // Production backend URL
        : 'http://localhost:3000/api';
    }
    
    if (!config.walletModuleUrl) {
      // For Vercel: Set your actual wallet module URL here or via meta tag
      config.walletModuleUrl = isProduction
        ? 'https://sui-two-shooter-wallet-module-test.vercel.app/wallet-api.umd.cjs'  // Production wallet module URL
        : 'wallet-module/dist/wallet-api.umd.cjs';  // Local path
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
  console.log('🔧 [CONFIG] API Base URL:', window.GAME_CONFIG.API_BASE_URL);
  console.log('🔧 [CONFIG] Wallet Module URL:', window.GAME_CONFIG.WALLET_MODULE_URL);
  console.log('🔧 [CONFIG] Hostname:', window.location.hostname);
  console.log('🔧 [CONFIG] Is Production:', window.location.hostname.includes('vercel.app') || (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'));
})();

export default {
  API_BASE_URL: typeof window !== 'undefined' ? window.GAME_CONFIG?.API_BASE_URL : 'http://localhost:3000/api',
  WALLET_MODULE_URL: typeof window !== 'undefined' ? window.GAME_CONFIG?.WALLET_MODULE_URL : 'wallet-module/dist/wallet-api.umd.cjs'
};

