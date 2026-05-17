// ==========================================
// Milestone definitions (Aquifer) — shared loader for HTTP route + AchievementService + public cache.
// ==========================================

import { MILESTONE_DEFINITIONS } from '@/data/initialization-data';
import { ensureMilestoneIds, type MilestoneRowLike } from '@/lib/services/achievements/milestones/ensure-milestone-ids';
import {
  platformMilestonesClient,
  type CallPlatformBackendOptions,
} from '@/lib/services/platform/client/platform-client';

export type NormalizedMilestoneDefinitions = Record<string, MilestoneRowLike[]>;

export async function fetchNormalizedMilestoneDefinitions(
  platformOptions: CallPlatformBackendOptions
): Promise<NormalizedMilestoneDefinitions> {
  const platformData = await platformMilestonesClient.getDefinitions(platformOptions);
  if (!platformData?.success || !(platformData.fullDefinitions || platformData.definitions)) {
    throw new Error(platformData?.error ?? 'Platform milestone definitions missing or unsuccessful');
  }
  const raw = (platformData.fullDefinitions ?? {}) as Record<string, unknown>;
  const base = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  return ensureMilestoneIds(base as Record<string, MilestoneRowLike[]>, MILESTONE_DEFINITIONS);
}
