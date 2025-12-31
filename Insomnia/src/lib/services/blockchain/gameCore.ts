/**
 * Game Core service for blockchain operations
 * Handles all game session-related blockchain interactions
 */

import { Transaction } from '@mysten/sui/transactions';
import { BaseBlockchainService } from './base';
import { IGameCoreService, TransactionResult } from '../../types/blockchain';

export class GameCoreService extends BaseBlockchainService implements IGameCoreService {
  
  /**
   * Start a new game session
   */
  public async startGameSession(): Promise<TransactionResult> {
    this.validateReady();

    try {
      console.log('🎮 Starting new game session...');
      
      const tx = new Transaction();
      
      // Call the start_game function (no system object needed)
      tx.moveCall({
        target: `${this.config.packageId}::${this.config.modules.gameCore}::start_game`,
        arguments: [
          tx.object(this.config.systemIds.clock)
        ]
      });

      console.log('🚀 Executing start game session transaction...');
      
      if (!this.signAndExecute) {
        console.error('❌ Sign and execute function not available');
        return {
          success: false,
          error: 'Wallet not connected or transaction signing not available'
        };
      }
      
      const result = await this.signAndExecute({ transaction: tx });
      
      if (result.digest) {
        console.log('✅ Game session started successfully!');
        console.log('📊 Transaction digest:', result.digest);
        
        // Extract the session ID from the events
        let sessionId = '';
        if (result.events) {
          const gameStartedEvent = result.events.find(event => 
            event.type.includes('GameStarted')
          );
          if (gameStartedEvent && gameStartedEvent.parsedJson) {
            sessionId = String(gameStartedEvent.parsedJson.session_id || '');
          }
        }
        
        return {
          success: true,
          digest: result.digest,
          events: result.events,
          effects: result.effects,
          sessionId
        };
      } else {
        console.error('❌ Game session start failed - no digest returned');
        return {
          success: false,
          error: 'Game session start failed - no digest returned'
        };
      }
      
    } catch (error) {
      console.error('❌ Failed to start game session:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Get game session details
   */
  public async getGameSession(sessionId: string): Promise<unknown> {
    this.validateReady();

    try {
      const session = await this.client.getObject({
        id: sessionId,
        options: { showContent: true }
      });
      
      return session.data?.content;
    } catch (error) {
      console.error('❌ Failed to get game session:', error);
      return null;
    }
  }
}
