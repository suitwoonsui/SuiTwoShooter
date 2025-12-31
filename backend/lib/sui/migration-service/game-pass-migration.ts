// Game pass migration service for transferring game passes from old GamePassSystem to new GamePassSystem
import { Transaction } from '@mysten/sui/transactions';
import { AdminWalletService } from '../admin-wallet-service';
import { getConfig } from '@/config/config';
import { MigrationLogger } from '../migration-logger';

export class GamePassMigrationService {
  private adminWallet: AdminWalletService;
  private config: ReturnType<typeof getConfig>;

  constructor(adminWallet: AdminWalletService) {
    this.adminWallet = adminWallet;
    this.config = getConfig();
  }

  /**
   * Read game pass from old GamePassSystem
   */
  /**
   * Read all tournament tickets from old GamePass
   * Returns ticket details including ticket_id, value_paid_usd_cents, and purchased_at
   */
  async readOldTickets(
    oldPackageId: string,
    oldGamePassSystemId: string,
    playerAddress: string,
    maxNextTicketId: number
  ): Promise<{
    success: boolean;
    tickets?: Array<{
      ticket_id: number;
      value_paid_usd_cents: number;
      purchased_at: number;
    }>;
    error?: string;
  }> {
    try {
      const network = this.config.sui.network;
      const client = network === 'testnet' 
        ? this.adminWallet.getTestnetClient()
        : this.adminWallet.getMainnetClient();

      MigrationLogger.info(`🔍 [READ OLD TICKETS] Reading tickets from old GamePass for ${playerAddress}`, {
        playerAddress,
        oldPackageId,
        oldGamePassSystemId,
        maxNextTicketId,
      });

      // First, get the old GamePass object
      const dynamicFieldName = {
        type: 'address',
        value: playerAddress,
      };

      const dynamicField = await client.getDynamicFieldObject({
        parentId: oldGamePassSystemId,
        name: dynamicFieldName,
      });

      if (dynamicField.error || !dynamicField.data) {
        return {
          success: false,
          error: 'No game pass found in old system',
        };
      }

      const gamePassObjectId = dynamicField.data.objectId;
      
      // Get the GamePass object to access tournament_tickets table
      const gamePassObj = await client.getObject({
        id: gamePassObjectId,
        options: { showContent: true },
      });

      if (gamePassObj.error || !gamePassObj.data?.content) {
        return {
          success: false,
          error: 'Failed to read game pass object',
        };
      }

      const fields = (gamePassObj.data.content as any).fields;
      
      // The tournament_tickets is a Table, which we can't directly query
      // Instead, we need to use devInspectTransactionBlock to check each ticket
      // But we can also try to get dynamic fields if the table uses them
      // For now, let's use devInspectTransactionBlock with get_ticket_info if available
      // Otherwise, we'll check has_tournament_ticket and try to get details

      const tickets: Array<{ ticket_id: number; value_paid_usd_cents: number; purchased_at: number }> = [];
      const maxTicketIdToCheck = Math.min(Math.max(maxNextTicketId + 10, 20), 100);

      for (let ticketId = 1; ticketId <= maxTicketIdToCheck; ticketId++) {
        try {
          const { Transaction } = await import('@mysten/sui/transactions');
          const tx = new Transaction();
          
          // Try to get ticket info using devInspectTransactionBlock
          // First check if ticket exists
          tx.moveCall({
            target: `${oldPackageId}::game_pass::has_tournament_ticket`,
            arguments: [
              tx.object(oldGamePassSystemId),
              tx.pure.address(playerAddress),
              tx.pure.u64(ticketId),
            ],
          });

          const hasTicketResult = await client.devInspectTransactionBlock({
            sender: this.adminWallet.getAddress(),
            transactionBlock: tx,
          });

          if (hasTicketResult.results && hasTicketResult.results[0]?.returnValues?.[0]) {
            const returnValue = hasTicketResult.results[0].returnValues[0];
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
              // Ticket exists - try to read its details
              // First, try using get_ticket_info view function (if old contract has it)
              let ticketValue = 0;
              let ticketPurchasedAt = 0;
              let extractedViaViewFunction = false;
              
              try {
                const { Transaction } = await import('@mysten/sui/transactions');
                const infoTx = new Transaction();
                infoTx.moveCall({
                  target: `${oldPackageId}::game_pass::get_ticket_info`,
                  arguments: [
                    infoTx.object(oldGamePassSystemId),
                    infoTx.pure.address(playerAddress),
                    infoTx.pure.u64(ticketId),
                  ],
                });

                const infoResult = await client.devInspectTransactionBlock({
                  sender: this.adminWallet.getAddress(),
                  transactionBlock: infoTx,
                });

                if (infoResult.results && infoResult.results[0]?.returnValues) {
                  const returnValues = infoResult.results[0].returnValues;
                  // get_ticket_info returns (ticket_id, value_paid_usd_cents, purchased_at)
                  if (returnValues.length >= 3) {
                    // Return values are in format [bytes, type] where bytes is the actual byte array
                    // Extract the byte arrays from the tuples
                    const extractBytes = (tuple: any): number[] => {
                      if (Array.isArray(tuple) && tuple.length >= 1) {
                        // If it's a tuple [bytes, type], extract the bytes (first element)
                        if (Array.isArray(tuple[0])) {
                          return tuple[0];
                        }
                        // If it's already just the bytes array
                        return tuple;
                      }
                      return [];
                    };

                    // Convert BCS bytes to numbers
                    const bytesToU64 = (tuple: any): number => {
                      // Handle tuple format [bytes, type]
                      const byteArray = extractBytes(tuple);
                      
                      if (typeof tuple === 'number') return tuple;
                      if (typeof tuple === 'string') return Number(tuple);
                      if (Array.isArray(byteArray) && byteArray.length > 0) {
                        let value = 0;
                        for (let i = 0; i < Math.min(byteArray.length, 8); i++) {
                          value += byteArray[i] * Math.pow(256, i);
                        }
                        return value;
                      }
                      return 0;
                    };
                    
                    ticketValue = bytesToU64(returnValues[1]);
                    ticketPurchasedAt = bytesToU64(returnValues[2]);
                    extractedViaViewFunction = true;
                    
                    MigrationLogger.info(`✅ [OLD TICKET ${ticketId}] Extracted via get_ticket_info`, {
                      ticketId,
                      valueUsdCents: ticketValue,
                      purchasedAt: ticketPurchasedAt,
                      rawReturnValues: returnValues,
                    });
                  }
                }
              } catch (error) {
                MigrationLogger.debug(`[OLD TICKET ${ticketId}] get_ticket_info not available or failed, trying direct field read`, {
                  error: error instanceof Error ? error.message : String(error),
                });
              }
              
              // If view function didn't work, try reading directly from table
              if (!extractedViaViewFunction) {
                try {
                  const gamePassFields = (gamePassObj.data.content as any).fields;
                  const ticketsTable = gamePassFields?.tournament_tickets;
                  
                  if (ticketsTable && ticketsTable.fields && ticketsTable.fields.id) {
                    const tableObjectId = ticketsTable.fields.id.id || ticketsTable.fields.id;
                    
                    // Try to get the dynamic field for this ticket ID
                    const ticketFieldName = {
                      type: 'u64',
                      value: ticketId,
                    };
                    
                    try {
                      const ticketFieldObj = await client.getDynamicFieldObject({
                        parentId: tableObjectId,
                        name: ticketFieldName,
                      });
                    
                    if (ticketFieldObj.data && 'content' in ticketFieldObj.data) {
                      const content = ticketFieldObj.data.content as any;
                      
                      // Log the raw structure for debugging
                      MigrationLogger.debug(`[OLD TICKET ${ticketId}] Raw ticket field object structure`, {
                        ticketId,
                        hasContent: !!content,
                        contentType: typeof content,
                        contentKeys: content ? Object.keys(content) : [],
                        fullContent: JSON.stringify(content, null, 2),
                      });
                      
                      let fields: any = null;
                      
                      // Try different possible structures
                      if (content && typeof content === 'object') {
                        // Check for direct fields
                        if (content.fields) {
                          MigrationLogger.debug(`[OLD TICKET ${ticketId}] Found content.fields`, {
                            fieldKeys: Object.keys(content.fields),
                            fields: content.fields,
                          });
                          
                          // Check for value_paid_usd_cents or alternative names
                          if (content.fields.value_paid_usd_cents !== undefined || 
                              content.fields.value_paid_usd !== undefined ||
                              content.fields.purchased_at !== undefined) {
                            fields = content.fields;
                          } else if (content.fields.value) {
                            const valueField = content.fields.value;
                            MigrationLogger.debug(`[OLD TICKET ${ticketId}] Found content.fields.value`, {
                              valueFieldType: typeof valueField,
                              valueFieldKeys: valueField && typeof valueField === 'object' ? Object.keys(valueField) : [],
                              valueField: valueField,
                            });
                            
                            if (valueField.fields) {
                              fields = valueField.fields;
                            } else if (valueField.value_paid_usd_cents !== undefined || 
                                      valueField.value_paid_usd !== undefined) {
                              fields = valueField;
                            }
                          }
                        } else if (content.value) {
                          MigrationLogger.debug(`[OLD TICKET ${ticketId}] Found content.value`, {
                            valueType: typeof content.value,
                            valueKeys: content.value && typeof content.value === 'object' ? Object.keys(content.value) : [],
                            value: content.value,
                          });
                          
                          if (content.value.fields) {
                            fields = content.value.fields;
                          } else if (content.value.value_paid_usd_cents !== undefined || 
                                    content.value.value_paid_usd !== undefined) {
                            fields = content.value;
                          }
                        } else if (content.value_paid_usd_cents !== undefined || 
                                  content.value_paid_usd !== undefined ||
                                  content.purchased_at !== undefined) {
                          fields = content;
                        }
                      }
                      
                      if (fields) {
                        MigrationLogger.debug(`[OLD TICKET ${ticketId}] Extracted fields`, {
                          ticketId,
                          fieldKeys: Object.keys(fields),
                          allFields: fields,
                        });
                        
                        // Try multiple possible field names for value
                        const valuePaidUsdCents = Number(
                          fields.value_paid_usd_cents || 
                          fields.valuePaidUsdCents ||
                          fields.value_paid_usd ||
                          fields.valuePaidUsd ||
                          fields.value ||
                          0
                        );
                        
                        const purchasedAt = Number(
                          fields.purchased_at || 
                          fields.purchasedAt || 
                          fields.purchased_at_timestamp ||
                          0
                        );
                        
                        MigrationLogger.debug(`[OLD TICKET ${ticketId}] Parsed values`, {
                          ticketId,
                          valuePaidUsdCents,
                          purchasedAt,
                          rawValueField: fields.value_paid_usd_cents || fields.value_paid_usd || fields.value,
                          rawPurchasedAtField: fields.purchased_at || fields.purchasedAt,
                        });
                        
                        ticketValue = valuePaidUsdCents;
                        ticketPurchasedAt = purchasedAt;
                        extractedViaViewFunction = true;
                        
                        MigrationLogger.info(`✅ [OLD TICKET ${ticketId}] Extracted via direct field read`, {
                          ticketId,
                          valueUsdCents: ticketValue,
                          purchasedAt: ticketPurchasedAt,
                        });
                      } else {
                        MigrationLogger.warn(`[OLD TICKET ${ticketId}] Could not extract fields from ticket object`, {
                          ticketId,
                          contentStructure: content ? Object.keys(content) : [],
                        });
                      }
                    }
                    } catch (error) {
                      MigrationLogger.debug(`Could not read ticket ${ticketId} details from table`, { error });
                    }
                  }
                } catch (error) {
                  MigrationLogger.debug(`Error reading ticket ${ticketId} details`, { error });
                }
              }
              
              // Add ticket with extracted values (or 0 if extraction failed)
              tickets.push({
                ticket_id: ticketId,
                value_paid_usd_cents: ticketValue,
                purchased_at: ticketPurchasedAt,
              });
              
              if (!extractedViaViewFunction && ticketValue === 0) {
                MigrationLogger.warn(`⚠️ [OLD TICKET ${ticketId}] Could not extract value - defaulting to $0.00`, {
                  ticketId,
                  note: 'Old contract may not have stored ticket values, or field extraction failed',
                });
              }
            }
          }
        } catch (error) {
          // Continue checking other tickets
          MigrationLogger.debug(`Error checking ticket ${ticketId}`, { error });
        }
      }

      MigrationLogger.info(`✅ [READ OLD TICKETS] Found ${tickets.length} tickets in old GamePass`, {
        playerAddress,
        ticketCount: tickets.length,
        tickets: tickets.map(t => ({
          ticketId: t.ticket_id,
          valueUsdCents: t.value_paid_usd_cents,
          purchasedAt: t.purchased_at,
        })),
        note: tickets.length > 0 && tickets.every(t => t.value_paid_usd_cents === 0)
          ? '⚠️ All tickets have $0.00 value - old contract may not have stored values'
          : 'Ticket values extracted successfully',
      });
      
      return {
        success: true,
        tickets,
      };
    } catch (error) {
      MigrationLogger.error('Error reading old tickets', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Count actual tournament tickets in old GamePass
   * Uses devInspectTransactionBlock to query which tickets exist
   */
  async countOldTickets(
    oldPackageId: string,
    oldGamePassSystemId: string,
    playerAddress: string,
    maxNextTicketId: number
  ): Promise<{
    success: boolean;
    ticketCount?: number;
    error?: string;
  }> {
    try {
      const network = this.config.sui.network;
      const client = network === 'testnet' 
        ? this.adminWallet.getTestnetClient()
        : this.adminWallet.getMainnetClient();

      MigrationLogger.debug(`Counting tickets from old GamePass for ${playerAddress}`);

      let ticketCount = 0;
      // Check up to maxNextTicketId + 10 to account for consumed tickets
      const maxTicketIdToCheck = Math.min(Math.max(maxNextTicketId + 10, 20), 100);

      for (let ticketId = 1; ticketId <= maxTicketIdToCheck; ticketId++) {
        try {
          const { Transaction } = await import('@mysten/sui/transactions');
          const tx = new Transaction();
          tx.moveCall({
            target: `${oldPackageId}::game_pass::has_tournament_ticket`,
            arguments: [
              tx.object(oldGamePassSystemId),
              tx.pure.address(playerAddress),
              tx.pure.u64(ticketId),
            ],
          });

          const result = await client.devInspectTransactionBlock({
            sender: this.adminWallet.getAddress(),
            transactionBlock: tx,
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
              ticketCount++;
            }
          }
        } catch (error) {
          // Continue checking other tickets
          MigrationLogger.debug(`Error checking ticket ${ticketId}`, { error });
        }
      }

      MigrationLogger.debug(`Found ${ticketCount} tickets in old GamePass`);
      return {
        success: true,
        ticketCount,
      };
    } catch (error) {
      MigrationLogger.error('Error counting old tickets', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async readOldGamePass(
    oldPackageId: string,
    oldGamePassSystemId: string,
    playerAddress: string
  ): Promise<{
    success: boolean;
    gamePass?: {
      games_remaining: number;
      pack_type: number;
      purchased_at: number;
      is_active: boolean;
      next_ticket_id: number;
      ticket_count?: number; // Actual ticket count (if we can count them)
    };
    error?: string;
  }> {
    try {
      const network = this.config.sui.network;
      const client = network === 'testnet' 
        ? this.adminWallet.getTestnetClient()
        : this.adminWallet.getMainnetClient();

      MigrationLogger.debug(`Reading old game pass for ${playerAddress}`);

      // Query the GamePass object from the old GamePassSystem using dynamic fields
      const dynamicFieldName = {
        type: 'address',
        value: playerAddress,
      };

      try {
        const dynamicField = await client.getDynamicFieldObject({
          parentId: oldGamePassSystemId,
          name: dynamicFieldName,
        });

        if (dynamicField.error || !dynamicField.data) {
          return {
            success: false,
            error: 'No game pass found in old system',
          };
        }

        const gamePassObjectId = dynamicField.data.objectId;
        const gamePassObj = await client.getObject({
          id: gamePassObjectId,
          options: { showContent: true },
        });

        if (gamePassObj.error || !gamePassObj.data?.content) {
          return {
            success: false,
            error: 'Failed to read game pass object',
          };
        }

        const fields = (gamePassObj.data.content as any).fields;
        
        return {
          success: true,
          gamePass: {
            games_remaining: Number(fields.games_remaining || 0),
            pack_type: Number(fields.pack_type || 1),
            purchased_at: Number(fields.purchased_at || 0),
            is_active: fields.is_active || false,
            next_ticket_id: Number(fields.next_ticket_id || 0),
          },
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        MigrationLogger.debug('Error reading old game pass', { errorMessage });
        return {
          success: false,
          error: errorMessage,
        };
      }
    } catch (error) {
      MigrationLogger.error('Error reading old game pass', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get all wallets with game passes in old system
   */
  async getAllWalletsWithGamePasses(
    oldPackageId: string,
    oldGamePassSystemId: string
  ): Promise<{
    success: boolean;
    wallets?: string[];
    error?: string;
  }> {
    try {
      const network = this.config.sui.network;
      const client = network === 'testnet' 
        ? this.adminWallet.getTestnetClient()
        : this.adminWallet.getMainnetClient();

      MigrationLogger.debug('Fetching all wallets with game passes from old system');

      const allFields = await client.getDynamicFields({
        parentId: oldGamePassSystemId,
      });

      const wallets: string[] = [];
      const fields = allFields.data || [];
      for (const field of fields) {
        if (field.name?.type === 'address' && field.name?.value) {
          wallets.push(String(field.name.value));
        }
      }

      MigrationLogger.debug(`Found ${wallets.length} wallets with game passes`);

      return {
        success: true,
        wallets,
      };
    } catch (error) {
      MigrationLogger.error('Error fetching wallets with game passes', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Migrate player game pass from old GamePassSystem to new GamePassSystem
   */
  async migrateGamePass(
    playerAddress: string,
    oldPackageId: string,
    oldGamePassSystemId: string
  ): Promise<{
    success: boolean;
    digest?: string;
    error?: string;
  }> {
    try {
      // 1. Read game pass from old system
      MigrationLogger.debug(`Reading game pass from old system for ${playerAddress}`);
      const oldGamePass = await this.readOldGamePass(oldPackageId, oldGamePassSystemId, playerAddress);
      
      if (!oldGamePass.success || !oldGamePass.gamePass) {
        return {
          success: false,
          error: oldGamePass.error || 'Failed to read old game pass',
        };
      }

      const gamePass = oldGamePass.gamePass;
      MigrationLogger.debug('Old game pass', gamePass);

      // Check if there are any games to migrate
      if (gamePass.games_remaining === 0 && !gamePass.is_active) {
        return {
          success: false,
          error: 'No active game pass to migrate',
        };
      }

      // Read actual tickets from old system (to get ticket IDs and details)
      MigrationLogger.info('🔍 [MIGRATION] Reading actual tickets from old GamePass', {
        playerAddress,
        nextTicketId: gamePass.next_ticket_id,
        oldPackageId,
      });
      
      const ticketsResult = await this.readOldTickets(
        oldPackageId,
        oldGamePassSystemId,
        playerAddress,
        gamePass.next_ticket_id
      );
      
      if (!ticketsResult.success) {
        MigrationLogger.warn('⚠️ [MIGRATION] Failed to read old tickets', {
          error: ticketsResult.error,
          playerAddress,
        });
      }
      
      const oldTickets = ticketsResult.success && ticketsResult.tickets
        ? ticketsResult.tickets
        : [];
      
      const actualTicketCount = oldTickets.length;
      
      MigrationLogger.info('📊 [MIGRATION] Ticket information from old system', {
        playerAddress,
        actualCount: actualTicketCount,
        nextTicketId: gamePass.next_ticket_id,
        ticketIds: oldTickets.map(t => t.ticket_id),
        ticketDetails: oldTickets.map(t => ({
          ticketId: t.ticket_id,
          valueUsdCents: t.value_paid_usd_cents,
          purchasedAt: t.purchased_at,
        })),
        note: 'If all values are 0, the old contract may not have stored ticket values',
      });

      // 2. Get new system configuration
      const newPackageId = this.config.contracts.gamePass.includes('::')
        ? this.config.contracts.gamePass.split('::')[0]
        : this.config.contracts.gamePass;
      const newGamePassSystemId = this.config.contracts.gamePassSystem;
      // Game pass uses premium_store::AdminCapability, not score_submission::AdminCapability
      const adminCapabilityObjectId = this.config.contracts.premiumStoreAdminCapability;

      if (!newGamePassSystemId || !adminCapabilityObjectId || adminCapabilityObjectId === '') {
        return {
          success: false,
          error: `New game pass system not configured. Missing: ${!newGamePassSystemId ? 'GAME_PASS_SYSTEM_OBJECT_ID_TESTNET' : ''} ${!adminCapabilityObjectId || adminCapabilityObjectId === '' ? 'PREMIUM_STORE_ADMIN_CAPABILITY_OBJECT_ID_TESTNET' : ''}`,
        };
      }

      // Get network and client for verification and transaction
      const network = this.config.sui.network;
      const client = network === 'testnet' 
        ? this.adminWallet.getTestnetClient()
        : this.adminWallet.getMainnetClient();

      // Verify the admin capability object exists with retry logic for rate limiting
      let adminCapObject;
      let retries = 3;
      let lastError: Error | null = null;
      
      while (retries > 0) {
        try {
          adminCapObject = await client.getObject({
            id: adminCapabilityObjectId,
            options: { showType: true },
          });
          break; // Success, exit retry loop
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          const errorMessage = lastError.message;
          
          // Check for rate limiting (429) or other retryable errors
          if (errorMessage.includes('429') || errorMessage.includes('rate limit') || 
              errorMessage.includes('Unexpected status code: 429') ||
              errorMessage.includes('503') || errorMessage.includes('Service Unavailable')) {
            retries--;
            if (retries > 0) {
              // Exponential backoff: wait 1s, 2s, 4s
              const waitTime = Math.pow(2, 3 - retries) * 1000;
              MigrationLogger.warn(`Rate limited (429/503) verifying admin capability, retrying in ${waitTime}ms... (${retries} attempts remaining)`);
              await new Promise(resolve => setTimeout(resolve, waitTime));
              continue;
            }
          }
          
          // Not a retryable error or out of retries - throw
          throw lastError;
        }
      }
      
      if (!adminCapObject) {
        const errorMessage = lastError instanceof Error ? lastError.message : 'Unknown error';
        MigrationLogger.error('Could not verify admin capability object after retries', { errorMessage });
        return {
          success: false,
          error: `Failed to verify admin capability object: ${errorMessage}. Please check that PREMIUM_STORE_ADMIN_CAPABILITY_OBJECT_ID_TESTNET is correct.`,
        };
      }

      if (adminCapObject.error) {
        MigrationLogger.error(`Admin capability object not found: ${adminCapabilityObjectId}`);
        return {
          success: false,
          error: `Admin capability object not found: ${adminCapabilityObjectId}. Please verify PREMIUM_STORE_ADMIN_CAPABILITY_OBJECT_ID_TESTNET is correct.`,
        };
      }

      const objectType = adminCapObject.data?.type || 'unknown';
      const owner = adminCapObject.data?.owner;
      
      // Extract package ID from admin capability type
      const adminCapPackageId = objectType.split('::')[0];
      
      MigrationLogger.debug('Admin capability verification', {
        objectType,
        adminCapPackageId,
        newPackageId,
        owner: JSON.stringify(owner),
        adminWalletAddress: this.adminWallet.getAddress()
      });
      
      // Verify it's the correct type (premium_store::AdminCapability - game pass uses premium_store admin capability)
      if (!objectType.includes('premium_store::AdminCapability')) {
        return {
          success: false,
          error: `Wrong admin capability type! The object at ${adminCapabilityObjectId} is of type ${objectType}, but expected premium_store::AdminCapability. Please use the premium_store admin capability.`,
        };
      }

      // CRITICAL: Verify the admin capability is from the same package as the new game pass system
      if (adminCapPackageId !== newPackageId) {
        return {
          success: false,
          error: `Package ID mismatch! The admin capability is from package ${adminCapPackageId}, but the new game pass system is from package ${newPackageId}. They must match. Please ensure GAME_PASS_CONTRACT_TESTNET matches the package that created the admin capability, or use an admin capability from the correct package.`,
        };
      }

      // 3. Build migration transaction
      MigrationLogger.transaction('Building game pass migration transaction');
      const { Transaction } = await import('@mysten/sui/transactions');
      const txb = new Transaction();

      // Set sender first (required for transaction building)
      txb.setSender(this.adminWallet.getAddress());
      MigrationLogger.debug('Transaction sender set', { sender: this.adminWallet.getAddress() });

      // Log the function target and arguments before building
      const functionTarget = `${newPackageId}::game_pass::migrate_game_pass`;
      const moveCallArgs = {
        target: functionTarget,
        arguments: {
          arg0_adminCap: {
            type: 'object',
            id: adminCapabilityObjectId,
          },
          arg1_newSystem: {
            type: 'object',
            id: newGamePassSystemId,
            fromPackage: newPackageId,
          },
          arg2_player: {
            type: 'address',
            value: playerAddress,
          },
          arg3_clock: {
            type: 'object',
            id: '0x6',
          },
          arg4_oldGamePass: {
            type: 'individual values',
            note: 'Passing individual game pass values to avoid cross-package type issues',
            values: {
              games_remaining: gamePass.games_remaining,
              pack_type: gamePass.pack_type,
              purchased_at: gamePass.purchased_at,
              is_active: gamePass.is_active,
              next_ticket_id: gamePass.next_ticket_id,
              old_ticket_count: actualTicketCount,
              note: 'This value may be 0 if we will create individual tickets to avoid double-counting',
            },
          },
        },
      };
      
      console.log('[MIGRATION DEBUG] Preparing game pass moveCall:', JSON.stringify(moveCallArgs, null, 2));
      MigrationLogger.debug('Preparing game pass moveCall', moveCallArgs);

      // Build the transaction
      // Pass individual game pass values instead of old system object to avoid cross-package type issues
      // IMPORTANT: If we're going to create individual tickets after migration, pass 0 for old_ticket_count
      // to avoid double-counting. The ticket creation will properly increment ticket_count.
      // Only add old_ticket_count if we're NOT creating individual tickets (e.g., can't read old tickets).
      const willCreateIndividualTickets = actualTicketCount > 0 && oldTickets.length > 0;
      const ticketCountToAdd = willCreateIndividualTickets ? 0 : actualTicketCount;
      
      MigrationLogger.debug('Ticket count handling', {
        playerAddress,
        actualTicketCount,
        oldTicketsLength: oldTickets.length,
        willCreateIndividualTickets,
        ticketCountToAdd,
        note: willCreateIndividualTickets 
          ? 'Passing 0 for old_ticket_count because we will create individual tickets (which increment count)'
          : 'Adding old_ticket_count because we cannot create individual tickets',
      });

      txb.moveCall({
        target: functionTarget,
        arguments: [
          txb.object(adminCapabilityObjectId),
          txb.object(newGamePassSystemId), // New system (mutable)
          txb.pure.address(playerAddress),
          txb.object('0x6'), // Clock object
          // Old game pass values (read from old system by backend)
          txb.pure.u64(gamePass.games_remaining),
          txb.pure.u8(gamePass.pack_type),
          txb.pure.u64(gamePass.purchased_at),
          txb.pure.bool(gamePass.is_active),
          txb.pure.u64(gamePass.next_ticket_id),
          txb.pure.u64(ticketCountToAdd), // Only add count if NOT creating individual tickets
        ],
      });

      MigrationLogger.debug('Game pass moveCall added to transaction');

      txb.setGasBudget(this.config.sui.gasBudget);

      // Check wallet balance before building transaction
      const { checkBalanceBeforeTransaction } = await import('../balance-checker');
      await checkBalanceBeforeTransaction({
        client,
        walletAddress: this.adminWallet.getAddress(),
        gasBudget: this.config.sui.gasBudget,
        context: 'migrate game pass',
      });

      // 4. Sign and execute with admin wallet
      MigrationLogger.transaction('Signing and executing game pass migration transaction');

      const result = await client.signAndExecuteTransaction({
        signer: this.adminWallet.getKeypair(),
        transaction: txb,
        options: {
          showEffects: true,
          showEvents: true,
        },
      });

      if (result.effects?.status?.status === 'success') {
        MigrationLogger.transaction('Game pass migrated successfully', {
          digest: result.digest
        });

        // 5. Create individual tickets in new system if there are any
        // IMPORTANT: Rebuild transaction after migration to get fresh object versions
        // NOTE: We passed 0 for old_ticket_count in the migration call to avoid double-counting.
        // The ticket creation below will properly increment ticket_count for each ticket.
        if (actualTicketCount > 0 && oldTickets.length > 0) {
          MigrationLogger.debug('Creating individual tickets in new system', {
            ticketCount: actualTicketCount,
            note: 'ticket_count was NOT added during migration to avoid double-counting. Creating tickets will increment count properly.',
          });

          // Wait a moment for the migration transaction to be fully processed
          // This ensures the GamePassSystem object version is updated
          await new Promise(resolve => setTimeout(resolve, 1500));

          // Log what we read from old system
          MigrationLogger.debug('Old tickets read from previous contract', {
            playerAddress,
            ticketCount: oldTickets.length,
            tickets: oldTickets.map(t => ({
              ticket_id: t.ticket_id,
              value_paid_usd_cents: t.value_paid_usd_cents,
              purchased_at: t.purchased_at,
            })),
            note: 'If all values are 0, the old contract may not have stored ticket values, or field extraction failed',
          });
          
          // Group tickets by value to preserve exact 1-to-1 ticket values
          // admin_add_tickets creates all tickets with the same value, so we need separate calls per value group
          const ticketsByValue = new Map<number, number>(); // value -> count
          
          for (const ticket of oldTickets) {
            const value = ticket.value_paid_usd_cents;
            ticketsByValue.set(value, (ticketsByValue.get(value) || 0) + 1);
          }
          
          MigrationLogger.debug('Grouping tickets by value for 1-to-1 migration', {
            totalTickets: oldTickets.length,
            valueGroups: Array.from(ticketsByValue.entries()).map(([value, count]) => ({
              valueUsdCents: value,
              count,
            })),
            originalTickets: oldTickets.map(t => ({
              ticketId: t.ticket_id,
              valueUsdCents: t.value_paid_usd_cents,
              purchasedAt: t.purchased_at,
            })),
          });
          
          // Create tickets in batches, one batch per unique value
          // This preserves the exact value for each ticket (1-to-1 migration)
          for (const [valueUsdCents, count] of ticketsByValue.entries()) {
            const batchTxb = new Transaction();
            batchTxb.setSender(this.adminWallet.getAddress());
            
            MigrationLogger.debug(`Creating batch of ${count} tickets with value ${valueUsdCents} USD cents`);
            
            batchTxb.moveCall({
              target: `${newPackageId}::game_pass::admin_add_tickets`,
              arguments: [
                batchTxb.object(adminCapabilityObjectId),
                batchTxb.object(newGamePassSystemId),
                batchTxb.pure.address(playerAddress),
                batchTxb.pure.u64(count), // Quantity for this value group
                batchTxb.pure.u64(valueUsdCents), // Exact value for this group
                batchTxb.object('0x6'), // Clock
              ],
            });
            
            // Set gas budget for this batch
            const batchGasMultiplier = Math.min(Math.max(2, Math.ceil(count / 2)), 10);
            const batchGasBudget = this.config.sui.gasBudget * batchGasMultiplier;
            batchTxb.setGasBudget(batchGasBudget);
            
            // Check wallet balance
            await checkBalanceBeforeTransaction({
              client,
              walletAddress: this.adminWallet.getAddress(),
              gasBudget: batchGasBudget,
              context: `create ${count} tickets with value ${valueUsdCents}`,
            });
            
            // Build transaction to get latest object versions
            await batchTxb.build({ client });
            
            try {
              const batchResult = await client.signAndExecuteTransaction({
                signer: this.adminWallet.getKeypair(),
                transaction: batchTxb,
                options: {
                  showEffects: true,
                  showEvents: true,
                },
              });
              
              if (batchResult.effects?.status?.status === 'success') {
                MigrationLogger.transaction(`Created batch of ${count} tickets with value ${valueUsdCents} USD cents`, {
                  digest: batchResult.digest,
                  count,
                  valueUsdCents,
                });
              } else {
                const batchError = batchResult.effects?.status?.error || 'Unknown error';
                MigrationLogger.error(`Failed to create batch of ${count} tickets with value ${valueUsdCents}`, batchError);
                throw new Error(`Failed to create ticket batch: ${batchError}`);
              }
              
              // Wait a bit between batches to avoid object version conflicts
              if (ticketsByValue.size > 1) {
                await new Promise(resolve => setTimeout(resolve, 1000));
              }
            } catch (error) {
              MigrationLogger.error(`Error creating batch of ${count} tickets with value ${valueUsdCents}`, error);
              throw error; // Fail the entire migration if a batch fails
            }
          }
          
          MigrationLogger.debug('All ticket batches created successfully', {
            totalBatches: ticketsByValue.size,
            totalTickets: actualTicketCount,
          });
        }

        return {
          success: true,
          digest: result.digest,
        };
      } else {
        const error = result.effects?.status?.error || 'Unknown error';
        MigrationLogger.error('Game pass migration failed', error);
        return {
          success: false,
          error: `Migration failed: ${error}`,
        };
      }
    } catch (error) {
      MigrationLogger.error('Error migrating game pass', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

