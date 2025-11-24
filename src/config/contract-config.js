/**
 * Contract Configuration
 * Stores Sui contract addresses for client-side transaction building
 */

// Contract addresses - Network-aware
const CONTRACT_CONFIG = {
  testnet: {
    packageId: '0x6df4ec20614cbf2b407de12997bb5fa689f7ec2833a3df3ea84cd9986f3f448d',
    badgeRegistry: '0xe47d097edec0fa01aec081cf8cf59cb9c191fea487ed42daf5fadf24a630a286',
    statisticsRegistry: '0xec2f3ac00be49a5c4f2b2874b15c73e57c0de952b4e59f648b990b704e384571',
    clock: '0x6', // Standard Sui Clock object
  },
  mainnet: {
    // TODO: Add mainnet addresses when deployed
    packageId: '',
    badgeRegistry: '',
    statisticsRegistry: '',
    clock: '0x6',
  }
};

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
  
  // Validate config has required fields
  if (!config.packageId || !config.badgeRegistry || !config.statisticsRegistry) {
    console.warn('⚠️ [CONTRACT CONFIG] Missing contract addresses for network:', network);
  }
  
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
  
  console.log('🔧 [CONTRACT CONFIG] Initialized');
  console.log('   Network:', window.GAME_CONFIG.NETWORK);
  console.log('   Package ID:', initialConfig.packageId);
  console.log('   Badge Registry:', initialConfig.badgeRegistry);
  console.log('   Statistics Registry:', initialConfig.statisticsRegistry);
  
  // Update config when wallet connects (if wallet API is available)
  if (window.walletAPIInstance) {
    const updateConfig = () => {
      const network = getNetwork();
      const config = getContractConfig();
      window.GAME_CONFIG.CONTRACTS = config;
      window.GAME_CONFIG.NETWORK = network;
      console.log('🔧 [CONTRACT CONFIG] Updated for network:', network);
    };
    
    // Update immediately if wallet is already connected
    updateConfig();
    
    // Listen for wallet connection changes (if supported)
    if (window.walletAPIInstance.onUpdate) {
      window.walletAPIInstance.onUpdate(updateConfig);
    }
  }
})();

