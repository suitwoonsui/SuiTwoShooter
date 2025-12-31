/**
 * Blockchain services exports
 * Centralized blockchain service management for the Insomnia game
 */

export * from './base';
export * from './gamePass';
export * from './scoreSystem';
export * from './gameCore';

// Re-export commonly used classes and interfaces
export { BaseBlockchainService } from './base';
export { GamePassService } from './gamePass';
export { ScoreSystemService } from './scoreSystem';
export { GameCoreService } from './gameCore';

// Service factory function for easy instantiation
import { BaseBlockchainService } from './base';
import { GamePassService } from './gamePass';
import { ScoreSystemService } from './scoreSystem';
import { GameCoreService } from './gameCore';
import { NetworkType } from '../../types/blockchain';

export function createBlockchainServices(network: NetworkType = 'testnet') {
  return {
    base: new BaseBlockchainService(network),
    gamePass: new GamePassService(network),
    scoreSystem: new ScoreSystemService(network),
    gameCore: new GameCoreService(network)
  };
}

// Individual service factory functions
export function createGamePassService(network: NetworkType = 'testnet'): GamePassService {
  return new GamePassService(network);
}

export function createScoreSystemService(network: NetworkType = 'testnet'): ScoreSystemService {
  return new ScoreSystemService(network);
}
