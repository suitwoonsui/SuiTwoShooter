// ==========================================
// Game Admin API - Vault details (single vault)
// Proxies to platform GET /api/glacier/[vaultId] (Glacier = canonical vault API). Exposed for future builds (dashboards, pool display).
// ==========================================

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { withApiHandler } from '@/lib/api/api-handler';
import { callPlatformBackend, buildPlatformCallOptions } from '@/lib/services/platform/client/platform-client';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

/**
 * GET /api/admin/vaults/[vaultId]
 * Returns vault details (multi-token balances). Proxies to platform.
 */
export const GET = withApiHandler(
  async (request: NextRequest, { params }: { params: Promise<{ vaultId: string }> }) => {
    const { vaultId } = await params;
    if (!vaultId?.startsWith('0x')) {
      return { success: false, error: 'Invalid vault ID', balances: [] };
    }

    const options = buildPlatformCallOptions(request);
    const result = await callPlatformBackend<{
      success: boolean;
      vaultId?: string;
      balances?: Array<{ coinTypeId: string; balanceRaw: string }>;
      balanceRaw?: string;
      coinTypeId?: string;
      unlockAtMs?: number;
      depositDeadlineMs?: number;
      released?: boolean;
      error?: string;
    }>(`api/glacier/${encodeURIComponent(vaultId)}`, { method: 'GET', ...options });

    if (!result.success) {
      return { success: false, error: result.error ?? 'Failed to load vault', balances: [] };
    }
    return {
      success: true,
      vaultId: result.vaultId ?? vaultId,
      balances: result.balances ?? [],
      balanceRaw: result.balanceRaw,
      coinTypeId: result.coinTypeId,
      unlockAtMs: result.unlockAtMs,
      depositDeadlineMs: result.depositDeadlineMs,
      released: result.released,
    };
  }
);
