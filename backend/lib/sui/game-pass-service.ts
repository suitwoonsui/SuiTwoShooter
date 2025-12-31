// ==========================================
// Game Pass Service - Handles game pass/credit system blockchain operations
// ==========================================

import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { getConfig } from '@/config/config';
import { getAdminWalletService } from './admin-wallet-service';
import { checkPlayerTokenBalanceForPurchase } from './balance-checker';
import { StoreLogger } from './store-logger';

/**
 * GamePassService - Handles game pass-related blockchain operations
 * - Query player game pass status
 * - Build purchase transactions (credit packs, pay-per-game)
 * - Consume credits (admin wallet)
 * - Manage tournament tickets
 */
export class GamePassService {
  private client: SuiClient;
  private config: ReturnType<typeof getConfig>;
  private adminWallet: ReturnType<typeof getAdminWalletService>;

  constructor() {
    this.config = getConfig();
    
    // Initialize Sui client
    const network = this.config.sui.network;
    const rpcUrl = network === 'testnet' 
      ? getFullnodeUrl('testnet')
      : network === 'mainnet'
      ? getFullnodeUrl('mainnet')
      : this.config.sui.rpcUrl;

    this.client = new SuiClient({ url: rpcUrl });
    this.adminWallet = getAdminWalletService();
    
    StoreLogger.info(`GamePassService initialized for ${network}`);
  }

