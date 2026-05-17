/**
 * Rate limiting and anomaly checks for score submission (scores/submit and tournaments submit-score).
 * In-memory store; per-instance only (no Redis). Use for single-instance or accept best-effort in multi-instance.
 */

import type { ReplayPayload } from './replay-schema';

// --- Rate limit (per player address) ---
const RATE_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_MAX_SUBMISSIONS = 10;  // max submissions per address per window

const submissionTimestampsByAddress = new Map<string, number[]>();

function pruneOldTimestamps(timestamps: number[], windowMs: number): number[] {
  const cutoff = Date.now() - windowMs;
  return timestamps.filter((t) => t > cutoff);
}

/**
 * Check if the address is over the submission rate limit. Call before processing submit.
 * @throws Error if over limit
 */
export function checkScoreSubmitRateLimit(playerAddress: string): void {
  const key = playerAddress.toLowerCase().trim();
  let timestamps = submissionTimestampsByAddress.get(key) ?? [];
  timestamps = pruneOldTimestamps(timestamps, RATE_WINDOW_MS);
  submissionTimestampsByAddress.set(key, timestamps);

  if (timestamps.length >= RATE_MAX_SUBMISSIONS) {
    throw new Error(
      `Too many score submissions. Please wait before submitting again (max ${RATE_MAX_SUBMISSIONS} per minute).`
    );
  }
}

/**
 * Record a successful score submission for rate limiting. Call after a submit is accepted (before platform call is fine).
 */
export function recordScoreSubmit(playerAddress: string): void {
  const key = playerAddress.toLowerCase().trim();
  const now = Date.now();
  let timestamps = submissionTimestampsByAddress.get(key) ?? [];
  timestamps = pruneOldTimestamps(timestamps, RATE_WINDOW_MS);
  timestamps.push(now);
  submissionTimestampsByAddress.set(key, timestamps);
}

// --- Anomaly checks (computed score + replay) ---
const MAX_REPLAY_EVENTS = 100_000;   // suspiciously large replay
const MAX_SCORE_CAP = 10_000_000;    // sanity cap (above normal play)
const MAX_DISTANCE_CAP = 500_000;    // sanity cap

export interface AnomalyInput {
  score: number;
  distance: number;
  coins: number;
  replayEventCount: number;
}

/**
 * Run anomaly checks on computed score and replay size.
 * @returns { allowed: true } or { allowed: false, reason: string }
 */
export function checkScoreSubmitAnomaly(input: AnomalyInput): { allowed: true } | { allowed: false; reason: string } {
  if (input.replayEventCount > MAX_REPLAY_EVENTS) {
    return {
      allowed: false,
      reason: `Replay event count (${input.replayEventCount}) exceeds maximum allowed (${MAX_REPLAY_EVENTS}).`,
    };
  }
  if (input.score > MAX_SCORE_CAP) {
    return {
      allowed: false,
      reason: `Score (${input.score}) exceeds maximum allowed (${MAX_SCORE_CAP}).`,
    };
  }
  if (input.distance > MAX_DISTANCE_CAP) {
    return {
      allowed: false,
      reason: `Distance (${input.distance}) exceeds maximum allowed (${MAX_DISTANCE_CAP}).`,
    };
  }
  return { allowed: true };
}

/**
 * Run rate limit and anomaly checks for a score submission. Throw if any check fails.
 */
export function guardScoreSubmit(
  playerAddress: string,
  computed: { score: number; distance: number; coins: number },
  replay: ReplayPayload
): void {
  checkScoreSubmitRateLimit(playerAddress);
  const anomaly = checkScoreSubmitAnomaly({
    score: computed.score,
    distance: computed.distance,
    coins: computed.coins,
    replayEventCount: Array.isArray(replay.events) ? replay.events.length : 0,
  });
  if (!anomaly.allowed) {
    throw new Error(anomaly.reason);
  }
}
