// ==========================================
// Payment Transaction Builder
// Shared service for building payment transactions across all services
// ==========================================

import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { getConfig } from '@/config/config';
import { checkPlayerTokenBalanceForPurchase } from './balance-checker';

export type PaymentToken = 'SUI' | 'MEWS' | 'USDC';
export type SuiNetwork = 'testnet' | 'mainnet' | 'devnet';

export interface PaymentConfig {
  playerAddress: string;
  paymentToken: PaymentToken;
  totalTokenAmount: string; // Amount in token (with decimals, as string to preserve precision)
  recipientAddress: string; // Address to receive payment (usually admin wallet)
  context: string; // Context for logging (e.g., 'store purchase', 'tournament creation')
}

export interface PaymentCoinResult {
  paymentCoin: any; // Transaction builder coin object
  error?: string;
}

export interface BuildPaymentTransactionOptions {
  paymentConfig: PaymentConfig;
  customCalls: (txb: Transaction, paymentCoin: any) => void; // Function to add custom contract calls
  gasBudget?: number; // Optional custom gas budget
}

/**
 * PaymentTransactionBuilder - Shared service for building payment transactions
 * 
 * Handles:
 * - Token type resolution (SUI, MEWS, USDC)
 * - Balance checking
 * - Payment coin preparation
 * - Gas estimation
 * 
 * Services can use this to build transactions with payment + custom contract calls
 */
export class PaymentTransactionBuilder {
  private client: SuiClient;
  private config: ReturnType<typeof getConfig>;

  constructor(client: SuiClient) {
    this.client = client;
    this.config = getConfig();
  }

  /**
   * Get payment token type ID and decimals
   * Uses backend's configured network (testnet for payments)
   */
  private getPaymentTokenInfo(paymentToken: PaymentToken): {
    tokenType: string;
    decimals: number;
    error?: string;
  } {
    // Use backend's configured network (testnet for store/tournament payments)
    const targetNetwork = this.config.sui.network;
    
    if (paymentToken === 'SUI') {
      return {
        tokenType: 'SUI',
        decimals: 9, // SUI has 9 decimals
      };
    } else if (paymentToken === 'MEWS') {
      // Get token type ID for the target network
      // Use config.token.mewsTokenTypeId directly (same as store service)
      // Config handles: MEWS_TOKEN_TYPE_ID_TESTNET/MAINNET > MEWS_TOKEN_TYPE_ID
      const tokenType = this.config.token.mewsTokenTypeId || '';
      
      if (!tokenType || tokenType === '0x...') {
        return {
          tokenType: '',
          decimals: 0,
          error: `MEWS token type ID not configured for ${targetNetwork}. Please set MEWS_TOKEN_TYPE_ID_${targetNetwork.toUpperCase()} or MEWS_TOKEN_TYPE_ID environment variable.`,
        };
      }
      // MEWS mainnet uses 6 decimals, testnet uses 9 decimals
      const decimals = targetNetwork === 'testnet' ? 9 : 6;
      
      // Debug logging to help diagnose balance issues
      const BadgeLogger = require('./badge-logger').BadgeLogger;
      BadgeLogger.debug('Payment token info for MEWS', {
        targetNetwork,
        backendNetwork: this.config.sui.network,
        tokenType,
        decimals,
        paymentToken,
        envTestnet: process.env.MEWS_TOKEN_TYPE_ID_TESTNET || 'not set',
        envMainnet: process.env.MEWS_TOKEN_TYPE_ID_MAINNET || 'not set',
        configTokenTypeId: this.config.token.mewsTokenTypeId,
      });
      
      return {
        tokenType,
        decimals,
      };
    } else if (paymentToken === 'USDC') {
      // Get token type ID for the target network
      const tokenType = targetNetwork === 'testnet'
        ? (process.env.USDC_TOKEN_TYPE_ID_TESTNET || process.env.USDC_TOKEN_TYPE_ID || this.config.token.usdcTokenTypeId || '')
        : (process.env.USDC_TOKEN_TYPE_ID_MAINNET || process.env.USDC_TOKEN_TYPE_ID || this.config.token.usdcTokenTypeId || '');
      
      if (!tokenType || tokenType === '') {
        return {
          tokenType: '',
          decimals: 0,
          error: `USDC token type ID not configured for ${targetNetwork}. Please set USDC_TOKEN_TYPE_ID_TESTNET or USDC_TOKEN_TYPE_ID_MAINNET in environment variables.`,
        };
      }
      return {
        tokenType,
        decimals: 6, // USDC has 6 decimals
      };
    } else {
      return {
        tokenType: '',
        decimals: 0,
        error: `Invalid payment token: ${paymentToken}`,
      };
    }
  }

