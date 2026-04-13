/**
 * Contract Configuration (Base)
 * Base contract configuration structure - apps should override with their own contracts
 * 
 * This provides the structure and utilities, but apps should provide their own
 * contract addresses via app-specific config files or meta tags.
 */

// Base contract config structure - apps should override
// Apps can extend this or provide their own CONTRACT_CONFIG
const BASE_CONTRACT_CONFIG = {
  testnet: {
    clock: '0x6', // Standard Sui Clock object (shared across all apps)
    // Apps should add their own contract addresses
  },
  mainnet: {
    clock: '0x6', // Standard Sui Clock object (shared across all apps)
    // Apps should add their own contract addresses
  }
};

// Default contract config (can be overridden by apps)
// Apps should set window.APP_CONTRACT_CONFIG before this script loads,
// or provide their own contract-config.js that extends this
let CONTRACT_CONFIG = BASE_CONTRACT_CONFIG;

// Allow apps to override contract config
if (typeof window !== 'undefined' && window.APP_CONTRACT_CONFIG) {
  CONTRACT_CONFIG = window.APP_CONTRACT_CONFIG;
}

// Get network from wallet or default to testnet
function getNetwork() {
  // Try to get from wallet API if available
  if (window.walletAPIInstance?.network) {
    return window.walletAPIInstance.network;
  }
  // Default to testnet
  return 'testnet';
}

// Get contract config for current network
function getContractConfig() {
  const network = getNetwork();
  const config = CONTRACT_CONFIG[network] || CONTRACT_CONFIG.testnet;
  
  // Note: Apps should validate their own required contract fields
  // Base config only provides structure, not validation
  
  return config;
}

// Initialize global config
(function() {
  if (typeof window === 'undefined') return;
  
  window.GAME_CONFIG = window.GAME_CONFIG || {};
  
  // Set initial config (will be updated when wallet connects)
  const initialConfig = getContractConfig();
  window.GAME_CONFIG.CONTRACTS = initialConfig;
  window.GAME_CONFIG.NETWORK = getNetwork();
  
  console.log('🔧 [BASE CONTRACT CONFIG] Initialized');
  console.log('   Network:', window.GAME_CONFIG.NETWORK);
  console.log('   Contracts:', Object.keys(initialConfig));
  
  // Update config when wallet connects (if wallet API is available)
  if (window.walletAPIInstance) {
    const updateConfig = () => {
      const network = getNetwork();
      const config = getContractConfig();
      window.GAME_CONFIG.CONTRACTS = config;
      window.GAME_CONFIG.NETWORK = network;
      console.log('🔧 [BASE CONTRACT CONFIG] Updated for network:', network);
    };
    
    // Update immediately if wallet is already connected
    updateConfig();
    
    // Listen for wallet connection changes (if supported)
    if (window.walletAPIInstance.onUpdate) {
      window.walletAPIInstance.onUpdate(updateConfig);
    }
  }
})();

