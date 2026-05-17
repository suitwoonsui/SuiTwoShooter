import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { withApiHandler } from '@/lib/api/api-handler';
import {
  isPlatformAppConfigEnabled,
  getPlatformAppConfigUrl,
  getPlatformEcosystemApiKey,
} from '@/lib/services/platform/app-config/platform-app-config';
import {
  getCorridorCapabilityObjectIdFromEnv,
  getCorridorAdminCapabilityObjectIdFromEnv,
} from '@/lib/services/platform/client/platform-client';

function maskObjectId(objectId: string): string {
  if (!objectId) return '';
  if (objectId.length <= 14) return objectId;
  return `${objectId.slice(0, 8)}...${objectId.slice(-6)}`;
}

function detectApiKeySource(): string {
  if (process.env.PLATFORM_API_KEY) return 'PLATFORM_API_KEY';
  if (process.env.PLATFORM_ECOSYSTEM_API_KEY) return 'PLATFORM_ECOSYSTEM_API_KEY';
  if (process.env.APP_ID && process.env.ECOSYSTEM_ID) return 'ECOSYSTEM_<id>_APP_<app>_API_KEY';
  if (process.env.ECOSYSTEM_ID) return 'ECOSYSTEM_<id>_API_KEY';
  if (process.env.ADMIN_API_KEY) return 'ADMIN_API_KEY';
  if (process.env.API_KEY) return 'API_KEY';
  return 'none';
}

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

/**
 * GET /api/admin/diagnostics/corridor
 * Read-only diagnostic endpoint for corridor identity readiness.
 */
export const GET = withApiHandler(async () => {
  const corridorCapabilityObjectId = getCorridorCapabilityObjectIdFromEnv();
  const corridorAdminCapabilityObjectId = getCorridorAdminCapabilityObjectIdFromEnv();
  const platformBaseUrl = getPlatformAppConfigUrl();
  const apiKeyConfigured = Boolean(getPlatformEcosystemApiKey());
  const enabled = isPlatformAppConfigEnabled();

  return {
    success: true,
    enabled,
    mode: 'corridor-only',
    checks: {
      platformBaseUrlConfigured: Boolean(platformBaseUrl),
      corridorCapabilityConfigured: Boolean(corridorCapabilityObjectId),
      corridorAdminCapabilityConfigured: Boolean(corridorAdminCapabilityObjectId),
      apiKeyConfigured,
    },
    values: {
      platformBaseUrl,
      corridorCapabilityObjectId: maskObjectId(corridorCapabilityObjectId),
      corridorAdminCapabilityObjectId: maskObjectId(corridorAdminCapabilityObjectId),
      apiKeySource: detectApiKeySource(),
    },
  };
});
