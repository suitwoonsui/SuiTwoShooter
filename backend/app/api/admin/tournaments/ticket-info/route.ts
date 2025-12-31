// ==========================================
// Admin API - Get Tournament Ticket Information
// ==========================================

import { NextRequest } from 'next/server';
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';
import { getGamePassService } from '@/lib/sui/game-pass-service';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { getConfig } from '@/config/config';

export const POST = withApiHandler(
  async (request: NextRequest) => {
    const body = await getRequestBody<{
      playerAddress?: string;
      ticketId?: number;
    }>(request);

    const { playerAddress, ticketId } = body;

    // Either playerAddress or ticketId must be provided
    if (!playerAddress && (ticketId === undefined || ticketId === null)) {
      throw new Error('Either player address or ticket ID is required');
    }

    const config = getConfig();
    const gamePassService = getGamePassService();
    const contractAddress = config.contracts.gamePass;
    const systemObjectId = config.contracts.gamePassSystem;

    if (!contractAddress || !systemObjectId) {
      throw new Error('Game pass contract not configured');
    }

    const packageId = contractAddress.includes('::') 
      ? contractAddress.split('::')[0]
      : contractAddress;

    // If ticketId is provided, search for the ticket owner
    if (ticketId !== undefined && ticketId !== null) {
      const network = config.sui.network;
      const rpcUrl = network === 'testnet' 
        ? getFullnodeUrl('testnet')
        : network === 'mainnet'
        ? getFullnodeUrl('mainnet')
        : config.sui.rpcUrl;
      
      const client = new SuiClient({ url: rpcUrl });

      console.log(`[TICKET-INFO] Searching for owner of ticket ID ${ticketId}`);

      try {
        // Get all players with game passes
        const allFields = await client.getDynamicFields({
          parentId: systemObjectId,
          limit: 1000, // Adjust if needed
        });

        console.log(`[TICKET-INFO] Found ${allFields.data.length} players with game passes`);

        // Search through players to find who owns this ticket
        for (const field of allFields.data) {
          try {
            // Extract player address from field name (same pattern as list-players route)
            let playerAddr: string | null = null;
            
            if (field.name?.type === 'address' && field.name?.value) {
              playerAddr = field.name.value as string;
            }

            if (!playerAddr) {
              console.debug(`[TICKET-INFO] Skipping field - could not extract player address:`, field.name);
              continue;
            }

            console.debug(`[TICKET-INFO] Checking player ${playerAddr} for ticket ${ticketId}`);

            // Check if this player has the ticket using has_tournament_ticket view function
            const tx = new Transaction();
            tx.moveCall({
              target: `${packageId}::game_pass::has_tournament_ticket`,
              arguments: [
                tx.object(systemObjectId),
                tx.pure.address(playerAddr),
                tx.pure.u64(ticketId),
              ],
            });

            const result = await client.devInspectTransactionBlock({
              transactionBlock: tx,
              sender: playerAddr,
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

              console.debug(`[TICKET-INFO] Player ${playerAddr} has_tournament_ticket(${ticketId}) = ${hasTicket}`, {
                returnValue,
                returnValueType: typeof returnValue,
                isArray: Array.isArray(returnValue),
              });

              if (hasTicket) {
                // Found the owner! Now get the ticket info
                console.log(`[TICKET-INFO] Found ticket ${ticketId} owned by ${playerAddr}`);
                
                const infoTx = new Transaction();
                infoTx.moveCall({
                  target: `${packageId}::game_pass::get_ticket_info`,
                  arguments: [
                    infoTx.object(systemObjectId),
                    infoTx.pure.address(playerAddr),
                    infoTx.pure.u64(ticketId),
                  ],
                });

                const infoResult = await client.devInspectTransactionBlock({
                  transactionBlock: infoTx,
                  sender: playerAddr,
                });

                console.log(`[TICKET-INFO] get_ticket_info result for ticket ${ticketId}:`, {
                  hasResults: !!infoResult.results,
                  resultsLength: infoResult.results?.length,
                  firstResult: infoResult.results?.[0],
                  returnValues: infoResult.results?.[0]?.returnValues,
                });

                if (infoResult.results && infoResult.results[0]?.returnValues) {
                  const returnValues = infoResult.results[0].returnValues;
                  
                  console.log(`[TICKET-INFO] Raw returnValues from get_ticket_info:`, {
                    returnValues,
                    length: returnValues.length,
                    types: returnValues.map((v: any) => typeof v),
                    stringified: JSON.stringify(returnValues),
                  });
                  
                  let ticketIdValue = 0;
                  let valuePaidUsdCents = 0;
                  let purchasedAt = 0;

                  // Parse return values (tuple of 3 u64s: ticket_id, value_paid_usd_cents, purchased_at)
                  // The structure is: [[byteArray], "u64"] where byteArray is little-endian u64 bytes
                  // Example: [[[8,0,0,0,0,0,0,0],"u64"], [[100,0,0,0,0,0,0,0],"u64"], [[18,160,23,10,155,1,0,0],"u64"]]
                  
                  // Helper function to convert little-endian byte array to number
                  const bytesToU64 = (bytes: number[]): number => {
                    if (!Array.isArray(bytes) || bytes.length === 0) return 0;
                    // Little-endian: bytes[0] is least significant byte
                    let value = 0;
                    for (let i = 0; i < Math.min(bytes.length, 8); i++) {
                      value += bytes[i] * Math.pow(256, i);
                    }
                    return value;
                  };

                  if (returnValues.length >= 3) {
                    // Structure: [[byteArray], "u64"]
                    const ticketIdRaw: any = returnValues[0];
                    if (Array.isArray(ticketIdRaw) && ticketIdRaw.length >= 1 && Array.isArray(ticketIdRaw[0])) {
                      ticketIdValue = bytesToU64(ticketIdRaw[0] as number[]);
                    } else if (Array.isArray(ticketIdRaw) && ticketIdRaw.length > 0) {
                      ticketIdValue = bytesToU64(ticketIdRaw as number[]);
                    } else {
                      ticketIdValue = Number(ticketIdRaw || 0);
                    }
                    
                    const valueRaw: any = returnValues[1];
                    if (Array.isArray(valueRaw) && valueRaw.length >= 1 && Array.isArray(valueRaw[0])) {
                      valuePaidUsdCents = bytesToU64(valueRaw[0] as number[]);
                    } else if (Array.isArray(valueRaw) && valueRaw.length > 0) {
                      valuePaidUsdCents = bytesToU64(valueRaw as number[]);
                    } else {
                      valuePaidUsdCents = Number(valueRaw || 0);
                    }
                    
                    const purchasedAtRaw: any = returnValues.length > 2 ? returnValues[2] : undefined;
                    if (purchasedAtRaw !== undefined) {
                      if (Array.isArray(purchasedAtRaw) && purchasedAtRaw.length >= 1 && Array.isArray(purchasedAtRaw[0])) {
                        purchasedAt = bytesToU64(purchasedAtRaw[0] as number[]);
                      } else if (Array.isArray(purchasedAtRaw) && purchasedAtRaw.length > 0) {
                        purchasedAt = bytesToU64(purchasedAtRaw as number[]);
                      } else {
                        purchasedAt = Number(purchasedAtRaw || 0);
                      }
                    }
                  } else if (returnValues.length === 1 && Array.isArray(returnValues[0]) && returnValues[0].length >= 3) {
                    // Alternative structure: single array with 3 elements
                    const tupleArray: any[] = returnValues[0] as any[];
                    const ticketIdRaw: any = tupleArray[0];
                    const valueRaw: any = tupleArray[1];
                    const purchasedAtRaw: any = tupleArray.length > 2 ? tupleArray[2] : undefined;
                    ticketIdValue = bytesToU64(Array.isArray(ticketIdRaw) ? ticketIdRaw : [ticketIdRaw]);
                    valuePaidUsdCents = bytesToU64(Array.isArray(valueRaw) ? valueRaw : [valueRaw]);
                    if (purchasedAtRaw !== undefined) {
                      purchasedAt = bytesToU64(Array.isArray(purchasedAtRaw) ? purchasedAtRaw : [purchasedAtRaw]);
                    }
                  }

                  console.log(`[TICKET-INFO] Parsed values:`, {
                    ticketIdValue,
                    valuePaidUsdCents,
                    purchasedAt,
                    isValid: ticketIdValue > 0,
                  });

                  if (ticketIdValue > 0) {
                    console.log(`[TICKET-INFO] Returning ticket info for ticket ${ticketIdValue}`);
                    return {
                      success: true,
                      playerAddress: playerAddr,
                      tickets: [{
                        ticketId: ticketIdValue,
                        valuePaidUsdCents,
                        purchasedAt,
                      }],
                      totalTickets: 1,
                    };
                  } else {
                    console.warn(`[TICKET-INFO] Parsed ticketIdValue is 0, ticket info may be invalid`);
                  }
                } else {
                  console.warn(`[TICKET-INFO] No return values from get_ticket_info for ticket ${ticketId}`);
                }
              }
            } else {
              // No return value means ticket doesn't exist for this player
              console.debug(`[TICKET-INFO] Player ${playerAddr} does not have ticket ${ticketId} (no return value)`);
            }
          } catch (error) {
            // Continue searching other players
            const errorMsg = error instanceof Error ? error.message : String(error);
            console.debug(`[TICKET-INFO] Error checking player for ticket ${ticketId}:`, errorMsg);
          }
        }

        // Ticket not found
        console.log(`[TICKET-INFO] Ticket ${ticketId} not found in any player's game pass after checking ${allFields.data.length} players`);
        return {
          success: true,
          playerAddress: null,
          tickets: [],
          totalTickets: 0,
        };
      } catch (error) {
        console.error(`[TICKET-INFO] Error searching for ticket ${ticketId}:`, error);
        throw new Error(`Failed to search for ticket: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Otherwise, get all tickets for the player (existing logic)
    // Get available ticket IDs
    const availableTicketsResult = await gamePassService.getAvailableTicketIds(playerAddress!);
    
    if (!availableTicketsResult.success) {
      throw new Error(availableTicketsResult.error || 'Failed to get available tickets');
    }

    const ticketIds = availableTicketsResult.ticketIds || [];
    
    if (ticketIds.length === 0) {
      return {
        success: true,
        playerAddress: playerAddress!,
        tickets: [],
        totalTickets: 0,
      };
    }
    
    // Get ticket info by reading directly from the tournament_tickets table
    // This is more efficient than calling get_ticket_info for each ticket
    const ticketInfo: Array<{
      ticketId: number;
      valuePaidUsdCents: number;
      purchasedAt: number;
    }> = [];

    const network = config.sui.network;
    const rpcUrl = network === 'testnet' 
      ? getFullnodeUrl('testnet')
      : network === 'mainnet'
      ? getFullnodeUrl('mainnet')
      : config.sui.rpcUrl;
    
    const client = new SuiClient({ url: rpcUrl });

    console.log(`[TICKET-INFO] Getting info for ${ticketIds.length} tickets:`, ticketIds);

    // Get the GamePass object to access the tournament_tickets table
    const dynamicFieldName = {
      type: 'address',
      value: playerAddress!,
    };
    
    const dynamicField = await client.getDynamicFieldObject({
      parentId: systemObjectId,
      name: dynamicFieldName,
    });
    
    if (!dynamicField.data || !('content' in dynamicField.data) || !dynamicField.data.content) {
      throw new Error('Game pass not found for player');
    }
    
    const passData = (dynamicField.data.content as any)?.fields;
    const tournamentTicketsTable = passData?.tournament_tickets;
    
    if (!tournamentTicketsTable || !tournamentTicketsTable.fields || !tournamentTicketsTable.fields.id) {
      return {
        success: true,
        playerAddress,
        tickets: [],
        totalTickets: 0,
      };
    }
    
    const tableObjectId = tournamentTicketsTable.fields.id.id;
    
    // Get all dynamic fields from the table
    // Note: Each dynamic field represents a ticket entry, and we need to fetch the actual object
    const dynamicFields = await client.getDynamicFields({
      parentId: tableObjectId,
    });

    // Build a map of ticket_id -> ticket info from the dynamic fields
    const ticketMap = new Map<number, { valuePaidUsdCents: number; purchasedAt: number }>();

    // Fetch all ticket objects in parallel
    const ticketObjectPromises = dynamicFields.data.map(async (field) => {
      try {
        // Extract ticket ID from field name
        const name = field.name as any;
        let ticketId: number = 0;
        
        if (name) {
          if (typeof name === 'object') {
            if (name.value !== undefined) {
              ticketId = Number(name.value);
            } else if (name.type === 'u64' && (name as any).bcs !== undefined) {
              ticketId = Number((name as any).bcs || 0);
            } else {
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
        
        if (ticketId > 0 && field.objectId) {
          // For Table entries, the dynamic field's value is the TournamentTicket struct itself
          // We need to get the dynamic field object, which contains the ticket data
          try {
            const dynamicFieldObj = await client.getDynamicFieldObject({
              parentId: tableObjectId,
              name: field.name,
            });
            
            // The ticket data might be in different places depending on how Sui structures it
            let fields: any = null;
            
            // Try to get from dynamic field object's content
            // For Table entries, the structure is typically: { content: { dataType: 'moveObject', fields: { value: { fields: { ...ticket data... } } } } }
            if (dynamicFieldObj.data && 'content' in dynamicFieldObj.data) {
              const content = dynamicFieldObj.data.content as any;
              
              // Log the structure for debugging (only for first ticket to avoid spam)
              if (ticketId === ticketIds[0]) {
                console.log(`[TICKET-INFO] Dynamic field object structure for ticket ${ticketId}:`, {
                  hasContent: !!content,
                  contentType: typeof content,
                  contentKeys: content ? Object.keys(content) : [],
                  fullContent: JSON.stringify(content, null, 2),
                });
              }
              
              // Try different possible structures
              if (content && typeof content === 'object') {
                // Structure 1: Direct fields (if the ticket is stored directly)
                if (content.fields) {
                  // Check if fields contains the ticket data directly
                  if (content.fields.value_paid_usd_cents !== undefined || content.fields.purchased_at !== undefined) {
                    fields = content.fields;
                  }
                  // Or if it's nested in a 'value' field (common for Table entries)
                  else if (content.fields.value) {
                    const valueField = content.fields.value;
                    if (valueField.fields) {
                      fields = valueField.fields;
                    } else if (valueField.value_paid_usd_cents !== undefined || valueField.purchased_at !== undefined) {
                      fields = valueField;
                    }
                  }
                }
                // Structure 2: Nested in value at top level
                else if (content.value) {
                  if (content.value.fields) {
                    fields = content.value.fields;
                  } else if (content.value.value_paid_usd_cents !== undefined || content.value.purchased_at !== undefined) {
                    fields = content.value;
                  }
                }
                // Structure 3: Direct properties
                else if (content.value_paid_usd_cents !== undefined || content.purchased_at !== undefined) {
                  fields = content;
                }
              }
            }
            
            // Fallback: Try getting the object directly
            if (!fields) {
              const ticketObj = await client.getObject({
                id: field.objectId,
                options: { showContent: true },
              });
              
              if (ticketObj.data && ticketObj.data.content && 'dataType' in ticketObj.data.content) {
                const content = ticketObj.data.content as any;
                if (content.dataType === 'moveObject' && content.fields) {
                  fields = content.fields;
                }
              }
            }
            
            if (fields) {
              // Extract values - handle both snake_case and camelCase
              const valuePaidUsdCents = Number(
                fields.value_paid_usd_cents || 
                fields.valuePaidUsdCents || 
                0
              );
              
              const purchasedAt = Number(
                fields.purchased_at || 
                fields.purchasedAt || 
                0
              );
              
              console.log(`[TICKET-INFO] Extracted values for ticket ${ticketId}:`, {
                valuePaidUsdCents,
                purchasedAt,
                rawFields: fields,
              });
              
              return {
                ticketId,
                valuePaidUsdCents,
                purchasedAt,
              };
            } else {
              console.warn(`[TICKET-INFO] Could not extract fields for ticket ${ticketId}`);
            }
          } catch (error) {
            console.error(`[TICKET-INFO] Error fetching ticket ${ticketId}:`, error);
          }
        }
      } catch (error) {
        console.error(`[TICKET-INFO] Error processing ticket field:`, error);
      }
      return null;
    });

    // Wait for all ticket objects to be fetched
    const ticketDataArray = await Promise.all(ticketObjectPromises);
    
    // Build the map from the fetched data
    for (const ticketData of ticketDataArray) {
      if (ticketData) {
        ticketMap.set(ticketData.ticketId, {
          valuePaidUsdCents: ticketData.valuePaidUsdCents,
          purchasedAt: ticketData.purchasedAt,
        });
        console.log(`[TICKET-INFO] Found ticket ${ticketData.ticketId} in table:`, {
          valuePaidUsdCents: ticketData.valuePaidUsdCents,
          purchasedAt: ticketData.purchasedAt,
        });
      }
    }
    
    console.log(`[TICKET-INFO] Built ticket map with ${ticketMap.size} entries`);

    for (const ticketId of ticketIds) {
      const ticketData = ticketMap.get(ticketId);
      if (ticketData) {
        ticketInfo.push({
          ticketId,
          valuePaidUsdCents: ticketData.valuePaidUsdCents,
          purchasedAt: ticketData.purchasedAt,
        });
      } else {
        // Fallback: try to get info using devInspectTransactionBlock if not found in map
        try {
          const tx = new Transaction();
          tx.moveCall({
            target: `${packageId}::game_pass::get_ticket_info`,
            arguments: [
              tx.object(systemObjectId),
              tx.pure.address(playerAddress || ''),
              tx.pure.u64(ticketId),
            ],
          });

          const result = await client.devInspectTransactionBlock({
            transactionBlock: tx,
            sender: playerAddress || '',
          });

          if (result.results && result.results[0]?.returnValues) {
            const returnValues = result.results[0].returnValues;
            
            let ticketIdValue = 0;
            let valuePaidUsdCents = 0;
            let purchasedAt = 0;

            if (returnValues.length >= 3) {
              const ticketIdRaw = returnValues[0];
              ticketIdValue = Array.isArray(ticketIdRaw) ? Number(ticketIdRaw[0] || 0) : Number(ticketIdRaw || 0);
              
              const valueRaw = returnValues[1];
              valuePaidUsdCents = Array.isArray(valueRaw) ? Number(valueRaw[0] || 0) : Number(valueRaw || 0);
              
              const purchasedAtRaw: any = returnValues.length > 2 ? returnValues[2] : undefined;
              if (purchasedAtRaw !== undefined) {
                purchasedAt = Array.isArray(purchasedAtRaw) ? Number(purchasedAtRaw[0] || 0) : Number(purchasedAtRaw || 0);
              }
            } else if (returnValues.length === 1 && Array.isArray(returnValues[0]) && returnValues[0].length >= 3) {
              const tupleArray = returnValues[0];
              const tupleArrayAny: any[] = tupleArray as any[];
              ticketIdValue = Number(tupleArrayAny[0] || 0);
              valuePaidUsdCents = Number(tupleArrayAny[1] || 0);
              purchasedAt = tupleArrayAny.length > 2 ? Number(tupleArrayAny[2] || 0) : 0;
            }

            if (ticketIdValue > 0) {
              ticketInfo.push({
                ticketId: ticketIdValue,
                valuePaidUsdCents,
                purchasedAt,
              });
            }
          }
        } catch (error) {
          console.error(`Error getting info for ticket ${ticketId} via fallback:`, error);
        }
      }
    }

    // Sort by ticket ID
    ticketInfo.sort((a, b) => a.ticketId - b.ticketId);

    console.log(`[TICKET-INFO] Final result:`, {
      playerAddress,
      requestedTicketIds: ticketIds,
      foundTicketInfo: ticketInfo.length,
      ticketInfo,
    });

    return {
      success: true,
      playerAddress,
      tickets: ticketInfo,
      totalTickets: ticketInfo.length,
    };
  }
);

