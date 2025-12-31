// Stats migration service for transferring player statistics from old StatisticsRegistry to new StatisticsRegistry
import { Transaction } from '@mysten/sui/transactions';
import { AdminWalletService } from '../admin-wallet-service';
import { getConfig } from '@/config/config';
import { MigrationLogger } from '../migration-logger';

export class StatsMigrationService {
  private adminWallet: AdminWalletService;
  private config: ReturnType<typeof getConfig>;

  constructor(adminWallet: AdminWalletService) {
    this.adminWallet = adminWallet;
    this.config = getConfig();
  }

  /**
   * Read player statistics from old StatisticsRegistry
   */
  async readOldPlayerStats(
    oldPackageId: string,
    oldStatsRegistryId: string,
    playerAddress: string
  ): Promise<{
    success: boolean;
    stats?: {
      total_games: number;
      best_score: number;
      best_distance: number;
      best_coins: number;
      best_bosses_defeated: number;
      best_enemies_defeated: number;
      best_coin_streak: number;
      total_score: number;
      total_distance: number;
      total_coins: number;
      total_bosses_defeated: number;
      total_enemies_defeated: number;
      total_coin_streak: number;
      first_game_date: number;
      last_game_date: number;
    };
    error?: string;
  }> {
    try {
      const network = this.config.sui.network;
      const client = network === 'testnet' 
        ? this.adminWallet.getTestnetClient()
        : this.adminWallet.getMainnetClient();

      MigrationLogger.stats(`Querying old stats for ${playerAddress}`, {
        oldPackageId,
        oldStatsRegistryId,
        playerAddress,
      });

      // First, verify the old stats registry object exists and get its type
      try {
        const registryObj = await client.getObject({
          id: oldStatsRegistryId,
          options: { showType: true, showContent: false },
        });
        
        if (registryObj.error) {
          MigrationLogger.error('Old stats registry object not found', {
            oldStatsRegistryId,
            error: registryObj.error,
          });
          return {
            success: false,
            error: `Old statistics registry object not found: ${oldStatsRegistryId}. Please verify OLD_STATISTICS_REGISTRY_OBJECT_ID_TESTNET is correct.`,
          };
        }

        const registryType = registryObj.data?.type || 'unknown';
        MigrationLogger.debug('Old stats registry object found', {
          objectId: oldStatsRegistryId,
          type: registryType,
        });

        // Verify it's a StatisticsRegistry
        if (!registryType.includes('StatisticsRegistry')) {
          MigrationLogger.warn('Old stats registry type mismatch', {
            expected: 'StatisticsRegistry',
            actual: registryType,
          });
        }
      } catch (verifyError) {
        MigrationLogger.warn('Could not verify old stats registry object', {
          error: verifyError instanceof Error ? verifyError.message : String(verifyError),
        });
        // Continue anyway - the function call might still work
      }
      
      const { Transaction } = await import('@mysten/sui/transactions');
      const tx = new Transaction();
      tx.moveCall({
        target: `${oldPackageId}::score_submission::get_player_stats`,
        arguments: [
          tx.object(oldStatsRegistryId),
          tx.pure.address(playerAddress),
        ],
      });

      let result;
      try {
        result = await client.devInspectTransactionBlock({
          transactionBlock: tx,
          sender: this.adminWallet.getAddress(),
        });
      } catch (inspectError) {
        MigrationLogger.error('devInspectTransactionBlock failed', {
          error: inspectError instanceof Error ? inspectError.message : String(inspectError),
          oldPackageId,
          target: `${oldPackageId}::score_submission::get_player_stats`,
        });
        return {
          success: false,
          error: `Failed to inspect transaction: ${inspectError instanceof Error ? inspectError.message : String(inspectError)}. The old contract may not have the get_player_stats function, or the package ID may be incorrect.`,
        };
      }

      if (!result.results || result.results.length === 0) {
        MigrationLogger.error('No results from devInspectTransactionBlock', {
          result: JSON.stringify(result, null, 2),
        });
        return {
          success: false,
          error: 'Failed to get player stats from old registry - no results returned. The old contract may not have the get_player_stats function.',
        };
      }

      if (!result.results[0].returnValues || result.results[0].returnValues.length === 0) {
        MigrationLogger.error('No return values from devInspectTransactionBlock', {
          results: result.results,
        });
        return {
          success: false,
          error: 'Failed to get player stats from old registry - no return values. The function may have failed or the old contract structure is different.',
        };
      }

      const returnValues = result.results[0].returnValues;
      MigrationLogger.debug('Return values from get_player_stats', {
        returnValuesCount: returnValues.length,
        returnValues: returnValues.map((rv: any, idx: number) => ({ 
          index: idx,
          structure: Array.isArray(rv) ? `[${rv.length} elements]` : typeof rv,
          firstElement: Array.isArray(rv) && rv[0] ? (Array.isArray(rv[0]) ? `[${rv[0].length} bytes]` : rv[0]) : rv[0],
          secondElement: Array.isArray(rv) && rv[1] ? rv[1] : rv[1],
        })),
      });

      // Helper function to parse u64 from byte array (little-endian)
      const parseU64FromBytes = (byteArray: number[]): number => {
        if (!Array.isArray(byteArray) || byteArray.length !== 8) {
          MigrationLogger.warn('Invalid u64 byte array', { 
            byteArray, 
            isArray: Array.isArray(byteArray),
            length: Array.isArray(byteArray) ? byteArray.length : 'N/A'
          });
          return 0;
        }
        // Convert little-endian byte array to number
        let value = 0;
        for (let i = 0; i < 8; i++) {
          value += byteArray[i] * Math.pow(256, i);
        }
        return value;
      };

      // Parse boolean: returnValues[0] is [[byteArray], 'bool']
      // byteArray is [0] for false or [1] for true
      const hasStatsByteArray = Array.isArray(returnValues[0]) && Array.isArray(returnValues[0][0]) 
        ? returnValues[0][0] 
        : [];
      const hasStats = Array.isArray(hasStatsByteArray) && hasStatsByteArray.length > 0 && hasStatsByteArray[0] === 1;
      
      MigrationLogger.debug('Has stats check', { 
        hasStats, 
        hasStatsByteArray,
        firstReturnValue: returnValues[0] 
      });

      // Parse all stats fields
      // The function returns: (bool, u64, u64, u64, u64, u64, u64, u64, u64, u64, u64, u64, u64, u64, u64, u64)
      // Structure: returnValues[i] = [[byteArray], 'type']
      // Index 0: has_stats (bool) - already checked
      // Index 1-15: all the stat values (u64) - each is [[8 bytes], 'u64']
      
      // Helper to parse u64 values
      const parseU64 = (val: any, index: number, fieldName: string): number => {
        try {
          // Structure: returnValues[i] = [[byteArray], 'type']
          // So val should be [[byteArray], 'u64']
          if (Array.isArray(val) && Array.isArray(val[0])) {
            const byteArray = val[0] as number[];
            return parseU64FromBytes(byteArray);
          } else {
            MigrationLogger.warn(`Invalid return value structure for ${fieldName} at index ${index}`, { 
              val, 
              isArray: Array.isArray(val),
              structure: Array.isArray(val) ? `[${val.length} elements]` : typeof val
            });
            return 0;
          }
        } catch (err) {
          MigrationLogger.warn(`Error parsing ${fieldName}`, { 
            error: err instanceof Error ? err.message : String(err), 
            val, 
            index 
          });
          return 0;
        }
      };

      // Check if we have enough return values (should have 16: 1 bool + 15 u64)
      if (returnValues.length < 16) {
        MigrationLogger.warn('Not enough return values', {
          expected: 16,
          actual: returnValues.length,
        });
      }

      const stats = {
        total_games: parseU64(returnValues[1], 1, 'total_games'),
        best_score: parseU64(returnValues[2], 2, 'best_score'),
        best_distance: parseU64(returnValues[3], 3, 'best_distance'),
        best_coins: parseU64(returnValues[4], 4, 'best_coins'),
        best_bosses_defeated: parseU64(returnValues[5], 5, 'best_bosses_defeated'),
        best_enemies_defeated: parseU64(returnValues[6], 6, 'best_enemies_defeated'),
        best_coin_streak: parseU64(returnValues[7], 7, 'best_coin_streak'),
        total_score: parseU64(returnValues[8], 8, 'total_score'),
        total_distance: parseU64(returnValues[9], 9, 'total_distance'),
        total_coins: parseU64(returnValues[10], 10, 'total_coins'),
        total_bosses_defeated: parseU64(returnValues[11], 11, 'total_bosses_defeated'),
        total_enemies_defeated: parseU64(returnValues[12], 12, 'total_enemies_defeated'),
        total_coin_streak: parseU64(returnValues[13], 13, 'total_coin_streak'),
        first_game_date: parseU64(returnValues[14], 14, 'first_game_date'),
        last_game_date: parseU64(returnValues[15], 15, 'last_game_date'),
      };

      MigrationLogger.stats('Parsed stats from old registry', stats);

      // Check if we actually have any stats (even if hasStats was false, the values might be non-zero)
      const hasAnyStats = stats.total_games > 0 || stats.best_score > 0 || stats.total_score > 0;
      
      if (!hasAnyStats) {
        MigrationLogger.stats('Player has no stats (all values are zero)', {
          hasStats,
          stats,
        });
        return {
          success: false,
          error: 'Player has no stats in old registry (all values are zero)',
        };
      }

      MigrationLogger.stats('Successfully read stats from old registry', {
        hasStats,
        totalGames: stats.total_games,
        bestScore: stats.best_score,
      });

      return {
        success: true,
        stats,
      };
    } catch (error) {
      MigrationLogger.error('Error reading old stats', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get all wallet addresses that have statistics in the old StatisticsRegistry
   * Note: Sui Tables don't support direct enumeration, so we need to query events or use a different approach
   * For now, this function will return an error suggesting manual input or event-based discovery
   */
  async getAllWalletsWithStats(
    oldPackageId: string,
    oldStatsRegistryId: string
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

      MigrationLogger.stats('Attempting to discover wallets with stats from old registry', {
        oldPackageId,
        oldStatsRegistryId,
        network: this.config.sui.network,
      });
      
      // Sui Tables don't support enumeration directly
      // We can try to query ScoreSubmitted events to find all players who have submitted scores
      // This is the most reliable way to discover wallets with stats
      
      try {
        // Query ScoreSubmitted events from the old package
        // These events are emitted when scores are submitted, so all players with stats should have events
        // Note: filter property is no longer supported, using query instead
        
        // Ensure package ID is clean (remove any ::module::function suffix)
        const cleanPackageId = oldPackageId.includes('::') 
          ? oldPackageId.split('::')[0] 
          : oldPackageId;
        
        MigrationLogger.debug('Querying events', {
          cleanPackageId,
          originalPackageId: oldPackageId,
          module: 'score_submission',
        });
        
        const events = await client.queryEvents({
          query: {
            MoveModule: {
              package: cleanPackageId,
              module: 'score_submission',
            },
          },
          limit: 1000, // Adjust as needed
        });

        MigrationLogger.stats(`Found ${events.data.length} events from old package`, {
          eventCount: events.data.length,
          packageId: cleanPackageId,
        });

        // Extract unique player addresses from events
        const walletsSet = new Set<string>();
        for (const event of events.data) {
          if (event.parsedJson && typeof event.parsedJson === 'object') {
            const player = (event.parsedJson as any).player;
            if (player && typeof player === 'string' && player.startsWith('0x')) {
              walletsSet.add(player);
            }
          }
        }

        const wallets = Array.from(walletsSet);
        MigrationLogger.info(`Found ${wallets.length} unique wallets with stats (from events)`);

        return {
          success: true,
          wallets,
        };
      } catch (eventError) {
        MigrationLogger.warn('Event-based discovery failed, trying alternative method', {
          error: eventError instanceof Error ? eventError.message : String(eventError),
          errorStack: eventError instanceof Error ? eventError.stack : undefined,
          oldPackageId,
          cleanPackageId: oldPackageId.includes('::') ? oldPackageId.split('::')[0] : oldPackageId,
        });
        
        // Alternative: Try to get dynamic fields (in case the registry structure is different)
        let dynamicFieldError: Error | null = null;
        try {
          MigrationLogger.debug('Trying dynamic fields discovery', {
            oldStatsRegistryId,
          });
          
          const allFields = await client.getDynamicFields({
            parentId: oldStatsRegistryId,
            limit: 1000, // Add limit to prevent issues
          });

          MigrationLogger.stats(`Found ${allFields.data.length} dynamic fields in stats registry`, {
            fieldCount: allFields.data.length,
            registryId: oldStatsRegistryId,
          });

          const wallets: string[] = [];
          for (const field of allFields.data) {
            if (field.name?.type === 'address' && field.name?.value) {
              wallets.push(String(field.name.value));
            }
          }

          if (wallets.length > 0) {
            MigrationLogger.info(`Found ${wallets.length} wallets with stats (from dynamic fields)`);
            return {
              success: true,
              wallets,
            };
          }
        } catch (dfError) {
          dynamicFieldError = dfError instanceof Error ? dfError : new Error(String(dfError));
          MigrationLogger.warn('Dynamic field discovery also failed', {
            error: dynamicFieldError.message,
            errorStack: dynamicFieldError.stack,
            oldStatsRegistryId,
          });
        }

        // If both methods fail, return an error with helpful message
        MigrationLogger.error('Both discovery methods failed', {
          oldPackageId,
          oldStatsRegistryId,
          eventError: eventError instanceof Error ? eventError.message : String(eventError),
          dynamicFieldError: dynamicFieldError ? dynamicFieldError.message : 'Not attempted',
        });
        
        return {
          success: false,
          error: `Unable to automatically discover wallets. Event query failed: ${eventError instanceof Error ? eventError.message : String(eventError)}. ${dynamicFieldError ? `Dynamic fields query also failed: ${dynamicFieldError.message}.` : 'Dynamic fields query was not attempted.'} Please use Single or Batch mode to manually specify wallet addresses, or verify the old contract IDs are correct.`,
        };
      }
    } catch (error) {
      MigrationLogger.error('Error fetching wallets with stats', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get all player addresses that have stats in the new contract
   */
  async getAllPlayersWithStats(): Promise<{
    success: boolean;
    players?: string[];
    error?: string;
  }> {
    try {
      const newStatsRegistryId = this.config.contracts.statisticsRegistry;

      if (!newStatsRegistryId) {
        return {
          success: false,
          error: 'Statistics registry not configured. Missing STATISTICS_REGISTRY_OBJECT_ID_TESTNET',
        };
      }

      const network = this.config.sui.network;
      const client = network === 'testnet' 
        ? this.adminWallet.getTestnetClient()
        : this.adminWallet.getMainnetClient();

      // Get the player_stats table ID from the StatisticsRegistry
      const registryObj = await client.getObject({
        id: newStatsRegistryId,
        options: { showContent: true },
      });

      if (registryObj.error || !registryObj.data?.content) {
        return {
          success: false,
          error: 'Failed to read StatisticsRegistry object',
        };
      }

      const content = registryObj.data.content as any;
      const fields = content.fields as any;
      const playerStatsTableId = fields.player_stats?.fields?.id?.id;

      if (!playerStatsTableId) {
        return {
          success: false,
          error: 'Failed to get player_stats table ID from StatisticsRegistry',
        };
      }

      // Get all dynamic fields (player addresses) from the table
      const dynamicFields = await client.getDynamicFields({
        parentId: playerStatsTableId,
      });

      const players = dynamicFields.data.map((field: any) => {
        // The name field contains the player address
        if (field.name?.type === 'address' && field.name?.value) {
          return field.name.value;
        }
        return null;
      }).filter((addr: string | null): addr is string => addr !== null);

      MigrationLogger.stats(`Found ${players.length} players with stats in new contract`);

      return {
        success: true,
        players,
      };
    } catch (error) {
      MigrationLogger.error('Error getting all players with stats', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Clear/reset player statistics in the new contract
   * This removes all stats for the player, effectively resetting them to 0
   * Also clears the player's session IDs from the SessionRegistry to allow re-migration
   */
  async clearPlayerStats(
    playerAddress: string
  ): Promise<{
    success: boolean;
    digest?: string;
    error?: string;
  }> {
    try {
      const newPackageId = this.config.contracts.gameScore.includes('::')
        ? this.config.contracts.gameScore.split('::')[0]
        : this.config.contracts.gameScore;
      const newStatsRegistryId = this.config.contracts.statisticsRegistry;
      const sessionRegistryId = this.config.contracts.sessionRegistry;
      const adminCapabilityObjectId = this.config.contracts.adminCapability;

      if (!newStatsRegistryId || !sessionRegistryId || !adminCapabilityObjectId || adminCapabilityObjectId === '') {
        return {
          success: false,
          error: `Statistics registry not configured. Missing: ${!newStatsRegistryId ? 'STATISTICS_REGISTRY_OBJECT_ID_TESTNET' : ''} ${!sessionRegistryId ? 'SESSION_REGISTRY_OBJECT_ID_TESTNET' : ''} ${!adminCapabilityObjectId || adminCapabilityObjectId === '' ? 'ADMIN_CAPABILITY_OBJECT_ID_TESTNET' : ''}`,
        };
      }

      const network = this.config.sui.network;
      const client = network === 'testnet' 
        ? this.adminWallet.getTestnetClient()
        : this.adminWallet.getMainnetClient();

      // First, query all GameSession objects owned by the player to get their session IDs
      MigrationLogger.stats(`Querying GameSession objects for player ${playerAddress}`);
      const gameSessionType = `${newPackageId}::score_submission::GameSession`;
      const ownedObjects = await client.getOwnedObjects({
        owner: playerAddress,
        filter: {
          StructType: gameSessionType,
        },
        options: {
          showContent: true,
        },
      });

      const sessionIds: string[] = [];
      if (ownedObjects.data && ownedObjects.data.length > 0) {
        MigrationLogger.stats(`Found ${ownedObjects.data.length} GameSession objects for player`);
        
        for (const obj of ownedObjects.data) {
          if (obj.data?.content && 'fields' in obj.data.content) {
            const fields = (obj.data.content as any).fields;
            if (fields.session_id) {
              // session_id is stored as a vector<u8>, which comes as an array of numbers
              const sessionIdBytes = fields.session_id as number[];
              if (Array.isArray(sessionIdBytes) && sessionIdBytes.length > 0) {
                // Convert byte array to string
                const sessionId = new TextDecoder().decode(new Uint8Array(sessionIdBytes));
                sessionIds.push(sessionId);
              }
            }
          }
        }
        
        MigrationLogger.stats(`Extracted ${sessionIds.length} session IDs from GameSession objects`);
      } else {
        MigrationLogger.stats('No GameSession objects found for player');
      }

      const { Transaction } = await import('@mysten/sui/transactions');
      const txb = new Transaction();
      txb.setSender(this.adminWallet.getAddress());

      // If we found session IDs, clear them from the SessionRegistry first
      // Call clear_session_id for each session ID (one at a time to avoid nested vector issues)
      if (sessionIds.length > 0) {
        MigrationLogger.stats(`Clearing ${sessionIds.length} session IDs from SessionRegistry`);
        
        for (const sessionId of sessionIds) {
          // Convert session ID string to byte array
          const sessionIdBytes = Array.from(new TextEncoder().encode(sessionId));
          
          txb.moveCall({
            target: `${newPackageId}::score_submission::clear_session_id`,
            arguments: [
              txb.object(adminCapabilityObjectId),
              txb.object(sessionRegistryId),
              txb.pure.vector('u8', sessionIdBytes),
            ],
          });
        }
      }

      // Call clear_player_stats function
      txb.moveCall({
        target: `${newPackageId}::score_submission::clear_player_stats`,
        arguments: [
          txb.object(adminCapabilityObjectId),
          txb.object(newStatsRegistryId),
          txb.pure.address(playerAddress),
        ],
      });

      txb.setGasBudget(this.config.sui.gasBudget);

      const transactionBytes = await txb.build({ client });
      const result = await client.signAndExecuteTransaction({
        signer: this.adminWallet.getKeypair(),
        transaction: transactionBytes,
        options: {
          showEffects: true,
          showEvents: true,
        },
      });

      if (result.effects?.status?.status === 'success') {
        MigrationLogger.stats('Player stats and session IDs cleared successfully', {
          playerAddress,
          sessionIdsCleared: sessionIds.length,
          digest: result.digest,
        });
        return {
          success: true,
          digest: result.digest,
        };
      } else {
        const error = result.effects?.status?.error || 'Unknown error';
        MigrationLogger.error('Failed to clear player stats', error);
        return {
          success: false,
          error: `Failed to clear player stats: ${error}`,
        };
      }
    } catch (error) {
      MigrationLogger.error('Error clearing player stats', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Clear all player statistics in the new contract
   * This queries all players and clears each one's stats
   */
  async clearAllPlayerStats(): Promise<{
    success: boolean;
    playersCleared?: number;
    digests?: string[];
    errors?: Array<{ player: string; error: string }>;
    error?: string;
  }> {
    try {
      // Get all players with stats
      const playersResult = await this.getAllPlayersWithStats();

      if (!playersResult.success || !playersResult.players) {
        return {
          success: false,
          error: playersResult.error || 'Failed to get players with stats',
        };
      }

      if (playersResult.players.length === 0) {
        return {
          success: true,
          playersCleared: 0,
          digests: [],
        };
      }

      MigrationLogger.stats(`Clearing stats for ${playersResult.players.length} players`);

      const digests: string[] = [];
      const errors: Array<{ player: string; error: string }> = [];

      // Clear each player's stats
      for (let i = 0; i < playersResult.players.length; i++) {
        const playerAddress = playersResult.players[i];
        
        try {
          const result = await this.clearPlayerStats(playerAddress);
          
          if (result.success && result.digest) {
            digests.push(result.digest);
            MigrationLogger.stats(`Cleared stats for player ${i + 1}/${playersResult.players.length}`, {
              playerAddress,
              digest: result.digest,
            });
          } else {
            errors.push({
              player: playerAddress,
              error: result.error || 'Unknown error',
            });
            MigrationLogger.error(`Failed to clear stats for player ${i + 1}/${playersResult.players.length}`, {
              playerAddress,
              error: result.error,
            });
          }

          // Small delay to avoid rate limiting
          if (i < playersResult.players.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        } catch (error) {
          errors.push({
            player: playerAddress,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          MigrationLogger.error(`Error clearing stats for player ${i + 1}/${playersResult.players.length}`, error);
        }
      }

      return {
        success: true,
        playersCleared: digests.length,
        digests,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      MigrationLogger.error('Error clearing all player stats', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Query all ScoreSubmitted events from old contract for a player
   */
  async queryOldPlayerEvents(
    oldPackageId: string,
    playerAddress: string
  ): Promise<Array<{
    score: number;
    distance: number;
    coins: number;
    bossesDefeated: number;
    enemiesDefeated: number;
    longestCoinStreak: number;
    playerName?: string;
    sessionId: string;
    timestamp: number;
  }>> {
    try {
      const network = this.config.sui.network;
      const client = network === 'testnet' 
        ? this.adminWallet.getTestnetClient()
        : this.adminWallet.getMainnetClient();

      // Query all ScoreSubmitted events from old contract
      const events = await client.queryEvents({
        query: {
          MoveModule: {
            package: oldPackageId,
            module: 'score_submission',
          },
        },
        limit: 1000,
        order: 'ascending', // Oldest first
      });

      // Helper function to decode byte arrays
      const decodeBytes = (bytes: any): string => {
        if (!bytes) return '';
        if (typeof bytes === 'string') return bytes;
        if (Array.isArray(bytes)) {
          const uint8Array = new Uint8Array(bytes);
          return new TextDecoder().decode(uint8Array);
        }
        return '';
      };

      // Filter events for this player and parse them
      // Also deduplicate by session_id to avoid migrating the same game twice
      const seenSessionIds = new Set<string>();
      const playerEvents = events.data
        .map((event) => {
          try {
            const parsedJson = event.parsedJson as any;
            const eventPlayer = parsedJson.player || parsedJson.wallet_address || '';
            
            // Only include events for this player
            if (eventPlayer.toLowerCase() !== playerAddress.toLowerCase()) {
              return null;
            }

            const sessionId = decodeBytes(parsedJson.session_id || parsedJson.sessionId || '');
            
            // Skip if we've already seen this session ID (deduplication)
            if (sessionId && seenSessionIds.has(sessionId)) {
              MigrationLogger.debug(`Skipping duplicate session: ${sessionId}`);
              return null;
            }
            
            if (sessionId) {
              seenSessionIds.add(sessionId);
            }

            return {
              score: Number(parsedJson.score || 0),
              distance: Number(parsedJson.distance || 0),
              coins: Number(parsedJson.coins || 0),
              bossesDefeated: Number(parsedJson.bosses_defeated || parsedJson.bossesDefeated || 0),
              enemiesDefeated: Number(parsedJson.enemies_defeated || parsedJson.enemiesDefeated || 0),
              longestCoinStreak: Number(parsedJson.longest_coin_streak || parsedJson.longestCoinStreak || 0),
              playerName: decodeBytes(parsedJson.player_name) || undefined,
              sessionId: sessionId,
              timestamp: event.timestampMs ? Number(event.timestampMs) : Date.now(),
            };
          } catch (e) {
            MigrationLogger.warn('Error parsing event', { error: e });
            return null;
          }
        })
        .filter((event): event is NonNullable<typeof event> => event !== null);

      MigrationLogger.stats(`Found ${playerEvents.length} unique game sessions for player ${playerAddress} in old contract (from ${events.data.length} total events)`);
      return playerEvents;
    } catch (error) {
      MigrationLogger.error('Error querying old player events', error);
      return [];
    }
  }

  /**
   * Migrate all individual game sessions from old contract to new contract
   * This creates individual GameSession objects and emits ScoreSubmitted events
   */
  async migrateAllGameSessions(
    playerAddress: string,
    oldPackageId: string
  ): Promise<{
    success: boolean;
    sessionsMigrated?: number;
    digests?: string[];
    error?: string;
  }> {
    try {
      // Query all events from old contract
      const oldEvents = await this.queryOldPlayerEvents(oldPackageId, playerAddress);

      if (oldEvents.length === 0) {
        return {
          success: true,
          sessionsMigrated: 0,
          digests: [],
        };
      }

      // Get new contract configuration
      const newPackageId = this.config.contracts.gameScore.includes('::')
        ? this.config.contracts.gameScore.split('::')[0]
        : this.config.contracts.gameScore;
      const sessionRegistryId = this.config.contracts.sessionRegistry;
      const statisticsRegistryId = this.config.contracts.statisticsRegistry;
      const adminCapabilityObjectId = this.config.contracts.adminCapability;

      if (!sessionRegistryId || !statisticsRegistryId || !adminCapabilityObjectId) {
        return {
          success: false,
          error: 'New contract configuration missing. Required: SESSION_REGISTRY_OBJECT_ID_TESTNET, STATISTICS_REGISTRY_OBJECT_ID_TESTNET, ADMIN_CAPABILITY_OBJECT_ID_TESTNET',
        };
      }

      const network = this.config.sui.network;
      const client = network === 'testnet' 
        ? this.adminWallet.getTestnetClient()
        : this.adminWallet.getMainnetClient();

      const { Transaction } = await import('@mysten/sui/transactions');
      const digests: string[] = [];

      MigrationLogger.stats(`Migrating ${oldEvents.length} game sessions for player ${playerAddress}`);

      // Submit each game session individually
      // Note: We could batch these, but submitting individually ensures each creates a proper GameSession object
      for (let i = 0; i < oldEvents.length; i++) {
        const event = oldEvents[i];
        
        // Retry logic for object version conflicts
        let retries = 3;
        let success = false;
        
        while (retries > 0 && !success) {
          try {
            const txb = new Transaction();
            txb.setSender(this.adminWallet.getAddress());

            // Convert player name and session ID to bytes
            const playerNameBytes = event.playerName 
              ? new TextEncoder().encode(event.playerName)
              : new Uint8Array(0);
            const sessionIdBytes = event.sessionId
              ? new TextEncoder().encode(event.sessionId)
              : new Uint8Array(0);

            // Submit game session
            txb.moveCall({
              target: `${newPackageId}::score_submission::submit_game_session_for_player`,
              arguments: [
                txb.object(adminCapabilityObjectId),
                txb.object(sessionRegistryId),
                txb.object(statisticsRegistryId),
                txb.pure.address(playerAddress),
                txb.object('0x6'), // Clock
                txb.pure.u64(event.score),
                txb.pure.u64(event.distance),
                txb.pure.u64(event.coins),
                txb.pure.u64(event.bossesDefeated),
                txb.pure.u64(event.enemiesDefeated),
                txb.pure.u64(event.longestCoinStreak),
                txb.pure.vector('u8', Array.from(playerNameBytes)),
                txb.pure.vector('u8', Array.from(sessionIdBytes)),
                txb.pure.vector('u64', []), // boss_tiers - empty for migrated games
                txb.pure.vector('u64', []), // enemy_types - empty for migrated games
                txb.pure.u64(0), // boss_hits - 0 for migrated games
              ],
            });

            txb.setGasBudget(this.config.sui.gasBudget);

            // Build transaction right before execution to get latest object versions
            const transactionBytes = await txb.build({ client });
            const result = await client.signAndExecuteTransaction({
              signer: this.adminWallet.getKeypair(),
              transaction: transactionBytes,
              options: {
                showEffects: true,
                showEvents: true,
              },
            });

            if (result.effects?.status?.status === 'success') {
              digests.push(result.digest);
              MigrationLogger.stats(`Migrated game session ${i + 1}/${oldEvents.length}`, {
                score: event.score,
                digest: result.digest,
              });
              success = true;
            } else {
              const error = result.effects?.status?.error || 'Unknown error';
              const isVersionConflict = typeof error === 'string' && 
                (error.includes('not available for consumption') || 
                 error.includes('Version') && error.includes('current version'));
              
              if (isVersionConflict && retries > 1) {
                // Version conflict - wait a bit longer and retry with fresh object versions
                MigrationLogger.debug(`Version conflict for session ${i + 1}, retrying... (${retries - 1} attempts remaining)`);
                await new Promise(resolve => setTimeout(resolve, 500));
                retries--;
              } else {
                MigrationLogger.error(`Failed to migrate game session ${i + 1}/${oldEvents.length}`, {
                  error,
                });
                retries = 0; // Give up
              }
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            const isVersionConflict = errorMessage.includes('not available for consumption') || 
              (errorMessage.includes('Version') && errorMessage.includes('current version'));
            
            if (isVersionConflict && retries > 1) {
              // Version conflict - wait and retry
              MigrationLogger.debug(`Version conflict error for session ${i + 1}, retrying... (${retries - 1} attempts remaining)`);
              await new Promise(resolve => setTimeout(resolve, 500));
              retries--;
            } else {
              MigrationLogger.error(`Error migrating game session ${i + 1}/${oldEvents.length}`, error);
              retries = 0; // Give up
            }
          }
        }

        // Delay between sessions to allow object versions to propagate
        if (i < oldEvents.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      return {
        success: true,
        sessionsMigrated: digests.length,
        digests,
      };
    } catch (error) {
      MigrationLogger.error('Error migrating game sessions', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Migrate player statistics from old StatisticsRegistry to new StatisticsRegistry
   */
  async migratePlayerStats(
    playerAddress: string,
    oldPackageId: string,
    oldStatsRegistryId: string,
    migrateIndividualSessions: boolean = true
  ): Promise<{
    success: boolean;
    digest?: string;
    sessionsMigrated?: number;
    error?: string;
  }> {
    try {
      // 1. Read stats from old registry
      MigrationLogger.stats(`Reading stats from old registry for ${playerAddress}`);
      const oldStats = await this.readOldPlayerStats(oldPackageId, oldStatsRegistryId, playerAddress);
      
      if (!oldStats.success || !oldStats.stats) {
        return {
          success: false,
          error: oldStats.error || 'Failed to read old stats',
        };
      }

      const stats = oldStats.stats;
      MigrationLogger.stats('Old stats', stats);

      // Check if there are any stats to migrate
      if (stats.total_games === 0 && stats.best_score === 0) {
        return {
          success: false,
          error: 'No stats to migrate (player has no games recorded)',
        };
      }

      // 2. Get new registry configuration
      const newPackageId = this.config.contracts.gameScore.includes('::')
        ? this.config.contracts.gameScore.split('::')[0]
        : this.config.contracts.gameScore;
      const newStatsRegistryId = this.config.contracts.statisticsRegistry;
      const adminCapabilityObjectId = this.config.contracts.adminCapability;
      
      // DEBUG: Log what we're reading from config
      console.log('[MIGRATION DEBUG] Config values:', {
        gameScore: this.config.contracts.gameScore,
        newPackageId,
        statisticsRegistry: newStatsRegistryId,
        adminCapability: adminCapabilityObjectId,
        network: this.config.sui.network,
      });

      if (!newStatsRegistryId || !adminCapabilityObjectId || adminCapabilityObjectId === '') {
        return {
          success: false,
          error: `New statistics registry not configured. Missing: ${!newStatsRegistryId ? 'STATISTICS_REGISTRY_OBJECT_ID_TESTNET' : ''} ${!adminCapabilityObjectId || adminCapabilityObjectId === '' ? 'ADMIN_CAPABILITY_OBJECT_ID_TESTNET' : ''}`,
        };
      }

      // Verify the admin capability object exists
      const network = this.config.sui.network;
      const client = network === 'testnet' 
        ? this.adminWallet.getTestnetClient()
        : this.adminWallet.getMainnetClient();
      
      try {
        const adminCapObject = await client.getObject({
          id: adminCapabilityObjectId,
          options: { showType: true },
        });

        if (adminCapObject.error) {
          MigrationLogger.error(`Admin capability object not found: ${adminCapabilityObjectId}`);
          return {
            success: false,
            error: `Admin capability object not found: ${adminCapabilityObjectId}. Please verify ADMIN_CAPABILITY_OBJECT_ID_TESTNET is correct.`,
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
        
        // DEBUG: Log the actual admin capability ID being used
        console.log('[MIGRATION DEBUG] Admin capability ID from config:', adminCapabilityObjectId);
        console.log('[MIGRATION DEBUG] Admin capability package ID:', adminCapPackageId);
        console.log('[MIGRATION DEBUG] New package ID:', newPackageId);
        console.log('[MIGRATION DEBUG] Package IDs match:', adminCapPackageId === newPackageId);
        
        // Verify it's the correct type (score_submission::AdminCapability)
        if (!objectType.includes('score_submission::AdminCapability')) {
          return {
            success: false,
            error: `Wrong admin capability type! The object at ${adminCapabilityObjectId} is of type ${objectType}, but expected score_submission::AdminCapability. Please use the score_submission admin capability.`,
          };
        }

        // CRITICAL: Verify the admin capability is from the same package as the new registry
        if (adminCapPackageId !== newPackageId) {
          return {
            success: false,
            error: `Package ID mismatch! The admin capability is from package ${adminCapPackageId}, but the new registry is from package ${newPackageId}. They must match. Please ensure GAME_SCORE_CONTRACT_TESTNET matches the package that created the admin capability, or use an admin capability from the correct package.`,
          };
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        MigrationLogger.error('Could not verify admin capability object', { errorMessage });
        return {
          success: false,
          error: `Failed to verify admin capability object: ${errorMessage}. Please check that ADMIN_CAPABILITY_OBJECT_ID_TESTNET is correct.`,
        };
      }

      // 3. Check if player already has games in the new contract
      // If they do, we need to be careful not to double-count
      
      // Check current stats in new contract
      let existingGamesInNewContract = 0;
      try {
        const { Transaction } = await import('@mysten/sui/transactions');
        const checkTxb = new Transaction();
        checkTxb.moveCall({
          target: `${newPackageId}::score_submission::get_player_stats`,
          arguments: [
            checkTxb.object(newStatsRegistryId),
            checkTxb.pure.address(playerAddress),
          ],
        });
        
        const checkResult = await client.devInspectTransactionBlock({
          sender: this.adminWallet.getAddress(),
          transactionBlock: checkTxb,
        });
        
        if (checkResult.results && checkResult.results.length > 0) {
          const returnValues = checkResult.results[0].returnValues;
          if (returnValues && returnValues.length >= 2) {
            const hasStats = returnValues[0][0][0] === 1; // bool
            if (hasStats) {
              const parseU64FromBytes = (byteArray: number[]): number => {
                if (!Array.isArray(byteArray) || byteArray.length !== 8) return 0;
                let value = 0;
                for (let i = 0; i < 8; i++) {
                  value += byteArray[i] * Math.pow(256, i);
                }
                return value;
              };
              existingGamesInNewContract = parseU64FromBytes(returnValues[1][0]);
              MigrationLogger.stats(`Player already has ${existingGamesInNewContract} games in new contract`);
            }
          }
        }
      } catch (error) {
        MigrationLogger.warn('Could not check existing games in new contract', { error });
      }

      // 4. If migrating individual sessions, do that first (before building aggregated stats transaction)
      // This will build up the stats naturally from individual game sessions
      if (migrateIndividualSessions) {
        // Warn if player already has games in new contract - migration will add to existing count
        if (existingGamesInNewContract > 0) {
          MigrationLogger.warn(`Player already has ${existingGamesInNewContract} games in new contract. Migration will add to this count.`);
        }
        
        MigrationLogger.stats('Migrating individual game sessions from old contract');
        const sessionsResult = await this.migrateAllGameSessions(playerAddress, oldPackageId);
        
        if (sessionsResult.success && sessionsResult.sessionsMigrated && sessionsResult.sessionsMigrated > 0) {
          MigrationLogger.stats('Individual game sessions migrated successfully', {
            sessionsMigrated: sessionsResult.sessionsMigrated,
            existingGamesBeforeMigration: existingGamesInNewContract,
            expectedTotalAfterMigration: existingGamesInNewContract + sessionsResult.sessionsMigrated,
          });
          // Stats are now built up from individual sessions, so we're done
          return {
            success: true,
            sessionsMigrated: sessionsResult.sessionsMigrated,
            digest: sessionsResult.digests?.[0], // Return first digest
          };
        } else if (!sessionsResult.success) {
          MigrationLogger.warn('Failed to migrate individual sessions, falling back to aggregated stats migration', {
            error: sessionsResult.error,
          });
          // Continue with aggregated stats migration as fallback
        } else {
          MigrationLogger.stats('No individual sessions found to migrate, proceeding with aggregated stats migration');
          // Continue with aggregated stats migration
        }
      }

      // 5. Get object details for logging and verification
      MigrationLogger.transaction('Fetching object details for transaction');

      const [newRegistryObj, adminCapObj] = await Promise.all([
        client.getObject({
          id: newStatsRegistryId,
          options: { showType: true, showOwner: true },
        }),
        client.getObject({
          id: adminCapabilityObjectId,
          options: { showType: true, showOwner: true },
        }),
      ]);

      const objectDetails = {
        newRegistry: {
          id: newStatsRegistryId,
          type: newRegistryObj.data?.type || 'unknown',
          owner: newRegistryObj.data?.owner || 'unknown',
          error: newRegistryObj.error,
        },
        adminCap: {
          id: adminCapabilityObjectId,
          type: adminCapObj.data?.type || 'unknown',
          owner: adminCapObj.data?.owner || 'unknown',
          error: adminCapObj.error,
        },
        oldStats: {
          total_games: stats.total_games,
          best_score: stats.best_score,
          best_distance: stats.best_distance,
          best_coins: stats.best_coins,
          best_bosses_defeated: stats.best_bosses_defeated,
          best_enemies_defeated: stats.best_enemies_defeated,
          best_coin_streak: stats.best_coin_streak,
          total_score: stats.total_score,
          total_distance: stats.total_distance,
          total_coins: stats.total_coins,
          total_bosses_defeated: stats.total_bosses_defeated,
          total_enemies_defeated: stats.total_enemies_defeated,
          total_coin_streak: stats.total_coin_streak,
          first_game_date: stats.first_game_date,
          last_game_date: stats.last_game_date,
        },
      };
      
      console.log('[MIGRATION DEBUG] Object details for migration:', JSON.stringify(objectDetails, null, 2));
      MigrationLogger.debug('Object details for migration', objectDetails);

      // 6. Build migration transaction
      MigrationLogger.transaction('Building migration transaction');
      const { Transaction } = await import('@mysten/sui/transactions');
      const txb = new Transaction();

      // Set sender first (required for transaction building)
      txb.setSender(this.adminWallet.getAddress());
      MigrationLogger.debug('Transaction sender set', { sender: this.adminWallet.getAddress() });

      // Log the function target and arguments before building
      const functionTarget = `${newPackageId}::score_submission::migrate_player_stats`;
      const moveCallArgs = {
        target: functionTarget,
        arguments: {
          arg0_adminCap: {
            type: 'object',
            id: adminCapabilityObjectId,
            objectType: adminCapObj.data?.type,
          },
          arg1_newRegistry: {
            type: 'object',
            id: newStatsRegistryId,
            objectType: newRegistryObj.data?.type,
            fromPackage: newPackageId,
          },
          arg2_player: {
            type: 'address',
            value: playerAddress,
          },
          arg3_oldStats: {
            type: 'individual values',
            note: 'Passing individual stat values to avoid cross-package type issues',
            values: {
              total_games: stats.total_games,
              best_score: stats.best_score,
              best_distance: stats.best_distance,
              best_coins: stats.best_coins,
              best_bosses_defeated: stats.best_bosses_defeated,
              best_enemies_defeated: stats.best_enemies_defeated,
              best_coin_streak: stats.best_coin_streak,
              total_score: stats.total_score,
              total_distance: stats.total_distance,
              total_coins: stats.total_coins,
              total_bosses_defeated: stats.total_bosses_defeated,
              total_enemies_defeated: stats.total_enemies_defeated,
              total_coin_streak: stats.total_coin_streak,
              first_game_date: stats.first_game_date,
              last_game_date: stats.last_game_date,
            },
          },
        },
      };
      
      console.log('[MIGRATION DEBUG] Preparing moveCall:', JSON.stringify(moveCallArgs, null, 2));
      MigrationLogger.debug('Preparing moveCall', moveCallArgs);

      // Build the transaction
      // Pass individual stat values instead of old registry object to avoid cross-package type issues
      txb.moveCall({
        target: functionTarget,
        arguments: [
          txb.object(adminCapabilityObjectId),
          txb.object(newStatsRegistryId), // New registry (mutable)
          txb.pure.address(playerAddress),
          // Old stats values (read from old registry by backend)
          txb.pure.u64(stats.total_games),
          txb.pure.u64(stats.best_score),
          txb.pure.u64(stats.best_distance),
          txb.pure.u64(stats.best_coins),
          txb.pure.u64(stats.best_bosses_defeated),
          txb.pure.u64(stats.best_enemies_defeated),
          txb.pure.u64(stats.best_coin_streak),
          txb.pure.u64(stats.total_score),
          txb.pure.u64(stats.total_distance),
          txb.pure.u64(stats.total_coins),
          txb.pure.u64(stats.total_bosses_defeated),
          txb.pure.u64(stats.total_enemies_defeated),
          txb.pure.u64(stats.total_coin_streak),
          txb.pure.u64(stats.first_game_date),
          txb.pure.u64(stats.last_game_date),
        ],
      });

      MigrationLogger.debug('moveCall added to transaction');

      txb.setGasBudget(this.config.sui.gasBudget);
      MigrationLogger.debug('Gas budget set', { gasBudget: this.config.sui.gasBudget });

      // Check wallet balance before building transaction
      const { checkBalanceBeforeTransaction } = await import('../balance-checker');
      await checkBalanceBeforeTransaction({
        client,
        walletAddress: this.adminWallet.getAddress(),
        gasBudget: this.config.sui.gasBudget,
        context: 'migrate player stats',
      });

      // 7. Build transaction first to let SDK resolve object types
      // This is important when passing objects from different packages
      // The SDK needs to fetch object metadata to resolve types correctly
      MigrationLogger.transaction('Building transaction to resolve object types');
      console.log('[MIGRATION DEBUG] Calling txb.build with client', {
        hasClient: !!client,
        network: this.config.sui.network,
        newRegistryType: newRegistryObj.data?.type,
        functionTarget,
        note: 'Passing individual stat values instead of old registry object',
      });
      MigrationLogger.debug('Calling txb.build with client', {
        hasClient: !!client,
        network: this.config.sui.network,
      });

      let transactionBytes: Uint8Array;
      try {
        transactionBytes = await txb.build({ client });
        console.log('[MIGRATION DEBUG] Transaction built successfully', {
          transactionSize: transactionBytes.length,
          transactionBytesPreview: Array.from(transactionBytes.slice(0, 20)).map(b => b.toString(16).padStart(2, '0')).join(' ') + '...',
        });
        MigrationLogger.debug('Transaction built successfully', {
          transactionSize: transactionBytes.length,
          transactionBytesPreview: Array.from(transactionBytes.slice(0, 20)).map(b => b.toString(16).padStart(2, '0')).join(' ') + '...',
        });
      } catch (buildError) {
        console.error('[MIGRATION DEBUG] Transaction build failed:', buildError);
        MigrationLogger.error('Transaction build failed', {
          error: buildError instanceof Error ? buildError.message : String(buildError),
          stack: buildError instanceof Error ? buildError.stack : undefined,
          errorDetails: buildError,
        });
        return {
          success: false,
          error: `Failed to build transaction: ${buildError instanceof Error ? buildError.message : String(buildError)}`,
        };
      }

      // 8. Sign and execute with admin wallet
      MigrationLogger.transaction('Signing and executing migration transaction');
      console.log('[MIGRATION DEBUG] Preparing to sign transaction', {
        transactionSize: transactionBytes.length,
        signerAddress: this.adminWallet.getAddress(),
        newRegistryType: newRegistryObj.data?.type,
      });
      MigrationLogger.debug('Preparing to sign transaction', {
        transactionSize: transactionBytes.length,
        signerAddress: this.adminWallet.getAddress(),
      });

      let result;
      try {
        console.log('[MIGRATION DEBUG] Calling signAndExecuteTransaction...');
        result = await client.signAndExecuteTransaction({
          signer: this.adminWallet.getKeypair(),
          transaction: transactionBytes,
          options: {
            showEffects: true,
            showEvents: true,
            showInput: true, // Include input to see what was actually sent
          },
        });
        console.log('[MIGRATION DEBUG] Transaction executed', {
          digest: result.digest,
          status: result.effects?.status?.status,
          error: result.effects?.status?.error,
          fullError: JSON.stringify(result.effects?.status, null, 2),
        });
        MigrationLogger.debug('Transaction executed', {
          digest: result.digest,
          status: result.effects?.status?.status,
          error: result.effects?.status?.error,
        });
      } catch (executeError) {
        console.error('[MIGRATION DEBUG] Transaction execution failed:', executeError);
        MigrationLogger.error('Transaction execution failed', {
          error: executeError instanceof Error ? executeError.message : String(executeError),
          stack: executeError instanceof Error ? executeError.stack : undefined,
          errorDetails: executeError,
        });
        return {
          success: false,
          error: `Failed to execute transaction: ${executeError instanceof Error ? executeError.message : String(executeError)}`,
        };
      }

      // If transaction succeeded, return success
      if (result.effects?.status?.status === 'success') {
        MigrationLogger.transaction('Stats migrated successfully', {
          digest: result.digest
        });
        return {
          success: true,
          digest: result.digest,
        };
      } else {
        const error = result.effects?.status?.error || 'Unknown error';
        MigrationLogger.error('Migration failed', error);
        return {
          success: false,
          error: `Migration failed: ${error}`,
        };
      }
    } catch (error) {
      MigrationLogger.error('Error migrating stats', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

