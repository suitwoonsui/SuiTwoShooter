// ==========================================
// Admin API - Add Tournament Tickets to Player
// ==========================================

import { NextRequest } from 'next/server';
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';
import { getGamePassService } from '@/lib/sui/game-pass-service';
import { getAdminWalletService } from '@/lib/sui/admin-wallet-service';
import { Transaction } from '@mysten/sui/transactions';
import { getConfig } from '@/config/config';
import { checkBalanceBeforeTransaction } from '@/lib/sui/balance-checker';
import { BadgeLogger } from '@/lib/sui/badge-logger';

export const POST = withApiHandler(
  async (request: NextRequest) => {
    const body = await getRequestBody<{
      playerAddress: string;
      quantity: number;
      valuePerTicketUsdCents?: number;  // Optional, defaults to 0 for free tickets
    }>(request);

    const { playerAddress, quantity, valuePerTicketUsdCents = 0 } = body;

    if (!playerAddress || typeof playerAddress !== 'string') {
      throw new Error('Player address is required');
    }

    if (typeof quantity !== 'number' || quantity <= 0 || !Number.isInteger(quantity)) {
      throw new Error('Quantity must be a positive integer');
    }

    if (typeof valuePerTicketUsdCents !== 'number' || valuePerTicketUsdCents < 0) {
      throw new Error('Value per ticket must be a non-negative number');
    }

    const config = getConfig();
    const adminWallet = getAdminWalletService();
    const contractAddress = config.contracts.gamePass;
    const systemObjectId = config.contracts.gamePassSystem;
    // Game pass uses premium_store AdminCapability, not a separate one
    const adminCapabilityObjectId = config.contracts.premiumStoreAdminCapability;

    if (!contractAddress || !systemObjectId || !adminCapabilityObjectId) {
      throw new Error('Game pass contract not configured');
    }

    const packageId = contractAddress.includes('::') 
      ? contractAddress.split('::')[0]
      : contractAddress;

    const client = config.sui.network === 'testnet'
      ? adminWallet.getTestnetClient()
      : adminWallet.getMainnetClient();

    const txb = new Transaction();

    txb.moveCall({
      target: `${packageId}::game_pass::admin_add_tickets`,
      arguments: [
        txb.object(adminCapabilityObjectId),
        txb.object(systemObjectId),
        txb.pure.address(playerAddress),
        txb.pure.u64(quantity),
        txb.pure.u64(valuePerTicketUsdCents),
        txb.object('0x6'), // Clock
      ],
    });

    txb.setSender(adminWallet.getAddress());
    
    // Use higher gas budget for ticket creation (recursive operations can be expensive)
    // Base gas budget + additional buffer based on quantity
    // Each ticket creation adds overhead, so we scale with quantity
    // Recursive operations can be very expensive, so we use a more generous multiplier
    const baseGasBudget = config.sui.gasBudget;
    const gasPerTicket = 2_000_000; // 2M gas per ticket (more conservative for recursive operations)
    const additionalGas = quantity * gasPerTicket;
    // Use at least 3x base for small quantities, or base + per-ticket for larger quantities
    // This accounts for the recursive nature of ticket creation
    const gasBudget = Math.max(baseGasBudget * 3, baseGasBudget + additionalGas);
    
    // Check admin wallet balance before building transaction
    // Use getCoins for more accurate available balance check
    try {
      const coins = await client.getCoins({
        owner: adminWallet.getAddress(),
        coinType: '0x2::sui::SUI',
      });
      
      const totalAvailableBalance = coins.data.reduce((sum, coin) => sum + BigInt(coin.balance), BigInt(0));
      const requiredBalance = BigInt(gasBudget) + BigInt(100_000_000); // gas + 0.1 SUI buffer
      const totalAvailableSUI = Number(totalAvailableBalance) / 1_000_000_000;
      const requiredSUI = Number(requiredBalance) / 1_000_000_000;
      
      BadgeLogger.info('🏆 [ADD TICKETS] Balance check', {
        walletAddress: adminWallet.getAddress(),
        totalAvailableBalance: totalAvailableSUI.toFixed(4),
        requiredBalance: requiredSUI.toFixed(4),
        gasBudget,
        gasBudgetSUI: (gasBudget / 1_000_000_000).toFixed(4),
        quantity,
        coinCount: coins.data.length,
      });
      
      if (totalAvailableBalance < requiredBalance) {
        throw new Error(`Insufficient SUI balance. Need ${requiredSUI.toFixed(4)} SUI (${(gasBudget / 1_000_000_000).toFixed(4)} gas + 0.1 buffer), but admin wallet has only ${totalAvailableSUI.toFixed(4)} SUI available. Please ensure the admin wallet has sufficient SUI balance.`);
      }
    } catch (error: any) {
      BadgeLogger.error('🏆 [ADD TICKETS] Insufficient balance for gas', {
        error: error.message,
        gasBudget,
        requiredSUI: ((gasBudget + 100_000_000) / 1_000_000_000).toFixed(4),
        quantity,
      });
      throw error;
    }
    
    BadgeLogger.info('🏆 [ADD TICKETS] Gas budget set', {
      gasBudget,
      gasBudgetSUI: (gasBudget / 1_000_000_000).toFixed(4),
      quantity,
      valuePerTicketUsdCents,
    });
    
    txb.setGasBudget(gasBudget);

    const transactionBytes = await txb.build({ client });
    
    let result;
    try {
      result = await client.signAndExecuteTransaction({
        signer: adminWallet.getKeypair(),
        transaction: transactionBytes,
        options: { showEffects: true, showEvents: true },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Transaction execution failed: ${errorMessage}`);
    }

    // Check transaction success
    const txStatus = result.effects?.status?.status;
    if (txStatus === 'failure' || result.effects?.status?.error) {
      const errorMessage = result.effects?.status?.error || 'Transaction failed';
      const errorDetails = typeof errorMessage === 'string' 
        ? errorMessage 
        : JSON.stringify(errorMessage);
      const isGasError = errorDetails.includes('InsufficientGas') || errorDetails.includes('insufficient gas');
      
      BadgeLogger.error('🏆 [ADD TICKETS] Transaction failed', {
        digest: result.digest,
        error: errorDetails,
        isGasError,
        gasBudget,
        gasBudgetSUI: (gasBudget / 1_000_000_000).toFixed(4),
        quantity,
      });
      
      let userFriendlyError = `Transaction failed: ${errorDetails}`;
      if (isGasError) {
        userFriendlyError = `Insufficient gas for adding tickets. The transaction requires approximately ${(gasBudget / 1_000_000_000).toFixed(4)} SUI for gas fees, but the admin wallet does not have enough SUI. Please ensure the admin wallet has at least ${((gasBudget + 100_000_000) / 1_000_000_000).toFixed(4)} SUI (gas + buffer).`;
    }
      
      throw new Error(userFriendlyError);
    }
    
    BadgeLogger.info('🏆 [ADD TICKETS] Transaction executed successfully', {
      digest: result.digest,
      status: txStatus,
      quantity,
      playerAddress,
    });

    return {
      success: true,
      digest: result.digest,
      playerAddress,
      quantity,
      valuePerTicketUsdCents,
    };
  }
);

