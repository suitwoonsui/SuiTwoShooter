// ==========================================
// Store Catalog API Route (single source of truth)
// Source: platform Terminal store-catalog (Provisions definitions + Stockroom offers)
// Payload is cached in @/lib/cache/public-nonuser-data-cache (shared with menu bootstrap).
// ==========================================

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { withApiHandler } from '@/lib/api/api-handler';
import { PlatformLogger } from '@/lib/services/platform/logging/platform-logger';
import { withGuaranteedOfferOrder } from '@/lib/services/store/terminal-store-catalog';
import { getOrLoadStoreCatalogPayload } from '@/lib/cache/public-nonuser-data-cache';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export const GET = withApiHandler(async (_request: NextRequest) => {
  const requestStartedAt = Date.now();
  const payload = await getOrLoadStoreCatalogPayload();
  PlatformLogger.info('[STORE CATALOG] GET (public cache)', {
    totalElapsedMs: Date.now() - requestStartedAt,
    itemCount: Array.isArray(payload.items) ? payload.items.length : 0,
  });
  return withGuaranteedOfferOrder(payload);
});

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';
