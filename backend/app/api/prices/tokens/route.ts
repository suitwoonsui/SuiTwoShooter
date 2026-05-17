// ==========================================
// Public token spot prices (MEWS / SUI / USDC in USD) + decimals.
// Shared across store, tournaments, and other features — not tied to store catalog TTL.
// ==========================================

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { withApiHandler } from '@/lib/api/api-handler';
import { buildTokenPricesDecimalsPayload } from '@/lib/services/payments/converter/token-prices-public-payload';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export const GET = withApiHandler(async (_request: NextRequest) => {
  return buildTokenPricesDecimalsPayload();
});
