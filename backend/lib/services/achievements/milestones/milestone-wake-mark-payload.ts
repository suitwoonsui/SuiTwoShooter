// ==========================================
// Wake mark row as flat u64 stat keys (Wake::submit_wake_stats contract shape).
// Primary mark: wake_mark_<id> = 1 active, 0 revoked. Auxiliary keys carry timestamps,
// optional app-defined u64 slots, packed addresses, and digest limbs (platform-neutral names).
// ==========================================

import { fromBase58 } from '@mysten/bcs';

import { WAKE_MARK_KEY_PREFIX } from '@/lib/services/achievements/milestones/milestones-service';

export const MILESTONE_WAKE_REWARD_SCHEMA = 'milestones_wake_v1';

/** Suffixes under `wake_mark_<n>` — must satisfy Aqueduct `isWakeMarkRowKey` (lowercase alnum + underscore). */
export const WAKE_MARK_AUX_U64_0_SUFFIX = 'aux_u64_0';
export const WAKE_MARK_AUX_U64_1_SUFFIX = 'aux_u64_1';

function wakeRowBaseKey(milestoneId: number): string {
  return `${WAKE_MARK_KEY_PREFIX}${Math.floor(milestoneId)}`;
}

function normalizeAddrHex(addr: string): string {
  const h = addr.trim().replace(/^0x/i, '');
  return h.padStart(64, '0').slice(0, 64);
}

/** Eight u32 limbs (as u64 on-chain) covering the 32-byte Sui address. */
function suiAddressToChunkStats(milestoneId: number, role: 'last_actor' | 'player', addr: string): Record<string, number> {
  const hex = normalizeAddrHex(addr);
  const base = wakeRowBaseKey(milestoneId);
  const out: Record<string, number> = {};
  for (let i = 0; i < 8; i++) {
    const slice = hex.slice(i * 8, i * 8 + 8);
    out[`${base}_${role}_b${i}`] = parseInt(slice, 16) >>> 0;
  }
  return out;
}

/**
 * Parse a Sui transaction digest string to exactly 32 bytes (canonical hash bytes).
 * Accepts Base58 (typical RPC `digest`) or 64 hex chars (optional `0x` prefix).
 * Empty string → 32 zero bytes. Unrecognized form → UTF-8 padded/truncated to 32 bytes (last resort).
 */
export function transactionDigestStringTo32Bytes(digest: string): Uint8Array {
  const s = digest.trim();
  const zeros = new Uint8Array(32);
  if (!s) return zeros;

  const hex = s.startsWith('0x') || s.startsWith('0X') ? s.slice(2) : s;
  if (/^[0-9a-fA-F]{64}$/.test(hex)) {
    const out = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
      out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    }
    return out;
  }

  try {
    const decoded = fromBase58(s);
    if (decoded.length === 32) return Uint8Array.from(decoded);
  } catch {
    // fall through
  }

  const raw = new TextEncoder().encode(s);
  const padded = new Uint8Array(32);
  padded.set(raw.subarray(0, 32));
  return padded;
}

/** Pack exactly 32 bytes into eight big-endian u32 limbs stored as u64 stats (`digest_b0`…`digest_b7`). */
function digestBytesToChunkStats(milestoneId: number, bytes32: Uint8Array): Record<string, number> {
  const padded = new Uint8Array(32);
  padded.set(bytes32.subarray(0, 32));
  const base = wakeRowBaseKey(milestoneId);
  const out: Record<string, number> = {};
  for (let i = 0; i < 8; i++) {
    let w = 0;
    for (let j = 0; j < 4; j++) w = (w << 8) | padded[i * 4 + j]!;
    out[`${base}_digest_b${i}`] = w >>> 0;
  }
  return out;
}

function digestStringToChunkStats(milestoneId: number, digest: string): Record<string, number> {
  return digestBytesToChunkStats(milestoneId, transactionDigestStringTo32Bytes(digest));
}

