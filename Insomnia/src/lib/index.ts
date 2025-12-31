/**
 * Main library exports
 * Centralized exports for all Insomnia game library modules
 */

// Configuration exports
export * from './config';

// Type exports
export * from './types';

// Service exports
export * from './services/blockchain';

// Utility exports
export * from './utils/blockchain';

// Re-export commonly used items from their respective modules
export {
  // Configuration
  getNetworkConfig,
  getContractConfig,
  getPassPrice,
  getPassTypeValue
} from './config';

export type {
  // Types
  GamePass,
  PlayerStats,
  TransactionResult,
  GameState,
  GamePassStatus
} from './types';

export {
  // Services
  BaseBlockchainService,
  GamePassService,
  ScoreSystemService,
  createBlockchainServices
} from './services/blockchain';

export {
  // Utilities
  mistToSui,
  formatAddress,
  isValidSuiAddress,
  retryWithBackoff
} from './utils/blockchain';
