// ==========================================
// Game Admin API - List Vaults (all vaults from chain)
// Proxies to platform GET /api/glacier/vaults?all=true so game admin sees all vaults (event-linked, orphaned, multiple per event).
// ==========================================

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { withApiHandler } from '@/lib/api/api-handler';
import { callPlatformBackend } from '@/lib/services/platform/client/platform-client';
import { PlatformLogger } from '@/lib/services/platform/logging/platform-logger';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

/**
 * GET /api/admin/vaults
 * Returns all vaults from chain (orphaned, event-linked, multiple per event). Proxies to platform with all=true.
 */
export const GET = withApiHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const limitParam = searchParams.get('limit');
  const limit = limitParam ? Math.min(Math.max(1, parseInt(limitParam, 10)), 500) : 200;

  const url = `api/glacier/vaults?all=true&limit=${limit}`;
  PlatformLogger.info('[VAULTS] Listing vaults: calling platform', { url });

  const result = await callPlatformBackend<{ success: boolean; vaults?: any[]; error?: string }>(url);

  if (!result.success) {
    PlatformLogger.warn('[VAULTS] Platform vault list failed', { error: result.error });
    return { success: false, error: result.error ?? 'Failed to load vaults', vaults: [] };
  }
  const vaults = result.vaults ?? [];
  PlatformLogger.info('[VAULTS] Platform vault list success', { vaultCount: vaults.length });
  return { success: true, vaults };
});
