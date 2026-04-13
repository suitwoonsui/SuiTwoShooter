// ==========================================
// Admin API - Discover Wallets with Insignia entries
// ==========================================
// Platform-only: there is no global "list wallets with Insignia" API.
// This endpoint exists so the admin UI can use the common discovery module;
// use search to load a specific wallet and then fetch Insignia.

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { withApiHandler } from '@/lib/api/api-handler';
import { getAdminWalletService } from '@/lib/services/wallet/admin/admin-wallet-service';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export const GET = withApiHandler(async (request: NextRequest) => {
  const h = request.headers.get('x-admin-wallet') || request.headers.get('X-Admin-Wallet') || '';
  const expected = getAdminWalletService().getAddress().toLowerCase();
  if (!h || h.toLowerCase() !== expected) {
    throw new Error('Unauthorized. X-Admin-Wallet must match the game admin.');
  }
  return {
    success: true,
    wallets: [],
    count: 0,
    message: 'Insignia is on platform. Discovery is per-address; use Search to check a wallet.',
  };
});