  /**
   * Prepare payment coin for transaction
   * Handles SUI (split from gas) and other tokens (get coins, merge if needed, split)
   */
  private async preparePaymentCoin(
    txb: Transaction,
    paymentConfig: PaymentConfig
  ): Promise<PaymentCoinResult> {
    const { playerAddress, paymentToken, totalTokenAmount } = paymentConfig;
    const tokenInfo = this.getPaymentTokenInfo(paymentToken);

    if (tokenInfo.error) {
      return {
        paymentCoin: null,
        error: tokenInfo.error,
      };
    }

    const paymentAmountBigInt = BigInt(totalTokenAmount);

    if (paymentToken === 'SUI') {
      // For SUI, split from gas coin
      // splitCoins returns an array, so we need to destructure when splitting into one coin
      const [paymentCoin] = txb.splitCoins(txb.gas, [paymentAmountBigInt]);
      return {
        paymentCoin,
      };
    } else {
      // For MEWS/USDC, get player's coins and prepare payment
      // Use backend's configured client (testnet for payments)
      try {
        const coins = await this.client.getCoins({
          owner: playerAddress,
          coinType: tokenInfo.tokenType,
        });

        if (!coins.data || coins.data.length === 0) {
          return {
            paymentCoin: null,
            error: `No ${paymentToken} coins found. Please ensure you have ${paymentToken} in your wallet.`,
          };
        }

        // Check if any single coin has sufficient balance
        const coinWithEnoughBalance = coins.data.find(
          coin => BigInt(coin.balance) >= paymentAmountBigInt
        );

        let coinToSplit: any;

        if (coinWithEnoughBalance) {
          // Use a single coin that has enough balance - no merge needed
          coinToSplit = txb.object(coinWithEnoughBalance.coinObjectId);
        } else if (coins.data.length === 1) {
          // Only one coin exists (will fail at execution if insufficient)
          coinToSplit = txb.object(coins.data[0].coinObjectId);
        } else {
          // Multiple coins and none has enough alone - merge them
          const coinObjects = coins.data.map(coin => txb.object(coin.coinObjectId));
          coinToSplit = txb.mergeCoins(coinObjects[0], coinObjects.slice(1));
        }

        // Split the payment amount from the coin
        // splitCoins returns an array, so we need to destructure when splitting into one coin
        const [paymentCoin] = txb.splitCoins(coinToSplit, [paymentAmountBigInt]);

        return {
          paymentCoin,
        };
      } catch (error) {
        return {
          paymentCoin: null,
          error: `Failed to get ${paymentToken} coins: ${error instanceof Error ? error.message : 'Unknown error'}`,
        };
      }
    }
  }

