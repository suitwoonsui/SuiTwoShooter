// ==========================================
// Verify Score Submission on Blockchain
// ==========================================

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { withApiHandler, getDigestParam } from '@/lib/api/api-handler';
import { PlatformError, PlatformErrorCode } from '@/lib/services/platform/errors/platform-errors';
import { platformGameScoreClient } from '@/lib/services/platform/client/platform-client';

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

/**
 * GET /api/scores/verify/[digest]
 * Verify via platform only. Requires PLATFORM_BACKEND_URL, ECOSYSTEM_ID, APP_ID.
 */
export const GET = withApiHandler(
  async (
    request: NextRequest,
    context: { params: Promise<{ digest: string }> }
  ) => {
    const digest = await getDigestParam(context.params);

    return platformGameScoreClient.verifyByDigest(digest);
  }
);

