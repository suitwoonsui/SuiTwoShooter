// ==========================================
// Game: Milestones Service (Sustain Rain — definition-driven rewards)
// Definitions from Aquifer; claimed definition IDs are read from **Wake marks** (`wake_mark_<id>` u64 keys via Hydroscope GET/Channel submit).
// Numeric stats use the same Wake store. Optional Anchor claim listing may remain for admin/debug tooling only (not used for milestone claim linkage).
// ==========================================

import {
  platformStatsClient,
  platformMilestonesClient,
  platformAnchorClient,
  callPlatformBackend,
  type CallPlatformBackendOptions,
} from '@/lib/services/platform/client/platform-client';
import { PlatformLogger } from '@/lib/services/platform/logging/platform-logger';

/** Params for Channel to build payout tx(s). Single build path: only Channel builds. */
export interface ChannelBuildParams {
  operationId: string;
  params: Record<string, unknown>;
}

/** Condition: metric from stats, operator, target value. */
export interface MilestoneCondition {
  metric: string; // e.g. totalGames, bestScore
  operator: '>=' | '>' | '<=' | '<' | '==' | '!=';
  value: number;
}

/** App-defined milestone definition (stored in Aquifer under a key, e.g. milestone:first_win). */
export interface MilestoneDefinitionFromAquifer {
  condition: MilestoneCondition;
  reward?: {
    tokenType?: 'SUI' | 'MEWS' | 'USDC';
    tokenAmount?: string;
    items?: Array<{ itemId: string; level: number; quantity: number }>;
  };
}

async function getStats(_ecosystemId: string, _appId: string, address: string): Promise<Record<string, unknown>> {
  const r = await platformStatsClient.getStats(address);
  return (r?.stats as Record<string, unknown>) ?? {};
}

async function getDefinitionFromChain(_ecosystemId: string, _appId: string, definitionKey: string): Promise<string | null> {
  const r = await platformMilestonesClient.getDefinition(definitionKey.trim());
  return r?.value ?? null;
}

/**
 * Fetch milestone definition from Aquifer by key (via platform). Returns null if not found or invalid.
 */
export async function getMilestoneDefinitionFromAquifer(
  ecosystemId: string,
  appId: string,
  definitionKey: string
): Promise<MilestoneDefinitionFromAquifer | null> {
  const valueBase64 = await getDefinitionFromChain(ecosystemId, appId, definitionKey.trim());
  if (valueBase64 == null) return null;
  try {
    const json = Buffer.from(valueBase64, 'base64').toString('utf8');
    const parsed = JSON.parse(json) as unknown;
    if (!parsed || typeof parsed !== 'object' || !('condition' in parsed)) return null;
    const cond = (parsed as { condition?: unknown }).condition;
    if (!cond || typeof cond !== 'object' || !('metric' in cond) || !('operator' in cond) || !('value' in cond)) return null;
    const def: MilestoneDefinitionFromAquifer = {
      condition: cond as MilestoneCondition,
      reward: (parsed as { reward?: MilestoneDefinitionFromAquifer['reward'] }).reward,
    };
    return def;
  } catch {
    return null;
  }
}

/** Claim type for milestone completion in Anchor. Platform may include claimType/payload in list response. */
const MILESTONE_CLAIM_TYPE = 'MILESTONE_COMPLETION';

/** Wake mark primary key for a claimed numeric definition id (must match platform `WAKE_MARK_KEY_PREFIX` + `marks` query + submit_wake_stats). */
export const WAKE_MARK_KEY_PREFIX = 'wake_mark_';

export function wakeMilestoneMarkKey(milestoneId: number): string {
  return `${WAKE_MARK_KEY_PREFIX}${Math.floor(milestoneId)}`;
}

/**
 * Read which milestone IDs in `milestoneDefinitionIds` have active Wake claim state (`wake_mark_<id> === 1`).
 */
