// ==========================================
// Game: Milestones Evaluate API
// Evaluate eligibility locally using stats from platform and condition from body.
// Platform is generic; milestone logic lives in the game.
// ==========================================

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';
import { platformStatsClient, buildPlatformCallOptions } from '@/lib/services/platform/client/platform-client';
import { evaluateCondition } from '@/lib/services/achievements/milestones/milestones-service';
import type { MilestoneCondition } from '@/lib/services/achievements/milestones/milestones-service';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

/**
 * POST /api/platform/milestones/evaluate
 * Body: { address, condition: { metric, operator, value }, stats?, ecosystemId? }.
 * Returns { eligible: boolean }. Uses platform for stats only when stats not provided.
 */
export const POST = withApiHandler(
  async (request: NextRequest) => {
    const body = await getRequestBody<{
      address: string;
      condition: { metric: string; operator: string; value: number };
      stats?: Record<string, unknown>;
      ecosystemId?: string;
    }>(request);
    const opts = buildPlatformCallOptions(request, body);
    const stats: Record<string, unknown> = body.stats ?? (await platformStatsClient.getStats(body.address, opts))?.stats ?? {};
    const condition: MilestoneCondition = {
      metric: body.condition.metric,
      operator: body.condition.operator as MilestoneCondition['operator'],
      value: body.condition.value,
    };
    const eligible = evaluateCondition(stats, condition);
    return {
      success: true,
      eligible,
    };
  }
);
