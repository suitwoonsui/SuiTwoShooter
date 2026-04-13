// Request context for API handlers (game-owned).

import { getEcosystemIdFromEnv, getAppIdFromEnv } from '@/lib/services/platform/client/platform-client';
import { getOrCreateRequestId } from '@/lib/http/request-id';

export interface RequestContext {
  ecosystemId: string;
  appId: string;
  requestId: string;
  corridor: {
    /** Incoming CorridorCap object id, if client sent it. */
    corridorCapabilityObjectId: string;
    /** Incoming CorridorAdminCap object id, if client sent it. */
    corridorAdminCapabilityObjectId: string;
  };
}

function readHeader(request: Request | undefined, name: string): string {
  if (!request) return '';
  const v = request.headers.get(name) || request.headers.get(name.toLowerCase()) || '';
  return (v ?? '').trim();
}

export async function getRequestContextAsync(request?: Request): Promise<RequestContext> {
  const ecosystemId = getEcosystemIdFromEnv()?.trim() || '';
  const appId = getAppIdFromEnv()?.trim() || '';
  const requestId = getOrCreateRequestId(request);
  const corridorCapabilityObjectId = readHeader(request, 'X-Corridor-Capability-Object-Id');
  const corridorAdminCapabilityObjectId = readHeader(request, 'X-Corridor-Admin-Capability-Object-Id');
  return {
    ecosystemId,
    appId,
    requestId,
    corridor: {
      corridorCapabilityObjectId,
      corridorAdminCapabilityObjectId,
    },
  };
}
