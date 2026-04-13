// ==========================================
// Inventory API Route - Proxy to Platform Backend
// ==========================================
// Same pattern as game-pass: frontend calls game backend, game backend calls platform backend.
// Multi-ecosystem: X-Ecosystem-Id, ?ecosystemId= (default suitwo).
// GET /api/inventory/[address] → platform api/inventory/[address]

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { withApiHandler, getAddressParam } from '@/lib/api/api-handler';
import { platformInventoryClient, buildPlatformCallOptions } from '@/lib/services/platform/client/platform-client';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

/**
 * GET /api/inventory/[address]
 * Proxy to platform backend. Pass ecosystemId from request (X-Ecosystem-Id, ?ecosystemId=).
 */
export const GET = withApiHandler(
  async (
    request: NextRequest,
    context: { params: Promise<{ address: string }> }
  ) => {
    const address = await getAddressParam(context.params);
    const url = new URL(request.url);
    const contract = url.searchParams.get('contract') || undefined;
    const debug = url.searchParams.get('debug') === '1';
    const result = await platformInventoryClient.getInventory(
      address,
      {
        ...(buildPlatformCallOptions(request) as Parameters<typeof platformInventoryClient.getInventory>[1]),
        ...(contract ? { contract: contract as any } : {}),
        ...(debug ? { debug: true } : {}),
      }
    );

    if (!result.success) {
      throw new Error(result.error || 'Failed to get inventory');
    }

    return {
      success: true,
      address: result.address ?? address,
      inventory: result.inventory ?? {},
    };
  }
);
