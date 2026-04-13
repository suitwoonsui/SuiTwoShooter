// ==========================================
// Rewards platform executor
// Signs and submits transaction(s) returned by platform Channel sustain-build-distribute.
// Game admin wallet signs; platform submits (POST /api/channel/execute). No direct SuiClient.
//
// Inputs: isPlatformConfigured() / platformTxClient (PLATFORM_BACKEND_URL); corridor cap from env (identity).
// getAdminWalletService() → GAME_WALLET_PRIVATE_KEY or ADMIN_WALLET_PRIVATE_KEY.
// ==========================================

import { getAdminWalletService } from '@/lib/services/wallet/admin/admin-wallet-service';
import { PlatformLogger } from '@/lib/services/platform/logging/platform-logger';
import { platformTxClient } from '@/lib/services/platform/client/platform-client';

export interface PlatformBuildDistributeTx {
  type: 'token' | 'items' | 'credits';
  bytesBase64: string;
  recipientAddress: string;
  tokenType?: string;
  tokenAmount?: string;
  itemCount?: number;
  credits?: number;
}

export interface SignAndSubmitRewardTransactionsResult {
  success: boolean;
  digests: string[];
  errors: string[];
}

/**
 * Sign and submit each transaction from platform (Channel sustain-build-distribute or equivalent).
 * Uses game admin wallet; caller obtains transactions via buildBatchViaChannel('sustain-build-distribute', ...).
 */
export async function signAndSubmitRewardTransactions(
  transactions: PlatformBuildDistributeTx[],
  options?: { source?: string }
): Promise<SignAndSubmitRewardTransactionsResult> {
  const digests: string[] = [];
  const errors: string[] = [];
  const adminWallet = getAdminWalletService();

  for (const tx of transactions) {
    try {
      const txBytes = Buffer.from(tx.bytesBase64, 'base64');
      const signed = await adminWallet.getKeypair().signTransaction(txBytes);
      const signature = typeof signed === 'object' && signed !== null && 'signature' in signed
        ? (signed as { signature: string }).signature
        : String(signed);
      const result = await platformTxClient.executeSigned(
        { transactionBytesBase64: tx.bytesBase64, signature }
      );
      if (result.success && result.digest) {
        digests.push(result.digest);
        PlatformLogger.info('Rewards executor: tx submitted via platform', {
          type: tx.type,
          recipientAddress: tx.recipientAddress,
          digest: result.digest,
          source: options?.source,
        });
      } else {
        errors.push(`${tx.recipientAddress} (${tx.type}): ${result.error || 'Transaction did not succeed'}`);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`${tx.recipientAddress} (${tx.type}): ${msg}`);
      PlatformLogger.error('Rewards executor: submit failed', {
        recipientAddress: tx.recipientAddress,
        type: tx.type,
        error: msg,
      });
    }
  }

  return {
    success: errors.length === 0,
    digests,
    errors,
  };
}
