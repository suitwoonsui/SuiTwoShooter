import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';
import { PlatformError, PlatformErrorCode } from '@/lib/services/platform/errors/platform-errors';
import { PlatformLogger } from '@/lib/services/platform/logging/platform-logger';
import {
  buildPlatformCallOptions,
  platformAnchorClient,
  platformTxClient,
  getCorridorAdminCapabilityObjectIdFromEnv,
} from '@/lib/services/platform/client/platform-client';
import { getAdminWalletService } from '@/lib/services/wallet/admin/admin-wallet-service';
import { getOrCreateRequestId } from '@/lib/http/request-id';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

/**
 * POST /api/admin/anchor/ensure-registry
 * Ensures the app's Anchor per-app registry exists (one-time).
 * - Platform builds the init tx
 * - Game admin wallet signs and executes (must own CorridorAdminCap)
 */
export const POST = withApiHandler(async (request: NextRequest) => {
  // Optional safety: require this to run only in dev unless explicitly enabled.
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_ANCHOR_REGISTRY_BOOTSTRAP !== 'true') {
    throw new PlatformError(
      PlatformErrorCode.FORBIDDEN,
      'Anchor registry bootstrap is disabled in production. Set ALLOW_ANCHOR_REGISTRY_BOOTSTRAP=true to enable.'
    );
  }

  type EnsureRegistryBody = { senderAddress?: string };
  const body: EnsureRegistryBody = await getRequestBody<EnsureRegistryBody>(request).catch(
    () => ({} as EnsureRegistryBody)
  );

  const corridorAdminCapId = getCorridorAdminCapabilityObjectIdFromEnv();
  if (!corridorAdminCapId?.startsWith('0x')) {
    throw new PlatformError(
      PlatformErrorCode.CONFIG_MISSING,
      'CORRIDOR_ADMIN_CAP_OBJECT_ID_* is required in game backend config/contracts.<network>.json to create Anchor registry.'
    );
  }

  const adminWallet = getAdminWalletService();
  const senderAddress = (body.senderAddress || adminWallet.getAddress()).trim();
  if (!senderAddress.startsWith('0x')) {
    throw new PlatformError(PlatformErrorCode.INVALID_ADDRESS, 'senderAddress must be a 0x... address.');
  }

  const requestId = getOrCreateRequestId(request);
  const platformOptions = buildPlatformCallOptions(request, body, {
    corridorAdminCapabilityObjectId: corridorAdminCapId,
  });

  PlatformLogger.info('[ANCHOR] ensure-registry start', {
    requestId,
    senderPrefix: senderAddress.slice(0, 10) + '...',
    corridorAdminCapPrefix: corridorAdminCapId.slice(0, 10) + '...',
  });

  // Ask platform to build the create-registry transaction.
  const regBuild = await platformAnchorClient.buildCreateRegistry(
    { senderAddress },
    platformOptions
  );

  if (!regBuild.success) {
    throw new PlatformError(
      PlatformErrorCode.TRANSACTION_BUILD_FAILED,
      regBuild.error ?? 'Failed to build Anchor registry init transaction'
    );
  }

  // If platform returns no tx, assume it's already initialized (or resolve-only response).
  if (!regBuild.transaction) {
    return { success: true, created: false, message: 'Anchor registry already initialized (no transaction returned).' };
  }

  const signed = await adminWallet.getKeypair().signTransaction(Buffer.from(regBuild.transaction, 'base64'));
  const exec = await platformTxClient.executeSigned(
    { transactionBytesBase64: regBuild.transaction, signature: signed.signature },
    platformOptions
  );

  if (!exec.success) {
    throw new PlatformError(
      PlatformErrorCode.TRANSACTION_FAILED,
      exec.error ?? 'Failed to execute Anchor registry init transaction'
    );
  }

  return {
    success: true,
    created: true,
    digest: exec.digest,
    message: 'Anchor registry initialized.',
  };
});

