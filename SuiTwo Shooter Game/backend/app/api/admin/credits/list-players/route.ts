// ==========================================
// Admin API - List All Players with Game Passes (Credits)
// This API now proxies to platform backend
// ==========================================

import { NextRequest } from 'next/server';
import { withApiHandler } from '@/lib/api/api-handler';
import { platformGamePassClient, buildPlatformCallOptions } from '@/lib/services/platform/client/platform-client';

export const GET = withApiHandler(
  async (request: NextRequest) => {
    return platformGamePassClient.listPlayers(buildPlatformCallOptions(request));
  }
);

