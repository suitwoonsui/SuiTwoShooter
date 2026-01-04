/**
 * Shooter Game Contract Configuration
 * App-specific contract addresses for the Shooter Game
 * 
 * This extends the base contract config with game-specific contracts.
 */

// Import base config first (if available)
// Base config provides structure and utilities

// Game-specific contract addresses
const GAME_CONTRACT_CONFIG = {
  testnet: {
    packageId: '0x6df4ec20614cbf2b407de12997bb5fa689f7ec2833a3df3ea84cd9986f3f448d',
    badgeRegistry: '0xe47d097edec0fa01aec081cf8cf59cb9c191fea487ed42daf5fadf24a630a286',
    statisticsRegistry: '0xec2f3ac00be49a5c4f2b2874b15c73e57c0de952b4e59f648b990b704e384571',
    clock: '0x6', // Standard Sui Clock object
    usdcTokenTypeId: '0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC',
  },
  mainnet: {
    // TODO: Add mainnet addresses when deployed
    packageId: '',
    badgeRegistry: '',
    statisticsRegistry: '',
    clock: '0x6',
    usdcTokenTypeId: '', // TODO: Add mainnet USDC token type ID when available
  }
};

// Set app-specific contract config
if (typeof window !== 'undefined') {
  window.APP_CONTRACT_CONFIG = GAME_CONTRACT_CONFIG;
  
  // Also merge with base config if it exists
  if (window.GAME_CONFIG && window.GAME_CONFIG.CONTRACTS) {
    const network = window.GAME_CONFIG.NETWORK || 'testnet';
    const baseConfig = window.GAME_CONFIG.CONTRACTS;
    const gameConfig = GAME_CONTRACT_CONFIG[network] || GAME_CONTRACT_CONFIG.testnet;
    
    // Merge: game config takes precedence
    window.GAME_CONFIG.CONTRACTS = {
      ...baseConfig,
      ...gameConfig
    };
    
    console.log('🔧 [GAME CONTRACT CONFIG] Merged with base config');
    console.log('   Network:', network);
    console.log('   Package ID:', window.GAME_CONFIG.CONTRACTS.packageId);
    console.log('   Badge Registry:', window.GAME_CONFIG.CONTRACTS.badgeRegistry);
    console.log('   Statistics Registry:', window.GAME_CONFIG.CONTRACTS.statisticsRegistry);
  }
}
