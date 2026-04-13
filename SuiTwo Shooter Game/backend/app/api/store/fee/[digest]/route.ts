// ==========================================
// Store Fee Payment API Route (game backend)
// The player pays only the game in the player-signed purchase tx.
// This endpoint has the **game admin wallet** pay the platform terminal store fee (SUI) in a separate tx.
// ==========================================

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { PlatformLogger } from '@/lib/services/platform/logging/platform-logger';
import { withApiHandler, getDigestParam } from '@/lib/api/api-handler';
import { buildBatchViaChannel, buildPlatformCallOptions, platformStoreClient, platformTxClient } from '@/lib/services/platform/client/platform-client';
import { getAdminWalletService } from '@/lib/services/wallet/admin/admin-wallet-service';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export const POST = withApiHandler(
  async (request: NextRequest, context: { params: Promise<{ digest: string }> }) => {
    const digest = await getDigestParam(context.params);

    // Only pay the fee after the purchase tx is confirmed successful.
    const status = await platformStoreClient.getTransactionStatus(digest, buildPlatformCallOptions(request));
    if (!status.success) {
      throw new Error(status.error || 'Failed to verify purchase transaction before paying fee');
    }
    if (!status.confirmed) {
      return {
        success: true,
        purchaseDigest: digest,
        feePaid: false,
        message: 'Purchase not confirmed yet; fee not paid.',
      };
    }

    const gameAdmin = getAdminWalletService();
    const senderAddress = gameAdmin.getAddress();
    const platformOptions = buildPlatformCallOptions(request);

    PlatformLogger.info('Paying terminal store fee (game admin -> platform)', {
      purchaseDigest: digest,
      senderAddress,
    });

    const build = await buildBatchViaChannel(
      {
        operations: [
          {
            operationId: 'terminal-store-fee-payment',
            params: {
              senderAddress,
              purchaseDigest: digest,
            },
          },
        ],
      },
      platformOptions
    );

    if (!build.success || !build.transactions?.length) {
      const msg = build.error || build.errors?.[0] || 'Failed to build fee transaction';
      throw new Error(msg);
    }

    const feeTxBase64 = build.transactions[0]!;
    const txBytes = Buffer.from(feeTxBase64, 'base64');
    const signed = await gameAdmin.getKeypair().signTransaction(txBytes);
    const signature =
      typeof signed === 'object' && signed !== null && 'signature' in signed
        ? (signed as { signature: string }).signature
        : String(signed);

    const exec = await platformTxClient.executeSigned(
      { transactionBytesBase64: feeTxBase64, signature },
      platformOptions
    );

    if (!exec.success) {
      throw new Error(exec.error || 'Fee transaction failed');
    }

    return {
      success: true,
      purchaseDigest: digest,
      feePaid: true,
      feeDigest: exec.digest,
    };
  }
);

