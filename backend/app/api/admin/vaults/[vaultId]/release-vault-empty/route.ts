// ==========================================
// Game Admin API - Vault close (empty vault)
// Proxies to platform POST /api/glacier/[vaultId]/release-vault-empty with contract selection (current / old / custom cap).
// ==========================================

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';
import { getAdminWalletService } from '@/lib/services/wallet/admin/admin-wallet-service';
import {
  callPlatformBackend,
  buildPlatformCallOptions,
  getCorridorAdminCapabilityObjectIdFromEnv,
  getOldCorridorAdminCapabilityObjectIdFromEnv,
} from '@/lib/services/platform/client/platform-client';
import { PlatformLogger } from '@/lib/services/platform/logging/platform-logger';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

type ContractSelection = 'current' | 'old' | 'custom';

type ReleaseEmptyBody = {
  contractSelection?: ContractSelection;
  customCorridorAdminCapId?: string;
  adminWalletAddress?: string;
  buildOnly?: boolean;
  senderAddress?: string;
  coinTypeId?: string;
  signedTransactionBlock?: string;
  signature?: string;
};

function resolveCorridorAdminCapId(selection: ContractSelection, customCapId?: string): { capId: string; error?: string } {
  if (selection === 'custom') {
    const id = (customCapId ?? '').trim();
    if (!id || !id.startsWith('0x')) {
      return { capId: '', error: 'Enter a valid Corridor Admin Cap object ID (0x...) when using "Enter a contract".' };
    }
    return { capId: id };
  }

  const currentCap = getCorridorAdminCapabilityObjectIdFromEnv();
  if (selection === 'old') {
    const oldCap = getOldCorridorAdminCapabilityObjectIdFromEnv();
    if (oldCap && oldCap.startsWith('0x')) return { capId: oldCap };
    if (currentCap && currentCap.startsWith('0x')) return { capId: currentCap };
    return {
      capId: '',
      error:
        'Close (old contract) requires a CorridorAdminCap. Set CORRIDOR_ADMIN_CAP_OBJECT_ID (or OLD_CORRIDOR_ADMIN_CAP_OBJECT_ID_*) in game backend config/contracts.<network>.json.',
    };
  }

  if (!currentCap || !currentCap.startsWith('0x')) {
    return {
      capId: '',
      error:
        'CORRIDOR_ADMIN_CAP_OBJECT_ID (or _TESTNET / _MAINNET) is not set. Set it in config/contracts.<network>.json to use the current contract.',
    };
  }
  return { capId: currentCap };
}

/**
 * POST /api/admin/vaults/[vaultId]/release-vault-empty
 * Build only: returns transactionBytesBase64. Otherwise signs with game admin wallet and executes.
 */
export const POST = withApiHandler(
  async (request: NextRequest, { params }: { params: Promise<{ vaultId: string }> }) => {
    const { vaultId } = await params;
    if (!vaultId?.startsWith('0x')) return { success: false, error: 'Invalid vault ID' };

    const body = await getRequestBody<ReleaseEmptyBody>(request).catch((): ReleaseEmptyBody => ({}));
    const contractSelection: ContractSelection = body.contractSelection ?? 'current';
    const { capId, error: capError } = resolveCorridorAdminCapId(contractSelection, body.customCorridorAdminCapId);
    if (capError) {
      PlatformLogger.warn('[VAULTS] release-vault-empty cap resolution failed', { contractSelection, error: capError });
      return { success: false, error: capError };
    }

    const adminWalletService = getAdminWalletService();
    const expectedAdmin = adminWalletService.getAddress().toLowerCase();
    const providedAdmin = (body.adminWalletAddress ?? body.senderAddress ?? '').toLowerCase();
    if (!providedAdmin || providedAdmin !== expectedAdmin) {
      return { success: false, error: 'Unauthorized. adminWalletAddress must match the game admin wallet.' };
    }

    const platformUrl = `api/glacier/${encodeURIComponent(vaultId)}/release-vault-empty`;
    const baseOptions = buildPlatformCallOptions(request, body, { corridorAdminCapabilityObjectId: capId });

    if (body.signedTransactionBlock?.trim() && body.signature?.trim()) {
      return await callPlatformBackend<{ success: boolean; digest?: string; message?: string; error?: string }>(platformUrl, {
        method: 'POST',
        body: JSON.stringify({ signedTransactionBlock: body.signedTransactionBlock.trim(), signature: body.signature.trim() }),
        ...baseOptions,
      });
    }

    const senderAddress = (body.senderAddress ?? body.adminWalletAddress ?? adminWalletService.getAddress()).trim();
    let coinTypeId = (body.coinTypeId ?? '').trim();
    if (!senderAddress.startsWith('0x')) return { success: false, error: 'senderAddress (or adminWalletAddress) is required and must be a valid 0x address.' };

    // Server-side gate: avoid building/signing tx before unlock time.
    const gating = await callPlatformBackend<{ success: boolean; unlockAtMs?: number; released?: boolean; coinTypeId?: string; error?: string }>(
      `api/glacier/${encodeURIComponent(vaultId)}`,
      { method: 'GET', ...baseOptions }
    );
    if (!gating.success) return { success: false, error: gating.error ?? 'Failed to load vault details for gating.' };
    if (gating.released) return { success: false, error: 'Vault already released.' };
    if (typeof gating.unlockAtMs === 'number' && Date.now() < gating.unlockAtMs) {
      return { success: false, error: `Vault is locked until ${new Date(gating.unlockAtMs).toLocaleString()}.` };
    }

    // Prefer the vault's own coinTypeId (even when empty) to match the Move generic type.
    if (!coinTypeId) {
      if (typeof gating.coinTypeId === 'string' && gating.coinTypeId.trim()) coinTypeId = gating.coinTypeId.trim();
    }
    if (!coinTypeId) coinTypeId = '0x2::sui::SUI';

    PlatformLogger.info('[VAULTS] release-vault-empty coin type resolved', {
      vaultId: vaultId.slice(0, 18) + '…',
      coinTypeIdSuffix: coinTypeId.slice(-24),
    });

    const buildResult = await callPlatformBackend<{
      success: boolean;
      transactionBytesBase64?: string;
      transaction?: string;
      message?: string;
      error?: string;
    }>(platformUrl, {
      method: 'POST',
      body: JSON.stringify({ senderAddress, coinTypeId, corridorAdminCapabilityObjectId: capId }),
      ...baseOptions,
    });
    if (!buildResult.success) return { success: false, error: buildResult.error ?? 'Failed to build close-empty-vault transaction' };

    const txBase64 = buildResult.transactionBytesBase64 ?? buildResult.transaction;
    if (body.buildOnly) {
      return {
        success: true,
        transactionBytesBase64: txBase64,
        message: 'Sign this transaction with the admin wallet and submit via POST with signedTransactionBlock and signature to execute.',
      };
    }

    const txBytes = Buffer.from(txBase64 ?? '', 'base64');
    const signed = await adminWalletService.getKeypair().signTransaction(txBytes);
    return await callPlatformBackend<{ success: boolean; digest?: string; message?: string; error?: string }>(platformUrl, {
      method: 'POST',
      body: JSON.stringify({ signedTransactionBlock: txBase64, signature: signed.signature }),
      ...baseOptions,
    });
  }
);

