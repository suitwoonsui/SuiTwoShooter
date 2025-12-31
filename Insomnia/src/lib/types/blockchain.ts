/**
 * Blockchain-related type definitions
 * Types for Sui blockchain operations and smart contract interactions
 */

import { SuiClient } from '@mysten/sui/client';

// GamePass interface for blockchain operations
export interface GamePass {
  id: string;
  passType: string;
  gamesRemaining: number;
  expiresAt: number;
  isActive: boolean;
}

// Player statistics from blockchain
export interface PlayerStats {
  id?: string;
  player: string;
  
  // Raw Performance - Highest
  highestClicks: number;
  highestTimeElapsed: number;  // Time in SECONDS
  highestScore: number;
  
  // Raw Performance - Averages
  averageClicks: number;
  averageTimeElapsed: number;  // Time in SECONDS
  averageScore: number;
  
  // Game Count
  totalGames: number;
  
  // Streaks
  currentStreak: number;
  bestStreak: number;
  
  // Legacy fields (for backward compatibility)
  personalBest?: number;
  score?: number;
  gamesPlayed?: number;
  highestEnduranceLevel?: number;
  currentSkillTier?: number;
  lastPlayed?: number;
  lastScoreUpdate?: number;
}

// Transaction result interface
export interface TransactionResult {
  success: boolean;
  digest?: string;
  error?: string;
  events?: Array<{ type: string; parsedJson?: Record<string, unknown> }>;
  effects?: string;
  sessionId?: string; // For game session transactions
}

// Sign and execute function type - matches dapp-kit
export type SignAndExecute = (input: {
  transaction: unknown; // Transaction from '@mysten/sui/transactions'
  chain?: `${string}:${string}`;
  options?: { showEvents?: boolean; showEffects?: boolean };
}) => Promise<{ 
  events?: Array<{ type: string; parsedJson?: Record<string, unknown> }>; 
  effects?: string;
  digest?: string;
}>;

// Blockchain service interface
export interface IBlockchainService {
  isReady(): boolean;
  setSignAndExecute(signAndExecute: SignAndExecute): void;
  getBalance(address: string): Promise<bigint>;
  getPlayerStats(playerAddress: string): Promise<PlayerStats>;
}

// GamePass service interface
export interface IGamePassService {
  purchaseGamePass(passType: string): Promise<TransactionResult>;
  addGamesToExistingPass(gamePassId: string, passType: string, additionalGames: number): Promise<TransactionResult>;
  getGamePassStatus(playerAddress: string): Promise<GamePass | null>;
  getGamePassById(gamePassId: string): Promise<GamePass | null>;
  consumeGameCredit(gamePassId: string, playerAddress: string): Promise<boolean>;
}

// Score system service interface
export interface IScoreSystemService {
  submitScore(playerAddress: string, finalScore: number, enduranceLevel: number): Promise<TransactionResult>;
}

// Game core service interface
export interface IGameCoreService {
  startGameSession(): Promise<TransactionResult>;
  getGameSession(sessionId: string): Promise<unknown>;
}

// Enhanced performance tracking interfaces
export interface GameMetrics {
  clicks: number;           // Blocks clicked this game
  timeElapsed: number;      // Survival time this game (ms)
  score: number;            // Calculated score this game
}

export interface PlayerPerformance {
  // Raw Performance - Highest Achievements
  highestClicks: number;        // Most blocks clicked in one game
  highestTimeElapsed: number;   // Longest survival time in one game (in SECONDS)
  highestScore: number;         // Best calculated score in one game
  
  // Raw Performance - Average Performance
  averageClicks: number;        // Average blocks per game
  averageTimeElapsed: number;   // Average survival time per game (in SECONDS)
  averageScore: number;         // Average calculated score per game
  
  // Game Count
  totalGames: number;           // Total games played
  
  // Current Session
  currentStreak: number;        // Consecutive games with improving scores
  bestStreak: number;           // Best streak achieved
}

// Admin system service interface
export interface IAdminSystemService {
  // Add admin-specific methods as needed
  // For now, this is a placeholder interface
  readonly _placeholder: never;
}

// Blockchain client configuration
export interface BlockchainClientConfig {
  client: SuiClient;
  signAndExecute?: SignAndExecute;
}

// Move object content type for Sui objects
export interface MoveObjectContent {
  type: string;
  fields: Record<string, unknown>;
}

// Sui object data structure
export interface SuiObjectData {
  content?: {
    dataType: string;
    type: string;
    fields: Record<string, unknown>;
  };
}

// Network type for blockchain operations
export type NetworkType = 'mainnet' | 'testnet' | 'devnet' | 'localnet';

// Game score interface for leaderboard
export interface GameScore {
  gameId: string;
  playerAddress: string;
  score: number;
  timestamp: number;
  speedLevel: number;
}
