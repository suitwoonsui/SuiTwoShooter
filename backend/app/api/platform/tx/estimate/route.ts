// ==========================================
// Transaction gas estimate (proxy to platform)
// POST /api/platform/tx/estimate — gas estimate for any operation.
// Proxies to platform POST /api/channel/estimate.
// ==========================================

import { NextRequest } from 'next/server';
import { withApiHandler } from '@/lib/api/api-handler';
import { callPlatformBackend, buildPlatformCallOptions } from '@/lib/services/platform/client/platform-client';

/**
 * POST /api/platform/tx/estimate
 * Proxies to platform POST /api/channel/estimate.
 * Body: { operationId: string, params?: object }.
 * Returns: { success, operationId?, gasEstimateMist?, gasEstimateSUI?, error? }.
 */
export const POST = withApiHandler(async (request: NextRequest) => {
  const options = buildPlatformCallOptions(request);
  let body: { operationId?: string; params?: Record<string, unknown> } = {};
  try {
    body = await request.json();
  } catch {
    return { success: false, error: 'Invalid JSON body' };
  }
  const result = await callPlatformBackend<{
    success: boolean;
    operationId?: string;
    gasEstimateMist?: number;
    gasEstimateSUI?: string;
    error?: string;
  }>('api/channel/estimate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    ...options,
  });
  return result;
});