export async function getClaimedMilestoneIdsFromWake(
  address: string,
  milestoneDefinitionIds: number[],
  options?: CallPlatformBackendOptions
): Promise<number[]> {
  const sorted = [...new Set(milestoneDefinitionIds)]
    .filter((n) => Number.isFinite(n) && n > 0)
    .sort((a, b) => a - b);
  if (sorted.length === 0) return [];

  const marksParam = sorted.join(',');
  const path = `api/hydroscope/${encodeURIComponent(address)}?marks=${encodeURIComponent(marksParam)}`;
  try {
    const res = await callPlatformBackend<{ success?: boolean; stats?: Record<string, unknown> }>(path, {
      method: 'GET',
      ...options,
    });
    if (!res || res.success === false) return [];
    const stats = res.stats ?? {};
    const claimed: number[] = [];
    for (const id of sorted) {
      const key = wakeMilestoneMarkKey(id);
      const v = stats[key];
      const n = typeof v === 'number' ? v : Number(v);
      if (Number.isFinite(n) && n === 1) claimed.push(id);
    }
    return claimed;
  } catch (e) {
    PlatformLogger.warn('Milestones: getClaimedMilestoneIdsFromWake failed', {
      address: address.slice(0, 10) + '…',
      error: e instanceof Error ? e.message : String(e),
    });
    return [];
  }
}

export async function isWakeMilestoneMarked(
  address: string,
  milestoneId: number,
  options?: CallPlatformBackendOptions
): Promise<boolean> {
  const ids = await getClaimedMilestoneIdsFromWake(address, [milestoneId], options);
  return ids.includes(milestoneId);
}

/**
 * Resolve Anchor claim_id for a (playerAddress, milestoneId). Use when revoking a milestone claim via platform anchor-revoke-claim.
 * When the game submits claims on behalf of players, pass submittedByAddress = game admin so we list that participant and filter by payload.playerAddress.
 * Returns the first matching claim's claimId, or null if not found.
 */
export async function getAnchorClaimIdForMilestone(
  playerAddress: string,
  milestoneId: number,
  options?: { submittedByAddress?: string }
): Promise<number | null> {
  const participant = options?.submittedByAddress?.trim().startsWith('0x') ? options.submittedByAddress!.trim() : playerAddress;
  const listOptions = { limit: 200, ...(participant !== playerAddress ? { payloadPlayerAddress: playerAddress } : {}) };
  const res = await platformAnchorClient.listParticipantClaims(participant, listOptions);
  if (!res.success || !res.claims?.length) return null;
  const mid = String(milestoneId);
  for (const c of res.claims) {
    const anyClaim = c as unknown as { claimType?: string; payload?: unknown; payloadJson?: unknown; claimId?: number };
    const type = (anyClaim.claimType ?? '').toUpperCase();
    if (type !== MILESTONE_CLAIM_TYPE && type !== 'MILESTONE_CLAIM') continue;
    // Strict schema: payload must include milestoneId.
    // Prefer payloadJson (enriched), else parse payload if it's a JSON string.
    let payload: any = null;
    if (anyClaim.payloadJson && typeof anyClaim.payloadJson === 'object') payload = anyClaim.payloadJson;
    else if (typeof anyClaim.payload === 'string') {
      try {
        payload = JSON.parse(anyClaim.payload);
      } catch {
        payload = null;
      }
    } else if (anyClaim.payload && typeof anyClaim.payload === 'object') payload = anyClaim.payload;
    const id = payload && typeof payload === 'object' ? (payload.milestoneId ?? payload.milestone_id) : undefined;
    if (id !== undefined && id !== null && String(id) === mid && c.claimId != null) return c.claimId;
  }
  return null;
}

/**
 * Options when listing claimed milestones from Anchor. When the game submits claims with the game admin wallet (participant = game address), set submittedByAddress so we list by that participant and filter by payload.playerAddress.
 */