  /**
   * Get player's game pass status from blockchain
   * Queries GamePass object for the given address
   * 
   * @param playerAddress - Wallet address to query
   * @returns Game pass status with credits remaining
   */
  async getGamePassStatus(playerAddress: string): Promise<{
    success: boolean;
    hasPass?: boolean;
    gamesRemaining?: number;
    isActive?: boolean;
    packType?: number;
    ticketCount?: number;
    error?: string;
  }> {
    try {
      // Validate address format
      if (!playerAddress || !playerAddress.startsWith('0x') || playerAddress.length !== 66) {
        return {
          success: false,
          error: 'Invalid player address format',
        };
      }

      const contractAddress = this.config.contracts.gamePass;
      
      if (!contractAddress || contractAddress === '' || contractAddress === '0x...') {
        // Contract not deployed yet - return no pass
        StoreLogger.warn('Game pass contract not configured. Returning no pass.');
        return {
          success: true,
          hasPass: false,
          gamesRemaining: 0,
          isActive: false,
          ticketCount: 0,
        };
      }

      // Parse package ID from contract address
      const packageId = contractAddress.includes('::') 
        ? contractAddress.split('::')[0]
        : contractAddress;

      // Get GamePassSystem object ID
      const systemObjectId = this.config.contracts.gamePassSystem;
      
      if (!systemObjectId || systemObjectId === '' || systemObjectId === '0x...') {
        StoreLogger.warn('Game pass system object ID not configured. Returning no pass.');
        return {
          success: true,
          hasPass: false,
          gamesRemaining: 0,
          isActive: false,
          ticketCount: 0,
        };
      }

      StoreLogger.info(`Querying game pass status for ${playerAddress}`);

      // Query the dynamic object field directly
      // The GamePass is stored as a dynamic field on GamePassSystem with key = player address
      try {
        const dynamicFieldName = {
          type: 'address',
          value: playerAddress,
        };

        let dynamicField;
        try {
          // Try getDynamicFieldObject first (returns the object directly)
          // Add retry logic for 503 errors
          let retries = 3;
          let lastError: Error | null = null;
          
          while (retries > 0) {
            try {
              dynamicField = await this.client.getDynamicFieldObject({
                parentId: systemObjectId,
                name: dynamicFieldName,
              });
              break; // Success, exit retry loop
            } catch (error) {
              lastError = error instanceof Error ? error : new Error(String(error));
              const errorMessage = lastError.message;
              
              // Check if it's a 503 or 429 error (retryable)
              if (errorMessage.includes('503') || errorMessage.includes('429') || 
                  errorMessage.includes('Service Unavailable') || 
                  errorMessage.includes('Too Many Requests')) {
                retries--;
                if (retries > 0) {
                  const delay = (4 - retries) * 1000; // Exponential backoff: 1s, 2s, 3s
                  StoreLogger.warn(`RPC error (retryable) in getDynamicFieldObject, retrying in ${delay}ms...`, {
                    error: errorMessage,
                    retriesLeft: retries,
                    playerAddress,
                  });
                  await new Promise(resolve => setTimeout(resolve, delay));
                  continue;
                }
              }
              
              // Not retryable or out of retries, throw
              throw lastError;
            }
          }
        } catch (directError) {
          // If direct query fails, try listing all dynamic fields and finding the one we need
          StoreLogger.debug('Direct query failed, trying getDynamicFields...');
          const allFields = await this.client.getDynamicFields({
            parentId: systemObjectId,
          });
          
          // Find the field with matching address
          const matchingField = allFields.data.find(
            (field: any) => field.name?.type === 'address' && field.name?.value === playerAddress
          );
          
          if (!matchingField) {
            StoreLogger.info('No game pass found for player (first time player)');
            return {
              success: true,
              hasPass: false,
              gamesRemaining: 0,
              isActive: false,
            };
          }
          
          // Get the actual GamePass object with retry logic for 503 errors
          let retries = 3;
          let lastError: Error | null = null;
          
          while (retries > 0) {
            try {
              dynamicField = await this.client.getObject({
                id: matchingField.objectId,
                options: { showContent: true },
              });
              break; // Success, exit retry loop
            } catch (error) {
              lastError = error instanceof Error ? error : new Error(String(error));
              const errorMessage = lastError.message;
              
              // Check if it's a 503 or 429 error (retryable)
              if (errorMessage.includes('503') || errorMessage.includes('429') || 
                  errorMessage.includes('Service Unavailable') || 
                  errorMessage.includes('Too Many Requests')) {
                retries--;
                if (retries > 0) {
                  const delay = (4 - retries) * 1000; // Exponential backoff: 1s, 2s, 3s
                  StoreLogger.warn(`RPC error (retryable), retrying in ${delay}ms...`, {
                    error: errorMessage,
                    retriesLeft: retries,
                    objectId: matchingField.objectId,
                  });
                  await new Promise(resolve => setTimeout(resolve, delay));
                  continue;
                }
              }
              
              // Not retryable or out of retries, throw
              throw lastError;
            }
          }
        }

        // Check if the field exists
        if (!dynamicField) {
          StoreLogger.info('No game pass found for player (first time player)');
          return {
            success: false,
            hasPass: false,
            error: 'No game pass found',
          };
        }
        const fieldData = dynamicField.data || dynamicField;
        if (!fieldData || !('content' in fieldData) || !fieldData.content) {
          StoreLogger.info('No game pass found for player (first time player)');
          return {
            success: true,
            hasPass: false,
            gamesRemaining: 0,
            isActive: false,
          };
        }

        // Parse the GamePass object
        const passData = fieldData.content as any;
        if (!passData || passData.fields === undefined) {
          StoreLogger.warn('Invalid game pass object structure');
          return {
            success: true,
            hasPass: false,
            gamesRemaining: 0,
            isActive: false,
          };
        }

        // Extract game pass data
        const gamesRemaining = Number(passData.fields.games_remaining || 0);
        const isActive = passData.fields.is_active === true || passData.fields.is_active === 'true';
        const packType = Number(passData.fields.pack_type || 1);
        const hasPass = isActive && gamesRemaining > 0;
        
        // Extract tournament tickets count
        // The ticket_count field is now accurately maintained (increments on purchase, decrements on consumption)
        // For backward compatibility: if ticket_count doesn't exist (old GamePass objects), fall back to next_ticket_id - 1
        let ticketCount = 0;
        let ticketCountField = null;
        if ('ticket_count' in passData.fields && passData.fields.ticket_count !== undefined && passData.fields.ticket_count !== null) {
          // New field exists - use it (accurate count)
          ticketCountField = Number(passData.fields.ticket_count || 0);
          ticketCount = ticketCountField;
          StoreLogger.debug('Using ticket_count field (new GamePass object)', {
            playerAddress,
            ticketCount,
          });
        } else {
          // Old GamePass object - fall back to approximation
          const nextTicketId = Number(passData.fields.next_ticket_id || 1);
          ticketCount = Math.max(0, nextTicketId - 1);
          StoreLogger.info('Using next_ticket_id approximation for ticket count (old GamePass object)', {
            playerAddress,
            nextTicketId,
            ticketCount,
            hasTicketCountField: 'ticket_count' in passData.fields,
          });
        }

        // Verify ticket count accuracy and use actual count if there's a discrepancy
        // This ensures we always return the correct count even if the field is stale
        try {
          const verification = await this.verifyTicketCount(playerAddress);
          if (verification.success && !verification.isAccurate && verification.actualTicketCount !== undefined) {
            // Use actual count from table when there's a discrepancy
            const oldCount = ticketCount;
            ticketCount = verification.actualTicketCount;
            StoreLogger.warn('Ticket count discrepancy detected - using actual count from table', {
              playerAddress,
              ticketCountField: verification.ticketCountField,
              actualTicketCount: verification.actualTicketCount,
              discrepancy: verification.discrepancy,
              oldCount,
              correctedCount: ticketCount,
              message: 'ticket_count field does not match actual tickets in table. Using actual count. Use fixTicketCount() to correct the field.',
            });
          }
        } catch (error) {
          StoreLogger.debug('Ticket count verification failed (non-critical)', { error, playerAddress });
          // Continue with field value if verification fails
        }

        StoreLogger.info('Game pass status loaded', {
          hasPass,
          gamesRemaining,
          isActive,
          packType,
          ticketCount,
        });

        return {
          success: true,
          hasPass,
          gamesRemaining,
          isActive,
          packType,
          ticketCount,
        };
      } catch (error) {
        // If dynamic field doesn't exist, player has no pass yet
        if (error instanceof Error && error.message.includes('not found')) {
          StoreLogger.info('No game pass found for player (first time player)');
          return {
            success: true,
            hasPass: false,
            gamesRemaining: 0,
            isActive: false,
          };
        }
        
        StoreLogger.error('Error querying dynamic field', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error querying game pass',
        };
      }
    } catch (error) {
      StoreLogger.error('Error querying game pass status', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get available tournament ticket IDs for a player
   * Uses devInspectTransactionBlock to query which tickets exist
   */
  async getAvailableTicketIds(playerAddress: string): Promise<{
    success: boolean;
    ticketIds?: number[];
    error?: string;
  }> {
    try {
      const contractAddress = this.config.contracts.gamePass;
      const systemObjectId = this.config.contracts.gamePassSystem;
      
      if (!contractAddress || !systemObjectId) {
        return {
          success: false,
          error: 'Game pass contract not configured',
        };
      }

      const packageId = contractAddress.includes('::') 
        ? contractAddress.split('::')[0]
        : contractAddress;

      // First, get the game pass status to check if player has tickets
      const statusResult = await this.getGamePassStatus(playerAddress);
      if (!statusResult.success) {
        return {
          success: false,
          error: statusResult.error || 'Failed to get game pass status',
        };
      }

      // If player has no pass or no tickets, return empty array
      if (!statusResult.hasPass || !statusResult.ticketCount || statusResult.ticketCount === 0) {
        StoreLogger.info('No tickets found for player', { 
          playerAddress, 
          hasPass: statusResult.hasPass,
          ticketCount: statusResult.ticketCount 
        });
        return {
          success: true,
          ticketIds: [],
        };
      }

      // Query the tournament_tickets table directly using dynamic fields
      // This is more reliable than checking sequentially with devInspectTransactionBlock
      const availableTicketIds: number[] = [];
      
      try {
        // Get the GamePass object to access the tournament_tickets table
        const dynamicFieldName = {
          type: 'address',
          value: playerAddress,
        };
        
        const dynamicField = await this.client.getDynamicFieldObject({
          parentId: systemObjectId,
          name: dynamicFieldName,
        });
        
        if (dynamicField.data && 'content' in dynamicField.data && dynamicField.data.content) {
          const passData = dynamicField.data.content as any;
          const tournamentTicketsTable = passData.fields?.tournament_tickets;
          
          if (tournamentTicketsTable && tournamentTicketsTable.fields && tournamentTicketsTable.fields.id) {
            const tableObjectId = tournamentTicketsTable.fields.id.id;
            
            StoreLogger.info('Querying tournament_tickets table directly', {
              playerAddress,
              tableObjectId,
              expectedTicketCount: statusResult.ticketCount,
            });
            
            // Get all dynamic fields from the table (each field is a ticket)
            const dynamicFields = await this.client.getDynamicFields({
              parentId: tableObjectId,
            });
            
            StoreLogger.info('Found dynamic fields in tournament_tickets table', {
              playerAddress,
              count: dynamicFields.data.length,
              expectedCount: statusResult.ticketCount,
            });
            
            // Extract ticket IDs from the dynamic field names
            // Dynamic field names for tables are the key values (ticket_id in this case)
            for (const field of dynamicFields.data) {
              try {
                // The name field contains the ticket_id as a u64
                // For Table<u64, V>, the name is typically: { type: 'u64', value: '123' } or just the number
                const name = field.name as any;
                let ticketId: number = 0;
                
                if (name) {
                  if (typeof name === 'object') {
                    // Handle object format: { type: 'u64', value: '123' } or { value: 123 }
                    if (name.value !== undefined) {
                      ticketId = Number(name.value);
                    } else if (name.type === 'u64' && (name as any).bcs !== undefined) {
                      // Handle BCS-encoded u64
                      ticketId = Number((name as any).bcs || 0);
                    } else {
                      // Try to find any numeric value in the object
                      const values = Object.values(name);
                      for (const val of values) {
                        if (typeof val === 'number' || (typeof val === 'string' && !isNaN(Number(val)))) {
                          ticketId = Number(val);
                          break;
                        }
                      }
                    }
                  } else if (typeof name === 'string') {
                    ticketId = Number(name);
                  } else if (typeof name === 'number') {
                    ticketId = name;
                  }
                }
                
                if (ticketId > 0) {
                  availableTicketIds.push(ticketId);
                  StoreLogger.debug('Found ticket from table', { 
                    ticketId, 
                    playerAddress,
                    nameType: typeof name,
                    nameValue: name,
                  });
                } else {
                  StoreLogger.warn('Could not extract ticket ID from dynamic field name', {
                    name,
                    nameType: typeof name,
                    fieldObjectId: field.objectId,
                  });
                }
              } catch (error) {
                StoreLogger.debug('Error extracting ticket ID from dynamic field', {
                  field,
                  error: error instanceof Error ? error.message : String(error),
                });
              }
            }
          } else {
            StoreLogger.warn('Tournament tickets table not found in GamePass', {
              playerAddress,
              hasTournamentTickets: !!tournamentTicketsTable,
            });
          }
        }
      } catch (error) {
        StoreLogger.error('Error querying tournament_tickets table', {
          error: error instanceof Error ? error.message : String(error),
          playerAddress,
        });
        
        // Fallback to sequential checking if table query fails
        StoreLogger.info('Falling back to sequential ticket checking', { playerAddress });
        
        // Get next_ticket_id to determine range
        let maxTicketIdToCheck = 100;
        try {
          const dynamicFieldName = {
            type: 'address',
            value: playerAddress,
          };
          
          const dynamicField = await this.client.getDynamicFieldObject({
            parentId: systemObjectId,
            name: dynamicFieldName,
          });
          
          if (dynamicField.data && 'content' in dynamicField.data && dynamicField.data.content) {
            const passData = dynamicField.data.content as any;
            if (passData.fields && passData.fields.next_ticket_id) {
              const nextTicketId = Number(passData.fields.next_ticket_id || 1);
              maxTicketIdToCheck = Math.min(nextTicketId + 10, 100); // Check a bit beyond next_ticket_id
            }
          }
        } catch (err) {
          // Use default range
        }
        
        // Sequential check as fallback
        for (let ticketId = 1; ticketId <= maxTicketIdToCheck; ticketId++) {
          try {
            const tx = new Transaction();
            tx.moveCall({
              target: `${packageId}::game_pass::has_tournament_ticket`,
              arguments: [
                tx.object(systemObjectId),
                tx.pure.address(playerAddress),
                tx.pure.u64(ticketId),
              ],
            });

            const result = await this.client.devInspectTransactionBlock({
              transactionBlock: tx,
              sender: playerAddress,
            });

            if (result.results && result.results[0]?.returnValues?.[0]) {
              const returnValue = result.results[0].returnValues[0];
              let hasTicket = false;
              
              if (Array.isArray(returnValue)) {
                if (Array.isArray(returnValue[0])) {
                  const val: any = returnValue[0][0];
                  hasTicket = val === 1 || val === '1' || val === true || String(val) === '1';
                } else {
                  const val: any = returnValue[0];
                  hasTicket = val === 1 || val === '1' || val === true || String(val) === '1';
                }
              } else {
                hasTicket = returnValue === 1 || returnValue === '1' || returnValue === true;
              }
              
              if (hasTicket) {
                availableTicketIds.push(ticketId);
              }
            }
          } catch (err) {
            // Continue checking other tickets
          }
        }
      }

      StoreLogger.info('Found available ticket IDs', {
        playerAddress,
        count: availableTicketIds.length,
        ticketIds: availableTicketIds,
      });

      return {
        success: true,
        ticketIds: availableTicketIds,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Verify ticket count accuracy by counting actual tickets in the table
   * Compares ticket_count field with actual tickets in tournament_tickets table
   * 
   * @param playerAddress - Player's wallet address
   * @returns Verification result with actual count vs ticket_count
   */
  async verifyTicketCount(playerAddress: string): Promise<{
    success: boolean;
    ticketCountField?: number;
    actualTicketCount?: number;
    isAccurate?: boolean;
    discrepancy?: number;
    error?: string;
  }> {
    try {
      const systemObjectId = this.config.contracts.gamePassSystem;
      
      if (!systemObjectId) {
        return {
          success: false,
          error: 'Game pass system not configured',
        };
      }

      // Get GamePass object
      const dynamicFieldName = {
        type: 'address',
        value: playerAddress,
      };
      
      const dynamicField = await this.client.getDynamicFieldObject({
        parentId: systemObjectId,
        name: dynamicFieldName,
      });

      if (dynamicField.error || !dynamicField.data) {
        return {
          success: false,
          error: 'No game pass found for player',
        };
      }

      const passData = (dynamicField.data.content as any)?.fields;
      if (!passData) {
        return {
          success: false,
          error: 'Invalid game pass structure',
        };
      }

      // Get ticket_count from field
      const ticketCountField = 'ticket_count' in passData && passData.ticket_count !== undefined && passData.ticket_count !== null
        ? Number(passData.ticket_count || 0)
        : null;

      // Get tournament_tickets table object ID
      const tournamentTicketsTable = passData.tournament_tickets;
      if (!tournamentTicketsTable || !tournamentTicketsTable.fields || !tournamentTicketsTable.fields.id) {
        return {
          success: true,
          ticketCountField: ticketCountField || 0,
          actualTicketCount: 0,
          isAccurate: (ticketCountField || 0) === 0,
          discrepancy: ticketCountField || 0,
        };
      }

      const tableObjectId = tournamentTicketsTable.fields.id.id;

      // Count actual tickets by querying dynamic fields of the table
      let actualTicketCount = 0;
      try {
        const dynamicFields = await this.client.getDynamicFields({
          parentId: tableObjectId,
        });
        actualTicketCount = dynamicFields.data.length;
      } catch (error) {
        StoreLogger.error('Error counting tickets from table', { error, playerAddress, tableObjectId });
        return {
          success: false,
          error: `Failed to count tickets from table: ${error instanceof Error ? error.message : String(error)}`,
        };
      }

      const isAccurate = ticketCountField === actualTicketCount;
      const discrepancy = ticketCountField !== null ? actualTicketCount - ticketCountField : null;

      StoreLogger.info('Ticket count verification', {
        playerAddress,
        ticketCountField,
        actualTicketCount,
        isAccurate,
        discrepancy,
      });

      return {
        success: true,
        ticketCountField: ticketCountField || 0,
        actualTicketCount,
        isAccurate,
        discrepancy: discrepancy !== null ? discrepancy : undefined,
      };
    } catch (error) {
      StoreLogger.error('Error verifying ticket count', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Fix ticket count discrepancy by setting ticket_count to match actual tickets in table
   * Uses admin_set_ticket_count function
   * 
   * @param playerAddress - Player's wallet address
   * @param correctCount - The correct ticket count (usually from verifyTicketCount)
   * @returns Transaction result
   */
  async fixTicketCount(playerAddress: string, correctCount: number): Promise<{
    success: boolean;
    digest?: string;
    error?: string;
  }> {
    try {
      const contractAddress = this.config.contracts.gamePass;
      const systemObjectId = this.config.contracts.gamePassSystem;
      // Game pass uses premium_store AdminCapability, not a separate one
      const adminCapabilityObjectId = this.config.contracts.premiumStoreAdminCapability;
      
      if (!contractAddress || !systemObjectId || !adminCapabilityObjectId) {
        return {
          success: false,
          error: 'Game pass contract not configured',
        };
      }

      const packageId = contractAddress.includes('::') 
        ? contractAddress.split('::')[0]
        : contractAddress;

      const client = this.config.sui.network === 'testnet'
        ? this.adminWallet.getTestnetClient()
        : this.adminWallet.getMainnetClient();

      const { Transaction } = await import('@mysten/sui/transactions');
      const txb = new Transaction();

      txb.moveCall({
        target: `${packageId}::game_pass::set_ticket_count`,
        arguments: [
          txb.object(adminCapabilityObjectId),
          txb.object(systemObjectId),
          txb.pure.address(playerAddress),
          txb.pure.u64(correctCount),
        ],
      });

      txb.setSender(this.adminWallet.getAddress());
      txb.setGasBudget(this.config.sui.gasBudget);

      const transactionBytes = await txb.build({ client });
      const result = await client.signAndExecuteTransaction({
        signer: this.adminWallet.getKeypair(),
        transaction: transactionBytes,
        options: { showEffects: true, showEvents: true },
      });

      StoreLogger.info('Ticket count fixed', {
        playerAddress,
        correctCount,
        digest: result.digest,
      });

      return {
        success: true,
        digest: result.digest,
      };
    } catch (error) {
      StoreLogger.error('Error fixing ticket count', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Build purchase transaction for credit pack
   * Creates an unsigned transaction that includes:
   * 1. Payment transfer (player pays)
   * 2. purchase_game_pass() call
   * 
   * @param playerAddress - Player's wallet address
   * @param packType - Pack type (1=Starter $1/11 games @9.1% off, 2=Regular $5/56 games @11% off, 3=Value $10/115 games @13% off, 4=Mega $20/235 games @15% off)
   * @param paymentToken - Token to pay with ('SUI', 'MEWS', or 'USDC')
   * @param totalTokenAmount - Total amount in token (with decimals)
   * @param pricePaidUsdCents - Price paid in USD cents (for event tracking)
   * @returns Unsigned transaction bytes
   */
  async buildPurchasePackTransaction(
    playerAddress: string,
    packType: number,
    paymentToken: 'SUI' | 'MEWS' | 'USDC',
    totalTokenAmount: string,
    pricePaidUsdCents: number
  ): Promise<{
    success: boolean;
    transaction?: string; // Serialized transaction bytes (base64)
    gasEstimate?: string;
    error?: string;
  }> {
    try {
      // Validate inputs
      if (!playerAddress || !playerAddress.startsWith('0x') || playerAddress.length !== 66) {
        return {
          success: false,
          error: 'Invalid player address format',
        };
      }

      if (packType < 1 || packType > 4) {
        return {
          success: false,
          error: 'Invalid pack type. Must be 1-4 (Starter, Regular, Value, Mega)',
        };
      }

      const contractAddress = this.config.contracts.gamePass;
      const network = this.config.sui.network;
      
      if (!contractAddress || contractAddress === '' || contractAddress === '0x...') {
        const envVarName = network === 'testnet' 
          ? 'GAME_PASS_CONTRACT_TESTNET' 
          : network === 'mainnet'
          ? 'GAME_PASS_CONTRACT_MAINNET'
          : 'GAME_PASS_CONTRACT';
        return {
          success: false,
          error: `Game pass contract not configured. Please set ${envVarName} environment variable.`,
        };
      }

      // Parse package ID from contract address
      const packageId = contractAddress.includes('::') 
        ? contractAddress.split('::')[0]
        : contractAddress;

      // Get system object ID from config
      const systemObjectId = this.config.contracts.gamePassSystem;
      
      if (!systemObjectId || systemObjectId === '' || systemObjectId === '0x...') {
        const envVarName = network === 'testnet' 
          ? 'GAME_PASS_SYSTEM_OBJECT_ID_TESTNET' 
          : network === 'mainnet'
          ? 'GAME_PASS_SYSTEM_OBJECT_ID_MAINNET'
          : 'GAME_PASS_SYSTEM_OBJECT_ID';
        return {
          success: false,
          error: `Game pass system object ID not configured. Please set ${envVarName} environment variable after contract deployment.`,
        };
      }

      StoreLogger.info('Building purchase pack transaction', {
        playerAddress,
        packType,
        paymentToken,
        totalAmount: totalTokenAmount,
        priceUsdCents: pricePaidUsdCents,
      });

      // Build transaction
      const txb = new Transaction();

      // Convert payment token to u8
      const paymentTokenMap: Record<string, number> = {
        'SUI': 0,
        'MEWS': 1,
        'USDC': 2,
      };
      const paymentTokenValue = paymentTokenMap[paymentToken];
      
      if (paymentTokenValue === undefined) {
        return {
          success: false,
          error: `Invalid payment token: ${paymentToken}`,
        };
      }

      // Check player balance before building transaction
      const gasEstimate = this.config.sui.gasBudget;
      const gasWithBuffer = Math.round(gasEstimate * 1.15);
      
      // Get token type ID based on payment token
      let paymentTokenType: string;
      let tokenDecimals: number;
      
      if (paymentToken === 'SUI') {
        paymentTokenType = 'SUI';
        tokenDecimals = 9; // SUI has 9 decimals
      } else if (paymentToken === 'MEWS') {
        paymentTokenType = this.config.token.mewsTokenTypeId || '';
        tokenDecimals = this.config.sui.network === 'testnet' ? 9 : 6;
        if (!paymentTokenType || paymentTokenType === '0x...') {
          return {
            success: false,
            error: 'MEWS token type ID not configured',
          };
        }
      } else if (paymentToken === 'USDC') {
        paymentTokenType = this.config.token.usdcTokenTypeId || '';
        tokenDecimals = 6; // USDC has 6 decimals
        if (!paymentTokenType || paymentTokenType === '') {
          return {
            success: false,
            error: 'USDC token type ID not configured',
          };
        }
      } else {
        return {
          success: false,
          error: `Invalid payment token: ${paymentToken}`,
        };
      }

      await checkPlayerTokenBalanceForPurchase({
        client: this.client,
        walletAddress: playerAddress,
        gasBudget: gasWithBuffer,
        paymentTokenType,
        paymentAmount: totalTokenAmount,
        tokenDecimals,
        context: 'game pass purchase',
      });

      // Handle payment coin preparation
      let paymentCoin: any = null;
      
      if (paymentToken === 'SUI') {
        // For SUI, split from gas coin
        const paymentAmountBigInt = BigInt(totalTokenAmount);
        paymentCoin = txb.splitCoins(txb.gas, [paymentAmountBigInt]);
      } else {
        // For MEWS/USDC, get player's coins and prepare payment
        try {
          const coins = await this.client.getCoins({
            owner: playerAddress,
            coinType: paymentTokenType,
          });
          
          if (!coins.data || coins.data.length === 0) {
            return {
              success: false,
              error: `No ${paymentToken} coins found. Please ensure you have ${paymentToken} in your wallet.`,
            };
          }
          
          // Check if any single coin has sufficient balance
          const paymentAmountBigInt = BigInt(totalTokenAmount);
          const coinWithEnoughBalance = coins.data.find(coin => BigInt(coin.balance) >= paymentAmountBigInt);
          
          let coinToSplit;
          if (coinWithEnoughBalance) {
            // Use the coin that has enough balance - no merge needed
            coinToSplit = txb.object(coinWithEnoughBalance.coinObjectId);
          } else if (coins.data.length === 1) {
            // Only one coin, but it might not have enough - try anyway (will fail at execution if insufficient)
            coinToSplit = txb.object(coins.data[0].coinObjectId);
          } else {
            // Multiple coins, none has enough alone - merge them all
            const coinObjects = coins.data.map(coin => txb.object(coin.coinObjectId));
            coinToSplit = txb.mergeCoins(coinObjects[0], coinObjects.slice(1));
          }
          
          // Split the payment amount from the coin
          paymentCoin = txb.splitCoins(coinToSplit, [paymentAmountBigInt]);
        } catch (error) {
          StoreLogger.error(`Error getting ${paymentToken} coins`, error);
          return {
            success: false,
            error: `Failed to get ${paymentToken} coins: ${error instanceof Error ? error.message : 'Unknown error'}`,
          };
        }
      }

      // Call purchase_game_pass with generic coin type
      // Contract signature: purchase_game_pass<T>(system, pack_type, payment_token_type, price_paid_usd_cents, payment, clock)
      // The contract receives the payment coin and transfers it to admin internally
      if (paymentToken === 'SUI') {
        txb.moveCall({
          target: `${packageId}::game_pass::purchase_game_pass`,
          typeArguments: ['0x2::sui::SUI'],
          arguments: [
            txb.object(systemObjectId),
            txb.pure.u8(packType),
            txb.pure.u8(paymentTokenValue),
            txb.pure.u64(pricePaidUsdCents),
            paymentCoin, // Pass the payment coin to the contract
            txb.object('0x6'), // Clock object
          ],
        });
      } else if (paymentToken === 'MEWS') {
        txb.moveCall({
          target: `${packageId}::game_pass::purchase_game_pass`,
          typeArguments: [this.config.token.mewsTokenTypeId],
          arguments: [
            txb.object(systemObjectId),
            txb.pure.u8(packType),
            txb.pure.u8(paymentTokenValue),
            txb.pure.u64(pricePaidUsdCents),
            paymentCoin, // Pass the payment coin to the contract
            txb.object('0x6'), // Clock object
          ],
        });
      } else if (paymentToken === 'USDC') {
        txb.moveCall({
          target: `${packageId}::game_pass::purchase_game_pass`,
          typeArguments: [this.config.token.usdcTokenTypeId],
          arguments: [
            txb.object(systemObjectId),
            txb.pure.u8(packType),
            txb.pure.u8(paymentTokenValue),
            txb.pure.u64(pricePaidUsdCents),
            paymentCoin, // Pass the payment coin to the contract
            txb.object('0x6'), // Clock object
          ],
        });
      }

      // Set sender (required for building transaction, even if not signing)
      txb.setSender(playerAddress);

      // Set gas budget
      txb.setGasBudget(gasWithBuffer);

      // Build transaction (don't sign - frontend will sign)
      const transactionBytes = await txb.build({ client: this.client });

      StoreLogger.info('Purchase pack transaction built successfully', {
        gasEstimate: gasWithBuffer,
        gasEstimateSUI: (gasWithBuffer / 1_000_000_000).toFixed(4)
      });

      return {
        success: true,
        transaction: Buffer.from(transactionBytes).toString('base64'),
        gasEstimate: gasWithBuffer.toString(),
      };
    } catch (error) {
      StoreLogger.error('Error building purchase pack transaction', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Build purchase transaction for pay-per-game
   * Similar to purchase pack but for single game
   */
  async buildPurchaseSingleGameTransaction(
    playerAddress: string,
    paymentToken: 'SUI' | 'MEWS' | 'USDC',
    totalTokenAmount: string,
    pricePaidUsdCents: number
  ): Promise<{
    success: boolean;
    transaction?: string;
    gasEstimate?: string;
    error?: string;
  }> {
    try {
      // Validate inputs
      if (!playerAddress || !playerAddress.startsWith('0x') || playerAddress.length !== 66) {
        return {
          success: false,
          error: 'Invalid player address format',
        };
      }

      const contractAddress = this.config.contracts.gamePass;
      const network = this.config.sui.network;
      
      if (!contractAddress || contractAddress === '' || contractAddress === '0x...') {
        const envVarName = network === 'testnet' 
          ? 'GAME_PASS_CONTRACT_TESTNET' 
          : network === 'mainnet'
          ? 'GAME_PASS_CONTRACT_MAINNET'
          : 'GAME_PASS_CONTRACT';
        return {
          success: false,
          error: `Game pass contract not configured. Please set ${envVarName} environment variable.`,
        };
      }

      const packageId = contractAddress.includes('::') 
        ? contractAddress.split('::')[0]
        : contractAddress;

      const systemObjectId = this.config.contracts.gamePassSystem;
      
      if (!systemObjectId || systemObjectId === '' || systemObjectId === '0x...') {
        const envVarName = network === 'testnet' 
          ? 'GAME_PASS_SYSTEM_OBJECT_ID_TESTNET' 
          : network === 'mainnet'
          ? 'GAME_PASS_SYSTEM_OBJECT_ID_MAINNET'
          : 'GAME_PASS_SYSTEM_OBJECT_ID';
        return {
          success: false,
          error: `Game pass system object ID not configured. Please set ${envVarName} environment variable.`,
        };
      }

      StoreLogger.info('Building purchase single game transaction', {
        playerAddress,
        paymentToken,
        totalAmount: totalTokenAmount,
        priceUsdCents: pricePaidUsdCents,
      });

      const txb = new Transaction();

      const paymentTokenMap: Record<string, number> = {
        'SUI': 0,
        'MEWS': 1,
        'USDC': 2,
      };
      const paymentTokenValue = paymentTokenMap[paymentToken];
      
      if (paymentTokenValue === undefined) {
        return {
          success: false,
          error: `Invalid payment token: ${paymentToken}`,
        };
      }

      const gasEstimate = this.config.sui.gasBudget;
      const gasWithBuffer = Math.round(gasEstimate * 1.15);
      
      let paymentTokenType: string;
      let tokenDecimals: number;
      
      if (paymentToken === 'SUI') {
        paymentTokenType = 'SUI';
        tokenDecimals = 9;
      } else if (paymentToken === 'MEWS') {
        paymentTokenType = this.config.token.mewsTokenTypeId || '';
        tokenDecimals = this.config.sui.network === 'testnet' ? 9 : 6;
        if (!paymentTokenType || paymentTokenType === '0x...') {
          return {
            success: false,
            error: 'MEWS token type ID not configured',
          };
        }
      } else if (paymentToken === 'USDC') {
        paymentTokenType = this.config.token.usdcTokenTypeId || '';
        tokenDecimals = 6;
        if (!paymentTokenType || paymentTokenType === '') {
          return {
            success: false,
            error: 'USDC token type ID not configured',
          };
        }
      } else {
        return {
          success: false,
          error: `Invalid payment token: ${paymentToken}`,
        };
      }

      await checkPlayerTokenBalanceForPurchase({
        client: this.client,
        walletAddress: playerAddress,
        gasBudget: gasWithBuffer,
        paymentTokenType,
        paymentAmount: totalTokenAmount,
        tokenDecimals,
        context: 'pay-per-game purchase',
      });

      let paymentCoin: any = null;
      
      if (paymentToken === 'SUI') {
        const paymentAmountBigInt = BigInt(totalTokenAmount);
        paymentCoin = txb.splitCoins(txb.gas, [paymentAmountBigInt]);
      } else {
        try {
          const coins = await this.client.getCoins({
            owner: playerAddress,
            coinType: paymentTokenType,
          });
          
          if (!coins.data || coins.data.length === 0) {
            return {
              success: false,
              error: `No ${paymentToken} coins found`,
            };
          }
          
          if (coins.data.length === 1) {
            paymentCoin = txb.object(coins.data[0].coinObjectId);
          } else {
            const coinObjects = coins.data.map(coin => txb.object(coin.coinObjectId));
            const mergedCoin = txb.mergeCoins(coinObjects[0], coinObjects.slice(1));
            paymentCoin = mergedCoin;
          }
          
          const paymentAmountBigInt = BigInt(totalTokenAmount);
          paymentCoin = txb.splitCoins(paymentCoin, [paymentAmountBigInt]);
        } catch (error) {
          StoreLogger.error(`Error getting ${paymentToken} coins`, error);
          return {
            success: false,
            error: `Failed to get ${paymentToken} coins: ${error instanceof Error ? error.message : 'Unknown error'}`,
          };
        }
      }

      // Call purchase_single_game
      if (paymentToken === 'SUI') {
        txb.moveCall({
          target: `${packageId}::game_pass::purchase_single_game`,
          typeArguments: ['0x2::sui::SUI'],
          arguments: [
            txb.object(systemObjectId),
            txb.pure.u8(paymentTokenValue),
            txb.pure.u64(pricePaidUsdCents),
            paymentCoin,
            txb.object('0x6'), // Clock object
          ],
        });
      } else if (paymentToken === 'MEWS') {
        txb.moveCall({
          target: `${packageId}::game_pass::purchase_single_game`,
          typeArguments: [this.config.token.mewsTokenTypeId],
          arguments: [
            txb.object(systemObjectId),
            txb.pure.u8(paymentTokenValue),
            txb.pure.u64(pricePaidUsdCents),
            paymentCoin,
            txb.object('0x6'),
          ],
        });
      } else if (paymentToken === 'USDC') {
        txb.moveCall({
          target: `${packageId}::game_pass::purchase_single_game`,
          typeArguments: [this.config.token.usdcTokenTypeId],
          arguments: [
            txb.object(systemObjectId),
            txb.pure.u8(paymentTokenValue),
            txb.pure.u64(pricePaidUsdCents),
            paymentCoin,
            txb.object('0x6'),
          ],
        });
      }

      txb.setSender(playerAddress);
      txb.setGasBudget(gasWithBuffer);

      const transactionBytes = await txb.build({ client: this.client });

      StoreLogger.info('Purchase single game transaction built successfully', {
        gasEstimate: gasWithBuffer,
      });

      return {
        success: true,
        transaction: Buffer.from(transactionBytes).toString('base64'),
        gasEstimate: gasWithBuffer.toString(),
      };
    } catch (error) {
      StoreLogger.error('Error building purchase single game transaction', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Consume game credit (admin wallet)
   * Called when player starts a game
   * 
   * @param playerAddress - Player's wallet address
   * @returns Transaction digest
   */
  async consumeGameCredit(
    playerAddress: string
  ): Promise<{
    success: boolean;
    digest?: string;
    gamesRemaining?: number;
    error?: string;
  }> {
    StoreLogger.info('consumeGameCredit called', { playerAddress });
    
    try {
      // Validate inputs
      if (!playerAddress || !playerAddress.startsWith('0x') || playerAddress.length !== 66) {
        StoreLogger.error('Invalid player address format');
        return {
          success: false,
          error: 'Invalid player address format',
        };
      }

      const contractAddress = this.config.contracts.gamePass;
      
      if (!contractAddress || contractAddress === '' || contractAddress === '0x...') {
        return {
          success: false,
          error: 'Game pass contract not configured',
        };
      }

      // Parse package ID
      const packageId = contractAddress.includes('::') 
        ? contractAddress.split('::')[0]
        : contractAddress;

      // Get system object ID
      const systemObjectId = this.config.contracts.gamePassSystem;
      
      if (!systemObjectId || systemObjectId === '' || systemObjectId === '0x...') {
        return {
          success: false,
          error: 'Game pass system object ID not configured',
        };
      }

      // Get admin capability (reuse from premium_store)
      const adminCapabilityObjectId = this.config.contracts.premiumStoreAdminCapability;
      
      if (!adminCapabilityObjectId || adminCapabilityObjectId === '' || adminCapabilityObjectId === '0x...') {
        return {
          success: false,
          error: 'Admin capability not configured. Game pass uses premium_store AdminCapability.',
        };
      }

      // Build transaction
      const txb = new Transaction();

      // Call consume_game_credit_for_user
      // Contract signature: consume_game_credit_for_user(admin_cap, system, player, clock)
      txb.moveCall({
        target: `${packageId}::game_pass::consume_game_credit_for_user`,
        arguments: [
          txb.object(adminCapabilityObjectId),
          txb.object(systemObjectId),
          txb.pure.address(playerAddress),
          txb.object('0x6'), // Clock object
        ],
      });

      // Set sender (admin wallet)
      txb.setSender(this.adminWallet.getAddress());

      // Set gas budget
      const gasEstimate = this.config.sui.gasBudget;
      txb.setGasBudget(gasEstimate);

      // Build transaction
      const transactionBytes = await txb.build({ client: this.client });

      // Sign and execute transaction (admin wallet pays gas)
      const result = await this.client.signAndExecuteTransaction({
        signer: this.adminWallet.getKeypair(),
        transaction: transactionBytes,
        options: {
          showEffects: true,
          showEvents: true,
        },
      });

      // Extract digest from result
      const digest = result.digest;

      if (!digest) {
        return {
          success: false,
          error: 'Failed to execute transaction - no digest returned',
        };
      }

      // Wait for transaction confirmation (with reasonable timeout)
      // This ensures the transaction is confirmed before returning
      try {
        await this.client.waitForTransaction({
          digest,
          timeout: 10000, // 10 second timeout (reasonable for game start)
          pollInterval: 500, // Check every 500ms
        });
        StoreLogger.info('Credit consumption transaction confirmed', {
          playerAddress,
          digest,
        });
      } catch (waitError) {
        // If timeout occurs, log warning but don't fail - transaction may still succeed
        StoreLogger.warn('Transaction confirmation timeout (transaction may still be processing)', {
          playerAddress,
          digest,
          error: waitError instanceof Error ? waitError.message : 'Unknown error',
        });
        // Continue - transaction was submitted, just not confirmed yet
      }

      // Query updated games remaining
      const statusResult = await this.getGamePassStatus(playerAddress);
      const gamesRemaining = statusResult.gamesRemaining || 0;

      StoreLogger.info('Credit consumed successfully', {
        playerAddress,
        digest,
        gamesRemaining,
      });

      return {
        success: true,
        digest,
        gamesRemaining,
      };
    } catch (error) {
      StoreLogger.error('Error consuming game credit', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Build purchase transaction for tournament tickets
   * Creates an unsigned transaction that includes:
   * 1. Payment transfer (player pays)
   * 2. purchase_tournament_tickets() call
   * 
   * @param playerAddress - Player's wallet address
   * @param quantity - Number of tickets to purchase
   * @param paymentToken - Payment token ('SUI', 'MEWS', or 'USDC')
   * @param totalTokenAmount - Total token amount to pay (after discount)
   * @param pricePaidUsdCents - Total price in USD cents (after discount)
   * @param valuePerTicketUsdCents - Price per ticket in USD cents
   * @returns Serialized transaction bytes (base64)
   */
  async buildPurchaseTicketsTransaction(
    playerAddress: string,
    quantity: number,
    paymentToken: 'SUI' | 'MEWS' | 'USDC',
    totalTokenAmount: string,
    pricePaidUsdCents: number,
    valuePerTicketUsdCents: number
  ): Promise<{
    success: boolean;
    transaction?: string; // Serialized transaction bytes (base64)
    gasEstimate?: string;
    error?: string;
  }> {
    try {
      // Validate inputs
      if (!playerAddress || !playerAddress.startsWith('0x') || playerAddress.length !== 66) {
        return {
          success: false,
          error: 'Invalid player address format',
        };
      }

      if (quantity < 1 || quantity > 100) {
        return {
          success: false,
          error: 'Invalid ticket quantity. Must be between 1 and 100',
        };
      }

      if (!['SUI', 'MEWS', 'USDC'].includes(paymentToken)) {
        return {
          success: false,
          error: 'Invalid payment token. Must be SUI, MEWS, or USDC',
        };
      }

      const contractAddress = this.config.contracts.gamePass;
      const network = this.config.sui.network;
      
      if (!contractAddress || contractAddress === '' || contractAddress === '0x...') {
        const envVarName = network === 'testnet' 
          ? 'GAME_PASS_CONTRACT_TESTNET' 
          : network === 'mainnet'
          ? 'GAME_PASS_CONTRACT_MAINNET'
          : 'GAME_PASS_CONTRACT';
        return {
          success: false,
          error: `Game pass contract not configured. Please set ${envVarName} environment variable.`,
        };
      }

      // Parse package ID from contract address
      const packageId = contractAddress.includes('::') 
        ? contractAddress.split('::')[0]
        : contractAddress;

      // Get system object ID from config
      const systemObjectId = this.config.contracts.gamePassSystem;
      
      if (!systemObjectId || systemObjectId === '' || systemObjectId === '0x...') {
        const envVarName = network === 'testnet' 
          ? 'GAME_PASS_SYSTEM_OBJECT_ID_TESTNET' 
          : network === 'mainnet'
          ? 'GAME_PASS_SYSTEM_OBJECT_ID_MAINNET'
          : 'GAME_PASS_SYSTEM_OBJECT_ID';
        return {
          success: false,
          error: `Game pass system object ID not configured. Please set ${envVarName} environment variable.`,
        };
      }

      StoreLogger.info('Building purchase tournament tickets transaction', {
        playerAddress,
        quantity,
        paymentToken,
        totalTokenAmount,
        pricePaidUsdCents,
        valuePerTicketUsdCents,
      });

      // Get gas budget estimate first
      // Use higher gas budget for ticket purchases (they may require more storage)
      const gasEstimate = this.config.sui.gasBudget;
      const gasWithBuffer = Math.round(gasEstimate * 1.5); // Increased buffer for ticket purchases
      
      // Get token type ID and decimals based on payment token
      let paymentTokenType: string;
      let tokenDecimals: number;
      
      if (paymentToken === 'SUI') {
        paymentTokenType = 'SUI';
        tokenDecimals = 9; // SUI has 9 decimals
      } else if (paymentToken === 'MEWS') {
        paymentTokenType = this.config.token.mewsTokenTypeId || '';
        tokenDecimals = this.config.sui.network === 'testnet' ? 9 : 6;
        if (!paymentTokenType || paymentTokenType === '0x...') {
          return {
            success: false,
            error: 'MEWS token type ID not configured',
          };
        }
      } else if (paymentToken === 'USDC') {
        paymentTokenType = this.config.token.usdcTokenTypeId || '';
        tokenDecimals = 6; // USDC has 6 decimals
        if (!paymentTokenType || paymentTokenType === '') {
          return {
            success: false,
            error: 'USDC token type ID not configured',
          };
        }
      } else {
        return {
          success: false,
          error: `Invalid payment token: ${paymentToken}`,
        };
      }

      // Check player has sufficient balance
      await checkPlayerTokenBalanceForPurchase({
        client: this.client,
        walletAddress: playerAddress,
        gasBudget: gasWithBuffer,
        paymentTokenType,
        paymentAmount: totalTokenAmount,
        tokenDecimals,
        context: 'tournament ticket purchase',
      });

      // Build transaction
      const txb = new Transaction();
      
      // Get payment token type value (0=SUI, 1=MEWS, 2=USDC) for the contract call
      let paymentTokenTypeValue = 0;
      let coinType = '';
      if (paymentToken === 'SUI') {
        paymentTokenTypeValue = 0;
        coinType = '0x2::sui::SUI';
      } else if (paymentToken === 'MEWS') {
        paymentTokenTypeValue = 1;
        coinType = paymentTokenType; // Use the string token type ID we already determined
      } else if (paymentToken === 'USDC') {
        paymentTokenTypeValue = 2;
        coinType = paymentTokenType; // Use the string token type ID we already determined
      }

      // Handle payment coin preparation
      let paymentCoin: any = null;
      
      if (paymentToken === 'SUI') {
        // For SUI, split from gas coin
        const paymentAmountBigInt = BigInt(totalTokenAmount);
        paymentCoin = txb.splitCoins(txb.gas, [paymentAmountBigInt]);
      } else {
        // For MEWS/USDC, get player's coins and prepare payment
        try {
          const coins = await this.client.getCoins({
            owner: playerAddress,
            coinType: paymentTokenType,
          });
          
          if (!coins.data || coins.data.length === 0) {
            return {
              success: false,
              error: `No ${paymentToken} coins found. Please ensure you have ${paymentToken} in your wallet.`,
            };
          }
          
          // Check if any single coin has sufficient balance
          const paymentAmountBigInt = BigInt(totalTokenAmount);
          const coinWithEnoughBalance = coins.data.find(coin => BigInt(coin.balance) >= paymentAmountBigInt);
          
          let coinToSplit;
          if (coinWithEnoughBalance) {
            // Use the coin that has enough balance - no merge needed
            coinToSplit = txb.object(coinWithEnoughBalance.coinObjectId);
          } else if (coins.data.length === 1) {
            // Only one coin, but it might not have enough - try anyway (will fail at execution if insufficient)
            coinToSplit = txb.object(coins.data[0].coinObjectId);
          } else {
            // Multiple coins, none has enough alone - merge them all
            const coinObjects = coins.data.map(coin => txb.object(coin.coinObjectId));
            coinToSplit = txb.mergeCoins(coinObjects[0], coinObjects.slice(1));
          }
          
          // Split the payment amount from the coin
          paymentCoin = txb.splitCoins(coinToSplit, [paymentAmountBigInt]);
        } catch (error) {
          StoreLogger.error(`Error getting ${paymentToken} coins`, error);
          return {
            success: false,
            error: `Failed to get ${paymentToken} coins: ${error instanceof Error ? error.message : 'Unknown error'}`,
          };
        }
      }

      // Call purchase_tournament_tickets
      // Note: The contract function signature is:
      // purchase_tournament_tickets<T>(system, quantity, value_per_ticket_usd_cents, payment_token_type, total_paid_usd_cents, payment, clock, ctx)
      // The buyer is derived from ctx.sender() in the contract
      txb.moveCall({
        target: `${packageId}::game_pass::purchase_tournament_tickets`,
        typeArguments: [coinType],
        arguments: [
          txb.object(systemObjectId), // system
          txb.pure.u64(quantity), // quantity
          txb.pure.u64(valuePerTicketUsdCents), // value_per_ticket_usd_cents
          txb.pure.u8(paymentTokenTypeValue), // payment_token_type (0=SUI, 1=MEWS, 2=USDC)
          txb.pure.u64(pricePaidUsdCents), // total_paid_usd_cents
          paymentCoin, // payment
          txb.object('0x6'), // clock
        ],
      });

      // Set sender (required for building transaction, even if not signing)
      txb.setSender(playerAddress);

      // Set gas budget (use fixed estimate like item purchases, not dry run)
      // The gasWithBuffer was already calculated earlier for balance checking
      txb.setGasBudget(gasWithBuffer);

      // Build transaction (don't sign - frontend will sign)
      const transactionBytes = await txb.build({ client: this.client });

      StoreLogger.info('Purchase tournament tickets transaction built successfully', {
        gasEstimate: gasWithBuffer,
      });

      return {
        success: true,
        transaction: Buffer.from(transactionBytes).toString('base64'),
        gasEstimate: gasWithBuffer.toString(),
      };
    } catch (error) {
      StoreLogger.error('Error building purchase tournament tickets transaction', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Admin: Add free credits to player's game pass
   * Uses add_free_credits function from game_pass contract
   * 
   * @param playerAddress - Player's wallet address
   * @param amount - Number of credits to add
   * @returns Transaction digest
   */
  async adminAddCredits(
    playerAddress: string,
    amount: number
  ): Promise<{
    success: boolean;
    digest?: string;
    gamesRemaining?: number;
    error?: string;
  }> {
    try {
      if (!playerAddress || !playerAddress.startsWith('0x') || playerAddress.length !== 66) {
        return {
          success: false,
          error: 'Invalid player address format',
        };
      }

      if (typeof amount !== 'number' || amount <= 0 || !Number.isInteger(amount)) {
        return {
          success: false,
          error: 'Amount must be a positive integer',
        };
      }

      const contractAddress = this.config.contracts.gamePass;
      const systemObjectId = this.config.contracts.gamePassSystem;
      const adminCapabilityObjectId = this.config.contracts.premiumStoreAdminCapability;

      if (!contractAddress || !systemObjectId || !adminCapabilityObjectId) {
        return {
          success: false,
          error: 'Game pass contract not configured',
        };
      }

      const packageId = contractAddress.includes('::') 
        ? contractAddress.split('::')[0]
        : contractAddress;

      const txb = new Transaction();
      txb.moveCall({
        target: `${packageId}::game_pass::add_free_credits`,
        arguments: [
          txb.object(adminCapabilityObjectId),
          txb.object(systemObjectId),
          txb.pure.address(playerAddress),
          txb.pure.u64(amount),
          txb.object('0x6'), // Clock
        ],
      });

      const result = await this.client.signAndExecuteTransaction({
        signer: this.adminWallet.getKeypair(),
        transaction: txb,
        options: {
          showEffects: true,
          showEvents: true,
        },
      });

      if (result.effects?.status?.status !== 'success') {
        return {
          success: false,
          error: 'Failed to add credits',
        };
      }

      // Get updated game pass status
      const status = await this.getGamePassStatus(playerAddress);

      StoreLogger.info('Admin added credits', {
        playerAddress,
        amount,
        digest: result.digest,
        gamesRemaining: status.gamesRemaining,
      });

      return {
        success: true,
        digest: result.digest,
        gamesRemaining: status.gamesRemaining || 0,
      };
    } catch (error) {
      StoreLogger.error('Error adding credits', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Admin: Set credits to a specific amount (removes excess or adds if needed)
   * 
   * @param playerAddress - Player's wallet address
   * @param targetAmount - Target number of credits
   * @returns Transaction digest
   */
  async adminSetCredits(
    playerAddress: string,
    targetAmount: number
  ): Promise<{
    success: boolean;
    digest?: string;
    gamesRemaining?: number;
    error?: string;
  }> {
    try {
      if (!playerAddress || !playerAddress.startsWith('0x') || playerAddress.length !== 66) {
        return {
          success: false,
          error: 'Invalid player address format',
        };
      }

      if (typeof targetAmount !== 'number' || targetAmount < 0 || !Number.isInteger(targetAmount)) {
        return {
          success: false,
          error: 'Target amount must be a non-negative integer',
        };
      }

      // Get current status
      const currentStatus = await this.getGamePassStatus(playerAddress);
      if (!currentStatus.success) {
        return {
          success: false,
          error: currentStatus.error || 'Failed to get current game pass status',
        };
      }

      const currentCredits = currentStatus.gamesRemaining || 0;
      const difference = targetAmount - currentCredits;

      if (difference === 0) {
        return {
          success: true,
          gamesRemaining: targetAmount,
        };
      }

      if (difference > 0) {
        // Add credits
        return await this.adminAddCredits(playerAddress, difference);
      } else {
        // Use the new set_credits contract function (more efficient than consuming one at a time)
        return await this.adminSetCreditsDirect(playerAddress, targetAmount);
      }
    } catch (error) {
      StoreLogger.error('Error setting credits', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Admin: Set credits directly using contract function (efficient for both add and remove)
   * 
   * @param playerAddress - Player's wallet address
   * @param targetAmount - Target number of credits
   * @returns Transaction digest
   */
  async adminSetCreditsDirect(
    playerAddress: string,
    targetAmount: number
  ): Promise<{
    success: boolean;
    digest?: string;
    gamesRemaining?: number;
    error?: string;
  }> {
    try {
      if (!playerAddress || !playerAddress.startsWith('0x') || playerAddress.length !== 66) {
        return {
          success: false,
          error: 'Invalid player address format',
        };
      }

      if (typeof targetAmount !== 'number' || targetAmount < 0 || !Number.isInteger(targetAmount)) {
        return {
          success: false,
          error: 'Target amount must be a non-negative integer',
        };
      }

      const contractAddress = this.config.contracts.gamePass;
      const systemObjectId = this.config.contracts.gamePassSystem;
      const adminCapabilityObjectId = this.config.contracts.premiumStoreAdminCapability;

      if (!contractAddress || !systemObjectId || !adminCapabilityObjectId) {
        return {
          success: false,
          error: 'Game pass contract not configured',
        };
      }

      const packageId = contractAddress.includes('::') 
        ? contractAddress.split('::')[0]
        : contractAddress;

      const txb = new Transaction();
      txb.moveCall({
        target: `${packageId}::game_pass::set_credits`,
        arguments: [
          txb.object(adminCapabilityObjectId),
          txb.object(systemObjectId),
          txb.pure.address(playerAddress),
          txb.pure.u64(targetAmount),
          txb.object('0x6'), // Clock
        ],
      });

      const result = await this.client.signAndExecuteTransaction({
        signer: this.adminWallet.getKeypair(),
        transaction: txb,
        options: {
          showEffects: true,
          showEvents: true,
        },
      });

      if (result.effects?.status?.status !== 'success') {
        return {
          success: false,
          error: 'Failed to set credits',
        };
      }

      // Get updated game pass status
      const status = await this.getGamePassStatus(playerAddress);

      StoreLogger.info('Admin set credits', {
        playerAddress,
        targetAmount,
        digest: result.digest,
        gamesRemaining: status.gamesRemaining,
      });

      return {
        success: true,
        digest: result.digest,
        gamesRemaining: status.gamesRemaining || targetAmount,
      };
    } catch (error) {
      StoreLogger.error('Error setting credits', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Admin: Remove credits from player's game pass
   * Uses the new remove_credits contract function
   * 
   * @param playerAddress - Player's wallet address
   * @param amount - Number of credits to remove
   * @returns Transaction digest
   */
  async adminRemoveCredits(
    playerAddress: string,
    amount: number
  ): Promise<{
    success: boolean;
    digest?: string;
    gamesRemaining?: number;
    error?: string;
  }> {
    try {
      if (!playerAddress || !playerAddress.startsWith('0x') || playerAddress.length !== 66) {
        return {
          success: false,
          error: 'Invalid player address format',
        };
      }

      if (typeof amount !== 'number' || amount <= 0 || !Number.isInteger(amount)) {
        return {
          success: false,
          error: 'Amount must be a positive integer',
        };
      }

      const contractAddress = this.config.contracts.gamePass;
      const systemObjectId = this.config.contracts.gamePassSystem;
      const adminCapabilityObjectId = this.config.contracts.premiumStoreAdminCapability;

      if (!contractAddress || !systemObjectId || !adminCapabilityObjectId) {
        return {
          success: false,
          error: 'Game pass contract not configured',
        };
      }

      const packageId = contractAddress.includes('::') 
        ? contractAddress.split('::')[0]
        : contractAddress;

      const txb = new Transaction();
      txb.moveCall({
        target: `${packageId}::game_pass::remove_credits`,
        arguments: [
          txb.object(adminCapabilityObjectId),
          txb.object(systemObjectId),
          txb.pure.address(playerAddress),
          txb.pure.u64(amount),
          txb.object('0x6'), // Clock
        ],
      });

      const result = await this.client.signAndExecuteTransaction({
        signer: this.adminWallet.getKeypair(),
        transaction: txb,
        options: {
          showEffects: true,
          showEvents: true,
        },
      });

      if (result.effects?.status?.status !== 'success') {
        return {
          success: false,
          error: 'Failed to remove credits',
        };
      }

      // Get updated game pass status
      const status = await this.getGamePassStatus(playerAddress);

      StoreLogger.info('Admin removed credits', {
        playerAddress,
        amount,
        digest: result.digest,
        gamesRemaining: status.gamesRemaining,
      });

      return {
        success: true,
        digest: result.digest,
        gamesRemaining: status.gamesRemaining || 0,
      };
    } catch (error) {
      StoreLogger.error('Error removing credits', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Export singleton instance
let gamePassServiceInstance: GamePassService | null = null;

export function getGamePassService(): GamePassService {
  if (!gamePassServiceInstance) {
    gamePassServiceInstance = new GamePassService();
  }
  return gamePassServiceInstance;
}

export const gamePassService = getGamePassService();

