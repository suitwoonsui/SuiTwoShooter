/**
 * GamePass service for blockchain operations
 * Handles all GamePass-related blockchain interactions
 */

import { Transaction } from '@mysten/sui/transactions';
import { BaseBlockchainService } from './base';
import { IGamePassService, GamePass, TransactionResult } from '../../types/blockchain';
import { getPassPrice, getPassTypeValue, PassType } from '../../config/constants';

export class GamePassService extends BaseBlockchainService implements IGamePassService {
  
  /**
   * Purchase a new game pass
   */
  public async purchaseGamePass(passType: PassType): Promise<TransactionResult> {
    this.validateReady();

    try {
      console.log('🎮 Creating transaction for pass type:', passType);
      
      // Calculate the payment based on pass type
      const payment = getPassPrice(passType);
      console.log('💰 Payment calculated:', payment);
      console.log('🎯 Target function:', `${this.config.packageId}::${this.config.modules.gamePass}::purchase_game_pass`);
      console.log('🎯 GamePassSystem ID:', this.config.systemIds.gamePassSystem);
      console.log('🎯 Clock ID:', this.config.systemIds.clock);

      const tx = new Transaction();
      
      // Call the purchase_game_pass function
      tx.moveCall({
        target: `${this.config.packageId}::${this.config.modules.gamePass}::purchase_game_pass`,
        arguments: [
          tx.object(this.config.systemIds.gamePassSystem),
          tx.pure.u8(getPassTypeValue(passType)),  // pass_type (u8)
          tx.splitCoins(tx.gas, [tx.pure.u64(payment)]),  // payment (Coin<SUI>)
          tx.object(this.config.systemIds.clock)
        ]
      });

      console.log('🚀 Executing transaction...');
      
      if (!this.signAndExecute) {
        console.error('❌ Sign and execute function not available');
        return {
          success: false,
          error: 'Wallet not connected or transaction signing not available'
        };
      }
      
      const result = await this.signAndExecute({ transaction: tx });
      
      if (result.digest) {
        console.log('✅ Game pass purchased successfully!');
        console.log('📊 Transaction digest:', result.digest);
        return {
          success: true,
          digest: result.digest,
          events: result.events,
          effects: result.effects
        };
      } else {
        console.error('❌ Transaction failed - no digest returned');
        return {
          success: false,
          error: 'Transaction failed - no digest returned'
        };
      }
      
    } catch (error) {
      console.error('❌ Failed to purchase game pass:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Add more games to an existing game pass
   */
  public async addGamesToExistingPass(
    gamePassId: string, 
    passType: PassType, 
    additionalGames: number
  ): Promise<TransactionResult> {
    this.validateReady();

    try {
      // Calculate the payment based on pass type
      const payment = getPassPrice(passType);
      
      const tx = new Transaction();
      
      // Call the purchase_additional_games function
      tx.moveCall({
        target: `${this.config.packageId}::${this.config.modules.gamePass}::purchase_additional_games`,
        arguments: [
          tx.object(this.config.systemIds.gamePassSystem),
          tx.object(gamePassId), // The existing GamePass object
          tx.pure.u64(additionalGames), // Number of games to add
          tx.splitCoins(tx.gas, [tx.pure.u64(payment)]), // Split SUI coin for payment
          tx.object(this.config.systemIds.clock)
        ]
      });

      console.log('🚀 Executing add games transaction...');
      console.log('📊 Adding', additionalGames, 'games to pass:', gamePassId);
      
      if (!this.signAndExecute) {
        console.error('❌ Sign and execute function not available');
        return {
          success: false,
          error: 'Wallet not connected or transaction signing not available'
        };
      }
      const result = await this.signAndExecute({ transaction: tx });
      
      if (result.digest) {
        console.log('✅ Games added to existing pass successfully!');
        console.log('📊 Transaction digest:', result.digest);
        return {
          success: true,
          digest: result.digest,
          events: result.events,
          effects: result.effects
        };
      } else {
        console.error('❌ Transaction failed - no digest returned');
        return {
          success: false,
          error: 'Transaction failed - no digest returned'
        };
      }
      
    } catch (error) {
      console.error('❌ Failed to add games to existing pass:', error);
      console.error('🔍 Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : 'No stack trace',
        fullError: error
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Get game pass status for a player using proper table lookup
   */
  public async getGamePassStatus(playerAddress: string): Promise<GamePass | null> {
    try {
      console.log('🎯 Fetching game pass status for:', playerAddress);
      
      // Use the new table lookup method
      const gamePasses = await this.findGamePassObjectsForPlayer(playerAddress);
      
      if (gamePasses.length > 0) {
        const gamePass = gamePasses[0];
        console.log('✅ Found active game pass:', gamePass);
        return gamePass;
      } else {
        console.log('❌ No GamePass found for player');
        return null;
      }
      
    } catch (error) {
      console.error('❌ Failed to get game pass status:', error);
      return null;
    }
  }

  /**
   * Get a specific GamePass object by its ID
   */
  public async getGamePassById(gamePassId: string): Promise<GamePass | null> {
    try {
      console.log('🎯 Querying specific GamePass object:', gamePassId);
      
      const gamePassObject = await this.client.getObject({
        id: gamePassId,
        options: { showContent: true }
      });
      
      console.log('🎯 Raw GamePass object response:', gamePassObject);
      
      if (gamePassObject.data?.content && 
          gamePassObject.data.content.dataType === 'moveObject') {
        
        // Use proper typing for MoveStruct fields
        const content = gamePassObject.data.content as { 
          type: string; 
          fields: { 
            [key: string]: unknown;
            pass_type?: string; 
            games_remaining?: number; 
            expires_at?: number; 
            is_active?: boolean; 
          } 
        };
        
        console.log('🎯 GamePass object content:', content);
        console.log('🎯 Content type:', content.type);
        console.log('🎯 Expected package ID:', this.config.packageId);
        console.log('🎯 Content fields:', content.fields);
        
        // Verify this is a GamePass object from our contract
        if (content.type.includes('game_pass::GamePass') && 
            content.type.includes(this.config.packageId)) {
          
          const gamePass: GamePass = {
            id: gamePassId,
            passType: content.fields.pass_type || '',
            gamesRemaining: Number(content.fields.games_remaining) || 0,
            expiresAt: Number(content.fields.expires_at) || 0,
            isActive: Boolean(content.fields.is_active)
          };
          
          console.log('✅ Found GamePass by ID:', gamePass);
          return gamePass;
        } else {
          console.warn('⚠️ Object is not a valid GamePass from our contract');
          console.warn('⚠️ Type check failed:', {
            hasGamePass: content.type.includes('game_pass::GamePass'),
            hasPackageId: content.type.includes(this.config.packageId),
            actualType: content.type
          });
          return null;
        }
      }

      console.log('❌ Could not get GamePass object content');
      console.log('❌ Object data:', gamePassObject);
      return null;
      
    } catch (error) {
      console.error('Failed to get GamePass by ID:', error);
      return null;
    }
  }

  /**
   * Consume a game credit via backend API (game owner pays gas)
   */
  public async consumeGameCredit(gamePassId: string, playerAddress: string): Promise<boolean> {
    try {
      console.log('🎮 Consuming game credit via backend API:', gamePassId);
      console.log('👤 Player address:', playerAddress);
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'}/api/consume-credit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gamePassId, playerAddress }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Backend API error:', response.status, errorData);
        return false;
      }
      
      const result = await response.json();
      if (result.success) {
        console.log('✅ Credit consumed successfully via backend API');
        console.log('📊 Transaction digest:', result.transactionDigest);
        console.log('🎮 Games remaining:', result.gamePassStatus?.gamesRemaining);
        
        // Return the updated game pass status for immediate UI update
        return true;
      } else {
        console.error('❌ Backend API returned failure:', result.error);
        return false;
      }
      
    } catch (error) {
      console.error('❌ Failed to consume game credit via backend API:', error);
      return false;
    }
  }

  /**
   * Find GamePass objects for a specific player using smart contract view functions
   * This is the proper way to look up GamePass objects using the table
   */
  private async findGamePassObjectsForPlayer(playerAddress: string): Promise<GamePass[]> {
    try {
      console.log('🔍 Searching for GamePass objects for player:', playerAddress);
      console.log('🔍 Using smart contract view functions for table lookup...');

      // First, check if the player has an active pass
      const hasPassTx = new Transaction();
      hasPassTx.moveCall({
        target: `${this.config.packageId}::game_pass::has_active_pass`,
        arguments: [
          hasPassTx.object(this.config.systemIds.gamePassSystem),
          hasPassTx.pure.address(playerAddress)
        ]
      });

      const hasPassResponse = await this.client.devInspectTransactionBlock({
        sender: playerAddress,
        transactionBlock: hasPassTx
      });

      console.log('🔍 has_active_pass response:', hasPassResponse);

      if (hasPassResponse.results && hasPassResponse.results[0]?.returnValues?.[0]) {
        const hasPass = hasPassResponse.results[0].returnValues[0];
        console.log('🔍 Player has active pass:', hasPass);

        // Check if the player has an active pass (return value should be truthy)
        if (hasPass && Array.isArray(hasPass) && hasPass.length > 0) {
          const firstValue = hasPass[0];
          // The first value is itself an array containing the boolean result
          if (Array.isArray(firstValue) && firstValue.length > 0 && firstValue[0] !== 0) {
            // Get the GamePass object ID using the view function
            const passIdTx = new Transaction();
            passIdTx.moveCall({
              target: `${this.config.packageId}::game_pass::get_player_pass_id`,
              arguments: [
                passIdTx.object(this.config.systemIds.gamePassSystem),
                passIdTx.pure.address(playerAddress)
              ]
            });

            const passIdResponse = await this.client.devInspectTransactionBlock({
              sender: playerAddress,
              transactionBlock: passIdTx
            });

            console.log('🔍 get_player_pass_id response:', passIdResponse);

            if (passIdResponse.results && passIdResponse.results[0]?.returnValues?.[0]) {
              const gamePassIdArray = passIdResponse.results[0].returnValues[0];

              // The return value is a BCS-encoded byte array representing the object ID
              // We need to convert it to a proper hex string
              let gamePassId: string;

              console.log('🔍 Player GamePass ID from table (raw):', gamePassIdArray);

              if (Array.isArray(gamePassIdArray) && gamePassIdArray.length >= 2) {
                // The first element is the actual byte array, second is the type
                const actualByteArray = gamePassIdArray[0];
                
                if (Array.isArray(actualByteArray)) {
                  // Convert byte array to hex string
                  gamePassId = '0x' + actualByteArray
                    .map((byte: number) => byte.toString(16).padStart(2, '0'))
                    .join('');
                } else {
                  // Fallback: try to convert directly
                  gamePassId = String(actualByteArray);
                }
              } else {
                // Fallback: try to convert directly
                gamePassId = String(gamePassIdArray);
              }

              console.log('🔍 Player GamePass ID from table (decoded):', gamePassId);

              // Now get the actual GamePass object
              const gamePassObject = await this.client.getObject({
                id: gamePassId,
                options: { showContent: true }
              });

              if (gamePassObject.data?.content &&
                  gamePassObject.data.content.dataType === 'moveObject') {

                // Use proper typing for MoveStruct fields
                const content = gamePassObject.data.content as {
                  type: string;
                  fields: {
                    [key: string]: unknown;
                    pass_type?: string;
                    games_remaining?: number;
                    expires_at?: number;
                    is_active?: boolean;
                  }
                };

                const gamePass: GamePass = {
                  id: gamePassId,
                  passType: content.fields.pass_type || '',
                  gamesRemaining: Number(content.fields.games_remaining) || 0,
                  expiresAt: Number(content.fields.expires_at) || 0,
                  isActive: Boolean(content.fields.is_active)
                };

                console.log('✅ Found GamePass via table lookup:', gamePass);
                return [gamePass];
              }
            }
          }
        }
      }

      console.log('❌ Table lookup completed but no active pass found');
      return [];
            
    } catch (error) {
      console.log('⚠️ Error calling view functions:', error);
      console.log('❌ Table lookup failed, no fallback available');
      return [];
    }
  }
}
