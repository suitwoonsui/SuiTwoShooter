// ==========================================
// Aquifer Definitions (Admin)
// Proxy to platform `api/aquifer/definitions` so the game admin UI can list definitions.
// ==========================================

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { withApiHandler } from '@/lib/api/api-handler';
import { verifyApiKey } from '@/lib/auth';
import { PlatformError, PlatformErrorCode } from '@/lib/services/platform/errors/platform-errors';
import { getAdminWalletService } from '@/lib/services/wallet/admin/admin-wallet-service';
import { callPlatformBackend, buildPlatformCallOptions } from '@/lib/services/platform/client/platform-client';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export const GET = withApiHandler(async (request: NextRequest) => {
  // Platform Aquifer GET is API-key protected. Allow access via API key OR verified admin wallet header.
  const hasApiKey = verifyApiKey(request);
  if (!hasApiKey) {
    const adminWallet = getAdminWalletService();
    const expected = adminWallet.getAddress().toLowerCase();
    const provided = (request.headers.get('X-Admin-Wallet') || request.headers.get('x-admin-wallet') || '').toLowerCase();
    if (!provided || provided !== expected) {
      throw new PlatformError(
        PlatformErrorCode.UNAUTHORIZED,
        'Unauthorized. Valid API key or admin wallet address required.'
      );
    }
  }

  const options = buildPlatformCallOptions(request);
  const response = await callPlatformBackend<{ success: boolean; definitions?: Array<{ key: string; value: string }>; error?: string }>(
    'api/aquifer/definitions',
    { method: 'GET', ...options }
  );
  if (!response.success) {
    throw new PlatformError(
      PlatformErrorCode.PLATFORM_ERROR,
      response.error || 'Failed to list Aquifer definitions'
    );
  }
  return { success: true, definitions: response.definitions ?? [] };
});

