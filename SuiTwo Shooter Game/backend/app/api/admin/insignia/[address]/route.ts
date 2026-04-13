// ==========================================
// Admin Insignia read (proxy to platform)
// GET /api/admin/insignia/[address]
// - Verifies admin wallet (same pattern as other admin endpoints)
// - Fetches platform Insignia (per-wallet progression KV under corridor app)
// - Returns raw base64 config plus a decoded `tier` helper (when present)
// ==========================================

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { withApiHandler, getAddressParam } from '@/lib/api/api-handler';
import { PlatformError, PlatformErrorCode } from '@/lib/services/platform/errors/platform-errors';
import { PlatformValidators } from '@/lib/services/platform/validators/platform-validators';
import { getAdminWalletService } from '@/lib/services/wallet/admin/admin-wallet-service';
import { buildPlatformCallOptions, platformInsigniaClient } from '@/lib/services/platform/client/platform-client';

function decodeUtf8Base64(b64: string): string {
  try {
    return Buffer.from(b64, 'base64').toString('utf8');
  } catch {
    return '';
  }
}

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export const GET = withApiHandler(
  async (request: NextRequest, context: { params: Promise<{ address: string }> }) => {
    const h = request.headers.get('x-admin-wallet') || request.headers.get('X-Admin-Wallet') || '';
    const expected = getAdminWalletService().getAddress().toLowerCase();
    if (!h || h.toLowerCase() !== expected) {
      throw new PlatformError(
        PlatformErrorCode.UNAUTHORIZED,
        'Unauthorized. X-Admin-Wallet must match the game admin.'
      );
    }

    const playerAddress = await getAddressParam(context.params);
    if (!playerAddress) {
      throw new PlatformError(PlatformErrorCode.INVALID_ADDRESS, 'Address parameter is required');
    }
    PlatformValidators.validateAddress(playerAddress);

    const options = buildPlatformCallOptions(request, undefined);
    const res = await platformInsigniaClient.getPlayerConfig(playerAddress, options);
    if (!res.success) return res;

    const config = res.config ?? {};
    const tierRaw = typeof config.tier === 'string' ? decodeUtf8Base64(config.tier).trim() : '';
    const tier = tierRaw !== '' && /^[0-9]+$/.test(tierRaw) ? Number(tierRaw) : null;

    return {
      ...res,
      decoded: {
        tier,
      },
    };
  },
  { logRequest: true }
);

