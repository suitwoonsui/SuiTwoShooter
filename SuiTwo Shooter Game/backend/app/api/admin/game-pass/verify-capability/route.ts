// ==========================================
// Diagnostic: Verify AppCapability app_id matches APP_ID
// Platform-only: no direct chain read. Use platform dashboard or Sui Explorer to verify capability.
// ==========================================

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { withApiHandler } from '@/lib/api/api-handler';
import { getAdminWalletService } from '@/lib/services/wallet/admin/admin-wallet-service';
import { getCorridorCapabilityObjectIdFromEnv, getAppIdFromEnv } from '@/lib/services/platform/client/platform-client';
import { PlatformError, PlatformErrorCode } from '@/lib/services/platform/errors/platform-errors';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

/**
 * GET /api/admin/game-pass/verify-capability
 * Requires X-Admin-Wallet header matching game admin.
 * Platform-only: returns capability IDs from env; verify app_id on platform or Sui Explorer.
 */
export const GET = withApiHandler(async (request: NextRequest) => {
  const h = request.headers.get('x-admin-wallet') || request.headers.get('X-Admin-Wallet') || '';
  const expected = getAdminWalletService().getAddress().toLowerCase();
  if (!h || h.toLowerCase() !== expected) {
    throw new Error('Unauthorized. X-Admin-Wallet must match the game admin.');
  }
  const capId = getCorridorCapabilityObjectIdFromEnv();
  const expectedAppId = getAppIdFromEnv();

  if (!capId || !expectedAppId) {
    return {
      success: false,
      error: 'CORRIDOR_CAPABILITY_OBJECT_ID must be in config/contracts.<network>.json; APP_ID must be set in .env',
    };
  }

  return {
    success: true,
    capabilityObjectId: capId,
    expectedAppId,
    message: 'Verify app_id on platform dashboard or Sui Explorer (object ' + capId + '). Game backend does not read chain directly.',
  };
});
