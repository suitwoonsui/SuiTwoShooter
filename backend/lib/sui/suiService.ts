// ==========================================
// Sui Blockchain Service Module
// ==========================================

import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { getConfig } from '@/config/config';

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

