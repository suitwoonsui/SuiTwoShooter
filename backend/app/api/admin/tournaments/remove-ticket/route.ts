// ==========================================
// Admin API - Remove Tournament Ticket from Player
// ==========================================

import { NextRequest } from 'next/server';
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';
import { getAdminWalletService } from '@/lib/sui/admin-wallet-service';
import { Transaction } from '@mysten/sui/transactions';
import { getConfig } from '@/config/config';

export const POST = withApiHandler(
  async (request: NextRequest) => {
    const body = await getRequestBody<{
      playerAddress: string;
      ticketId: number;
    }>(request);

    const { playerAddress, ticketId } = body;

    if (!playerAddress || typeof playerAddress !== 'string') {
      throw new Error('Player address is required');
    }

    if (typeof ticketId !== 'number' || ticketId <= 0 || !Number.isInteger(ticketId)) {
      throw new Error('Ticket ID must be a positive integer');
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
      target: `${packageId}::game_pass::admin_remove_ticket`,
      arguments: [
        txb.object(adminCapabilityObjectId),
        txb.object(systemObjectId),
        txb.pure.address(playerAddress),
        txb.pure.u64(ticketId),
      ],
    });

    txb.setSender(adminWallet.getAddress());
    txb.setGasBudget(config.sui.gasBudget);

    const transactionBytes = await txb.build({ client });
    const result = await client.signAndExecuteTransaction({
      signer: adminWallet.getKeypair(),
      transaction: transactionBytes,
      options: { showEffects: true, showEvents: true },
    });

    // Check transaction success
    if (result.effects?.status?.status !== 'success') {
      throw new Error('Transaction failed');
    }

    return {
      success: true,
      digest: result.digest,
      playerAddress,
      ticketId,
    };
  }
);

