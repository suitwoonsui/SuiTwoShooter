// ==========================================
// Sui Blockchain Service Module
// ==========================================

import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { getConfig } from '../../config/config';

/**
 * SuiService - Handles all Sui blockchain interactions
 * 
 * Note: Transactions are signed by users on the frontend.
 * This service only verifies transactions and queries blockchain data.
 */
export class SuiService {
  private client: SuiClient;
  private config: ReturnType<typeof getConfig>;

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
    
    console.log(`✅ SuiService initialized for ${network}`);
  }

  /**
   * Get token balance for a wallet address
   * Used for gatekeeping (require minimum $Mews token balance)
   * 
   * @param walletAddress - Wallet address to check
   * @param coinType - Optional token type ID (defaults to $Mews from config)
   * @returns Balance information including whether minimum balance is met
   */
  async getTokenBalance(
    walletAddress: string,
    coinType?: string
  ): Promise<{
    address: string;
    totalBalance: string;
    coinType: string;
    hasMinimumBalance: boolean;
    error?: string;
  }> {
    try {
      const tokenType = coinType || this.config.token.mewsTokenTypeId;
      
      if (!tokenType || tokenType === '0x...') {
        return {
          address: walletAddress,
          totalBalance: '0',
          coinType: tokenType || '',
          hasMinimumBalance: false,
          error: 'Token type ID not configured. Please set MEWS_TOKEN_TYPE_ID in environment variables.',
        };
      }

      // For custom tokens, use getCoins instead of getBalance
      // getBalance might not work for custom tokens on all networks
      const coins = await this.client.getCoins({
        owner: walletAddress,
        coinType: tokenType,
      });

      // Calculate total balance from all coin objects
      let totalBalance = BigInt(0);
      coins.data.forEach((coin) => {
        totalBalance += BigInt(coin.balance);
      });

      const minBalance = BigInt(this.config.token.minTokenBalance);
      const hasMinimumBalance = totalBalance >= minBalance;

      // Log for debugging (remove in production)
      if (process.env.NODE_ENV === 'development') {
        console.log(`Token balance check:`, {
          address: walletAddress,
          tokenType,
          coinsFound: coins.data.length,
          totalBalance: totalBalance.toString(),
          minBalance: minBalance.toString(),
          hasMinimumBalance,
        });
      }

      return {
        address: walletAddress,
        totalBalance: totalBalance.toString(),
        coinType: tokenType,
        hasMinimumBalance,
      };
    } catch (error) {
      console.error('Error checking token balance:', error);
      return {
        address: walletAddress,
        totalBalance: '0',
        coinType: coinType || this.config.token.mewsTokenTypeId || '',
        hasMinimumBalance: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Verify a transaction that was signed and executed by the frontend
   * 
   * @param transactionHash - Transaction digest/hash from frontend
   * @returns Transaction verification result with status and events
   */
  async verifyTransaction(transactionHash: string): Promise<{
    exists: boolean;
    success: boolean;
    transactionHash: string;
    events?: any[];
    timestamp?: string;
    error?: string;
  }> {
    try {
      const tx = await this.client.getTransactionBlock({
        digest: transactionHash,
        options: {
          showEffects: true,
          showEvents: true,
          showInput: true,
        },
      });

      const success = tx.effects?.status?.status === 'success';
      
      return {
        exists: true,
        success,
        transactionHash,
        events: tx.events || [],
        timestamp: tx.timestampMs ? new Date(Number(tx.timestampMs)).toISOString() : undefined,
      };
    } catch (error) {
      console.error('Error verifying transaction:', error);
      return {
        exists: false,
        success: false,
        transactionHash,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Query StatisticsRegistry directly for all player stats
   * This includes migrated stats that may not have events
   * 
   * @param limit - Number of top scores to fetch (default: 100)
   * @returns Leaderboard entries sorted by best_score (descending)
   */
  async queryStatisticsRegistry(limit: number = 100): Promise<Array<{
    walletAddress: string;
    playerName?: string;
    score: number;  // best_score
    distance: number;  // best_distance
    coins: number;  // best_coins
    bossesDefeated: number;  // best_bosses_defeated
    enemiesDefeated?: number;  // best_enemies_defeated
    longestCoinStreak?: number;  // best_coin_streak
    transactionHash: string;  // Empty for registry queries
    timestamp: string;  // last_game_date
  }>> {
    try {
      const statsRegistryId = this.config.contracts.statisticsRegistry;
      
      if (!statsRegistryId || statsRegistryId === '0x...') {
        console.warn('⚠️ Statistics registry not configured. Cannot query leaderboard from registry.');
        return [];
      }

      console.log(`📊 [LEADERBOARD] Querying StatisticsRegistry: ${statsRegistryId}`);

      // Get the StatisticsRegistry object to access the player_stats table
      const registryObj = await this.client.getObject({
        id: statsRegistryId,
        options: { showContent: true },
      });

      if (registryObj.error || !registryObj.data?.content) {
        console.error('❌ [LEADERBOARD] Failed to get StatisticsRegistry object:', registryObj.error);
        return [];
      }

      const content = registryObj.data.content as any;
      const fields = content.fields as any;

      if (!fields.player_stats) {
        console.warn('⚠️ [LEADERBOARD] StatisticsRegistry has no player_stats table');
        return [];
      }

      // Get the table ID (Tables are stored as dynamic fields)
      // The structure is: player_stats: Table<address, PlayerStats>
      // Table has an id field that contains the dynamic fields
      let tableId: string;
      if (fields.player_stats.fields && fields.player_stats.fields.id) {
        tableId = fields.player_stats.fields.id.id || fields.player_stats.fields.id;
      } else if (fields.player_stats.id) {
        tableId = fields.player_stats.id.id || fields.player_stats.id;
      } else {
        console.error('❌ [LEADERBOARD] Could not find table ID in player_stats structure');
        console.error('Registry structure:', JSON.stringify(fields, null, 2));
        return [];
      }

      console.log(`📊 [LEADERBOARD] Player stats table ID: ${tableId}`);

      // Get all dynamic fields from the table (each field is a player address -> PlayerStats entry)
      const dynamicFields = await this.client.getDynamicFields({
        parentId: tableId,
      });

      console.log(`📊 [LEADERBOARD] Found ${dynamicFields.data.length} players in StatisticsRegistry`);

      if (dynamicFields.data.length === 0) {
        return [];
      }

      // Fetch all PlayerStats objects using getDynamicFieldObject for each player
      // This gives us the actual PlayerStats value from the table
      const playerStatsPromises = dynamicFields.data.map(async (field, index) => {
        try {
          // Get the player address from the field name
          // Field name structure: { type: 'address', value: '0x...' }
          let playerAddress = '';
          if (field.name) {
            if (typeof field.name === 'string') {
              playerAddress = field.name;
            } else if (field.name.value) {
              playerAddress = String(field.name.value);
            } else if (field.name.type === 'address' && (field.name as any).value) {
              playerAddress = String((field.name as any).value);
            }
          }

          if (!playerAddress) {
            console.warn(`⚠️ [LEADERBOARD] Field ${index} has no address:`, JSON.stringify(field.name));
            return null;
          }

          console.log(`📊 [LEADERBOARD] Fetching stats for player ${index + 1}/${dynamicFields.data.length}: ${playerAddress}`);
          
          // Use getDynamicFieldObject to get the actual PlayerStats value
          const dynamicFieldObj = await this.client.getDynamicFieldObject({
            parentId: tableId,
            name: {
              type: 'address',
              value: playerAddress,
            },
          });

          if (dynamicFieldObj.error || !dynamicFieldObj.data) {
            console.error(`❌ [LEADERBOARD] Error getting dynamic field for ${playerAddress}:`, dynamicFieldObj.error);
            return null;
          }

          // The PlayerStats object ID is in dynamicFieldObj.data.objectId
          const statsObj = await this.client.getObject({
            id: dynamicFieldObj.data.objectId,
            options: { showContent: true },
          });

          if (statsObj.error || !statsObj.data?.content) {
            console.error(`❌ [LEADERBOARD] Error fetching PlayerStats object ${dynamicFieldObj.data.objectId}:`, statsObj.error);
            return null;
          }

          const statsContent = statsObj.data.content as any;
          let statsFields = statsContent.fields as any;

          // Log first player's stats structure for debugging
          if (index === 0) {
            console.log(`🔍 [LEADERBOARD] Sample PlayerStats structure:`, {
              allFields: Object.keys(statsFields),
              hasValue: !!statsFields.value,
              valueType: typeof statsFields.value,
              valueIsObject: typeof statsFields.value === 'object',
              valueHasFields: !!(statsFields.value as any)?.fields,
              best_score: statsFields.best_score,
              best_distance: statsFields.best_distance,
            });
          }

          // If we got a wrapper with a 'value' field containing the PlayerStats fields
          // The value field is an object with { type, fields } where fields contains the actual stats
          if (statsFields.value && typeof statsFields.value === 'object' && statsFields.value.fields) {
            console.log(`📊 [LEADERBOARD] Detected wrapper structure, extracting PlayerStats from value.fields`);
            statsFields = statsFields.value.fields;
            console.log(`✅ [LEADERBOARD] Extracted PlayerStats fields:`, Object.keys(statsFields));
          } else if (statsFields.value && !statsFields.best_score) {
            // Fallback: value might be an object ID that needs to be fetched
            console.log(`📊 [LEADERBOARD] Detected wrapper structure, fetching actual PlayerStats from value field`);
            const valueId = typeof statsFields.value === 'string' 
              ? statsFields.value 
              : (statsFields.value as any).fields?.id?.id || (statsFields.value as any).id?.id || statsFields.value;
            
            const actualStatsObj = await this.client.getObject({
              id: valueId,
              options: { showContent: true },
            });

            if (actualStatsObj.data?.content) {
              statsFields = (actualStatsObj.data.content as any).fields;
              console.log(`✅ [LEADERBOARD] Got actual PlayerStats, fields:`, Object.keys(statsFields));
            }
          }

          const score = Number(statsFields.best_score || 0);
          const result = {
            walletAddress: playerAddress,
            score: score,
            distance: Number(statsFields.best_distance || 0),
            coins: Number(statsFields.best_coins || 0),
            bossesDefeated: Number(statsFields.best_bosses_defeated || 0),
            enemiesDefeated: statsFields.best_enemies_defeated ? Number(statsFields.best_enemies_defeated) : undefined,
            longestCoinStreak: statsFields.best_coin_streak ? Number(statsFields.best_coin_streak) : undefined,
            transactionHash: '',  // No transaction hash for registry queries
            timestamp: statsFields.last_game_date 
              ? new Date(Number(statsFields.last_game_date)).toISOString() 
              : new Date().toISOString(),
          };

          console.log(`✅ [LEADERBOARD] Loaded stats for ${playerAddress}: score=${score}`);
          return result;
        } catch (error) {
          console.error(`❌ [LEADERBOARD] Error fetching player stats for field ${index}:`, error);
          if (error instanceof Error) {
            console.error(`   Error message: ${error.message}`);
            console.error(`   Error stack: ${error.stack}`);
          }
          return null;
        }
      });

      const allStats = await Promise.all(playerStatsPromises);
      
      console.log(`📊 [LEADERBOARD] Fetched ${allStats.length} stats, ${allStats.filter(s => s !== null).length} non-null`);
      
      const validStats = allStats
        .filter((stat): stat is NonNullable<typeof stat> => stat !== null)
        .filter((stat) => {
          const isValid = stat.walletAddress !== '' && stat.score > 0;
          if (!isValid) {
            console.warn(`⚠️ [LEADERBOARD] Filtered out player ${stat.walletAddress || 'unknown'}: address=${stat.walletAddress !== ''}, score=${stat.score}`);
          }
          return isValid;
        })
        .sort((a, b) => b.score - a.score) // Sort by best_score descending
        .slice(0, limit); // Take top N

      console.log(`✅ [LEADERBOARD] Successfully loaded ${validStats.length} players from StatisticsRegistry (after filtering)`);

      return validStats;
    } catch (error) {
      console.error('❌ [LEADERBOARD] Error querying StatisticsRegistry:', error);
      return [];
    }
  }

  /**
   * Query events from a specific package (for querying old contract events)
   * 
   * @param packageId - Package ID to query events from
   * @param limit - Number of events to fetch (default: 1000)
   * @returns Leaderboard entries sorted by score (descending)
   */
  async queryEventsFromPackage(packageId: string, limit: number = 1000): Promise<Array<{
    walletAddress: string;
    playerName?: string;
    score: number;
    distance: number;
    coins: number;
    bossesDefeated: number;
    enemiesDefeated?: number;
    longestCoinStreak?: number;
    transactionHash: string;
    timestamp: string;
  }>> {
    try {
      if (!packageId || packageId === '0x...') {
        console.warn('⚠️ Package ID not provided. Cannot query events.');
        return [];
      }

      // Query events for score submissions from the specified package
      const events = await this.client.queryEvents({
        query: {
          MoveModule: {
            package: packageId,
            module: 'score_submission',
          },
        },
        limit: limit,
        order: 'descending',
      });
      
      console.log(`📊 [LEADERBOARD] Queried events from ${packageId}::score_submission, found ${events.data.length} events`);

      // Helper function to decode byte arrays (vector<u8> from Move)
      const decodeBytes = (bytes: any): string => {
        if (!bytes) return '';
        if (typeof bytes === 'string') return bytes;
        if (Array.isArray(bytes)) {
          const uint8Array = new Uint8Array(bytes);
          return new TextDecoder().decode(uint8Array);
        }
        return '';
      };

      // Parse and sort events by score
      const scores = events.data
        .map((event, index) => {
          try {
            const parsedJson = event.parsedJson as any;
            const playerName = decodeBytes(parsedJson.player_name);
            
            return {
              walletAddress: parsedJson.player || parsedJson.wallet_address || '',
              playerName: playerName || undefined,
              score: Number(parsedJson.score || 0),
              distance: Number(parsedJson.distance || 0),
              coins: Number(parsedJson.coins || 0),
              bossesDefeated: Number(parsedJson.bosses_defeated || parsedJson.bossesDefeated || 0),
              enemiesDefeated: parsedJson.enemies_defeated || parsedJson.enemiesDefeated 
                ? Number(parsedJson.enemies_defeated || parsedJson.enemiesDefeated) 
                : undefined,
              longestCoinStreak: parsedJson.longest_coin_streak || parsedJson.longestCoinStreak
                ? Number(parsedJson.longest_coin_streak || parsedJson.longestCoinStreak)
                : undefined,
              transactionHash: event.id.txDigest,
              timestamp: event.timestampMs 
                ? new Date(Number(event.timestampMs)).toISOString() 
                : new Date().toISOString(),
            };
          } catch (e) {
            console.error(`❌ [LEADERBOARD] Error parsing event ${index}:`, e, event);
            return null;
          }
        })
        .filter((score): score is NonNullable<typeof score> => score !== null)
        .filter((score) => score.walletAddress !== '') // Filter out invalid entries
        .sort((a, b) => b.score - a.score); // Sort by score descending

      console.log(`✅ [LEADERBOARD] Successfully parsed ${scores.length} scores from ${events.data.length} events (package: ${packageId})`);

      return scores;
    } catch (error) {
      console.error(`❌ [LEADERBOARD] Error querying events from package ${packageId}:`, error);
      return [];
    }
  }

  /**
   * Query blockchain events for leaderboard
   * Queries ScoreSubmitted events from the smart contract
   * 
   * @param limit - Number of top scores to fetch (default: 100)
   * @returns Leaderboard entries sorted by score (descending)
   */
  async queryEvents(limit: number = 100): Promise<Array<{
    walletAddress: string;
    playerName?: string;  // Optional player name (if provided)
    score: number;
    distance: number;
    coins: number;
    bossesDefeated: number;
    enemiesDefeated?: number;
    longestCoinStreak?: number;
    transactionHash: string;
    timestamp: string;
  }>> {
    try {
      const contractAddress = this.config.contracts.gameScore;
      
      if (!contractAddress || contractAddress === '0x...') {
        console.warn('⚠️ Game score contract address not configured. Cannot query leaderboard.');
        return [];
      }

      // Parse contract address (format: 0x...::module::type)
      const [packageId] = contractAddress.split('::');

      // Query events for score submissions
      // Note: The module is 'score_submission', not 'game'
      const events = await this.client.queryEvents({
        query: {
          MoveModule: {
            package: packageId,
            module: 'score_submission',
          },
        },
        limit: 1000, // Get more than needed to sort and filter
        order: 'descending',
      });
      
      console.log(`📊 [LEADERBOARD] Queried events from ${packageId}::score_submission, found ${events.data.length} events`);
      
      if (events.data.length === 0) {
        console.warn(`⚠️ [LEADERBOARD] No events found. Check that:`);
        console.warn(`   - Package ID is correct: ${packageId}`);
        console.warn(`   - Module name is correct: score_submission`);
        console.warn(`   - Events have been emitted from the contract`);
      }

      // Helper function to decode byte arrays (vector<u8> from Move)
      const decodeBytes = (bytes: any): string => {
        if (!bytes) return '';
        if (typeof bytes === 'string') return bytes;
        if (Array.isArray(bytes)) {
          // Convert array of numbers to Uint8Array and decode
          const uint8Array = new Uint8Array(bytes);
          return new TextDecoder().decode(uint8Array);
        }
        return '';
      };

      // Parse and sort events by score
      const scores = events.data
        .map((event, index) => {
          try {
            const parsedJson = event.parsedJson as any;
            
            // Debug: Log first event structure
            if (index === 0) {
              console.log(`🔍 [LEADERBOARD] Sample event structure:`, {
                type: event.type,
                parsedJsonKeys: Object.keys(parsedJson || {}),
                parsedJson: parsedJson,
              });
            }
            
            const playerName = decodeBytes(parsedJson.player_name);
            
            return {
              walletAddress: parsedJson.player || parsedJson.wallet_address || '',
              playerName: playerName || undefined,  // Only include if not empty
              score: Number(parsedJson.score || 0),
              distance: Number(parsedJson.distance || 0),
              coins: Number(parsedJson.coins || 0),
              bossesDefeated: Number(parsedJson.bosses_defeated || parsedJson.bossesDefeated || 0),
              enemiesDefeated: parsedJson.enemies_defeated || parsedJson.enemiesDefeated 
                ? Number(parsedJson.enemies_defeated || parsedJson.enemiesDefeated) 
                : undefined,
              longestCoinStreak: parsedJson.longest_coin_streak || parsedJson.longestCoinStreak
                ? Number(parsedJson.longest_coin_streak || parsedJson.longestCoinStreak)
                : undefined,
              transactionHash: event.id.txDigest,
              timestamp: event.timestampMs 
                ? new Date(Number(event.timestampMs)).toISOString() 
                : new Date().toISOString(),
            };
          } catch (e) {
            console.error(`❌ [LEADERBOARD] Error parsing event ${index}:`, e, event);
            return null;
          }
        })
        .filter((score): score is NonNullable<typeof score> => score !== null)
        .filter((score) => score.walletAddress !== '') // Filter out invalid entries
        .sort((a, b) => b.score - a.score) // Sort by score descending
        .slice(0, limit); // Take top N

      console.log(`✅ [LEADERBOARD] Successfully parsed ${scores.length} scores from ${events.data.length} events`);

      return scores;
    } catch (error) {
      console.error('Error querying events:', error);
      return [];
    }
  }

  /**
   * Get scores for a specific wallet address
   * 
   * @param walletAddress - Wallet address to query
   * @param limit - Maximum number of scores to return (default: 50)
   * @returns Player's scores sorted by score (descending)
   */
  async getPlayerScores(
    walletAddress: string,
    limit: number = 50
  ): Promise<Array<{
    walletAddress: string;
    playerName?: string;  // Optional player name (if provided)
    score: number;
    distance: number;
    coins: number;
    bossesDefeated: number;
    enemiesDefeated?: number;
    longestCoinStreak?: number;
    transactionHash: string;
    timestamp: string;
  }>> {
    try {
      const allScores = await this.queryEvents(1000);
      
      // Filter by player address
      const playerScores = allScores
        .filter((score) => score.walletAddress.toLowerCase() === walletAddress.toLowerCase())
        .slice(0, limit);

      return playerScores;
    } catch (error) {
      console.error('Error getting player scores:', error);
      return [];
    }
  }

  /**
   * Test connection to Sui network
   * 
   * @returns Connection status and network info
   */
  async testConnection(): Promise<{
    connected: boolean;
    network: string;
    chainId?: string;
    error?: string;
  }> {
    try {
      const chainId = await this.client.getChainIdentifier();
      
      return {
        connected: true,
        network: this.config.sui.network,
        chainId,
      };
    } catch (error) {
      return {
        connected: false,
        network: this.config.sui.network,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Export singleton instance
export const suiService = new SuiService();

export default suiService;

