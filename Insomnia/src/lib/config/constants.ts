/**
 * Application constants and configuration values
 * Centralized constants for easy maintenance and updates
 */

// Game Pass Types and Pricing
export const PASS_TYPES = {
  BASIC: 'basic',
  PREMIUM: 'premium',
  UNLIMITED: 'unlimited'
} as const;

export type PassType = typeof PASS_TYPES[keyof typeof PASS_TYPES];

// Pass prices in MIST (1 SUI = 1,000,000,000 MIST)
export const PASS_PRICES: Record<PassType, number> = {
  [PASS_TYPES.BASIC]: 100000000,    // 0.1 SUI
  [PASS_TYPES.PREMIUM]: 400000000,  // 0.4 SUI
  [PASS_TYPES.UNLIMITED]: 1000000000 // 1.0 SUI
};

// Pass type values for smart contract (enum values)
export const PASS_TYPE_VALUES: Record<PassType, number> = {
  [PASS_TYPES.BASIC]: 1,
  [PASS_TYPES.PREMIUM]: 2,
  [PASS_TYPES.UNLIMITED]: 3
};

// Game Configuration
export const GAME_CONFIG = {
  DEFAULT_SPEED: 1,
  MAX_SPEED: 10,
  SCORE_MULTIPLIER: 100,
  ENDURANCE_BONUS: 10
} as const;

// UI Constants
export const UI_CONSTANTS = {
  ANIMATION_DURATION: 300,
  DEBOUNCE_DELAY: 500,
  TOAST_DURATION: 5000,
  LOADING_TIMEOUT: 10000
} as const;

// Blockchain Constants
export const BLOCKCHAIN_CONSTANTS = {
  DEFAULT_GAS_BUDGET: 10000000,
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
  TRANSACTION_TIMEOUT: 30000
} as const;

// Environment Constants
export const ENV_CONSTANTS = {
  BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001',
  DEFAULT_NETWORK: 'testnet',
  SUPPORTED_NETWORKS: ['mainnet', 'testnet', 'devnet', 'localnet'] as const
} as const;

// Helper functions
export function getPassPrice(passType: PassType): number {
  return PASS_PRICES[passType] || PASS_PRICES[PASS_TYPES.BASIC];
}

export function getPassTypeValue(passType: PassType): number {
  return PASS_TYPE_VALUES[passType] || PASS_TYPE_VALUES[PASS_TYPES.BASIC];
}

export function isValidPassType(passType: string): passType is PassType {
  return Object.values(PASS_TYPES).includes(passType as PassType);
}