export interface GetClaimedMilestoneIdsFromAnchorOptions {
  /** When set, list claims for this participant (e.g. game admin address) and filter by payload.playerAddress = address. Use when game admin signs and submits claims on behalf of players. */
  submittedByAddress?: string;
}

export interface AnchorClaimsDebugSnapshot {
  participant: string;
  payloadPlayerAddress?: string;
  success: boolean;
  claimCount: number;
  platformDebug?: any;
  sample: Array<{
    claimId?: number | null;
    claimType?: string | null;
    payloadKeys?: string[];
    payloadJson?: unknown;
    payload?: unknown;
  }>;
}

export interface GetClaimedMilestoneIdsFromAnchorDebugResult {
  ids: string[];
  debug: {
    queries: AnchorClaimsDebugSnapshot[];
  };
}

/**
 * Return claimed milestone IDs for a player from Anchor (platform). Use when platform is configured.
 * Filters claims by claimType === MILESTONE_COMPLETION and extracts milestoneId from payload.
 * Strict schema: does NOT accept legacy `definitionId`.
 * When submittedByAddress is set (game admin), lists claims for that participant with payloadPlayerAddress = address so game-submitted claims are found.
 */
export async function getClaimedMilestoneIdsFromAnchor(
  address: string,
  options?: GetClaimedMilestoneIdsFromAnchorOptions
): Promise<string[]> {
  const ids = new Set<string>();

  const extractIntoSet = (claims: unknown[]) => {
    for (const c of claims) {
      const anyClaim = c as unknown as { claimType?: string; payload?: unknown; payloadJson?: unknown };
      const type = (anyClaim.claimType ?? '').toUpperCase();
      if (type !== MILESTONE_CLAIM_TYPE && type !== 'MILESTONE_CLAIM') continue;
      // Strict schema: payload must include milestoneId.
      // Prefer payloadJson (enriched), else parse payload if it's a JSON string.
      let payload: any = null;
      if (anyClaim.payloadJson && typeof anyClaim.payloadJson === 'object') payload = anyClaim.payloadJson;
      else if (typeof anyClaim.payload === 'string') {
        try {
          payload = JSON.parse(anyClaim.payload);
        } catch {
          payload = null;
        }
      } else if (anyClaim.payload && typeof anyClaim.payload === 'object') payload = anyClaim.payload;
      const id = payload && typeof payload === 'object' ? (payload.milestoneId ?? payload.milestone_id) : undefined;
      if (id !== undefined && id !== null) ids.add(String(id));
    }
  };

  // Claims may be stored under different participants depending on how they were submitted:
  // - game admin submits on behalf of players (participant = admin; payloadPlayerAddress = player)
  // - player submits directly (participant = player)
  // To avoid "already claimed shows as claimable after restart" when participant assumptions change,
  // we query both locations and union the milestone IDs.
  const submittedBy = options?.submittedByAddress?.trim().startsWith('0x') ? options.submittedByAddress!.trim() : null;

  if (submittedBy && submittedBy !== address) {
    const resAdmin = await platformAnchorClient.listParticipantClaims(submittedBy, {
      limit: 200,
      payloadPlayerAddress: address,
    });
    if (resAdmin.success && resAdmin.claims) extractIntoSet(resAdmin.claims);
  }

  const resPlayer = await platformAnchorClient.listParticipantClaims(address, { limit: 200 });
  if (resPlayer.success && resPlayer.claims) extractIntoSet(resPlayer.claims);

  // Backward/failure tolerance: if neither call succeeded, return [] (caller will decide how to handle).
  return Array.from(ids);
}

/**
 * Debug variant of getClaimedMilestoneIdsFromAnchor that returns both the derived IDs and a small snapshot
 * of the raw Anchor claim data fetched from the platform. Intended for admin/debugging only.
 */
