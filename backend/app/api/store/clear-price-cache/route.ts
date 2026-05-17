// ==========================================
// Clear Price Cache API Endpoint
// Forces fresh price fetch on next request
// ==========================================

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { priceConverter } from '@/lib/services/payments/converter/price-converter';
import { withApiHandler } from '@/lib/api/api-handler';
import { notifyPublicStoreCatalogChanged } from '@/lib/cache/public-nonuser-data-cache';

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export const POST = withApiHandler(
  async (request: NextRequest) => {
    priceConverter.clearCache();
    await notifyPublicStoreCatalogChanged({ reason: 'clear-price-cache' });

    return {
      success: true,
      message: 'Price cache and store catalog public cache cleared. Next request will fetch fresh prices and catalog.',
    };
  }
);


