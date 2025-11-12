// ==========================================
// Admin Wallet Service - Signs transactions on behalf of players
// Admin wallet pays all gas fees
// ==========================================

import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { fromHEX } from '@mysten/sui/utils';
import { Transaction } from '@mysten/sui/transactions';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { getConfig } from '@/config/config';
import { bech32 } from 'bech32';

/**
 * Decode bech32 private key to hex format
 * Handles both bech32 (suiprivkey1...) and hex formats
 */
function decodePrivateKey(privateKey: string): Uint8Array {
  // Check if it's bech32 format (starts with suiprivkey1)
  if (privateKey.startsWith('suiprivkey1')) {
    try {
      // Decode bech32 format
      // Sui private keys use bech32 encoding with prefix "suiprivkey1"
      const decoded = bech32.decode(privateKey);
      
      // Convert 5-bit words to bytes
      // The decoded data is in 5-bit words, we need to convert to 8-bit bytes
      const bytes = bech32.fromWords(decoded.words);
      
      // Sui Ed25519 private keys are 32 bytes
      // Bech32 may include a version byte (33 bytes), so slice it off if present
      if (bytes.length === 33) {
        // First byte is version byte, skip it
        return new Uint8Array(bytes.slice(1));
      } else if (bytes.length === 32) {
        return new Uint8Array(bytes);
      } else {
        throw new Error(`Invalid private key length after bech32 decode. Expected 32 or 33 bytes, got ${bytes.length}`);
      }
    } catch (error) {
      throw new Error(`Failed to decode bech32 private key: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  } else {
    // Hex format (with or without 0x prefix)
    let hexKey = privateKey.trim();
    if (hexKey.startsWith('0x') || hexKey.startsWith('0X')) {
      hexKey = hexKey.slice(2);
    }
    
    if (hexKey.length !== 64) {
      throw new Error(`Invalid hex private key length. Expected 64 characters, got ${hexKey.length}`);
    }
    
    return fromHEX(hexKey);
  }
}

/**
 * AdminWalletService - Manages admin wallet for signing transactions
 * Admin wallet pays gas fees for all score submissions
 */
export class AdminWalletService {
  private keypair: Ed25519Keypair;
  private address: string;
  private testnetClient: SuiClient;
  private mainnetClient: SuiClient;
  private config: ReturnType<typeof getConfig>;

  constructor() {
    this.config = getConfig();
    
    // Load admin wallet private key from environment
    const privateKey = process.env.GAME_WALLET_PRIVATE_KEY || process.env.ADMIN_WALLET_PRIVATE_KEY;
    
    if (!privateKey) {
      throw new Error('GAME_WALLET_PRIVATE_KEY or ADMIN_WALLET_PRIVATE_KEY must be set in environment variables');
    }

    // Initialize keypair from private key (handles both bech32 and hex)
    try {
      // Decode private key (handles both bech32 and hex formats)
      const decodedKey = decodePrivateKey(privateKey);
      this.keypair = Ed25519Keypair.fromSecretKey(decodedKey);
      this.address = this.keypair.toSuiAddress();
    } catch (error) {
      throw new Error(`Failed to initialize admin wallet: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Initialize Sui clients (separate for testnet and mainnet)
    this.testnetClient = new SuiClient({ url: getFullnodeUrl('testnet') });
    this.mainnetClient = new SuiClient({ url: getFullnodeUrl('mainnet') });
    
    console.log(`✅ AdminWalletService initialized`);
    console.log(`   Admin Address: ${this.address}`);
    console.log(`   Testnet RPC: ${getFullnodeUrl('testnet')}`);
    console.log(`   Mainnet RPC: ${getFullnodeUrl('mainnet')}`);
  }

  /**
   * Get admin wallet address
   */
  getAddress(): string {
    return this.address;
  }

  /**
   * Get testnet client (for contract operations)
   */
  getTestnetClient(): SuiClient {
    return this.testnetClient;
  }

  /**
   * Get mainnet client (for token balance checks)
   */
  getMainnetClient(): SuiClient {
    return this.mainnetClient;
  }

  /**
   * Submit game score on behalf of a player
   * Admin wallet signs and pays gas fees
   * 
   * @param playerAddress - User's wallet address (from connected wallet)
   * @param scoreData - Game statistics
   * @param playerName - Optional player name (empty string if skipped)
   * @param sessionId - Unique session ID for duplicate prevention
   */
  async submitScoreForPlayer(
    playerAddress: string,
    scoreData: {
      score: number;
      distance: number;
      coins: number;
      bossesDefeated: number;
      enemiesDefeated: number;
      longestCoinStreak: number;
    },
    playerName: string = '',
    sessionId: string | null = null
  ): Promise<{
    success: boolean;
    digest?: string;
    error?: string;
  }> {
    try {
      // Validate player address format
      if (!playerAddress || !playerAddress.startsWith('0x') || playerAddress.length !== 66) {
        throw new Error('Invalid player address format');
      }

      // Validate score data
      if (
        scoreData.score < 0 || 
        scoreData.distance < 0 || 
        scoreData.coins < 0 ||
        scoreData.bossesDefeated < 0 ||
        scoreData.enemiesDefeated < 0 ||
        scoreData.longestCoinStreak < 0
      ) {
        throw new Error('Invalid score data: negative values not allowed');
      }

      // Get contract package ID from config
      const contractAddress = this.config.contracts.gameScore;
      if (!contractAddress || contractAddress === '' || contractAddress === '0x...') {
        throw new Error('Game score contract address not configured. Please set GAME_SCORE_CONTRACT environment variable.');
      }

      // Parse package ID from contract address (format: 0x... or 0x...::module::type)
      const packageId = contractAddress.includes('::') 
        ? contractAddress.split('::')[0]
        : contractAddress;

      console.log(`📝 Building transaction for player: ${playerAddress}`);
      console.log(`   Score: ${scoreData.score}`);
      console.log(`   Distance: ${scoreData.distance}`);
      console.log(`   Coins: ${scoreData.coins}`);
      console.log(`   Bosses Defeated: ${scoreData.bossesDefeated}`);
      console.log(`   Enemies Defeated: ${scoreData.enemiesDefeated}`);
      console.log(`   Longest Coin Streak: ${scoreData.longestCoinStreak}`);
      console.log(`   Package ID: ${packageId}`);
      console.log(`   Player Name: ${playerName || '(empty)'}`);
      console.log(`   Session ID: ${sessionId || '(none)'}`);

      // Get session registry object ID from config
      // This will be set after contract deployment (from init function)
      // Config already handles network-specific variables (SESSION_REGISTRY_OBJECT_ID_TESTNET/MAINNET)
      const registryObjectId = this.config.contracts.sessionRegistry;
      if (!registryObjectId || registryObjectId === '' || registryObjectId === '0x...') {
        const network = this.config.sui.network;
        throw new Error(`Session registry object ID not configured for ${network}. Please set SESSION_REGISTRY_OBJECT_ID_${network.toUpperCase()} environment variable after contract deployment.`);
      }

      // Convert player name and session ID to bytes (UTF-8)
      const playerNameBytes = new TextEncoder().encode(playerName || '');
      const sessionIdBytes = sessionId ? new TextEncoder().encode(sessionId) : new TextEncoder().encode('');

      // Ensure all numeric values are integers (Move contract expects u64, not floats)
      const score = Math.round(scoreData.score);
      const distance = Math.round(scoreData.distance);  // Round distance to integer
      const coins = Math.round(scoreData.coins);
      const bossesDefeated = Math.round(scoreData.bossesDefeated);
      const enemiesDefeated = Math.round(scoreData.enemiesDefeated);
      const longestCoinStreak = Math.round(scoreData.longestCoinStreak);
      
      // Get boss tiers and enemy types arrays (for exact score calculation)
      const bossTiers = Array.isArray(scoreData.bossTiers) ? scoreData.bossTiers.map(t => Math.round(t)) : [];
      const enemyTypes = Array.isArray(scoreData.enemyTypes) ? scoreData.enemyTypes.map(t => Math.round(t)) : [];
      const bossHits = Math.round(scoreData.bossHits || 0);
      
      // Calculate exact expected score for validation debugging
      // NOTE: Coins and distance do NOT give score in the game - they are only tracked for other purposes
      const enemyScoreComponent = enemyTypes.length === enemiesDefeated
        ? enemyTypes.reduce((sum, type) => sum + (15 * type), 0) // Exact: 15 * type for each
        : enemiesDefeated * 15; // Fallback: minimum (all type 1)
      const bossScoreComponent = bossTiers.length === bossesDefeated
        ? bossTiers.reduce((sum, tier) => sum + (5000 * tier), 0) // Exact: 5000 * tier for each
        : bossesDefeated * 5000; // Fallback: minimum (all tier 1)
      const bossHitScoreComponent = bossHits; // bossHits is now total damage dealt (not count), points = damage
      const expectedScore = enemyScoreComponent + bossScoreComponent + bossHitScoreComponent;
      const minAllowedScore = expectedScore > 0 ? Math.floor(expectedScore * 90 / 100) : 0; // Contract uses 90% threshold (tightened from 25% → 75% → 80% → 90% as score system consistently achieves 100% accuracy)
      const maxAllowedScore = expectedScore * 20; // Contract uses 20x max
      
      console.log(`🔍 [VALIDATION DEBUG] Exact score calculation (coins and distance do NOT give score):`);
      if (enemyTypes.length === enemiesDefeated) {
        console.log(`   Enemy component (EXACT): ${enemyTypes.length} enemies, types: [${enemyTypes.join(', ')}] = ${enemyScoreComponent}`);
      } else {
        console.log(`   Enemy component (FALLBACK): ${enemiesDefeated} * 15 = ${enemyScoreComponent} (array length mismatch: ${enemyTypes.length} vs ${enemiesDefeated})`);
      }
      if (bossTiers.length === bossesDefeated) {
        console.log(`   Boss component (EXACT): ${bossTiers.length} bosses, tiers: [${bossTiers.join(', ')}] = ${bossScoreComponent}`);
      } else {
        console.log(`   Boss component (FALLBACK): ${bossesDefeated} * 5000 = ${bossScoreComponent} (array length mismatch: ${bossTiers.length} vs ${bossesDefeated})`);
      }
      console.log(`   Boss hits component: ${bossHits} total damage = ${bossHitScoreComponent} (points = damage dealt)`);
      console.log(`   Expected score: ${expectedScore} (enemies + bosses + boss hits only)`);
      console.log(`   Min allowed (90%): ${minAllowedScore}`);
      console.log(`   Max allowed (20x): ${maxAllowedScore}`);
      console.log(`   Actual score: ${score}`);
      
      // Calculate accuracy percentage for analysis
      const accuracyPercent = expectedScore > 0 ? ((score / expectedScore) * 100).toFixed(2) : 'N/A';
      const accuracyDiff = expectedScore > 0 ? (score - expectedScore) : 0;
      console.log(`   📊 ACCURACY: ${accuracyPercent}% (diff: ${accuracyDiff > 0 ? '+' : ''}${accuracyDiff})`);
      console.log(`   Score >= 90% of expected? ${score >= minAllowedScore}`);
      console.log(`   Score <= 20x of expected? ${score <= maxAllowedScore}`);

      // Build transaction
      const txb = new Transaction();

      // Call submit_game_session_for_player function
      txb.moveCall({
        target: `${packageId}::score_submission::submit_game_session_for_player`,
        arguments: [
          txb.object(registryObjectId),              // registry: &mut SessionRegistry
          txb.pure.address(playerAddress),           // player: address
          txb.object('0x6'),                        // clock: &Clock (standard Sui Clock)
          txb.pure.u64(score),                      // score: u64
          txb.pure.u64(distance),                    // distance: u64 (rounded)
          txb.pure.u64(coins),                      // coins: u64
          txb.pure.u64(bossesDefeated),              // bosses_defeated: u64
          txb.pure.u64(enemiesDefeated),            // enemies_defeated: u64
          txb.pure.u64(longestCoinStreak),          // longest_coin_streak: u64
          txb.pure.vector('u8', Array.from(playerNameBytes)),  // player_name: vector<u8>
          txb.pure.vector('u8', Array.from(sessionIdBytes)),     // session_id: vector<u8>
          txb.pure.vector('u64', bossTiers),        // boss_tiers: vector<u64> (for exact score calculation)
          txb.pure.vector('u64', enemyTypes),       // enemy_types: vector<u64> (for exact score calculation)
          txb.pure.u64(bossHits),                   // boss_hits: u64 (50 points each)
        ],
      });

      // Set gas budget
      txb.setGasBudget(this.config.sui.gasBudget);

      console.log('🔐 Signing transaction with admin wallet...');

      // Sign and execute with admin wallet on testnet (admin pays gas)
      const result = await this.testnetClient.signAndExecuteTransaction({
        signer: this.keypair,
        transaction: txb,
        options: {
          showEffects: true,
          showEvents: true,
        },
      });

      // Check if transaction succeeded
      if (result.effects?.status?.status === 'success') {
        console.log('✅ Score submitted successfully!');
        console.log(`   Transaction Digest: ${result.digest}`);
        console.log(`   Gas paid by: Admin wallet (${this.address})`);

        return {
          success: true,
          digest: result.digest,
        };
      } else {
        throw new Error(`Transaction failed: ${result.effects?.status?.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('❌ Error submitting score:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Check admin wallet SUI balance (for gas fees)
   * Checks testnet balance (where contracts are deployed)
   */
  async checkBalance(): Promise<{
    balance: string;
    balanceInSUI: number;
    hasEnough: boolean;
  }> {
    try {
      const balance = await this.testnetClient.getBalance({
        owner: this.address,
      });

      const balanceInSUI = parseInt(balance.totalBalance) / 1_000_000_000; // Convert MIST to SUI
      const minRequired = 0.01; // 0.01 SUI minimum
      const hasEnough = balanceInSUI >= minRequired;

      return {
        balance: balance.totalBalance,
        balanceInSUI,
        hasEnough,
      };
    } catch (error) {
      console.error('Error checking admin wallet balance:', error);
      return {
        balance: '0',
        balanceInSUI: 0,
        hasEnough: false,
      };
    }
  }
}

// Export singleton instance
let adminWalletServiceInstance: AdminWalletService | null = null;

export function getAdminWalletService(): AdminWalletService {
  if (!adminWalletServiceInstance) {
    adminWalletServiceInstance = new AdminWalletService();
  }
  return adminWalletServiceInstance;
}

export const adminWalletService = getAdminWalletService();
export default adminWalletService;

