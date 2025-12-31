// Tournament migration service for transferring tournaments from old TournamentRegistry to new TournamentRegistry
import { Transaction } from '@mysten/sui/transactions';
import { AdminWalletService } from '../admin-wallet-service';
import { getConfig } from '@/config/config';
import { MigrationLogger } from '../migration-logger';

export class TournamentMigrationService {
  private adminWallet: AdminWalletService;
  private config: ReturnType<typeof getConfig>;

  constructor(adminWallet: AdminWalletService) {
    this.adminWallet = adminWallet;
    this.config = getConfig();
  }

  /**
   * Get all tournament IDs from old TournamentRegistry
   * Uses the same approach as getActiveTournaments - queries TournamentCreated events
   */
  async getAllTournamentIds(
    oldPackageId: string,
    oldTournamentRegistryId: string
  ): Promise<{
    success: boolean;
    tournamentIds?: number[];
    error?: string;
  }> {
    try {
      const network = this.config.sui.network;
      const client = network === 'testnet' 
        ? this.adminWallet.getTestnetClient()
        : this.adminWallet.getMainnetClient();

      MigrationLogger.debug('Fetching all tournament IDs from old registry');

      // Query TournamentCreated events (same approach as getActiveTournaments)
      const events = await client.queryEvents({
        query: {
          MoveModule: {
            package: oldPackageId,
            module: 'tournaments',
          },
        },
        limit: 1000,
        order: 'descending',
      });

      const tournamentIds: number[] = [];
      const seenIds = new Set<number>();

      // Process events and extract tournament IDs
      for (const event of events.data) {
        if (event.type?.includes('TournamentCreated')) {
          try {
            const eventData = event.parsedJson as any;
            const tournamentId = Number(eventData.tournament_id);
            
            if (!isNaN(tournamentId) && !seenIds.has(tournamentId)) {
              tournamentIds.push(tournamentId);
              seenIds.add(tournamentId);
            }
          } catch (error) {
            MigrationLogger.debug('Error parsing tournament event', { error });
            continue;
          }
        }
      }

      // Sort tournament IDs
      tournamentIds.sort((a, b) => a - b);

      MigrationLogger.debug(`Found ${tournamentIds.length} tournaments in old registry`);

      return {
        success: true,
        tournamentIds,
      };
    } catch (error) {
      MigrationLogger.error('Error fetching tournament IDs', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Read tournament from old TournamentRegistry (with full data including participants and leaderboard)
   */
  async readOldTournament(
    oldPackageId: string,
    oldTournamentRegistryId: string,
    tournamentId: number
  ): Promise<{
    success: boolean;
    tournament?: {
      tournament_id: number;
      name: string;
      category: number;
      start_time: number;
      end_time: number;
      entry_fee_tickets: number;
      prize_pool_usd_cents: number;
      created_at: number;
      object_id: string;
      distribution_status: number; // 0=pending, 1=distributed, 2=no_participants, 3=no_rewards
      // Participants data
      participants: Array<{
        address: string;
        ticket_id: number;
        ticket_value_usd_cents: number;
        entered_at: number;
      }>;
      // Leaderboard data
      leaderboard: Array<{
        address: string;
        score: number;
        playerName?: string; // Player name from TournamentScoreUpdated events
      }>;
    };
    error?: string;
  }> {
    try {
      const network = this.config.sui.network;
      const client = network === 'testnet' 
        ? this.adminWallet.getTestnetClient()
        : this.adminWallet.getMainnetClient();

      MigrationLogger.debug(`Reading tournament ${tournamentId} from old registry`);

      // Use the same approach as getActiveTournaments - query events to find the tournament
      // Then find the tournament object from the transaction
      try {
        // Query TournamentCreated events for this specific tournament ID
        const events = await client.queryEvents({
          query: {
            MoveModule: {
              package: oldPackageId,
              module: 'tournaments',
            },
          },
          limit: 1000,
          order: 'descending',
        });

        // Find the event for this tournament ID
        let tournamentEvent: any = null;
        for (const event of events.data) {
          if (event.type?.includes('TournamentCreated')) {
            const eventData = event.parsedJson as any;
            if (Number(eventData.tournament_id) === tournamentId) {
              tournamentEvent = event;
              break;
            }
          }
        }

        if (!tournamentEvent) {
          return {
            success: false,
            error: `Tournament ${tournamentId} not found in old registry events`,
          };
        }

        // Query the registry's tournaments table directly FIRST
        // This is more reliable than trying to find it in transaction object changes
        // Tournaments are stored in a table in the registry, keyed by tournament_id
        MigrationLogger.debug('Querying registry table for tournament', {
          tournamentId,
          oldTournamentRegistryId,
        });

        let tournamentObject: { objectId: string; type: string; objectType: string } | null = null;
        let tournamentsTableId: string | null = null;

        try {
          // Read the registry object to get the tournaments table ID
          const registryObj = await client.getObject({
            id: oldTournamentRegistryId,
            options: { showContent: true },
          });

          if (registryObj.data?.content) {
            const registryFields = (registryObj.data.content as any).fields;
            tournamentsTableId = registryFields?.tournaments?.fields?.id?.id;

            MigrationLogger.debug('Registry structure', {
              hasTournamentsField: !!registryFields?.tournaments,
              tournamentsTableId,
            });

            if (tournamentsTableId) {
              // Query the tournaments table using the tournament ID as the key
              const tournamentKey = {
                type: 'u64',
                value: tournamentId,
              };

              MigrationLogger.debug('Querying tournaments table', {
                tournamentsTableId,
                tournamentKey,
              });

              try {
                const tournamentField = await client.getDynamicFieldObject({
                  parentId: tournamentsTableId,
                  name: tournamentKey,
                });

                MigrationLogger.debug('Tournament field query result', {
                  hasData: !!tournamentField.data,
                  objectId: tournamentField.data?.objectId,
                  error: tournamentField.error,
                });

                if (tournamentField.data && tournamentField.data.objectId) {
                  // In Sui tables, when you store an ID, the table entry's value is the ID object
                  // The dynamic field object ID might be the tournament object ID itself
                  // OR we need to read the field object to get the ID
                  
                  // Try the field object ID directly first (sometimes it's the tournament itself)
                  let tournamentObjId: string | null = tournamentField.data.objectId;

                  // Read the field object to see what it contains
                  const fieldObj = await client.getObject({
                    id: tournamentField.data.objectId,
                    options: { showContent: true, showType: true },
                  });

                  MigrationLogger.debug('Field object details', {
                    fieldObjectId: tournamentField.data.objectId,
                    fieldType: fieldObj.data?.type,
                    hasContent: !!fieldObj.data?.content,
                  });

                  // Check if the field object itself is a Tournament
                  if (fieldObj.data?.type?.includes('Tournament')) {
                    // The field object IS the tournament - use it directly
                    tournamentObjId = tournamentField.data.objectId;
                    MigrationLogger.debug('Field object is the tournament itself', {
                      tournamentObjId,
                    });
                  } else if (fieldObj.data?.content) {
                    // The field object contains the tournament ID
                    const fields = (fieldObj.data.content as any).fields;
                    
                    MigrationLogger.debug('Field object content structure', {
                      fields: Object.keys(fields || {}),
                      hasValue: !!fields?.value,
                      hasId: !!fields?.id,
                    });

                    // In Sui, when storing an ID in a table, it's typically stored as a value field
                    // Try different ways to extract the ID
                    if (fields?.value) {
                      if (typeof fields.value === 'string') {
                        tournamentObjId = fields.value;
                      } else if (fields.value?.fields?.id) {
                        tournamentObjId = fields.value.fields.id;
                      } else if (fields.value?.id) {
                        tournamentObjId = typeof fields.value.id === 'string' 
                          ? fields.value.id 
                          : fields.value.id?.id;
                      }
                    } else if (fields?.id) {
                      tournamentObjId = typeof fields.id === 'string'
                        ? fields.id
                        : fields.id?.id;
                    }
                  }

                  // Verify the tournament object ID
                  if (tournamentObjId) {
                    const tournamentObj = await client.getObject({
                      id: tournamentObjId,
                      options: { showType: true },
                    });

                    if (tournamentObj.data?.type?.includes('Tournament')) {
                      tournamentObject = {
                        objectId: tournamentObjId,
                        type: 'created',
                        objectType: tournamentObj.data.type,
                      };
                      MigrationLogger.debug('✅ Found tournament via registry table lookup', {
                        tournamentId,
                        tournamentObjectId: tournamentObjId,
                      });
                    } else {
                      MigrationLogger.debug('Field object ID is not a Tournament', {
                        tournamentObjId,
                        type: tournamentObj.data?.type,
                      });
                    }
                  } else {
                    MigrationLogger.debug('Could not extract tournament object ID', {
                      fieldObjectId: tournamentField.data.objectId,
                      fieldType: fieldObj.data?.type,
                      fieldContent: fieldObj.data?.content,
                    });
                  }
                } else if (tournamentField.error) {
                  MigrationLogger.debug('Tournament not found in table', {
                    error: tournamentField.error,
                    tournamentsTableId,
                    tournamentId,
                  });
                }
              } catch (tableError) {
                MigrationLogger.debug('Error querying tournaments table', {
                  error: tableError instanceof Error ? tableError.message : String(tableError),
                  tournamentsTableId,
                  tournamentId,
                });
              }
            } else {
              MigrationLogger.debug('Tournaments table ID not found in registry', {
                registryFields: Object.keys(registryFields || {}),
              });
            }
          }
        } catch (error) {
          MigrationLogger.debug('Error reading registry object', {
            error: error instanceof Error ? error.message : String(error),
          });
        }

        // Fallback 1: Query all dynamic fields and find the one matching tournament ID
        if (!tournamentObject && tournamentsTableId) {
          MigrationLogger.debug('Trying to find tournament by querying all dynamic fields', {
            tournamentId,
            tournamentsTableId,
          });

          try {
            const allFields = await client.getDynamicFields({
              parentId: tournamentsTableId,
              limit: 1000,
            });

            MigrationLogger.debug('All dynamic fields in tournaments table', {
              count: allFields.data.length,
            });

            for (const field of allFields.data) {
              try {
                // The key should be the tournament ID
                const fieldKey = typeof field.name === 'object' && 'value' in field.name
                  ? Number(field.name.value)
                  : Number(field.name);

                if (fieldKey === tournamentId) {
                  // Found the matching field - try to extract tournament object ID
                  const fieldObj = await client.getObject({
                    id: field.objectId,
                    options: { showContent: true, showType: true },
                  });

                  if (fieldObj.data?.type?.includes('Tournament')) {
                    tournamentObject = {
                      objectId: field.objectId,
                      type: 'created',
                      objectType: fieldObj.data.type,
                    };
                    MigrationLogger.debug('✅ Found tournament by iterating all fields', {
                      tournamentId,
                      tournamentObjectId: field.objectId,
                    });
                    break;
                  } else if (fieldObj.data?.content) {
                    const fields = (fieldObj.data.content as any).fields;
                    let tournamentObjId: string | null = null;

                    if (fields?.value) {
                      tournamentObjId = typeof fields.value === 'string' 
                        ? fields.value 
                        : (fields.value?.fields?.id || fields.value?.id || null);
                    }

                    if (tournamentObjId) {
                      const tournamentObj = await client.getObject({
                        id: tournamentObjId,
                        options: { showType: true },
                      });

                      if (tournamentObj.data?.type?.includes('Tournament')) {
                        tournamentObject = {
                          objectId: tournamentObjId,
                          type: 'created',
                          objectType: tournamentObj.data.type,
                        };
                        MigrationLogger.debug('✅ Found tournament by iterating all fields (nested)', {
                          tournamentId,
                          tournamentObjectId: tournamentObjId,
                        });
                        break;
                      }
                    }
                  }
                }
              } catch (e) {
                // Skip fields that don't match
                continue;
              }
            }
          } catch (error) {
            MigrationLogger.debug('Error querying all dynamic fields', {
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }

        // Fallback 2: Try to find tournament in transaction object changes (if available)
        if (!tournamentObject) {
          MigrationLogger.debug('Trying transaction object changes as final fallback', {
            tournamentId,
            txDigest: tournamentEvent.id.txDigest,
          });

          try {
            const tx = await client.getTransactionBlock({
              digest: tournamentEvent.id.txDigest,
              options: {
                showEvents: true,
                showObjectChanges: true,
                showInput: false,
              },
            });

            if (tx.objectChanges && tx.objectChanges.length > 0) {
              const foundChange = tx.objectChanges.find((change: any) =>
                change &&
                'type' in change &&
                'objectId' in change &&
                'objectType' in change &&
                change.type === 'created' && 
                change.objectType?.includes('Tournament') &&
                !change.objectType?.includes('Registry')
              );
              tournamentObject = foundChange && 'objectId' in foundChange && 'objectType' in foundChange
                ? { objectId: foundChange.objectId, type: foundChange.type, objectType: foundChange.objectType }
                : null;

              if (tournamentObject) {
                MigrationLogger.debug('Found tournament in transaction object changes', {
                  tournamentId,
                  tournamentObjectId: tournamentObject.objectId,
                });
              }
            } else {
              MigrationLogger.debug('Transaction has no object changes', {
                txDigest: tournamentEvent.id.txDigest,
              });
            }
          } catch (txError) {
            MigrationLogger.debug('Error fetching transaction', {
              error: txError instanceof Error ? txError.message : String(txError),
            });
          }
        }


        if (!tournamentObject || !tournamentObject.objectId) {
          MigrationLogger.error('Tournament object not found after all attempts', {
            tournamentId,
            txDigest: tournamentEvent.id.txDigest,
            oldPackageId,
            oldTournamentRegistryId,
          });
          return {
            success: false,
            error: `Tournament object not found in transaction ${tournamentEvent.id.txDigest}. Tried: object changes, registry table lookup, and devInspect. Tournament may not exist or may be in a different format.`,
          };
        }

        const tournamentObjectId = tournamentObject.objectId;

        // Read the tournament object to get full data
        const tournamentObj = await client.getObject({
          id: tournamentObjectId,
          options: { showContent: true, showType: true },
        });

        if (tournamentObj.error || !tournamentObj.data?.content) {
          return {
            success: false,
            error: `Failed to read tournament object ${tournamentObjectId}`,
          };
        }

        const fields = (tournamentObj.data.content as any).fields;
        const eventData = tournamentEvent.parsedJson as any;
        
        // Decode name from vector<u8>
        const nameBytes = fields.name || [];
        const name = new TextDecoder().decode(new Uint8Array(nameBytes));

        // Read participants table
        const participants: Array<{
          address: string;
          ticket_id: number;
          ticket_value_usd_cents: number;
          entered_at: number;
        }> = [];
        
        // Read leaderboard table
        const leaderboard: Array<{
          address: string;
          score: number;
          playerName?: string; // Player name from events
        }> = [];

        // Get participants table ID
        const participantsTableId = fields.participants?.fields?.id?.id || null;
        MigrationLogger.debug('Reading participants table', {
          tournamentId,
          hasParticipantsField: !!fields.participants,
          participantsTableId,
        });
        
        if (participantsTableId) {
          try {
            const participantFields = await client.getDynamicFields({
              parentId: participantsTableId,
              limit: 1000,
            });
            
            MigrationLogger.info('Found participants in old tournament', {
              count: participantFields.data.length,
              tournamentId,
              participantsTableId,
            });
            
            for (const field of participantFields.data) {
              try {
                // The key is the player address
                const playerAddress = typeof field.name === 'object' && 'value' in field.name 
                  ? String(field.name.value) 
                  : String(field.name);
                
                // Read the entry object
                const entryObj = await client.getObject({
                  id: field.objectId,
                  options: { showContent: true },
                });
                
                if (entryObj.data?.content) {
                  const entryFields = (entryObj.data.content as any).fields?.value?.fields || 
                                     (entryObj.data.content as any).fields || {};
                  
                  participants.push({
                    address: playerAddress,
                    ticket_id: Number(entryFields.ticket_id || 0),
                    ticket_value_usd_cents: Number(entryFields.ticket_value_usd_cents || 0),
                    entered_at: Number(entryFields.entered_at || 0),
                  });
                }
              } catch (e) {
                MigrationLogger.debug('Error reading participant entry', { error: e });
              }
            }
          } catch (e) {
            MigrationLogger.error('Error reading participants table', {
              error: e instanceof Error ? e.message : String(e),
              tournamentId,
              participantsTableId,
            });
          }
        } else {
          MigrationLogger.warn('No participants table found in old tournament', {
            tournamentId,
            hasParticipantsField: !!fields.participants,
          });
        }

        // Get leaderboard table ID
        const leaderboardTableId = fields.leaderboard?.fields?.id?.id || null;
        MigrationLogger.debug('Reading leaderboard table', {
          tournamentId,
          hasLeaderboardField: !!fields.leaderboard,
          leaderboardTableId,
        });
        
        if (leaderboardTableId) {
          try {
            const leaderboardFields = await client.getDynamicFields({
              parentId: leaderboardTableId,
              limit: 1000,
            });
            
            MigrationLogger.info('Found leaderboard entries in old tournament', {
              count: leaderboardFields.data.length,
              tournamentId,
              leaderboardTableId,
            });
            
            for (const field of leaderboardFields.data) {
              try {
                // The key is the player address
                const playerAddress = typeof field.name === 'object' && 'value' in field.name 
                  ? String(field.name.value) 
                  : String(field.name);
                
                let score = 0;
                let entryContent: any = null;
                
                // Try reading using getDynamicFieldObject first (proper way to read table entries)
                // Old contract stored Table<address, u64> (just score), not LeaderboardEntry struct
                try {
                  const entryField = await client.getDynamicFieldObject({
                    parentId: leaderboardTableId,
                    name: field.name,
                  });
                  
                  if (entryField.data?.content) {
                    entryContent = entryField.data.content as any;
                  }
                } catch (dynamicFieldError) {
                  // Fallback: try reading the object directly
                  MigrationLogger.debug('getDynamicFieldObject failed, trying direct object read', {
                    playerAddress,
                    error: dynamicFieldError instanceof Error ? dynamicFieldError.message : String(dynamicFieldError),
                  });
                  
                  try {
                    const scoreObj = await client.getObject({
                      id: field.objectId,
                      options: { showContent: true },
                    });
                    
                    if (scoreObj.data?.content) {
                      entryContent = scoreObj.data.content as any;
                    }
                  } catch (objectError) {
                    MigrationLogger.debug('Direct object read also failed', {
                      playerAddress,
                      error: objectError instanceof Error ? objectError.message : String(objectError),
                    });
                  }
                }
                
                if (entryContent) {
                  // Handle different storage formats:
                  // 1. LeaderboardEntry struct: { fields: { value: u64, player_name: vector<u8> } }
                  //    The value might be nested: { fields: { value: { fields: { value: u64 } } } }
                  // 2. Direct u64 value (old contract format - Table<address, u64>)
                  
                  // Try LeaderboardEntry struct format first (new contract format)
                  if (entryContent.fields && typeof entryContent.fields === 'object') {
                    // Check if value is nested (wrapped in another struct)
                    if (entryContent.fields.value?.fields?.value !== undefined) {
                      const nestedValue = entryContent.fields.value.fields.value;
                      score = typeof nestedValue === 'string' 
                        ? parseInt(nestedValue, 10) || 0
                        : (typeof nestedValue === 'number' ? nestedValue : Number(nestedValue) || 0);
                    } else if (entryContent.fields.value !== undefined) {
                      const value = entryContent.fields.value;
                      score = typeof value === 'string' 
                        ? parseInt(value, 10) || 0
                        : (typeof value === 'number' ? value : Number(value) || 0);
                    }
                  } 
                  // Try direct value access
                  else if (typeof entryContent === 'object' && 'value' in entryContent) {
                    score = Number(entryContent.value) || 0;
                  } 
                  // Try direct number/string
                  else if (typeof entryContent === 'number' || typeof entryContent === 'string') {
                    score = Number(entryContent) || 0;
                  }
                  // Try fields as direct number (edge case)
                  else if (entryContent.fields !== undefined && (typeof entryContent.fields === 'number' || typeof entryContent.fields === 'string')) {
                    score = Number(entryContent.fields) || 0;
                  }
                  
                  // Log if we couldn't extract a score (but still try to add it if entryContent exists)
                  if (score === 0 && entryContent) {
                    MigrationLogger.debug('Score is 0 or could not extract score from leaderboard entry', {
                      playerAddress,
                      hasFields: !!entryContent.fields,
                      fieldsType: typeof entryContent.fields,
                      entryContentKeys: entryContent.fields ? Object.keys(entryContent.fields) : [],
                      entryContentPreview: JSON.stringify(entryContent).substring(0, 300),
                    });
                  }
                  
                  // Add to leaderboard even if score is 0 (might be valid)
                  leaderboard.push({
                    address: playerAddress,
                    score,
                  });
                } else {
                  MigrationLogger.debug('Leaderboard entry has no content', {
                    playerAddress,
                    objectId: field.objectId,
                  });
                }
              } catch (e) {
                MigrationLogger.debug('Error reading leaderboard entry', { 
                  error: e instanceof Error ? e.message : String(e),
                  playerAddress: typeof field.name === 'object' && 'value' in field.name 
                    ? String(field.name.value) 
                    : String(field.name),
                });
              }
            }
          } catch (e) {
            MigrationLogger.error('Error reading leaderboard table', {
              error: e instanceof Error ? e.message : String(e),
              tournamentId,
              leaderboardTableId,
            });
          }
        } else {
          MigrationLogger.warn('No leaderboard table found in old tournament', {
            tournamentId,
            hasLeaderboardField: !!fields.leaderboard,
          });
        }

        // Parse distribution_status - handle both old (rewards_distributed: bool) and new (distribution_status: u8) formats
        const distributionStatus = fields.distribution_status !== undefined 
          ? Number(fields.distribution_status) 
          : (Boolean(fields.rewards_distributed) ? 1 : 0);

        // Query TournamentScoreUpdated events to get player names and reconstruct leaderboard if table is empty
        // Old tournaments may have stored leaderboard data only in events, not in the table
        // Also check older package IDs if data not found in current old package
        const nameMap = new Map<string, string>();
        const eventScoreMap = new Map<string, number>(); // Track highest score per player from events
        
        // List of package IDs to check (from newest to oldest)
        // The 2025-12-23 package has leaderboard data for some tournaments
        const packageIdsToCheck = [
          oldPackageId, // Current OLD package
          '0x93e6bcb4da6728f47e0006eb3acc0016aae21f6d25cf6f80d5476d176413c352', // 2025-12-23
          '0x7c0f06e479d4e53d35e03ed24f3ab9374da5fd6e04434f3bd1c92cf9f70766e0', // 2025-12-22
          '0x25b5142a89b49e973b983c7de0f808078f2e0ba7b1b4bba0def6eca6ebfa0d3a', // 2025-12-17
        ];
        
        try {
          MigrationLogger.debug('Querying TournamentScoreUpdated events from multiple package versions', {
            tournamentId,
            leaderboardCount: leaderboard.length,
            willReconstructFromEvents: leaderboard.length === 0,
            packagesToCheck: packageIdsToCheck.length,
          });

          // Query events from all package versions
          const allEvents = [];
          for (const packageId of packageIdsToCheck) {
            try {
              const events = await client.queryEvents({
                query: {
                  MoveModule: {
                    package: packageId,
                    module: 'tournaments',
                  },
                },
                limit: 1000,
                order: 'descending',
              });
              
              MigrationLogger.debug(`Queried events from package ${packageId.substring(0, 16)}...`, {
                tournamentId,
                eventsFound: events.data.length,
              });
              
              allEvents.push(...events.data);
            } catch (packageError) {
              MigrationLogger.debug(`Error querying package ${packageId.substring(0, 16)}...`, {
                tournamentId,
                error: packageError instanceof Error ? packageError.message : String(packageError),
              });
              // Continue to next package
            }
          }
          
          MigrationLogger.debug('Total events collected from all packages', {
            tournamentId,
            totalEvents: allEvents.length,
          });

          const decodeBytes = (bytes: any): string => {
            if (!bytes) return '';
            if (typeof bytes === 'string') return bytes;
            if (Array.isArray(bytes)) {
              const uint8Array = new Uint8Array(bytes);
              return new TextDecoder().decode(uint8Array).trim();
            }
            return '';
          };

          for (const event of allEvents) {
            if (event.type?.includes('TournamentScoreUpdated')) {
              const eventData = event.parsedJson as any;
              const eventTournamentId = Number(eventData.tournament_id || 0);
              
              if (eventTournamentId === tournamentId) {
                const player = typeof eventData.player === 'string' 
                  ? eventData.player 
                  : String(eventData.player?.[0] || '');
                
                if (player) {
                  // Extract score from event
                  const score = Number(eventData.value || 0);
                  
                  // Keep highest score per player (reconstruct leaderboard from events)
                  if (!eventScoreMap.has(player) || eventScoreMap.get(player)! < score) {
                    eventScoreMap.set(player, score);
                  }
                  
                  // Extract player name
                  if (eventData.player_name) {
                    const playerName = decodeBytes(eventData.player_name);
                    if (playerName && !nameMap.has(player.toLowerCase())) {
                      nameMap.set(player.toLowerCase(), playerName);
                    }
                  }
                }
              }
            }
          }

          MigrationLogger.info('Found data from TournamentScoreUpdated events', {
            tournamentId,
            namesFound: nameMap.size,
            scoresFound: eventScoreMap.size,
            leaderboardFromTable: leaderboard.length,
            leaderboardFromEvents: eventScoreMap.size,
          });
          
          // If table is empty but we found scores in events, reconstruct leaderboard from events
          if (leaderboard.length === 0 && eventScoreMap.size > 0) {
            MigrationLogger.info('Leaderboard table is empty but scores found in events - reconstructing from events', {
              tournamentId,
              eventScoresCount: eventScoreMap.size,
            });
            
            // Reconstruct leaderboard from events
            for (const [playerAddress, score] of eventScoreMap.entries()) {
              leaderboard.push({
                address: playerAddress,
                score,
              });
            }
            
            MigrationLogger.info('Reconstructed leaderboard from events', {
              tournamentId,
              leaderboardCount: leaderboard.length,
            });
          }
        } catch (eventError) {
          MigrationLogger.warn('Could not query events (non-critical)', {
            tournamentId,
            error: eventError instanceof Error ? eventError.message : String(eventError),
          });
        }

        // Add player names to leaderboard entries (from events or table)
        for (const entry of leaderboard) {
          const name = nameMap.get(entry.address.toLowerCase());
          if (name) {
            entry.playerName = name;
          }
        }

        MigrationLogger.info('Read tournament data from old contract', {
          tournamentId,
          name,
          participantsCount: participants.length,
          leaderboardCount: leaderboard.length,
          leaderboardWithNames: leaderboard.filter(l => l.playerName).length,
          distributionStatus,
          hasParticipantsTable: !!participantsTableId,
          hasLeaderboardTable: !!leaderboardTableId,
          participantsTableId,
          leaderboardTableId,
          hasDistributionStatusField: fields.distribution_status !== undefined,
          hasRewardsDistributedField: fields.rewards_distributed !== undefined,
          rawDistributionStatus: fields.distribution_status,
          rawRewardsDistributed: fields.rewards_distributed,
        });
        
        // Log participant details if any exist
        if (participants.length > 0) {
          MigrationLogger.info('Tournament has participants', {
            tournamentId,
            participantCount: participants.length,
            participantAddresses: participants.slice(0, 5).map(p => p.address),
          });
        } else {
          MigrationLogger.info('Tournament has NO participants', {
            tournamentId,
            participantsTableId,
          });
        }
        
        // Log leaderboard details if any exist
        if (leaderboard.length > 0) {
          MigrationLogger.info('Tournament has leaderboard entries', {
            tournamentId,
            leaderboardCount: leaderboard.length,
            topScores: leaderboard.slice(0, 5).map(l => ({ address: l.address, score: l.score })),
          });
        } else {
          MigrationLogger.info('Tournament has NO leaderboard entries', {
            tournamentId,
            leaderboardTableId,
          });
        }

        return {
          success: true,
          tournament: {
            tournament_id: Number(fields.tournament_id || tournamentId),
            name,
            category: Number(fields.category || eventData.category || 0),
            start_time: Number(fields.start_time || eventData.start_time || 0),
            end_time: Number(fields.end_time || eventData.end_time || 0),
            entry_fee_tickets: Number(fields.entry_fee_tickets || eventData.entry_fee_tickets || 1),
            prize_pool_usd_cents: Number(fields.prize_pool_usd_cents || 0),
            created_at: Number(fields.created_at || eventData.timestamp || 0),
            object_id: tournamentObjectId,
            distribution_status: distributionStatus,
            participants,
            leaderboard,
          },
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        MigrationLogger.debug('Error reading old tournament', { errorMessage });
        return {
          success: false,
          error: errorMessage,
        };
      }
    } catch (error) {
      MigrationLogger.error('Error reading old tournament', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Migrate tournament from old TournamentRegistry to new TournamentRegistry
   */
  async migrateTournament(
    tournamentId: number,
    oldPackageId: string,
    oldTournamentRegistryId: string,
    oldTournamentAdminCapId: string
  ): Promise<{
    success: boolean;
    digest?: string;
    error?: string;
  }> {
    try {
      // 1. Read tournament from old system
      MigrationLogger.debug(`Reading tournament ${tournamentId} from old system`);
      const oldTournament = await this.readOldTournament(oldPackageId, oldTournamentRegistryId, tournamentId);
      
      if (!oldTournament.success || !oldTournament.tournament) {
        return {
          success: false,
          error: oldTournament.error || 'Failed to read old tournament',
        };
      }

      const tournament = oldTournament.tournament;
      MigrationLogger.info('Old tournament data read successfully', {
        tournamentId,
        name: tournament.name,
        participantsCount: tournament.participants.length,
        leaderboardCount: tournament.leaderboard.length,
        distributionStatus: tournament.distribution_status,
        prizePoolUsdCents: tournament.prize_pool_usd_cents,
        hasParticipants: tournament.participants.length > 0,
        hasLeaderboard: tournament.leaderboard.length > 0,
        participantDetails: tournament.participants.slice(0, 3).map(p => ({
          address: p.address,
          ticketId: p.ticket_id,
          ticketValue: p.ticket_value_usd_cents,
        })),
        leaderboardDetails: tournament.leaderboard.slice(0, 3).map(l => ({
          address: l.address,
          score: l.score,
          hasName: !!l.playerName,
        })),
      });

      // 2. Get new system configuration
      const newPackageId = this.getPackageId();
      const newTournamentRegistryId = this.getTournamentRegistryId();
      const newTournamentAdminCapId = this.getTournamentAdminCapId();

      if (!newTournamentRegistryId || !newTournamentAdminCapId) {
        return {
          success: false,
          error: `New tournament registry not configured. Missing: ${!newTournamentRegistryId ? 'TOURNAMENT_REGISTRY_ID_TESTNET' : ''} ${!newTournamentAdminCapId ? 'TOURNAMENT_ADMIN_CAP_ID_TESTNET' : ''}`,
        };
      }

      // Get network and client
      const network = this.config.sui.network;
      const client = network === 'testnet' 
        ? this.adminWallet.getTestnetClient()
        : this.adminWallet.getMainnetClient();

      // Verify the new admin capability object exists
      try {
        const adminCapObject = await client.getObject({
          id: newTournamentAdminCapId,
          options: { showType: true },
        });

        if (adminCapObject.error) {
          MigrationLogger.error(`Admin capability object not found: ${newTournamentAdminCapId}`);
          return {
            success: false,
            error: `Admin capability object not found: ${newTournamentAdminCapId}. Please verify TOURNAMENT_ADMIN_CAP_ID_TESTNET is correct.`,
          };
        }

        const objectType = adminCapObject.data?.type || 'unknown';
        
        // Verify it's the correct type
        if (!objectType.includes('tournaments::AdminCapability')) {
          return {
            success: false,
            error: `Wrong admin capability type! The object at ${newTournamentAdminCapId} is of type ${objectType}, but expected tournaments::AdminCapability.`,
          };
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        MigrationLogger.error('Could not verify admin capability object', { errorMessage });
        return {
          success: false,
          error: `Failed to verify admin capability object: ${errorMessage}. Please check that TOURNAMENT_ADMIN_CAP_ID_TESTNET is correct.`,
        };
      }

      // 3. Build migration transaction
      // Note: Tournaments don't have a migrate function in the contract yet
      // For now, we'll create a new tournament with the same data
      // In the future, a proper migrate function could preserve participants and scores
      MigrationLogger.transaction('Building tournament migration transaction');
      const txb = new Transaction();

      // Set sender first (required for transaction building)
      txb.setSender(this.adminWallet.getAddress());
      MigrationLogger.debug('Transaction sender set', { sender: this.adminWallet.getAddress() });

      // Convert name to vector<u8>
      const nameBytes = new TextEncoder().encode(tournament.name);

      // Check if tournament has ended
      const currentTime = Date.now();
      const hasEnded = tournament.end_time <= currentTime;

      // Validate time ranges before proceeding
      if (tournament.start_time >= tournament.end_time) {
        return {
          success: false,
          error: `Invalid time range: start_time (${tournament.start_time}) must be less than end_time (${tournament.end_time})`,
        };
      }

      // Calculate gas budget based on which path we'll use
      const baseGasBudget = this.config.sui.gasBudget;
      let gasBudget: number;

      // Use historical tournament function for ended tournaments to preserve original times
      // Use regular function for active/upcoming tournaments
      if (hasEnded) {
        // Historical tournament creation is simpler - use base gas budget
        gasBudget = baseGasBudget;
        
        MigrationLogger.debug('Tournament has ended, using historical tournament function to preserve original times', {
          originalStartTime: tournament.start_time,
          originalEndTime: tournament.end_time,
          currentTime,
          prizePoolUsdCents: tournament.prize_pool_usd_cents,
          gasBudget,
        });

        // Use admin_create_historical_tournament to preserve original times, prize pool, and distribution status
        txb.moveCall({
          target: `${newPackageId}::tournaments::admin_create_historical_tournament`,
          arguments: [
            txb.object(newTournamentRegistryId),
            txb.object(newTournamentAdminCapId),
            txb.pure.vector('u8', Array.from(nameBytes)),
            txb.pure.u8(tournament.category),
            txb.pure.u64(tournament.start_time),  // Preserve original start time
            txb.pure.u64(tournament.end_time),    // Preserve original end time
            txb.pure.u64(tournament.entry_fee_tickets),
            txb.pure.u64(tournament.prize_pool_usd_cents),  // Preserve original prize pool
            txb.pure.u8(tournament.distribution_status),      // Preserve distribution status from old tournament
            txb.object('0x6'), // Clock
          ],
        });
      } else {
        // create_tournament_default_rewards is complex with 17 arguments
        // Needs significantly more gas (3x base or base + 50_000_000)
        gasBudget = Math.max(baseGasBudget * 3, baseGasBudget + 50_000_000);
        MigrationLogger.debug('Tournament is active/upcoming, using regular tournament creation function', {
          startTime: tournament.start_time,
          endTime: tournament.end_time,
          currentTime,
        });

        // Use regular create_tournament for active/upcoming tournaments
        // Old tournaments don't have starting_ante_usd_cents, so use 0
        const startingAnteUSDCents = 0;
        
        // Get default reward config (same as tournament-service.ts)
        const defaultConfig = await this.getDefaultRewardConfig();
        
        // Convert itemRewards to parallel vectors
        const ranks: number[] = [];
        const itemIds: number[] = [];
        const levels: number[] = [];
        const quantities: number[] = [];
        
        const sortedRanks = Object.keys(defaultConfig.itemRewards)
          .map(Number)
          .sort((a, b) => a - b);
        
        for (const rank of sortedRanks) {
          const items = defaultConfig.itemRewards[rank] || [];
          for (const item of items) {
            ranks.push(rank);
            itemIds.push(this.itemIdToU8(item.itemId));
            levels.push(item.level);
            quantities.push(item.quantity);
          }
        }
        
        MigrationLogger.debug('Using default rewards for migration', {
          rewardDepth: defaultConfig.rewardDepth,
          poolDepth: defaultConfig.poolDepth,
          itemCount: ranks.length,
          gasBudget,
          gasBudgetSUI: (gasBudget / 1_000_000_000).toFixed(4),
        });
        
        txb.moveCall({
          target: `${newPackageId}::tournaments::create_tournament_default_rewards`,
          arguments: [
            txb.object(newTournamentRegistryId),
            txb.object(newTournamentAdminCapId),
            txb.pure.vector('u8', Array.from(nameBytes)),
            txb.pure.u8(tournament.category),
            txb.pure.u64(tournament.start_time),
            txb.pure.u64(tournament.end_time),
            txb.pure.u64(tournament.entry_fee_tickets),
            txb.pure.u8(defaultConfig.rewardDepth),
            txb.pure.u8(defaultConfig.poolDepth),
            txb.pure.vector('u64', defaultConfig.poolDistribution),
            txb.pure.u8(defaultConfig.poolSource || 0),
            txb.pure.vector('u8', ranks),
            txb.pure.vector('u8', itemIds),
            txb.pure.vector('u8', levels),
            txb.pure.vector('u64', quantities),
            txb.pure.u64(startingAnteUSDCents),
            txb.object('0x6'), // Clock
          ],
        });
      }

      MigrationLogger.debug('Tournament creation moveCall added to transaction');

      // Gas budget was calculated above based on which path was used
      MigrationLogger.debug('Gas budget for migration', {
        baseGasBudget,
        gasBudget,
        gasBudgetSUI: (gasBudget / 1_000_000_000).toFixed(4),
        hasEnded,
      });

      txb.setGasBudget(gasBudget);

      // Check wallet balance before building transaction
      const { checkBalanceBeforeTransaction } = await import('../balance-checker');
      await checkBalanceBeforeTransaction({
        client,
        walletAddress: this.adminWallet.getAddress(),
        gasBudget: gasBudget,
        context: 'migrate tournament',
      });

      // 4. Sign and execute with admin wallet using finalization helper
      // This ensures the tournament object is fully available before restoration
      MigrationLogger.transaction('Signing and executing tournament migration transaction');

      const { executeTransactionWithFinalization } = await import('../transaction-helpers');
      const result = await executeTransactionWithFinalization(
        client,
        this.adminWallet.getKeypair(),
        txb,
        {
          logger: {
            info: (msg, data) => MigrationLogger.info(`[MIGRATE TOURNAMENT] ${msg}`, data),
            warn: (msg, data) => MigrationLogger.warn(`[MIGRATE TOURNAMENT] ${msg}`, data),
            error: (msg, data) => MigrationLogger.error(`[MIGRATE TOURNAMENT] ${msg}`, data),
          },
        }
      );
      
      // Note: executeTransactionWithFinalization already includes showEffects, showEvents, and showObjectChanges

      if (result.effects?.status?.status === 'success') {
      MigrationLogger.transaction('Tournament created successfully, now restoring data', {
        digest: result.digest,
        oldTournamentId: tournamentId,
        participantsCount: tournament.participants.length,
        leaderboardCount: tournament.leaderboard.length,
        distributionStatus: tournament.distribution_status,
        endTime: tournament.end_time,
        currentTime: Date.now(),
        hasEnded: tournament.end_time <= Date.now(),
      });

        // Find the newly created tournament object ID from events
        let newTournamentObjectId: string | null = null;
        if (result.events) {
          for (const event of result.events) {
            if (event.type?.includes('TournamentCreated')) {
              // Get the tournament ID from the event
              const newTournamentId = (event.parsedJson as any)?.tournament_id;
              if (newTournamentId !== undefined) {
                // Look up the object ID from the transaction's object changes
                const tournamentObj = result.objectChanges?.find((change: any) =>
                  change.type === 'created' && 
                  change.objectType?.includes('Tournament') &&
                  !change.objectType?.includes('Registry')
                );
                if (tournamentObj) {
                  newTournamentObjectId = tournamentObj.objectId;
                }
              }
              break;
            }
          }
        }

        // Also check object changes directly if no event found
        if (!newTournamentObjectId && result.objectChanges) {
          const tournamentObj = result.objectChanges.find((change: any) =>
            change.type === 'created' && 
            change.objectType?.includes('Tournament') &&
            !change.objectType?.includes('Registry')
          );
          if (tournamentObj) {
            newTournamentObjectId = tournamentObj.objectId;
          }
        }

        if (!newTournamentObjectId) {
          MigrationLogger.warn('Could not find new tournament object ID, data restoration skipped', {
            tournamentId,
          });
          return {
            success: true,
            digest: result.digest,
          };
        }

        MigrationLogger.debug('Found new tournament object', {
          newTournamentObjectId,
          oldTournamentId: tournamentId,
        });

        // Transaction is already finalized by executeTransactionWithFinalization
        // No need for additional delay - the object is ready for restoration
        MigrationLogger.debug('Tournament object is finalized and ready for data restoration', {
          newTournamentObjectId,
          oldTournamentId: tournamentId,
        });

        // Restore participants and leaderboard data
        MigrationLogger.info('Starting data restoration for migrated tournament', {
          tournamentId,
          participantsCount: tournament.participants.length,
          leaderboardCount: tournament.leaderboard.length,
          newTournamentObjectId,
        });

        const restoreResult = await this.restoreTournamentData(
          client,
          newPackageId,
          newTournamentAdminCapId,
          newTournamentObjectId,
          {
            participants: tournament.participants,
            leaderboard: tournament.leaderboard,
            distribution_status: tournament.distribution_status,
            prize_pool_usd_cents: tournament.prize_pool_usd_cents,
            end_time: tournament.end_time,
          }
        );

        if (!restoreResult.success) {
          MigrationLogger.error('Tournament created but data restoration failed - migration incomplete', {
            tournamentId,
            error: restoreResult.error,
            participantsCount: tournament.participants.length,
            leaderboardCount: tournament.leaderboard.length,
          });
          
          // Migration should fail if data restoration fails
          return {
            success: false,
            error: `Tournament created but data restoration failed: ${restoreResult.error}. Tournament object ID: ${newTournamentObjectId}. You may need to run restoration manually.`,
            digest: result.digest,
          };
        }

        MigrationLogger.transaction('Tournament migration completed successfully with all data restored', {
          tournamentId,
          participantsCount: tournament.participants.length,
          leaderboardCount: tournament.leaderboard.length,
        });

        return {
          success: true,
          digest: result.digest,
        };
      } else {
        const error = result.effects?.status?.error || 'Unknown error';
        MigrationLogger.error('Tournament migration failed', error);
        return {
          success: false,
          error: `Migration failed: ${error}`,
        };
      }
    } catch (error) {
      MigrationLogger.error('Error migrating tournament', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Restore tournament data (participants, leaderboard, rewards_distributed)
   * Called after tournament creation to restore all data from old tournament
   */
  private async restoreTournamentData(
    client: any,
    packageId: string,
    adminCapId: string,
    tournamentObjectId: string,
    oldTournament: {
      participants: Array<{
        address: string;
        ticket_id: number;
        ticket_value_usd_cents: number;
        entered_at: number;
      }>;
      leaderboard: Array<{
        address: string;
        score: number;
        playerName?: string; // Player name from events
      }>;
      distribution_status: number; // 0=pending, 1=distributed, 2=no_participants, 3=no_rewards
      prize_pool_usd_cents: number;
      end_time: number; // Add end_time to check if tournament has ended
    }
  ): Promise<{
    success: boolean;
    digests?: string[];
    error?: string;
  }> {
    const digests: string[] = [];
    const baseGasBudget = this.config.sui.gasBudget;

    MigrationLogger.info('Starting tournament data restoration', {
      tournamentObjectId,
      participantsCount: oldTournament.participants.length,
      leaderboardCount: oldTournament.leaderboard.length,
      distributionStatus: oldTournament.distribution_status,
      prizePoolUsdCents: oldTournament.prize_pool_usd_cents,
      participants: oldTournament.participants.slice(0, 5).map(p => ({
        address: p.address,
        ticketId: p.ticket_id,
        ticketValue: p.ticket_value_usd_cents,
      })),
      leaderboard: oldTournament.leaderboard.slice(0, 5).map(l => ({
        address: l.address,
        score: l.score,
        hasName: !!l.playerName,
      })),
    });

    try {
      // Batch participants and leaderboard into chunks to avoid transaction size limits
      const BATCH_SIZE = 50; // Process 50 entries at a time

      // Restore participants in batches
      if (oldTournament.participants.length > 0) {
        MigrationLogger.info('Restoring participants', {
          tournamentObjectId,
          totalParticipants: oldTournament.participants.length,
          batches: Math.ceil(oldTournament.participants.length / BATCH_SIZE),
        });
        for (let i = 0; i < oldTournament.participants.length; i += BATCH_SIZE) {
          const batch = oldTournament.participants.slice(i, i + BATCH_SIZE);
          
          const addresses: string[] = [];
          const ticketIds: number[] = [];
          const ticketValues: number[] = [];
          const enteredAts: number[] = [];

          for (const p of batch) {
            addresses.push(p.address);
            ticketIds.push(p.ticket_id);
            ticketValues.push(p.ticket_value_usd_cents);
            enteredAts.push(p.entered_at);
          }

          MigrationLogger.debug('Restoring participants batch', {
            batchIndex: i / BATCH_SIZE,
            batchSize: batch.length,
            total: oldTournament.participants.length,
          });

          const txb = new Transaction();
          txb.setSender(this.adminWallet.getAddress());

          txb.moveCall({
            target: `${packageId}::tournaments::admin_restore_participants`,
            arguments: [
              txb.object(tournamentObjectId),
              txb.object(adminCapId),
              txb.pure.vector('address', addresses),
              txb.pure.vector('u64', ticketIds),
              txb.pure.vector('u64', ticketValues),
              txb.pure.vector('u64', enteredAts),
            ],
          });

          txb.setGasBudget(baseGasBudget);

          // Use executeTransactionWithFinalization to ensure transaction is finalized
          const { executeTransactionWithFinalization } = await import('../transaction-helpers');
          const result = await executeTransactionWithFinalization(
            client,
            this.adminWallet.getKeypair(),
            txb,
            {
              logger: {
                info: (msg, data) => MigrationLogger.info(`[RESTORE PARTICIPANTS] ${msg}`, data),
                warn: (msg, data) => MigrationLogger.warn(`[RESTORE PARTICIPANTS] ${msg}`, data),
                error: (msg, data) => MigrationLogger.error(`[RESTORE PARTICIPANTS] ${msg}`, data),
              },
            }
          );

          if (result.effects?.status?.status !== 'success') {
            MigrationLogger.error('Failed to restore participants batch', {
              error: result.effects?.status?.error,
            });
            return {
              success: false,
              digests,
              error: `Failed to restore participants: ${result.effects?.status?.error}`,
            };
          }

          digests.push(result.digest);
        }
      } else {
        MigrationLogger.info('No participants to restore', {
          tournamentObjectId,
          participantsCount: oldTournament.participants.length,
        });
      }

      // Restore leaderboard in batches
      if (oldTournament.leaderboard.length > 0) {
        MigrationLogger.info('Restoring leaderboard', {
          tournamentObjectId,
          totalLeaderboardEntries: oldTournament.leaderboard.length,
          batches: Math.ceil(oldTournament.leaderboard.length / BATCH_SIZE),
          entriesWithNames: oldTournament.leaderboard.filter(l => l.playerName).length,
        });
        for (let i = 0; i < oldTournament.leaderboard.length; i += BATCH_SIZE) {
          const batch = oldTournament.leaderboard.slice(i, i + BATCH_SIZE);
          
          const addresses: string[] = [];
          const scores: number[] = [];
          const playerNames: number[] = [];

          for (const l of batch) {
            addresses.push(l.address);
            scores.push(l.score);
            // Convert player name to vector<u8> (empty if no name)
            const nameBytes = l.playerName 
              ? Array.from(new TextEncoder().encode(l.playerName))
              : [];
            playerNames.push(...nameBytes);
            // For vector<vector<u8>>, we need to encode each name separately
            // Actually, we need to pass it as a vector of vectors
          }

          MigrationLogger.debug('Restoring leaderboard batch', {
            batchIndex: i / BATCH_SIZE,
            batchSize: batch.length,
            total: oldTournament.leaderboard.length,
            namesIncluded: batch.filter(l => l.playerName).length,
          });

          // Convert player names to vector<vector<u8>> format
          // Each name needs to be a separate vector<u8>
          const playerNameVectors: number[][] = batch.map(l => 
            l.playerName 
              ? Array.from(new TextEncoder().encode(l.playerName))
              : []
          );

          const txb = new Transaction();
          txb.setSender(this.adminWallet.getAddress());

          // The Sui SDK's txb.pure should support nested vectors when passed as array of arrays
          // Try using the string type format - if this fails, we'll need to check transaction errors
          MigrationLogger.debug('Preparing leaderboard restoration transaction', {
            batchSize: batch.length,
            addressesCount: addresses.length,
            scoresCount: scores.length,
            playerNamesCount: playerNameVectors.length,
            playerNamesStructure: playerNameVectors.map(v => ({ length: v.length, preview: v.slice(0, 5) })),
          });

          txb.moveCall({
            target: `${packageId}::tournaments::admin_restore_leaderboard`,
            arguments: [
              txb.object(tournamentObjectId),
              txb.object(adminCapId),
              txb.pure.vector('address', addresses),
              txb.pure.vector('u64', scores),
              // Try passing nested vector as array of arrays - SDK should handle serialization
              // If this doesn't work, the transaction will fail and we'll see the error
              txb.pure('vector<vector<u8>>', playerNameVectors),
            ],
          });

          txb.setGasBudget(baseGasBudget);

          // Use executeTransactionWithFinalization to ensure transaction is finalized
          // This prevents version mismatch errors when restoring data
          const { executeTransactionWithFinalization } = await import('../transaction-helpers');
          const result = await executeTransactionWithFinalization(
            client,
            this.adminWallet.getKeypair(),
            txb,
            {
              logger: {
                info: (msg, data) => MigrationLogger.info(`[RESTORE LEADERBOARD] ${msg}`, data),
                warn: (msg, data) => MigrationLogger.warn(`[RESTORE LEADERBOARD] ${msg}`, data),
                error: (msg, data) => MigrationLogger.error(`[RESTORE LEADERBOARD] ${msg}`, data),
              },
            }
          );

          if (result.effects?.status?.status !== 'success') {
            MigrationLogger.error('Failed to restore leaderboard batch', {
              error: result.effects?.status?.error,
            });
            return {
              success: false,
              digests,
              error: `Failed to restore leaderboard: ${result.effects?.status?.error}`,
            };
          }

          digests.push(result.digest);
        }
      } else {
        MigrationLogger.info('No leaderboard entries to restore', {
          tournamentObjectId,
          leaderboardCount: oldTournament.leaderboard.length,
        });
      }

      // Distribution status is already set correctly during tournament creation
      // No need to restore it separately - it's passed as a parameter to admin_create_historical_tournament
      MigrationLogger.info('Tournament data restoration completed successfully', {
        tournamentObjectId,
        distributionStatus: oldTournament.distribution_status,
        participantsRestored: oldTournament.participants.length,
        leaderboardRestored: oldTournament.leaderboard.length,
        totalDigests: digests.length,
        digests,
      });

      return {
        success: true,
        digests,
      };
    } catch (error) {
      MigrationLogger.error('Error restoring tournament data', error);
      return {
        success: false,
        digests,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get package ID for tournaments
   */
  private getPackageId(): string {
    const contractAddress = this.config.contracts.gameScore || '';
    if (!contractAddress) {
      throw new Error('Game score contract not configured');
    }
    return contractAddress.includes('::') 
      ? contractAddress.split('::')[0]
      : contractAddress;
  }

  /**
   * Get tournament registry object ID
   */
  private getTournamentRegistryId(): string {
    return this.config.contracts.tournamentRegistry || '';
  }

  /**
   * Get tournament admin capability object ID
   */
  private getTournamentAdminCapId(): string {
    return this.config.contracts.tournamentAdminCap || '';
  }

  /**
   * Get default reward config structure
   * Loads from admin-configured defaults (stored in file) or uses system defaults
   */
  private async getDefaultRewardConfig(): Promise<{
    rewardDepth: number;
    poolDepth: number;
    poolDistribution: number[];
    poolSource: number;
    itemRewards: Record<number, Array<{ itemId: string; level: number; quantity: number }>>;
  }> {
    try {
      // Try to load from admin-configured defaults
      const configUrl = process.env.API_BASE_URL || 'http://localhost:3000';
      const response = await fetch(`${configUrl}/api/admin/tournaments/default-rewards`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.config) {
          MigrationLogger.debug('⚙️ [DEFAULT REWARDS] Loaded admin-configured default rewards');
          return data.config;
        }
      }
    } catch (error) {
      MigrationLogger.debug('⚙️ [DEFAULT REWARDS] Failed to load admin-configured defaults, using system defaults', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    // Fall back to system defaults based on documented reward structure
    // "random" is resolved at distribution time to a random basic L1 item
    const itemRewards: Record<number, Array<{ itemId: string; level: number; quantity: number }>> = {
      1: [
        { itemId: 'destroyAll', level: 1, quantity: 1 },
        { itemId: 'bossKillShot', level: 1, quantity: 1 },
        { itemId: 'random', level: 1, quantity: 1 },
      ],
      2: [
        { itemId: 'bossKillShot', level: 1, quantity: 1 },
        { itemId: 'random', level: 1, quantity: 1 },
      ],
      3: [
        { itemId: 'destroyAll', level: 1, quantity: 1 },
        { itemId: 'random', level: 1, quantity: 1 },
      ],
      4: [{ itemId: 'random', level: 1, quantity: 1 }],
      5: [{ itemId: 'random', level: 1, quantity: 1 }],
      6: [{ itemId: 'random', level: 1, quantity: 1 }],
      7: [{ itemId: 'random', level: 1, quantity: 1 }],
      8: [{ itemId: 'random', level: 1, quantity: 1 }],
      9: [{ itemId: 'random', level: 1, quantity: 1 }],
      10: [{ itemId: 'random', level: 1, quantity: 1 }],
    };

    const systemDefaults = {
      rewardDepth: 10,
      poolDepth: 3,
      poolDistribution: [50, 30, 20],
      poolSource: 0, // Prize Pool
      itemRewards,
    };

    MigrationLogger.debug('⚙️ [DEFAULT REWARDS] Using system default rewards');
    return systemDefaults;
  }

  /**
   * Convert item ID string to u8 value
   */
  private itemIdToU8(itemId: string): number {
    const map: Record<string, number> = {
      'orbLevel': 0,
      'forceField': 1,
      'extraLives': 2,
      'slowTime': 3,
      'coinTractorBeam': 4,
      'destroyAll': 5,
      'bossKillShot': 6,
      'random': 255, // Special value - resolved to random L1 item at distribution time
    };
    return map[itemId] ?? 0;
  }

  /**
   * Restore data for an already-migrated tournament
   * This is useful when a tournament was created but data restoration failed
   * If newTournamentId is not provided, it will try to find the tournament by matching properties
   * 
   * @param oldTournamentId - Tournament ID in the old system
   * @param newTournamentId - Tournament ID in the new system (null to auto-find)
   * @param oldPackageId - Package ID to read events from (can be older package like 2025-12-23)
   * @param oldTournamentRegistryId - Registry ID in old system (optional - if empty, will reconstruct from events only)
   */
  async restoreDataForMigratedTournament(
    oldTournamentId: number,
    newTournamentId: number | null,
    oldPackageId: string,
    oldTournamentRegistryId: string
  ): Promise<{
    success: boolean;
    digests?: string[];
    newTournamentId?: number;
    error?: string;
  }> {
    try {
      MigrationLogger.debug('Restoring data for already-migrated tournament', {
        oldTournamentId,
        newTournamentId,
        oldPackageId,
        hasRegistryId: !!oldTournamentRegistryId,
      });

      // 1. Read old tournament data
      // If registryId is empty, readOldTournament will still try to reconstruct from events
      const oldTournament = await this.readOldTournament(
        oldPackageId,
        oldTournamentRegistryId || '', // Allow empty - will use events
        oldTournamentId
      );

      if (!oldTournament.success || !oldTournament.tournament) {
        return {
          success: false,
          error: oldTournament.error || 'Failed to read old tournament data',
        };
      }

      const tournament = oldTournament.tournament;

      // 2. Find the new tournament object ID in the new registry
      const newPackageId = this.getPackageId();
      const newTournamentRegistryId = this.getTournamentRegistryId();
      const newTournamentAdminCapId = this.getTournamentAdminCapId();

      if (!newTournamentRegistryId || !newTournamentAdminCapId) {
        return {
          success: false,
          error: 'New tournament registry not configured',
        };
      }

      const network = this.config.sui.network;
      const client = network === 'testnet' 
        ? this.adminWallet.getTestnetClient()
        : this.adminWallet.getMainnetClient();

      // Query the new registry to find the tournament object ID
      let newTournamentObjectId: string | null = null;
      let foundNewTournamentId: number | null = null;

      try {
        const registryObj = await client.getObject({
          id: newTournamentRegistryId,
          options: { showContent: true },
        });

        if (registryObj.data?.content) {
          const registryFields = (registryObj.data.content as any).fields;
          const tournamentsTableId = registryFields?.tournaments?.fields?.id?.id;

          if (tournamentsTableId) {
            // If newTournamentId is provided, use it directly
            if (newTournamentId !== null) {
              const tournamentKey = {
                type: 'u64',
                value: newTournamentId,
              };

              const tournamentField = await client.getDynamicFieldObject({
                parentId: tournamentsTableId,
                name: tournamentKey,
              });

              if (tournamentField.data && tournamentField.data.objectId) {
                const fieldObj = await client.getObject({
                  id: tournamentField.data.objectId,
                  options: { showContent: true, showType: true },
                });

                if (fieldObj.data?.type?.includes('Tournament')) {
                  newTournamentObjectId = tournamentField.data.objectId;
                  foundNewTournamentId = newTournamentId;
                } else if (fieldObj.data?.content) {
                  const fields = (fieldObj.data.content as any).fields;
                  if (fields?.value) {
                    newTournamentObjectId = typeof fields.value === 'string' 
                      ? fields.value 
                      : (fields.value?.fields?.id || fields.value?.id || null);
                    
                    if (newTournamentObjectId) {
                      const tournamentObj = await client.getObject({
                        id: newTournamentObjectId,
                        options: { showType: true },
                      });

                      if (tournamentObj.data?.type?.includes('Tournament')) {
                        foundNewTournamentId = newTournamentId;
                      } else {
                        newTournamentObjectId = null;
                      }
                    }
                  }
                }
              }
            } else {
              // Find tournament by matching properties (name, start_time, end_time)
              MigrationLogger.debug('Finding tournament by matching properties', {
                name: tournament.name,
                startTime: tournament.start_time,
                endTime: tournament.end_time,
              });

              // Query all tournaments and find the one that matches
              const allFields = await client.getDynamicFields({
                parentId: tournamentsTableId,
                limit: 1000,
              });

              for (const field of allFields.data) {
                try {
                  const fieldKey = typeof field.name === 'object' && 'value' in field.name
                    ? Number(field.name.value)
                    : Number(field.name);

                  let candidateTournamentId: string | null = field.objectId;
                  const fieldObj = await client.getObject({
                    id: field.objectId,
                    options: { showContent: true, showType: true },
                  });

                  if (fieldObj.data?.type?.includes('Tournament')) {
                    candidateTournamentId = field.objectId;
                  } else if (fieldObj.data?.content) {
                    const fields = (fieldObj.data.content as any).fields;
                    if (fields?.value) {
                      candidateTournamentId = typeof fields.value === 'string' 
                        ? fields.value 
                        : (fields.value?.fields?.id || fields.value?.id || null);
                    }
                  }

                  if (candidateTournamentId) {
                    const tournamentObj = await client.getObject({
                      id: candidateTournamentId,
                      options: { showContent: true, showType: true },
                    });

                    if (tournamentObj.data?.content && tournamentObj.data.type?.includes('Tournament')) {
                      const fields = (tournamentObj.data.content as any).fields;
                      const nameBytes = fields.name || [];
                      const name = new TextDecoder().decode(new Uint8Array(nameBytes));
                      const startTime = Number(fields.start_time || 0);
                      const endTime = Number(fields.end_time || 0);

                      // Match by name, start_time, and end_time
                      if (name === tournament.name && 
                          startTime === tournament.start_time && 
                          endTime === tournament.end_time) {
                        newTournamentObjectId = candidateTournamentId;
                        foundNewTournamentId = fieldKey;
                        MigrationLogger.debug('Found matching tournament', {
                          newTournamentId: fieldKey,
                          newTournamentObjectId,
                        });
                        break;
                      }
                    }
                  }
                } catch (e) {
                  continue;
                }
              }
            }
          }
        }
      } catch (error) {
        MigrationLogger.debug('Error finding new tournament object', {
          error: error instanceof Error ? error.message : String(error),
        });
      }

      if (!newTournamentObjectId) {
        return {
          success: false,
          error: `Could not find new tournament object. ${newTournamentId !== null ? `Tournament ${newTournamentId} may not exist in the new registry.` : 'No tournament matching the old tournament properties was found.'}`,
        };
      }

      MigrationLogger.debug('Found new tournament object', {
        newTournamentId: foundNewTournamentId,
        newTournamentObjectId,
      });

      // 3. Restore the data
      const restoreResult = await this.restoreTournamentData(
        client,
        newPackageId,
        newTournamentAdminCapId,
        newTournamentObjectId,
        {
          participants: tournament.participants,
          leaderboard: tournament.leaderboard,
          distribution_status: tournament.distribution_status,
          prize_pool_usd_cents: tournament.prize_pool_usd_cents,
          end_time: tournament.end_time,
        }
      );

      return {
        ...restoreResult,
        newTournamentId: foundNewTournamentId ?? undefined,
      };
    } catch (error) {
      MigrationLogger.error('Error restoring data for migrated tournament', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

