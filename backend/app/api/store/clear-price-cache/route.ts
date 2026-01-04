// ==========================================
// Clear Price Cache API Endpoint
// Forces fresh price fetch on next request
// ==========================================

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '../../../../../../../base/backend/lib/cors';
import { priceConverter } from '../../../../../../../backend/lib/services/price-converter';
import { withApiHandler } from '../../../../../../../base/backend/lib/api/api-handler';

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export const POST = withApiHandler(
  async (request: NextRequest) => {
    priceConverter.clearCache();
    
    return {
      success: true,
      message: 'Price cache cleared. Next request will fetch fresh prices.',
    };
  }
);

