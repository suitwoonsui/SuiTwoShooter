// ==========================================
// Badge Minting API Route
// ==========================================

import { NextRequest, NextResponse } from 'next/server';
import { getBadgeService } from '@/lib/sui/badge-service';
import { BadgeValidators } from '@/lib/sui/badge-validators';
import { BadgeError, BadgeErrorCode } from '@/lib/sui/badge-errors';
import { BadgeLogger } from '@/lib/sui/badge-logger';
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';
import { Transaction } from '@mysten/sui/transactions';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { getConfig } from '@/config/config';

/**
 * POST /api/badges/mint
 * Build mint badge transaction for player to sign
 * 
 * Request body:
 * {
 *   playerAddress: string,  // Player's wallet address
 *   paymentCoinId: string   // Player's SUI coin ID for minting fee payment
 * }
 * 
 * Returns:
 * {
 *   success: boolean,
 *   transaction?: string,   // Base64 transaction bytes
 *   gasEstimate?: string,
 *   error?: string
 * }
 * 
 * Note: Frontend must sign and execute this transaction using player's wallet
 */

// Handle CORS preflight - middleware handles this automatically
export async function OPTIONS(request: NextRequest) {
  const { handleCorsPreflight } = await import('@/lib/cors');
  return handleCorsPreflight(request);
}

export const POST = withApiHandler(
  async (request: NextRequest) => {
    const body = await getRequestBody<{
      playerAddress: string;
      paymentCoinId?: string;
    }>(request);
    const { playerAddress, paymentCoinId } = body;

    // Validate required fields and format using BadgeValidators
    if (!playerAddress) {
      throw new BadgeError(
        BadgeErrorCode.INVALID_ADDRESS,
        'playerAddress is required'
      );
    }
    BadgeValidators.validateAddress(playerAddress);
    BadgeValidators.validatePaymentCoinId(paymentCoinId);

    BadgeLogger.info('Badge mint request received', {
      playerAddress,
      hasPaymentCoinId: !!paymentCoinId,
    });

    const badgeService = getBadgeService();
    const config = getConfig();
    
    // Get transaction data (creates BadgeImageData object on-chain)
    // paymentCoinId is required for the new method - if not provided, we'll need to find one
    let coinIdToUse = paymentCoinId;
    
    if (!coinIdToUse) {
      // Find a SUI coin for the player (same as old method did)
      const network = config.sui.network;
      const client = new SuiClient({ 
        url: network === 'testnet' 
          ? getFullnodeUrl('testnet')
          : network === 'mainnet'
          ? getFullnodeUrl('mainnet')
          : config.sui.rpcUrl
      });
      
      const coins = await client.getCoins({
        owner: playerAddress,
        coinType: '0x2::sui::SUI',
      });
      
      if (coins.data.length === 0) {
        throw new BadgeError(
          BadgeErrorCode.INSUFFICIENT_BALANCE,
          'No SUI coins found. Please ensure you have SUI in your wallet.'
        );
      }
      
      // Use the first coin with sufficient balance (0.1 SUI + gas)
      const requiredBalance = BigInt(100_000_000) + BigInt(config.sui.gasBudget); // 0.1 SUI + gas
      const coinWithBalance = coins.data.find(coin => BigInt(coin.balance) >= requiredBalance);
      
      if (!coinWithBalance) {
        throw new BadgeError(
          BadgeErrorCode.INSUFFICIENT_BALANCE,
          'Insufficient SUI balance. Need at least 0.1 SUI + gas for minting.'
        );
      }
      
      coinIdToUse = coinWithBalance.coinObjectId;
    }
    
    // Get transaction data (creates BadgeImageData object on-chain)
    const transactionDataResult = await badgeService.getMintBadgeTransactionData(
      playerAddress,
      coinIdToUse
    );

    if (!transactionDataResult.success || !transactionDataResult.transactionData) {
      const errorMessage = transactionDataResult.error || 'Failed to get mint transaction data';
      BadgeLogger.error('Failed to get mint transaction data', {
        playerAddress,
        error: errorMessage,
      });
      throw new BadgeError(
        BadgeErrorCode.TRANSACTION_FAILED,
        errorMessage
      );
    }

    const transactionData = transactionDataResult.transactionData;
    
    // Build transaction from transaction data
    const network = config.sui.network;
    const client = new SuiClient({ 
      url: network === 'testnet' 
        ? getFullnodeUrl('testnet')
        : network === 'mainnet'
        ? getFullnodeUrl('mainnet')
        : config.sui.rpcUrl
    });
    
    const txb = new Transaction();
    const paymentAmount = BigInt(transactionData.arguments.paymentAmount);
    const splitPaymentCoin = txb.splitCoins(txb.gas, [paymentAmount]);
    
    txb.moveCall({
      target: `${transactionData.packageId}::${transactionData.module}::${transactionData.function}`,
      arguments: [
        txb.object(transactionData.arguments.badgeRegistry),
        txb.object(transactionData.arguments.statsRegistry),
        txb.object(transactionData.arguments.clock),
        splitPaymentCoin,
        txb.object(transactionData.arguments.imageDataObjectId),
      ],
    });
    
    txb.setSender(playerAddress);
    txb.setGasBudget(transactionData.gasBudget);
    
    // Build transaction
    const transactionBytes = await txb.build({ client });
    
    BadgeLogger.info('Transaction built successfully from transaction data', { playerAddress });

    // Return built transaction as base64 (frontend just signs it, like store)
    return {
      success: true,
      transaction: Buffer.from(transactionBytes).toString('base64'),
      gasEstimate: transactionData.gasBudget.toString(),
    };
  },
  {
    logRequest: true,
  }
);

