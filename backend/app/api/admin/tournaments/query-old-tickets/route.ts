// ==========================================
// Admin API - Query Old Contract Tickets
// ==========================================

import { NextRequest } from 'next/server';
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';
import { getAdminWalletService } from '@/lib/sui/admin-wallet-service';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { getConfig } from '@/config/config';

export const POST = withApiHandler(
  async (request: NextRequest) => {
    const body = await getRequestBody<{
      playerAddress: string;
      ticketId?: number;
      oldPackageId?: string;
      oldGamePassSystemId?: string;
    }>(request);

    const { playerAddress, ticketId, oldPackageId, oldGamePassSystemId } = body;

    if (!playerAddress) {
      throw new Error('Player address is required');
    }

    const config = getConfig();
    const adminWallet = getAdminWalletService();
    
    // Use provided IDs or fall back to environment variables
    const finalOldPackageId = oldPackageId || 
      process.env.OLD_GAME_SCORE_CONTRACT_TESTNET || 
      process.env.OLD_GAME_SCORE_PACKAGE_ID || 
      process.env.OLD_GAME_SCORE_CONTRACT;
    
    const finalOldGamePassSystemId = oldGamePassSystemId || 
      process.env.OLD_GAME_PASS_SYSTEM_OBJECT_ID_TESTNET || 
      process.env.OLD_GAME_PASS_SYSTEM_OBJECT_ID;

    if (!finalOldPackageId || !finalOldGamePassSystemId) {
      throw new Error('Old package ID and game pass system ID are required. Provide them in the request or set environment variables.');
    }

    const network = config.sui.network;
    const client = network === 'testnet'
      ? adminWallet.getTestnetClient()
      : adminWallet.getMainnetClient();

    console.log('[QUERY OLD TICKETS] Querying old contract', {
      playerAddress,
      ticketId,
      oldPackageId: finalOldPackageId,
      oldGamePassSystemId: finalOldGamePassSystemId,
      network,
    });

    const results: any[] = [];

    // If ticketId is provided, query that specific ticket
    if (ticketId !== undefined) {
      console.log(`[QUERY OLD TICKETS] Querying ticket ${ticketId} for player ${playerAddress}`);

      // Method 1: Try get_ticket_info view function
      try {
        const tx1 = new Transaction();
        tx1.moveCall({
          target: `${finalOldPackageId}::game_pass::get_ticket_info`,
          arguments: [
            tx1.object(finalOldGamePassSystemId),
            tx1.pure.address(playerAddress),
            tx1.pure.u64(ticketId),
          ],
        });

        const result1 = await client.devInspectTransactionBlock({
          sender: adminWallet.getAddress(),
          transactionBlock: tx1,
        });

        console.log(`[QUERY OLD TICKETS] get_ticket_info result for ticket ${ticketId}:`, {
          hasResults: !!result1.results,
          resultsLength: result1.results?.length,
          firstResult: result1.results?.[0],
          returnValues: result1.results?.[0]?.returnValues,
        });

        if (result1.results && result1.results[0]?.returnValues) {
          const returnValues = result1.results[0].returnValues;
          if (returnValues.length >= 3) {
            // Parse BCS bytes to numbers
            // Return values are in format [bytes, type] where bytes is the actual byte array
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

            const ticketIdValue = bytesToU64(returnValues[0]);
            const valuePaidUsdCents = bytesToU64(returnValues[1]);
            const purchasedAt = bytesToU64(returnValues[2]);

            console.log(`[QUERY OLD TICKETS] Single ticket ${ticketId} extracted via get_ticket_info:`, {
              ticketIdValue,
              valuePaidUsdCents,
              purchasedAt,
              rawReturnValues: returnValues,
            });

            results.push({
              method: 'get_ticket_info',
              ticketId,
              ticketIdValue,
              valuePaidUsdCents,
              purchasedAt,
              rawReturnValues: returnValues,
            });
          }
        }
      } catch (error) {
        console.log(`[QUERY OLD TICKETS] get_ticket_info failed for ticket ${ticketId}:`, error);
        results.push({
          method: 'get_ticket_info',
          ticketId,
          error: error instanceof Error ? error.message : String(error),
        });
      }

      // Method 2: Query ticket object directly from tournament_tickets table
      try {
        // First get the GamePass object
        const dynamicFieldName = {
          type: 'address',
          value: playerAddress,
        };

        const dynamicField = await client.getDynamicFieldObject({
          parentId: finalOldGamePassSystemId,
          name: dynamicFieldName,
        });

        if (dynamicField.data) {
          const gamePassObjectId = dynamicField.data.objectId;
          const gamePassObj = await client.getObject({
            id: gamePassObjectId,
            options: { showContent: true },
          });

          if (gamePassObj.data?.content) {
            const fields = (gamePassObj.data.content as any).fields;
            const tournamentTicketsTable = fields?.tournament_tickets;

            if (tournamentTicketsTable && tournamentTicketsTable.fields && tournamentTicketsTable.fields.id) {
              const tableObjectId = tournamentTicketsTable.fields.id.id || tournamentTicketsTable.fields.id;

              // Get the dynamic field for this ticket ID
              const ticketFieldName = {
                type: 'u64',
                value: ticketId,
              };

              const ticketFieldObj = await client.getDynamicFieldObject({
                parentId: tableObjectId,
                name: ticketFieldName,
              });

              console.log(`[QUERY OLD TICKETS] Direct ticket object query for ticket ${ticketId}:`, {
                hasData: !!ticketFieldObj.data,
                objectId: ticketFieldObj.data?.objectId,
                dataType: ticketFieldObj.data?.type,
                hasContent: ticketFieldObj.data && 'content' in ticketFieldObj.data,
                contentKeys: ticketFieldObj.data && 'content' in ticketFieldObj.data 
                  ? Object.keys(ticketFieldObj.data.content as any)
                  : [],
                fullData: JSON.stringify(ticketFieldObj.data, null, 2),
                content: ticketFieldObj.data && 'content' in ticketFieldObj.data 
                  ? JSON.stringify(ticketFieldObj.data.content, null, 2)
                  : null,
              });

              if (ticketFieldObj.data && 'content' in ticketFieldObj.data) {
                const content = ticketFieldObj.data.content as any;
                
                // Log the complete structure for debugging
                console.log(`[QUERY OLD TICKETS] Raw content structure for ticket ${ticketId}:`, {
                  contentType: typeof content,
                  isObject: typeof content === 'object',
                  contentKeys: content ? Object.keys(content) : [],
                  hasFields: content?.fields !== undefined,
                  fieldsKeys: content?.fields ? Object.keys(content.fields) : [],
                  hasValue: content?.value !== undefined,
                  valueType: typeof content?.value,
                  valueKeys: content?.value && typeof content.value === 'object' ? Object.keys(content.value) : [],
                  fullContent: JSON.stringify(content, null, 2),
                });

                let ticketFields: any = null;

                // Extract fields from various possible structures
                if (content.fields) {
                  console.log(`[QUERY OLD TICKETS] Ticket ${ticketId} has content.fields:`, {
                    fieldsKeys: Object.keys(content.fields),
                    fields: content.fields,
                  });
                  
                  if (content.fields.value) {
                    const valueField = content.fields.value;
                    console.log(`[QUERY OLD TICKETS] Ticket ${ticketId} has content.fields.value:`, {
                      valueFieldType: typeof valueField,
                      valueFieldKeys: valueField && typeof valueField === 'object' ? Object.keys(valueField) : [],
                      valueField: valueField,
                    });
                    
                    if (valueField.fields) {
                      ticketFields = valueField.fields;
                      console.log(`[QUERY OLD TICKETS] Ticket ${ticketId} using valueField.fields`);
                    } else if (valueField.value_paid_usd_cents !== undefined || valueField.value_paid_usd !== undefined) {
                      ticketFields = valueField;
                      console.log(`[QUERY OLD TICKETS] Ticket ${ticketId} using valueField directly`);
                    }
                  } else if (content.fields.value_paid_usd_cents !== undefined || content.fields.purchased_at !== undefined) {
                    ticketFields = content.fields;
                    console.log(`[QUERY OLD TICKETS] Ticket ${ticketId} using content.fields directly`);
                  }
                } else if (content.value) {
                  console.log(`[QUERY OLD TICKETS] Ticket ${ticketId} has content.value:`, {
                    valueType: typeof content.value,
                    valueKeys: content.value && typeof content.value === 'object' ? Object.keys(content.value) : [],
                    value: content.value,
                  });
                  
                  if (content.value.fields) {
                    ticketFields = content.value.fields;
                    console.log(`[QUERY OLD TICKETS] Ticket ${ticketId} using content.value.fields`);
                  } else if (content.value.value_paid_usd_cents !== undefined) {
                    ticketFields = content.value;
                    console.log(`[QUERY OLD TICKETS] Ticket ${ticketId} using content.value directly`);
                  }
                } else if (content.value_paid_usd_cents !== undefined || content.purchased_at !== undefined) {
                  ticketFields = content;
                  console.log(`[QUERY OLD TICKETS] Ticket ${ticketId} using content directly`);
                }

                if (ticketFields) {
                  // Log all possible field names we're checking
                  const allFieldNames = Object.keys(ticketFields);
                  console.log(`[QUERY OLD TICKETS] Ticket ${ticketId} extracted fields:`, {
                    allFieldNames,
                    ticketFields,
                    value_paid_usd_cents: ticketFields.value_paid_usd_cents,
                    valuePaidUsdCents: ticketFields.valuePaidUsdCents,
                    value_paid_usd: ticketFields.value_paid_usd,
                    valuePaidUsd: ticketFields.valuePaidUsd,
                    value: ticketFields.value,
                    purchased_at: ticketFields.purchased_at,
                    purchasedAt: ticketFields.purchasedAt,
                  });

                  const extractedValue = Number(
                    ticketFields.value_paid_usd_cents || 
                    ticketFields.valuePaidUsdCents ||
                    ticketFields.value_paid_usd ||
                    ticketFields.valuePaidUsd ||
                    ticketFields.value ||
                    0
                  );

                  const extractedPurchasedAt = Number(
                    ticketFields.purchased_at || 
                    ticketFields.purchasedAt || 
                    ticketFields.purchased_at_timestamp ||
                    0
                  );

                  console.log(`[QUERY OLD TICKETS] Ticket ${ticketId} extracted values:`, {
                    valuePaidUsdCents: extractedValue,
                    purchasedAt: extractedPurchasedAt,
                  });

                  results.push({
                    method: 'direct_object_query',
                    ticketId,
                    ticketIdValue: Number(ticketFields.ticket_id || ticketFields.ticketId || ticketId),
                    valuePaidUsdCents: extractedValue,
                    purchasedAt: extractedPurchasedAt,
                    rawFields: ticketFields,
                    allFieldNames,
                    fullContent: JSON.stringify(content, null, 2),
                  });
                } else {
                  console.log(`[QUERY OLD TICKETS] Ticket ${ticketId} - Could not extract ticket fields from content`);
                  results.push({
                    method: 'direct_object_query',
                    ticketId,
                    error: 'Could not extract ticket fields',
                    rawContent: JSON.stringify(content, null, 2),
                    contentKeys: content ? Object.keys(content) : [],
                  });
                }
              }
            }
          }
        }
      } catch (error) {
        console.log(`[QUERY OLD TICKETS] Direct object query failed for ticket ${ticketId}:`, error);
        results.push({
          method: 'direct_object_query',
          ticketId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    } else {
      // Query all tickets for the player
      console.log(`[QUERY OLD TICKETS] Querying all tickets for player ${playerAddress}`);

      // First, get the GamePass to find the tournament_tickets table
      const dynamicFieldName = {
        type: 'address',
        value: playerAddress,
      };

      const dynamicField = await client.getDynamicFieldObject({
        parentId: finalOldGamePassSystemId,
        name: dynamicFieldName,
      });

      if (!dynamicField.data) {
        throw new Error('No game pass found in old system for this player');
      }

      const gamePassObjectId = dynamicField.data.objectId;
      const gamePassObj = await client.getObject({
        id: gamePassObjectId,
        options: { showContent: true },
      });

      if (!gamePassObj.data?.content) {
        throw new Error('Failed to read game pass object');
      }

      const fields = (gamePassObj.data.content as any).fields;
      const tournamentTicketsTable = fields?.tournament_tickets;

      if (!tournamentTicketsTable || !tournamentTicketsTable.fields || !tournamentTicketsTable.fields.id) {
        return {
          success: true,
          playerAddress,
          tickets: [],
          message: 'No tournament_tickets table found in old game pass',
        };
      }

      const tableObjectId = tournamentTicketsTable.fields.id.id || tournamentTicketsTable.fields.id;

      // Get all dynamic fields from the table
      const dynamicFields = await client.getDynamicFields({
        parentId: tableObjectId,
      });

      console.log(`[QUERY OLD TICKETS] Found ${dynamicFields.data.length} tickets in old tournament_tickets table`);

      // Query each ticket
      for (const field of dynamicFields.data) {
        const name = field.name as any;
        let extractedTicketId: number = 0;

        if (name) {
          if (typeof name === 'object') {
            if (name.value !== undefined) {
              extractedTicketId = Number(name.value);
            } else if (name.type === 'u64' && (name as any).bcs !== undefined) {
              extractedTicketId = Number((name as any).bcs || 0);
            } else {
              const values = Object.values(name);
              for (const val of values) {
                if (typeof val === 'number' || (typeof val === 'string' && !isNaN(Number(val)))) {
                  extractedTicketId = Number(val);
                  break;
                }
              }
            }
          } else if (typeof name === 'string') {
            extractedTicketId = Number(name);
          } else if (typeof name === 'number') {
            extractedTicketId = name;
          }
        }

        if (extractedTicketId > 0) {
          // Try get_ticket_info for this ticket
          try {
            const tx = new Transaction();
            tx.moveCall({
              target: `${finalOldPackageId}::game_pass::get_ticket_info`,
              arguments: [
                tx.object(finalOldGamePassSystemId),
                tx.pure.address(playerAddress),
                tx.pure.u64(extractedTicketId),
              ],
            });

            const result = await client.devInspectTransactionBlock({
              sender: adminWallet.getAddress(),
              transactionBlock: tx,
            });

            console.log(`[QUERY OLD TICKETS] get_ticket_info result for ticket ${extractedTicketId}:`, {
              hasResults: !!result.results,
              resultsLength: result.results?.length,
              firstResult: result.results?.[0],
              returnValues: result.results?.[0]?.returnValues,
              returnValuesLength: result.results?.[0]?.returnValues?.length,
            });

            if (result.results && result.results[0]?.returnValues && result.results[0].returnValues.length >= 3) {
              const returnValues = result.results[0].returnValues;
              
              // Return values are in format [bytes, type] where bytes is the actual byte array
              // Extract the byte arrays from the tuples
              const extractBytes = (tuple: any): number[] => {
                if (Array.isArray(tuple) && tuple.length >= 1) {
                  // If it's a tuple [bytes, type], extract the bytes
                  if (Array.isArray(tuple[0])) {
                    return tuple[0];
                  }
                  // If it's already just the bytes array
                  return tuple;
                }
                return [];
              };

              const bytesToU64 = (bytes: any): number => {
                // Handle tuple format [bytes, type]
                const byteArray = extractBytes(bytes);
                
                if (typeof bytes === 'number') return bytes;
                if (typeof bytes === 'string') return Number(bytes);
                if (Array.isArray(byteArray) && byteArray.length > 0) {
                  let value = 0;
                  for (let i = 0; i < Math.min(byteArray.length, 8); i++) {
                    value += byteArray[i] * Math.pow(256, i);
                  }
                  return value;
                }
                return 0;
              };

              const ticketIdValue = bytesToU64(returnValues[0]);
              const valuePaidUsdCents = bytesToU64(returnValues[1]);
              const purchasedAt = bytesToU64(returnValues[2]);

              console.log(`[QUERY OLD TICKETS] Ticket ${extractedTicketId} extracted via get_ticket_info:`, {
                ticketIdValue,
                valuePaidUsdCents,
                purchasedAt,
                rawReturnValues: returnValues,
              });

              results.push({
                ticketId: extractedTicketId,
                method: 'get_ticket_info',
                ticketIdValue,
                valuePaidUsdCents,
                purchasedAt,
              });
            } else {
              console.log(`[QUERY OLD TICKETS] get_ticket_info did not return expected values for ticket ${extractedTicketId}, falling back to direct query`);
              throw new Error('get_ticket_info did not return expected values');
            }
          } catch (error) {
            console.log(`[QUERY OLD TICKETS] get_ticket_info failed for ticket ${extractedTicketId}, error:`, error instanceof Error ? error.message : String(error));
            // Fall back to direct object query
            try {
              const ticketFieldObj = await client.getDynamicFieldObject({
                parentId: tableObjectId,
                name: field.name,
              });

              console.log(`[QUERY OLD TICKETS] Direct query for ticket ${extractedTicketId}:`, {
                hasData: !!ticketFieldObj.data,
                objectId: ticketFieldObj.data?.objectId,
                hasContent: ticketFieldObj.data && 'content' in ticketFieldObj.data,
              });

              if (ticketFieldObj.data && 'content' in ticketFieldObj.data) {
                const content = ticketFieldObj.data.content as any;
                
                console.log(`[QUERY OLD TICKETS] Raw content for ticket ${extractedTicketId}:`, {
                  contentType: typeof content,
                  contentKeys: content ? Object.keys(content) : [],
                  hasFields: content?.fields !== undefined,
                  fieldsKeys: content?.fields ? Object.keys(content.fields) : [],
                  fullContent: JSON.stringify(content, null, 2),
                });

                let ticketFields: any = null;

                if (content.fields?.value?.fields) {
                  ticketFields = content.fields.value.fields;
                  console.log(`[QUERY OLD TICKETS] Ticket ${extractedTicketId} using content.fields.value.fields`);
                } else if (content.fields?.value_paid_usd_cents !== undefined || content.fields?.purchased_at !== undefined) {
                  ticketFields = content.fields;
                  console.log(`[QUERY OLD TICKETS] Ticket ${extractedTicketId} using content.fields directly`);
                } else if (content.value?.fields) {
                  ticketFields = content.value.fields;
                  console.log(`[QUERY OLD TICKETS] Ticket ${extractedTicketId} using content.value.fields`);
                } else if (content.value_paid_usd_cents !== undefined || content.purchased_at !== undefined) {
                  ticketFields = content;
                  console.log(`[QUERY OLD TICKETS] Ticket ${extractedTicketId} using content directly`);
                }

                if (ticketFields) {
                  const allFieldNames = Object.keys(ticketFields);
                  const extractedValue = Number(
                    ticketFields.value_paid_usd_cents || 
                    ticketFields.valuePaidUsdCents ||
                    ticketFields.value_paid_usd ||
                    ticketFields.valuePaidUsd ||
                    ticketFields.value ||
                    0
                  );

                  console.log(`[QUERY OLD TICKETS] Ticket ${extractedTicketId} extracted:`, {
                    allFieldNames,
                    valuePaidUsdCents: extractedValue,
                    rawFields: ticketFields,
                  });

                  results.push({
                    ticketId: extractedTicketId,
                    method: 'direct_object_query',
                    ticketIdValue: Number(ticketFields.ticket_id || ticketFields.ticketId || extractedTicketId),
                    valuePaidUsdCents: extractedValue,
                    purchasedAt: Number(
                      ticketFields.purchased_at || 
                      ticketFields.purchasedAt || 
                      0
                    ),
                    allFieldNames,
                    rawFields: ticketFields,
                  });
                } else {
                  console.log(`[QUERY OLD TICKETS] Ticket ${extractedTicketId} - Could not extract fields`);
                  results.push({
                    ticketId: extractedTicketId,
                    method: 'direct_object_query',
                    error: 'Could not extract ticket fields',
                    rawContent: JSON.stringify(content, null, 2),
                  });
                }
              }
            } catch (error2) {
              console.log(`[QUERY OLD TICKETS] Failed to query ticket ${extractedTicketId}:`, error2);
            }
          }
        }
      }
    }

    return {
      success: true,
      playerAddress,
      oldPackageId: finalOldPackageId,
      oldGamePassSystemId: finalOldGamePassSystemId,
      ticketId: ticketId || 'all',
      results,
      summary: {
        totalTickets: results.length,
        ticketsWithValues: results.filter(r => r.valuePaidUsdCents > 0).length,
        ticketsWithZeroValues: results.filter(r => r.valuePaidUsdCents === 0).length,
      },
    };
  },
  {
    logRequest: true,
  }
);

