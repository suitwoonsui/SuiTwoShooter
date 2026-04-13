// ==========================================
// Transaction services catalog (proxy to platform)
// Apps/games call platform via API for all transaction operations.
// This endpoint returns the catalog from the platform for discovery.
// ==========================================

import { NextRequest } from 'next/server';
import { withApiHandler } from '@/lib/api/api-handler';
import { callPlatformBackend, buildPlatformCallOptions } from '@/lib/services/platform/client/platform-client';

/**
 * GET /api/platform/tx
 * Proxies to platform GET /api/channel. Returns the catalog of transaction-related APIs
 * (build/execute) so the app knows which platform endpoints to call for each operation.
 */
export const GET = withApiHandler(async (request: NextRequest) => {
  const options = buildPlatformCallOptions(request);
  const result = await callPlatformBackend<{
    success: boolean;
    message?: string;
    operations?: any[];
    byService?: Record<string, string[]>;
  }>('api/channel', { method: 'GET', ...options });

  if (!result.success) {
    return { success: false, error: (result as any).error ?? 'Failed to load transaction catalog', operations: [] };
  }
  return {
    success: result.success,
    message: result.message,
    operations: result.operations ?? [],
    byService: result.byService ?? {},
  };
});
