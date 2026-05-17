import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { withApiHandler } from '@/lib/api/api-handler';
import { PlatformError, PlatformErrorCode } from '@/lib/services/platform/errors/platform-errors';
import { callPlatformBackend } from '@/lib/services/platform/client/platform-client';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export const GET = withApiHandler(async () => {
  try {
    const response = await callPlatformBackend<{
      success: boolean;
      offers?: Record<string, Record<string, unknown>>;
      offerOrder?: string[];
      error?: string;
    }>('api/stockroom/offers', { method: 'GET' });

    if (!response.success) {
      throw new PlatformError(
        PlatformErrorCode.BLOCKCHAIN_QUERY_FAILED,
        response.error || 'Failed to load stockroom offers from platform.'
      );
    }

    const offers = response.offers || {};
    return {
      success: true,
      offers,
      ...(Array.isArray(response.offerOrder) ? { offerOrder: response.offerOrder } : {}),
      count: Object.keys(offers).length,
    };
  } catch (error) {
    throw new PlatformError(
      PlatformErrorCode.BLOCKCHAIN_QUERY_FAILED,
      `Failed to fetch stockroom offers: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
});

