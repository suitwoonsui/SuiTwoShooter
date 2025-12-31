/**
 * Type definitions exports
 * Centralized type management for the Insomnia game
 */

// Blockchain types
export * from './blockchain';

// Game types
export * from './game';

// Wallet types
export * from './wallet';

// Re-export commonly used types
export type {
  GamePass,
  PlayerStats,
  TransactionResult,
  SignAndExecute,
  GameScore
} from './blockchain';

export type {
  GameState,
  GamePassStatus,
  GameSession,
  GameSettings,
  GameMode
} from './game';

export type {
  WalletConnectionState,
  WalletProvider,
  NetworkInfo,
  TransactionInfo
} from './wallet';
