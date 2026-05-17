// ==========================================
// Store Transaction Status API Route
// Proxies to platform backend (framework-level operation)
// ==========================================

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { PlatformLogger } from '@/lib/services/platform/logging/platform-logger';
import { withApiHandler, getDigestParam } from '@/lib/api/api-handler';
import { platformStoreClient } from '@/lib/services/platform/client/platform-client';

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export const GET = withApiHandler(
  async (
    request: NextRequest,
    context: { params: Promise<{ digest: string }> }
  ) => {
    const digest = await getDigestParam(context.params);

    PlatformLogger.info('Checking transaction status (proxying to platform)', { digest });

    // Proxy to platform backend
    const result = await platformStoreClient.getTransactionStatus(digest);

    if (!result.success) {
      throw new Error(result.error || 'Failed to verify transaction');
    }

    return {
      success: true,
      digest: result.digest,
      exists: result.exists,
      confirmed: result.confirmed,
    };
  }
);