function rewardFingerprint(credits: number, items: Array<{ itemId: string; level: number; quantity: number }>): number {
  const norm = [...items]
    .map((it) => ({ itemId: it.itemId, level: it.level, quantity: it.quantity }))
    .sort((a, b) => a.itemId.localeCompare(b.itemId) || a.level - b.level || a.quantity - b.quantity);
  const s = `${MILESTONE_WAKE_REWARD_SCHEMA}|${credits}|${JSON.stringify(norm)}`;
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/** Full Wake row for a completed claim (metadata + optional linkage digest / aux u64s) in one `submit_wake_stats` batch. */
export function buildMilestoneWakeCompleteClaimStats(params: {
  milestoneId: number;
  playerAddress: string;
  lastActorAddress: string;
  credits: number;
  items: Array<{ itemId: string; level: number; quantity: number }>;
  nowMs?: number;
  /** Optional app-defined u64 ref (e.g. future provider ids); omit to leave cleared. */
  auxU64_0?: number | null;
  auxU64_1?: number | null;
  /** Correlation digest (e.g. reward payout execute digest); 32-byte digest packed into `digest_b*` (Base58 or hex). */
  linkageDigest?: string;
}): Record<string, number> {
  const initial = buildMilestoneWakeInitialClaimStats({
    milestoneId: params.milestoneId,
    playerAddress: params.playerAddress,
    lastActorAddress: params.lastActorAddress,
    credits: params.credits,
    items: params.items,
    nowMs: params.nowMs,
  });
  const link = buildMilestoneWakeLinkageStats({
    milestoneId: params.milestoneId,
    updatedMs: params.nowMs ?? Date.now(),
    auxU64_0: params.auxU64_0 ?? undefined,
    auxU64_1: params.auxU64_1 ?? undefined,
    linkageDigest: params.linkageDigest,
  });
  return { ...initial, ...link };
}

/** Building block: claimed state + metadata (aux slots zero until linkage merges). */
export function buildMilestoneWakeInitialClaimStats(params: {
  milestoneId: number;
  playerAddress: string;
  lastActorAddress: string;
  credits: number;
  items: Array<{ itemId: string; level: number; quantity: number }>;
  nowMs?: number;
}): Record<string, number> {
  const { milestoneId, playerAddress, lastActorAddress, credits, items } = params;
  const now = params.nowMs ?? Date.now();
  const id = Math.floor(milestoneId);
  const base = wakeRowBaseKey(id);
  return {
    [base]: 1,
    [`${base}_created_ms`]: now,
    [`${base}_updated_ms`]: now,
    [`${base}_${WAKE_MARK_AUX_U64_0_SUFFIX}`]: 0,
    [`${base}_${WAKE_MARK_AUX_U64_1_SUFFIX}`]: 0,
    [`${base}_reward_hash`]: rewardFingerprint(credits, items),
    ...suiAddressToChunkStats(id, 'last_actor', lastActorAddress),
    ...suiAddressToChunkStats(id, 'player', playerAddress),
    ...digestStringToChunkStats(id, ''),
  };
}

/** Optional linkage: aux u64 slots + digest limbs (merged into `buildMilestoneWakeCompleteClaimStats` or a follow-up tx). */
export function buildMilestoneWakeLinkageStats(params: {
  milestoneId: number;
  updatedMs?: number;
  auxU64_0?: number;
  auxU64_1?: number;
  linkageDigest?: string;
}): Record<string, number> {
  const id = Math.floor(params.milestoneId);
  const base = wakeRowBaseKey(id);
  const now = params.updatedMs ?? Date.now();
  const out: Record<string, number> = {
    [base]: 1,
    [`${base}_updated_ms`]: now,
  };
  if (params.auxU64_0 != null && Number.isFinite(params.auxU64_0)) {
    out[`${base}_${WAKE_MARK_AUX_U64_0_SUFFIX}`] = Math.max(0, Math.floor(params.auxU64_0));
  }
  if (params.auxU64_1 != null && Number.isFinite(params.auxU64_1)) {
    out[`${base}_${WAKE_MARK_AUX_U64_1_SUFFIX}`] = Math.max(0, Math.floor(params.auxU64_1));
  }
  if (params.linkageDigest) {
    Object.assign(out, digestStringToChunkStats(id, params.linkageDigest));
  }
  return out;
}

/** Revoke (unclaim): primary state 0; clears aux and digest limbs. */
export function buildMilestoneWakeRevokeStats(milestoneId: number, nowMs?: number): Record<string, number> {
  const id = Math.floor(milestoneId);
  const base = wakeRowBaseKey(id);
  const now = nowMs ?? Date.now();
  return {
    [base]: 0,
    [`${base}_updated_ms`]: now,
    [`${base}_${WAKE_MARK_AUX_U64_0_SUFFIX}`]: 0,
    [`${base}_${WAKE_MARK_AUX_U64_1_SUFFIX}`]: 0,
    ...digestStringToChunkStats(id, ''),
  };
}
