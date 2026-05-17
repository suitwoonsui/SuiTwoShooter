// ==========================================
// Distribute Creator Reward API Route
// Creator rewards are paid from the pool only (platform distribution with creator_reward_config).
// This endpoint is disabled; use the normal reward distribution flow instead.
// ==========================================

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { withApiHandler } from '@/lib/api/api-handler';
import { PlatformError, PlatformErrorCode } from '@/lib/services/platform/errors/platform-errors';
import { verifyApiKey } from '@/lib/auth';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export const POST = withApiHandler(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    if (!verifyApiKey(request)) {
      throw new PlatformError(
        PlatformErrorCode.INVALID_ADDRESS,
        'Unauthorized. Valid API key required.'
      );
    }

    const { id } = await params;
    if (!id || !id.startsWith('0x')) {
      throw new PlatformError(
        PlatformErrorCode.INVALID_ADDRESS,
        'Invalid tournament object ID format'
      );
    }

    throw new PlatformError(
      PlatformErrorCode.INVALID_INPUT,
      'Creator rewards are paid from the pool only. Set creator_reward_config on the platform (Helm) and distribute rewards via the normal distribution flow (Distribute button). The game does not pay creators from the admin wallet.'
    );
  }
);







