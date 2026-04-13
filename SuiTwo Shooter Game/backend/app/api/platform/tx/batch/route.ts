// ==========================================
// Transaction batch (proxy to platform)
// POST /api/platform/tx/batch — batch operations. Proxies to platform POST /api/channel/batch.
// ==========================================

import { NextRequest } from 'next/server';
import { withApiHandler } from '@/lib/api/api-handler';
import { callPlatformBackend, buildPlatformCallOptions } from '@/lib/services/platform/client/platform-client';

/**
 * POST /api/platform/tx/batch
 * Proxies to platform POST /api/channel/batch.
 * Body: { operations: [{ operationId, params }], ecosystemId? }.
 * Supported: rewards-build-distribute (params.rewards array).
 */
export const POST = withApiHandler(async (request: NextRequest) => {
  const options = buildPlatformCallOptions(request);
  let body: { operations?: Array<{ operationId?: string; params?: Record<string, unknown> }>; ecosystemId?: string } = {};
  try {
    body = await request.json();
  } catch {
    return { success: false, error: 'Invalid JSON body' };
  }
  const result = await callPlatformBackend<any>('api/channel/batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, ecosystemId: body.ecosystemId ?? options.ecosystemId }),
    ...options,
  });
  return result;
});
