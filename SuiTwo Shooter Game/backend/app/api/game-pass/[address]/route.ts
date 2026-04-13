// ==========================================
// Game Pass API Route - Proxy to Platform Backend
// ==========================================
// This route proxies game pass requests to the platform backend
// Frontend calls game backend, game backend calls platform backend

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { withApiHandler, getAddressParam } from '@/lib/api/api-handler';
import {
  platformGamePassClient,
  buildPlatformCallOptions,
  invalidatePlayerGamePassCacheForAddress,
} from '@/lib/services/platform/client/platform-client';

// Handle CORS preflight
export async function OPTIONS(
  request: NextRequest,
  context: { params: Promise<{ address: string }> }
) {
  return handleCorsPreflight(request);
}

/**
 * GET /api/game-pass/[address]
 * Proxy to platform backend to get game pass status
 */
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000000000000000000000000000';

export const GET = withApiHandler(
  async (
    request: NextRequest,
    context: { params: Promise<{ address: string }> }
  ) => {
    const address = await getAddressParam(context.params);
    // When no wallet is connected, frontend may call with zero address. Return empty status
    // without calling platform to avoid platform errors (e.g. ticket-units 500) and user-visible errors.
    if (address === ZERO_ADDRESS || address?.toLowerCase() === ZERO_ADDRESS) {
      console.log('[TICKET-FLOW] game-pass route: zero address, returning empty without calling platform');
      return {
        success: true,
        hasPass: false,
        gamesRemaining: 0,
        isActive: false,
        packType: undefined,
        ticketCount: 0,
      };
    }
    // Default to 'new' so the game uses the same contract as the admin (admin sends ?contract=new).
    const url = new URL(request.url);
    const contract = url.searchParams.get('contract') || 'new';
    if (url.searchParams.has('_refresh')) {
      invalidatePlayerGamePassCacheForAddress(address);
    }
    console.log('[TICKET-FLOW] game-pass route: calling platform', { address: address.slice(0, 10) + '...', contract });
    const result = await platformGamePassClient.getGamePassStatus(address, buildPlatformCallOptions(request, undefined, { contract }));
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to get game pass status');
    }

    console.log('[TICKET-FLOW] game-pass route: platform result', {
      address: address.slice(0, 10) + '...',
      ticketCount: result.ticketCount ?? 0,
      gamesRemaining: result.gamesRemaining ?? 0,
      hasPass: result.hasPass ?? false,
    });
    
    return {
      success: true,
      hasPass: result.hasPass || false,
      gamesRemaining: result.gamesRemaining || 0,
      isActive: result.isActive || false,
      packType: result.packType,
      ticketCount: result.ticketCount || 0,
    };
  }
);
