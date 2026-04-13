// ==========================================
// Game: Milestones Service (Sustain Rain — definition-driven rewards)
// Definitions from Aquifer; stats from Hydroscope; claims via Anchor (platform). No in-memory claim storage.
// ==========================================

import { platformStatsClient, platformMilestonesClient, platformAnchorClient } from '@/lib/services/platform/client/platform-client';
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
    const type = (c.claimType ?? '').toUpperCase();
    if (type !== MILESTONE_CLAIM_TYPE && type !== 'MILESTONE_CLAIM') continue;
    const payload = c.payload && typeof c.payload === 'object' ? c.payload : {};
    const id = payload.definitionId ?? payload.milestoneId ?? payload.definition_id ?? payload.milestone_id;
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

/**
 * Return claimed milestone IDs for a player from Anchor (platform). Use when platform is configured.
 * Filters claims by claimType === MILESTONE_COMPLETION and extracts definitionId from payload.
 * When submittedByAddress is set (game admin), lists claims for that participant with payloadPlayerAddress = address so game-submitted claims are found.
 */
export async function getClaimedMilestoneIdsFromAnchor(
  address: string,
  options?: GetClaimedMilestoneIdsFromAnchorOptions
): Promise<string[]> {
  const participant = options?.submittedByAddress?.trim().startsWith('0x') ? options.submittedByAddress!.trim() : address;
  const listOptions = { limit: 200, ...(participant !== address ? { payloadPlayerAddress: address } : {}) };
  const res = await platformAnchorClient.listParticipantClaims(participant, listOptions);
  if (!res.success || !res.claims) return [];
  const ids: string[] = [];
  for (const c of res.claims) {
    const type = (c.claimType ?? '').toUpperCase();
    if (type !== MILESTONE_CLAIM_TYPE && type !== 'MILESTONE_CLAIM') continue;
    const payload = c.payload && typeof c.payload === 'object' ? c.payload : {};
    const id = payload.definitionId ?? payload.milestoneId ?? payload.definition_id ?? payload.milestone_id;
    if (id !== undefined && id !== null) ids.push(String(id));
  }
  return ids;
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

/** Claims are stored via Anchor; no in-memory set. Use getClaimedMilestoneIdsFromAnchor for list. */
export async function isAlreadyClaimedAnchor(address: string, milestoneId: string): Promise<boolean> {
  const ids = await getClaimedMilestoneIdsFromAnchor(address);
  return ids.includes(String(milestoneId));
}

/** No-op: claims are recorded by submitting Anchor claim tx (platform POST /api/anchor/claims → sign & submit). */
export function recordClaimed(
  _ecosystemId: string,
  _appId: string,
  _address: string,
  _milestoneId: string
): void {
  PlatformLogger.debug('Milestones: recordClaimed no-op; record via Anchor submit_claim.');
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
