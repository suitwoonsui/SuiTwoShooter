import { NextRequest } from 'next/server';
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';
import { PlatformError, PlatformErrorCode } from '@/lib/services/platform/errors/platform-errors';
import { platformGameScoreClient } from '@/lib/services/platform/client/platform-client';

/**
 * POST /api/scores/verify
 * Verify via platform only. Requires PLATFORM_BACKEND_URL, ECOSYSTEM_ID, APP_ID.
 */
export const POST = withApiHandler(
  async (request: NextRequest) => {
    const body = await getRequestBody<{ txHash: string }>(request);
    const { txHash } = body;

    if (!txHash) {
      throw new Error('Transaction hash is required');
    }

    if (!txHash.startsWith('0x') || txHash.length < 10) {
      throw new Error('Invalid transaction hash format');
    }

    return platformGameScoreClient.verifyByTxHash(txHash);
  }
);


