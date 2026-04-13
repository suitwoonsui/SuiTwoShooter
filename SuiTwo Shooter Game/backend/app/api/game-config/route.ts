// ==========================================
// Game Config API - Serves game configuration from platform or blockchain
// Corridor-only platform config. Response cached in @/lib/cache/public-nonuser-data-cache
// (shared with menu bootstrap). Platform fetch also uses fetchPlatformAppConfig internal cache.
// ==========================================

import { NextRequest } from 'next/server';
import { withApiHandler } from '@/lib/api/api-handler';
import { getOrLoadGameConfigResponse } from '@/lib/cache/public-nonuser-data-cache';

export const GET = withApiHandler(async (request: NextRequest) => {
  const source = request.nextUrl.searchParams.get('source');
  if (!source) {
    console.warn('[PUBLIC] /api/game-config missing source tag', {
      route: '/api/game-config',
      referer: request.headers.get('referer'),
      userAgent: request.headers.get('user-agent'),
      secFetchDest: request.headers.get('sec-fetch-dest'),
      secFetchMode: request.headers.get('sec-fetch-mode'),
      secFetchSite: request.headers.get('sec-fetch-site'),
    });
  }
  return getOrLoadGameConfigResponse();
});