export async function getClaimedMilestoneIdsFromAnchorWithDebug(
  address: string,
  options?: GetClaimedMilestoneIdsFromAnchorOptions
): Promise<GetClaimedMilestoneIdsFromAnchorDebugResult> {
  const ids = new Set<string>();
  const queries: AnchorClaimsDebugSnapshot[] = [];

  const extractIntoSet = (claims: unknown[]) => {
    for (const c of claims) {
      const anyClaim = c as unknown as { claimType?: string; payload?: unknown; payloadJson?: unknown };
      const type = (anyClaim.claimType ?? '').toUpperCase();
      if (type !== MILESTONE_CLAIM_TYPE && type !== 'MILESTONE_CLAIM') continue;
      let payload: any = null;
      if (anyClaim.payloadJson && typeof anyClaim.payloadJson === 'object') payload = anyClaim.payloadJson;
      else if (typeof anyClaim.payload === 'string') {
        try {
          payload = JSON.parse(anyClaim.payload);
        } catch {
          payload = null;
        }
      } else if (anyClaim.payload && typeof anyClaim.payload === 'object') payload = anyClaim.payload;
      const id = payload && typeof payload === 'object' ? (payload.milestoneId ?? payload.milestone_id) : undefined;
      if (id !== undefined && id !== null) ids.add(String(id));
    }
  };

  const snapshot = (
    participant: string,
    payloadPlayerAddress: string | undefined,
    res: { success?: boolean; claims?: unknown[] } | null
  ): AnchorClaimsDebugSnapshot => {
    const success = Boolean(res && res.success);
    const claims = (res && Array.isArray(res.claims) ? res.claims : []) as any[];
    const platformDebug = res && typeof (res as any).debug !== 'undefined' ? (res as any).debug : undefined;
    const sample = claims.slice(0, 5).map((c) => {
      const anyClaim = c as any;
      const payloadJson =
        anyClaim && typeof anyClaim === 'object' && 'payloadJson' in anyClaim ? (anyClaim as any).payloadJson : undefined;
      const payload =
        anyClaim && typeof anyClaim === 'object' && 'payload' in anyClaim ? (anyClaim as any).payload : undefined;
      const payloadObj =
        payloadJson && typeof payloadJson === 'object'
          ? payloadJson
          : payload && typeof payload === 'object'
            ? payload
            : null;
      const payloadKeys = payloadObj && typeof payloadObj === 'object' ? Object.keys(payloadObj as any) : undefined;
      return {
        claimId: typeof anyClaim?.claimId === 'number' ? anyClaim.claimId : null,
        claimType: typeof anyClaim?.claimType === 'string' ? anyClaim.claimType : null,
        payloadKeys,
        payloadJson,
        payload,
      };
    });
    return {
      participant,
      payloadPlayerAddress,
      success,
      claimCount: claims.length,
      platformDebug,
      sample,
    };
  };

  const submittedBy = options?.submittedByAddress?.trim().startsWith('0x') ? options.submittedByAddress!.trim() : null;

  if (submittedBy && submittedBy !== address) {
    const resAdmin = await platformAnchorClient.listParticipantClaims(submittedBy, {
      limit: 200,
      payloadPlayerAddress: address,
      debug: true,
    });
    queries.push(snapshot(submittedBy, address, resAdmin as any));
    if (resAdmin.success && resAdmin.claims) extractIntoSet(resAdmin.claims);
  }

  const resPlayer = await platformAnchorClient.listParticipantClaims(address, { limit: 200, debug: true });
  queries.push(snapshot(address, undefined, resPlayer as any));
  if (resPlayer.success && resPlayer.claims) extractIntoSet(resPlayer.claims);

  return { ids: Array.from(ids), debug: { queries } };
}

export function evaluateCondition(
  stats: Record<string, unknown>,
  condition: MilestoneCondition
): boolean {
  const raw = stats[condition.metric];
  if (raw === undefined || raw === null) return false;
  const num = typeof raw === 'number' ? raw : Number(raw);
  if (Number.isNaN(num)) return false;
  switch (condition.operator) {
    case '>=': return num >= condition.value;
    case '>':  return num > condition.value;
    case '<=': return num <= condition.value;
    case '<':  return num < condition.value;
    case '==': return num === condition.value;
    case '!=': return num !== condition.value;
    default:   return false;
  }
}

