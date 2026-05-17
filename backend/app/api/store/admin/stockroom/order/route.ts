import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { verifyApiKey } from '@/lib/auth';
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';
import { PlatformError, PlatformErrorCode } from '@/lib/services/platform/errors/platform-errors';
import { getAdminWalletService } from '@/lib/services/wallet/admin/admin-wallet-service';
import { platformSetStockroomCatalogOrder } from '@/lib/services/platform/app-config/platform-app-config';
import { callPlatformBackend } from '@/lib/services/platform/client/platform-client';
import { notifyPublicStoreCatalogChanged } from '@/lib/cache/public-nonuser-data-cache';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

/**
 * POST /api/store/admin/stockroom/order
 * Persists Stockroom on-chain `catalog_order` for the current app scope.
 */
export const POST = withApiHandler(async (request: NextRequest) => {
  const hasApiKey = verifyApiKey(request);
  const body = await getRequestBody<{
    adminWalletAddress?: string;
    offerOrder: string[];
  }>(request);

  if (!hasApiKey) {
    const adminWallet = getAdminWalletService();
    const expected = adminWallet.getAddress().toLowerCase();
    const provided = body.adminWalletAddress?.toLowerCase();
    if (!provided || provided !== expected) {
      throw new PlatformError(PlatformErrorCode.UNAUTHORIZED, 'Unauthorized. Admin wallet or API key required.');
    }
  }

  const offerOrder = Array.isArray(body.offerOrder) ? body.offerOrder.map((s) => String(s ?? '').trim()).filter(Boolean) : [];
  if (offerOrder.length === 0) {
    throw new PlatformError(PlatformErrorCode.INVALID_INPUT, 'offerOrder must be a non-empty string[]');
  }

  // High-signal diagnostics for "saved but didn't change" reports.
  // This logs what the admin UI actually sent (prefix only; avoids huge logs).
  console.log('[STORE ADMIN] stockroom/order POST', {
    offerOrderCount: offerOrder.length,
    offerOrderPreview: offerOrder.slice(0, 25),
    offerOrderTailPreview: offerOrder.slice(-10),
    adminWalletAddress: body.adminWalletAddress ? String(body.adminWalletAddress).slice(0, 10) + '…' : null,
    hasApiKey,
  });

  const result = await platformSetStockroomCatalogOrder({ offerOrder });
  if (!result.success) {
    throw new PlatformError(PlatformErrorCode.UNKNOWN_ERROR, result.error || 'Failed to persist Stockroom order');
  }

  // Prove whether the on-chain read path reflects the saved order.
  // If this fails/mismatches, the issue is not "UI state" — it's either scope identity or read-indexing.
  try {
    const readBack = await callPlatformBackend<{ success: boolean; offerOrder?: string[]; error?: string }>('api/stockroom/offers', {
      method: 'GET',
    });
    const got = Array.isArray(readBack.offerOrder) ? readBack.offerOrder.map((s) => String(s ?? '').trim()).filter(Boolean) : [];
    const want = offerOrder;
    const same =
      readBack.success &&
      got.length === want.length &&
      got.every((v, i) => v === want[i]);
    console.log('[STORE ADMIN] stockroom/order read-back', {
      success: readBack.success,
      same,
      wantCount: want.length,
      gotCount: got.length,
      gotPreview: got.slice(0, 25),
      gotTailPreview: got.slice(-10),
      error: readBack.success ? null : (readBack.error || 'platform read failed'),
    });
  } catch (e: unknown) {
    console.log('[STORE ADMIN] stockroom/order read-back failed', {
      error: e instanceof Error ? e.message : String(e),
    });
  }

  await notifyPublicStoreCatalogChanged({ reason: 'stockroom:order' });

  return { success: true, digest: result.digest, offerOrderCount: offerOrder.length };
});

