// ==========================================
// Submit signed transaction (proxy to platform)
// POST /api/platform/tx/execute — proxies to platform POST /api/channel/execute.
// Use after building (e.g. POST /api/badges/mint/fulfill or /api/badges/upgrade/fulfill) and signing with the player wallet.
// ==========================================

import { NextRequest } from 'next/server';
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';
import { PlatformError, PlatformErrorCode } from '@/lib/services/platform/errors/platform-errors';
import { platformTxClient, buildPlatformCallOptions } from '@/lib/services/platform/client/platform-client';

export const POST = withApiHandler(
  async (request: NextRequest) => {
    const body = await getRequestBody<{
      transactionBytesBase64: string;
      signature: string;
      ecosystemId?: string;
    }>(request);

    const { transactionBytesBase64, signature } = body ?? {};
    if (!transactionBytesBase64 || typeof transactionBytesBase64 !== 'string') {
      throw new PlatformError(
        PlatformErrorCode.INVALID_INPUT,
        'transactionBytesBase64 is required'
      );
    }
    if (!signature || typeof signature !== 'string') {
      throw new PlatformError(
        PlatformErrorCode.INVALID_INPUT,
        'signature is required'
      );
    }

    const options = buildPlatformCallOptions(request, body);
    const result = await platformTxClient.executeSigned(
      { transactionBytesBase64, signature },
      options
    );
    return result;
  },
  { logRequest: true }
);
