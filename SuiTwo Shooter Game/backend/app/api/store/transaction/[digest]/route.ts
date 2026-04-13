// ==========================================
// Store Transaction Status API Route
// Checks transaction status on blockchain
// ==========================================

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '../../../../../../../../base/backend/lib/cors';
import { storeService } from '../../../../../../../../backend/lib/sui/store-service';
import { BadgeLogger } from '../../../../../../../../base/backend/lib/sui/badge-logger';
import { withApiHandler, getDigestParam } from '../../../../../../../../base/backend/lib/api/api-handler';

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

    BadgeLogger.info('Checking transaction status', { digest });

    // Verify transaction
    const result = await storeService.verifyTransaction(digest);

    if (!result.success) {
      throw new Error(result.error || 'Failed to verify transaction');
    }

    return {
      success: true,
      digest,
      exists: result.exists,
      confirmed: result.confirmed,
    };
  }
);

