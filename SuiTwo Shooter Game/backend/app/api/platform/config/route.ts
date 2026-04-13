// ==========================================
// Platform Config API Proxy
// GET /api/platform/config → platform api/config
// Returns platform config (network, rpcUrl, walletModuleUrl, etc.) for frontend or game.
// ==========================================

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { withApiHandler } from '@/lib/api/api-handler';
import { platformConfigClient } from '@/lib/services/platform/client/platform-client';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

/**
 * GET /api/platform/config
 * Proxy to platform backend. Returns safe config (network, rpcUrl, walletModuleUrl, storageKey).
 */
export const GET = withApiHandler(
  async (request: NextRequest) => {
    console.info('[GAME_BACKEND_PROXY] Forwarding platform config request', {
      route: '/api/platform/config',
      target: '/api/config',
    });
    const result = await platformConfigClient.getConfig();

    if (!result.success && result.error) {
      throw new Error(result.error);
    }

    console.info('[GAME_BACKEND_PROXY] Platform config response received', {
      route: '/api/platform/config',
      success: true,
      network: result.network,
    });

    return {
      success: true,
      network: result.network,
      rpcUrl: result.rpcUrl,
      walletModuleUrl: result.walletModuleUrl,
      storageKey: result.storageKey,
    };
  }
);
