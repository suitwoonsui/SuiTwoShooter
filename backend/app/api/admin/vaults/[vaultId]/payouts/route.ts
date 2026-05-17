// ==========================================
// Game Admin API - Vault payout history
// Proxies to platform GET /api/glacier/[vaultId]/payouts (Glacier = canonical vault API). Exposed for future builds (audit, history).
// ==========================================

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { withApiHandler } from '@/lib/api/api-handler';
import { callPlatformBackend, buildPlatformCallOptions } from '@/lib/services/platform/client/platform-client';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

/**
 * GET /api/admin/vaults/[vaultId]/payouts
 * Returns payout history for the vault. Proxies to platform.
 * Query: limit (optional), includeRecipients (optional).
 */
export const GET = withApiHandler(
  async (request: NextRequest, { params }: { params: Promise<{ vaultId: string }> }) => {
    const { vaultId } = await params;
    if (!vaultId?.startsWith('0x')) {
      return { success: false, error: 'Invalid vault ID', payouts: [] };
    }

    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') ?? '';
    const includeRecipients = searchParams.get('includeRecipients');
    const query = new URLSearchParams();
    if (limit) query.set('limit', limit);
    if (includeRecipients != null) query.set('includeRecipients', includeRecipients);
    const qs = query.toString();

    const options = buildPlatformCallOptions(request);
    const result = await callPlatformBackend<{ success: boolean; payouts?: any[]; error?: string }>(
      `api/glacier/${encodeURIComponent(vaultId)}/payouts${qs ? `?${qs}` : ''}`,
      { method: 'GET', ...options }
    );

    if (!result.success) {
      return { success: false, error: result.error ?? 'Failed to load payouts', payouts: [] };
    }
    return { success: true, payouts: result.payouts ?? [] };
  }
);
