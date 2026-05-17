import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { withApiHandler } from '@/lib/api/api-handler';
import { PlatformError, PlatformErrorCode } from '@/lib/services/platform/errors/platform-errors';
import { ensureGameClaimsAnchorSessionId } from '@/lib/services/anchor/claims-anchor-session';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

/**
 * POST /api/admin/anchor/create-claims-session
 * Creates (or reuses) a long-lived Anchor session used for milestone claim tracking.
 *
 * Returns sessionId. To persist across restarts, set GAME_ANCHOR_SESSION_ID=<sessionId> in the game backend env.
 */
export const POST = withApiHandler(async () => {
  // Optional safety: allow in prod only when explicitly enabled.
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_ANCHOR_SESSION_BOOTSTRAP !== 'true') {
    throw new PlatformError(
      PlatformErrorCode.FORBIDDEN,
      'Anchor session bootstrap is disabled in production. Set ALLOW_ANCHOR_SESSION_BOOTSTRAP=true to enable.'
    );
  }

  const res = await ensureGameClaimsAnchorSessionId();
  if (!res.success || res.sessionId == null) {
    throw new PlatformError(
      PlatformErrorCode.TRANSACTION_FAILED,
      res.error ?? 'Failed to create Anchor claims session'
    );
  }
  return {
    success: true,
    sessionId: res.sessionId,
    message: 'Anchor claims session ready. Set GAME_ANCHOR_SESSION_ID to persist across restarts.',
  };
});