/** Whether this Wake mark is set (value > 0). Prefer `isWakeMilestoneMarked` for clarity. */
export async function isAlreadyClaimedAnchor(address: string, milestoneId: string): Promise<boolean> {
  const mid = parseInt(String(milestoneId), 10);
  if (!Number.isFinite(mid) || mid < 1) return false;
  return isWakeMilestoneMarked(address, mid, undefined);
}

/** No-op: claimed state is written via Wake `submit_wake_stats` marks (game AchievementService). */
export function recordClaimed(
  _ecosystemId: string,
  _appId: string,
  _address: string,
  _milestoneId: string
): void {
  PlatformLogger.debug('Milestones: recordClaimed no-op; Wake mark is set via Channel hydroscope-submit-stats.');
}

/** @deprecated Use getClaimedMilestoneIdsFromAnchor when platform is configured. Returns [] (claims via Anchor). */
export function getClaimedMilestoneIds(
  _ecosystemId: string,
  _appId: string,
  _address: string
): string[] {
  return [];
}

export interface MilestoneClaimOptions {
  ecosystemId: string;
  appId: string;
  address: string;
  milestoneId: string;
  condition: MilestoneCondition;
  reward?: {
    tokenType?: 'SUI' | 'MEWS' | 'USDC';
    tokenAmount?: string;
    items?: Array<{ itemId: string; level: number; quantity: number }>;
  };
  statsOverride?: Record<string, unknown>;
  /** Ecosystem admin wallet address (game pays). Required when reward has tokens or items. */
  payerAddress?: string;
}

export interface MilestoneClaimResult {
  success: boolean;
  eligible?: boolean;
  alreadyClaimed?: boolean;
  /** Call POST /api/channel/batch with this to get unsigned tx(s). Only Channel builds. */
  channelBuildParams?: ChannelBuildParams;
  /** Ecosystem admin wallet address; caller signs and submits with this wallet. */
  payerAddress?: string;
  error?: string;
}

export async function claimMilestone(options: MilestoneClaimOptions): Promise<MilestoneClaimResult> {
  const { ecosystemId, appId, address, milestoneId, condition, reward, statsOverride, payerAddress } = options;

  const alreadyClaimed = await isAlreadyClaimedAnchor(address, milestoneId);
  if (alreadyClaimed) {
    return { success: false, alreadyClaimed: true, eligible: true };
  }

  const stats = statsOverride ?? (await getStats(ecosystemId, appId, address)) ?? {};
  const eligible = evaluateCondition(stats as Record<string, unknown>, condition);
  if (!eligible) {
    return { success: false, eligible: false };
  }

  if (!reward || (!reward.tokenAmount && (!reward.items || reward.items.length === 0))) {
    recordClaimed(ecosystemId, appId, address, milestoneId);
    return { success: true, eligible: true, channelBuildParams: undefined, payerAddress };
  }

  if (!payerAddress || !payerAddress.startsWith('0x')) {
    return {
      success: false,
      eligible: true,
      error: 'App/game admin wallet not configured for milestone reward payout. Set ECOSYSTEM_<id>_ADMIN_WALLET for your ecosystem. The app/game must fund this wallet; platform does not pay rewards.',
    };
  }

  const rewards = [{
    recipientAddress: address,
    tokenType: reward.tokenType,
    tokenAmount: reward.tokenAmount,
    items: reward.items,
  }];
  recordClaimed(ecosystemId, appId, address, milestoneId);
  return {
    success: true,
    eligible: true,
    channelBuildParams: {
      operationId: 'sustain-build-distribute',
      params: {
        rewards,
        adminWalletAddress: payerAddress,
        source: `claim:${milestoneId}`,
      },
    },
    payerAddress,
  };
}
