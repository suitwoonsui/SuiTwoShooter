// ==========================================
// Game Admin API - Vault release (release_distribute)
// Proxies to platform POST /api/glacier/[vaultId]/release-distribute with contract selection (current / old / custom cap).
// Same Glacier package for all; "old" and "custom" only change which cap is used to sign (e.g. OLD_CORRIDOR_ADMIN_CAP_OBJECT_ID for vaults created with that cap).
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

type ReleaseDistributeBody = {
  contractSelection?: ContractSelection;
  customCorridorAdminCapId?: string;
  adminWalletAddress?: string;
  buildOnly?: boolean;
  senderAddress?: string;
  recipients?: string[];
  amounts?: string[];
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

  // For modular setups where old and current vault contracts share the same Corridor admin cap:
  // - If OLD_CORRIDOR_ADMIN_CAP_* is set, "old" uses that cap.
  // - Otherwise, "old" falls back to the current CorridorAdminCap.
  const currentCap = getCorridorAdminCapabilityObjectIdFromEnv();
  if (selection === 'old') {
    const oldCap = getOldCorridorAdminCapabilityObjectIdFromEnv();
    if (oldCap && oldCap.startsWith('0x')) {
      return { capId: oldCap };
    }
    if (currentCap && currentCap.startsWith('0x')) {
      return { capId: currentCap };
    }
    return {
      capId: '',
      error:
        'Release (old contract) requires a CorridorAdminCap. Set CORRIDOR_ADMIN_CAP_OBJECT_ID (or OLD_CORRIDOR_ADMIN_CAP_OBJECT_ID_*) in game backend config/contracts.<network>.json.',
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

export const POST = withApiHandler(
  async (request: NextRequest, { params }: { params: Promise<{ vaultId: string }> }) => {
    const { vaultId } = await params;
    if (!vaultId?.startsWith('0x')) {
      return { success: false, error: 'Invalid vault ID' };
    }

    const body = await getRequestBody<ReleaseDistributeBody>(request).catch(
      (): ReleaseDistributeBody => ({})
    );

    const contractSelection: ContractSelection = body.contractSelection ?? 'current';
    const { capId, error: capError } = resolveCorridorAdminCapId(contractSelection, body.customCorridorAdminCapId);
    if (capError) {
      PlatformLogger.warn('[VAULTS] release-distribute cap resolution failed', { contractSelection, error: capError });
      return { success: false, error: capError };
    }
    const capSuffix = capId.length >= 8 ? capId.slice(-8) : capId;
    PlatformLogger.info('[VAULTS] release-distribute using cap', { contractSelection, capIdSuffix: capSuffix, vaultId: vaultId.slice(0, 18) + '…' });

    const adminWalletService = getAdminWalletService();
    const expectedAdmin = adminWalletService.getAddress().toLowerCase();
    const providedAdmin = (body.adminWalletAddress ?? body.senderAddress ?? '').toLowerCase();
    if (!providedAdmin || providedAdmin !== expectedAdmin) {
      return { success: false, error: 'Unauthorized. adminWalletAddress must match the game admin wallet.' };
    }

    const platformUrl = `api/glacier/${encodeURIComponent(vaultId)}/release-distribute`;
    const baseOptions = buildPlatformCallOptions(request, body, {
      corridorAdminCapabilityObjectId: capId,
    });

    if (body.signedTransactionBlock?.trim() && body.signature?.trim()) {
      const result = await callPlatformBackend<{ success: boolean; digest?: string; message?: string; error?: string }>(
        platformUrl,
        {
          method: 'POST',
          body: JSON.stringify({
            signedTransactionBlock: body.signedTransactionBlock.trim(),
            signature: body.signature.trim(),
          }),
          ...baseOptions,
        }
      );
      return result;
    }

    const senderAddress = (body.senderAddress ?? body.adminWalletAddress ?? adminWalletService.getAddress()).trim();
    const recipients = Array.isArray(body.recipients) ? body.recipients.map((a) => String(a).trim()).filter((a) => a.startsWith('0x')) : [];
    const amounts = Array.isArray(body.amounts) ? body.amounts.map((a) => String(a)) : [];
    const coinTypeId = body.coinTypeId?.trim();

    if (!senderAddress || !senderAddress.startsWith('0x')) {
      return { success: false, error: 'senderAddress (or adminWalletAddress) is required and must be a valid 0x address.' };
    }
    if (!coinTypeId) {
      return { success: false, error: 'coinTypeId is required (full Move coin type, e.g. 0x2::sui::SUI).' };
    }
    if (recipients.length === 0 || amounts.length === 0 || recipients.length !== amounts.length) {
      return { success: false, error: 'recipients and amounts arrays are required and must have the same length.' };
    }

    // Server-side gate: avoid building/signing tx before unlock time.
    const details = await callPlatformBackend<{ success: boolean; unlockAtMs?: number; released?: boolean; error?: string }>(
      `api/glacier/${encodeURIComponent(vaultId)}`,
      { method: 'GET', ...baseOptions }
    );
    if (!details.success) {
      return { success: false, error: details.error ?? 'Failed to load vault details for gating.' };
    }
    if (details.released) {
      return { success: false, error: 'Vault already released.' };
    }
    if (typeof details.unlockAtMs === 'number' && Date.now() < details.unlockAtMs) {
      return { success: false, error: `Vault is locked until ${new Date(details.unlockAtMs).toLocaleString()}.` };
    }

    const buildResult = await callPlatformBackend<{
      success: boolean;
      transactionBytesBase64?: string;
      transaction?: string;
      message?: string;
      error?: string;
    }>(platformUrl, {
      method: 'POST',
      body: JSON.stringify({
        senderAddress,
        recipients,
        amounts,
        coinTypeId,
        corridorAdminCapabilityObjectId: capId,
      }),
      ...baseOptions,
    });

    if (!buildResult.success) {
      PlatformLogger.warn('[VAULTS] release-distribute build failed', { contractSelection, capIdSuffix: capSuffix, error: buildResult.error });
      return { success: false, error: buildResult.error ?? 'Failed to build release-distribute transaction' };
    }

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
    const execResult = await callPlatformBackend<{ success: boolean; digest?: string; message?: string; error?: string }>(
      platformUrl,
      {
        method: 'POST',
        body: JSON.stringify({
          signedTransactionBlock: txBase64,
          signature: signed.signature,
        }),
        ...baseOptions,
      }
    );
    if (execResult.success) {
      PlatformLogger.info('[VAULTS] release-distribute executed', { contractSelection, capIdSuffix: capSuffix, digest: execResult.digest });
    } else {
      PlatformLogger.warn('[VAULTS] release-distribute execute failed', { contractSelection, capIdSuffix: capSuffix, error: execResult.error });
    }
    return execResult;
  }
);