  /**
   * Check player balance before building transaction
   * Uses backend's configured network (testnet for payments)
   */
  private async checkBalance(paymentConfig: PaymentConfig): Promise<{
    success: boolean;
    error?: string;
  }> {
    // Use backend's configured network (testnet for store/tournament payments)
    const tokenInfo = this.getPaymentTokenInfo(paymentConfig.paymentToken);

    if (tokenInfo.error) {
      return {
        success: false,
        error: tokenInfo.error,
      };
    }

    const gasBudget = this.config.sui.gasBudget;
    const gasWithBuffer = Math.round(gasBudget * 1.15);

    // Debug: Log network and token info to help diagnose issues
    const BadgeLogger = require('./badge-logger').BadgeLogger;
    BadgeLogger.debug('Payment balance check', {
      network: this.config.sui.network,
      paymentToken: paymentConfig.paymentToken,
      tokenType: tokenInfo.tokenType,
      tokenDecimals: tokenInfo.decimals,
      walletAddress: paymentConfig.playerAddress,
      requiredAmount: paymentConfig.totalTokenAmount,
      context: paymentConfig.context,
    });
    
    // Also log at info level to ensure visibility
    if (paymentConfig.paymentToken === 'MEWS') {
      BadgeLogger.info('MEWS Token Type ID Check', {
        network: this.config.sui.network,
        tokenTypeBeingUsed: tokenInfo.tokenType,
        expectedTestnet: '0xcc01924c571e20ad9e7151e83cf43238c5b74c7836d54b39390ad071d74f477a::mews::MEWS',
        expectedMainnet: '0x2dcf8629a70b235cda598170fc9b271f03f33d34dd6fa148adaff481e7a792d2::mews::MEWS',
        isTestnetToken: tokenInfo.tokenType === '0xcc01924c571e20ad9e7151e83cf43238c5b74c7836d54b39390ad071d74f477a::mews::MEWS',
        isMainnetToken: tokenInfo.tokenType === '0x2dcf8629a70b235cda598170fc9b271f03f33d34dd6fa148adaff481e7a792d2::mews::MEWS',
        envTestnet: process.env.MEWS_TOKEN_TYPE_ID_TESTNET || 'not set',
        envMainnet: process.env.MEWS_TOKEN_TYPE_ID_MAINNET || 'not set',
        configTokenTypeId: this.config.token.mewsTokenTypeId || 'not set',
      });
    }

    try {
      await checkPlayerTokenBalanceForPurchase({
        client: this.client,
        walletAddress: paymentConfig.playerAddress,
        gasBudget: gasWithBuffer,
        paymentTokenType: tokenInfo.tokenType,
        paymentAmount: paymentConfig.totalTokenAmount,
        tokenDecimals: tokenInfo.decimals,
        context: paymentConfig.context,
      });

      return {
        success: true,
      };
    } catch (error) {
      // Enhanced error message with network and token info
      const errorMessage = error instanceof Error ? error.message : 'Balance check failed';
      BadgeLogger.error('Payment balance check failed', {
        network: this.config.sui.network,
        paymentToken: paymentConfig.paymentToken,
        tokenType: tokenInfo.tokenType,
        walletAddress: paymentConfig.playerAddress,
        error: errorMessage,
        context: paymentConfig.context,
      });
      
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Build payment transaction with custom contract calls
   * 
   * This is the main entry point for building payment transactions.
   * Services provide their custom contract calls via the customCalls callback.
   * 
   * @param options - Payment config and custom calls
   * @returns Unsigned transaction bytes (base64 encoded)
   */
  async buildPaymentTransaction(
    options: BuildPaymentTransactionOptions
  ): Promise<{
    success: boolean;
    transaction?: string; // Base64 encoded transaction bytes
    gasEstimate?: string;
    error?: string;
  }> {
    try {
      const { paymentConfig, customCalls, gasBudget } = options;

      // Validate player address
      if (!paymentConfig.playerAddress || !paymentConfig.playerAddress.startsWith('0x') || paymentConfig.playerAddress.length !== 66) {
        return {
          success: false,
          error: 'Invalid player address format',
        };
      }

      // Check balance first
      const balanceCheck = await this.checkBalance(paymentConfig);
      if (!balanceCheck.success) {
        return {
          success: false,
          error: balanceCheck.error,
        };
      }

      // Build transaction
      const txb = new Transaction();

      // Prepare payment coin
      const paymentCoinResult = await this.preparePaymentCoin(txb, paymentConfig);
      if (paymentCoinResult.error) {
        return {
          success: false,
          error: paymentCoinResult.error,
        };
      }

      const paymentCoin = paymentCoinResult.paymentCoin;

      // Add custom contract calls (provided by service)
      // Services can use paymentCoin in their calls
      // NOTE: customCalls should NOT transfer paymentCoin - the builder handles that
      customCalls(txb, paymentCoin);

      // Transfer payment to recipient (typically admin wallet for purchases/fees)
      // If no recipientAddress specified, return to player (for refund scenarios)
      const transferRecipient = paymentConfig.recipientAddress || paymentConfig.playerAddress;
      txb.transferObjects([paymentCoin], transferRecipient);

      // Set sender (required for building transaction, even if not signing)
      txb.setSender(paymentConfig.playerAddress);

      // Set gas budget
      const finalGasBudget = gasBudget || Math.round(this.config.sui.gasBudget * 1.15);
      txb.setGasBudget(finalGasBudget);

      // Build transaction (don't sign - frontend will sign)
      const transactionBytes = await txb.build({ client: this.client });

      return {
        success: true,
        transaction: Buffer.from(transactionBytes).toString('base64'),
        gasEstimate: finalGasBudget.toString(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error building transaction',
      };
    }
  }

  /**
   * Helper: Convert payment token to u8 (for contract calls)
   */
  static getPaymentTokenU8(paymentToken: PaymentToken): number {
    const paymentTokenMap: Record<PaymentToken, number> = {
      'SUI': 0,
      'MEWS': 1,
      'USDC': 2,
    };
    return paymentTokenMap[paymentToken] ?? 0;
  }

  /**
   * Helper: Get payment token type argument for contract calls
   */
  getPaymentTokenTypeArgument(paymentToken: PaymentToken): string {
    if (paymentToken === 'SUI') {
      return '0x2::sui::SUI';
    } else if (paymentToken === 'MEWS') {
      return this.config.token.mewsTokenTypeId || '';
    } else if (paymentToken === 'USDC') {
      return this.config.token.usdcTokenTypeId || '';
    }
    return '';
  }
}

/**
 * Create a payment transaction builder instance
 */
export function createPaymentTransactionBuilder(client: SuiClient): PaymentTransactionBuilder {
  return new PaymentTransactionBuilder(client);
}

