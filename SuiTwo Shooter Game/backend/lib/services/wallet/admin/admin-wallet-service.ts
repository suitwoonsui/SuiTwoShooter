// ==========================================
// Admin Wallet Service - Game-specific extensions
// Standalone implementation that doesn't extend platform backend's AdminWalletService
// (tournament ops go through platform API; this wallet is for game-signed ops: rewards, badges, achievements, store, app-config).
// Env: GAME_WALLET_PRIVATE_KEY or ADMIN_WALLET_PRIVATE_KEY (bech32 or hex). Network from config (SUI_NETWORK / getConfig().sui.network).
// ==========================================

import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { fromHEX } from '@mysten/sui/utils';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { getConfig } from '@/config/config';
import { bech32 } from 'bech32';

/**
 * Decode bech32 private key to hex format
 * Handles both bech32 (suiprivkey1...) and hex formats
 */
function decodePrivateKey(privateKey: string): Uint8Array {
  if (privateKey.startsWith('suiprivkey1')) {
    try {
      const decoded = bech32.decode(privateKey);
      const bytes = bech32.fromWords(decoded.words);
      if (bytes.length === 33) {
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
 * GameAdminWalletService - Standalone implementation for game backend
 * Doesn't extend platform backend's AdminWalletService to avoid requiring private key
 * for tournament operations (which go through platform backend API)
 * 
 * Note: This service still needs the private key for other operations like:
 * - Score submission
 * - Badge operations
 * - Achievement operations
 * - Store operations
 * - Game config operations
 */
export class GameAdminWalletService {
  private keypair: Ed25519Keypair | null = null;
  private address: string | null = null;
  private testnetClient: SuiClient;
  private mainnetClient: SuiClient;
  private gameConfig: ReturnType<typeof getConfig>;
  private initialized: boolean = false;

  constructor() {
    this.gameConfig = getConfig();
    this.testnetClient = new SuiClient({ url: getFullnodeUrl('testnet') });
    this.mainnetClient = new SuiClient({ url: getFullnodeUrl('mainnet') });
    // Don't initialize keypair here - do it lazily when needed
    // This allows tournament operations (which go through platform API) to work
    // without requiring the private key
  }

  /**
   * Initialize the wallet (lazy initialization)
   * Only called when actually needed for operations that require signing
   */
  private ensureInitialized(): void {
    if (this.initialized) return;

    // Game backend uses GAME_WALLET_PRIVATE_KEY (separate from platform backend)
    // This wallet is used for game-specific operations (scores, badges, achievements, store)
    // Tournament operations go through platform backend API and don't need this
    const privateKey = process.env.GAME_WALLET_PRIVATE_KEY || process.env.ADMIN_WALLET_PRIVATE_KEY;
    
    if (!privateKey) {
      throw new Error('GAME_WALLET_PRIVATE_KEY or ADMIN_WALLET_PRIVATE_KEY must be set in environment variables. Required for operations like score submission, badges, achievements, and store operations. Tournament operations go through platform backend API and don\'t need this.');
    }

    try {
      const decodedKey = decodePrivateKey(privateKey);
      this.keypair = Ed25519Keypair.fromSecretKey(decodedKey);
      this.address = this.keypair.toSuiAddress();
      this.initialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize admin wallet: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get admin wallet address
   */
  getAddress(): string {
    this.ensureInitialized();
    return this.address!;
  }

  /**
   * Get admin wallet keypair (for signing transactions)
   */
  getKeypair(): Ed25519Keypair {
    this.ensureInitialized();
    return this.keypair!;
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
   * Get client for current network (from config)
   */
  getClient(): SuiClient {
    return this.gameConfig.sui.network === 'testnet' 
      ? this.testnetClient 
      : this.mainnetClient;
  }

}

// Export singleton instance
let adminWalletServiceInstance: GameAdminWalletService | null = null;

export function getAdminWalletService(): GameAdminWalletService {
  if (!adminWalletServiceInstance) {
    adminWalletServiceInstance = new GameAdminWalletService();
  }
  return adminWalletServiceInstance;
}

// Note: Removed module-level export to prevent immediate initialization
// Tournament operations now go through platform backend API, so admin wallet
// is only needed for backward compatibility with old tournaments
// export const adminWalletService = getAdminWalletService(); // Removed for SaaS architecture
// export default adminWalletService; // Removed - was causing ReferenceError

