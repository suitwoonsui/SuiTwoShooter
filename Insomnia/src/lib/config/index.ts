/**
 * Configuration module exports
 * Centralized configuration management for the Insomnia game
 */

export * from './networks';
export * from './contracts';
export * from './constants';

// Re-export commonly used types and functions
export type { PassType } from './constants';
export type { NetworkConfig } from './networks';
export type { ContractConfig } from './contracts';
export { 
  getPassPrice,
  getPassTypeValue,
  isValidPassType
} from './constants';

// Export network functions
export { 
  getNetworkConfig, 
  getNetworkUrl, 
  getChainId
} from './networks';

// Export contract functions
export { 
  getContractConfig,
  getPackageId,
  getModuleName,
  getSystemId,
  getGameOwnerAddress
} from './contracts';
