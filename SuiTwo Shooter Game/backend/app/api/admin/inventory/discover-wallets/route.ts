// ==========================================
// Inventory discover-wallets proxy: forwards to platform backend
// Same pattern as game-pass: game backend verifies admin wallet, then calls platform.
// Uses platform config (PREMIUM_STORE_OBJECT_ID_* in Aqueduct Platform/backend/.env).
// ==========================================

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { withApiHandler } from '@/lib/api/api-handler';
import { getAdminWalletService } from '@/lib/services/wallet/admin/admin-wallet-service';
import { callPlatformBackend, buildPlatformCallOptions, getEcosystemIdFromEnv } from '@/lib/services/platform/client/platform-client';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export const GET = withApiHandler(async (request: NextRequest) => {
  const h = request.headers.get('x-admin-wallet') || request.headers.get('X-Admin-Wallet') || '';
  const expected = getAdminWalletService().getAddress().toLowerCase();
  if (!h || h.toLowerCase() !== expected) {
    throw new Error('Unauthorized. X-Admin-Wallet must match the game admin.');
  }
  const { searchParams } = new URL(request.url);
  const contract = searchParams.get('contract') || 'new';
  const ecosystemId = searchParams.get('ecosystemId')?.trim() || getEcosystemIdFromEnv();
  const offset = searchParams.get('offset');
  const limit = searchParams.get('limit');
  // Platform admin discovery is corridor-scoped; do not send legacy ecosystem/app identity.
  // Keep query params for UI pagination only.
  const path =
    `api/admin/inventory/discover-wallets?contract=${encodeURIComponent(contract)}` +
    (offset != null ? `&offset=${encodeURIComponent(offset)}` : '') +
    (limit != null ? `&limit=${encodeURIComponent(limit)}` : '');
  return callPlatformBackend<{ success: boolean; wallets?: string[]; count?: number }>(path, {
    method: 'GET',
    ...buildPlatformCallOptions(request),
  });
});
