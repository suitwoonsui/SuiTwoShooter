/**
 * Replay schema for score verification.
 * Client records events during a run and sends the replay with score submission.
 * Server recomputes score from the replay and accepts only if it matches (or uses computed score only).
 */

export const REPLAY_SCHEMA_VERSION = 1;

/** Single event in the replay log. Order matters. */
export type ReplayEvent =
  | { type: 'distance'; total: number }
  | { type: 'distance_tick'; delta: number }
  | { type: 'coin' }
  | { type: 'enemy_kill'; enemyType: number }
  | { type: 'boss_hit' }
  | { type: 'boss_kill'; tier: number };

export interface ReplayPayload {
  /** Schema version for future compatibility. */
  version: number;
  /** Ordered list of events. */
  events: ReplayEvent[];
}

/** Result of computing score from a replay. Matches ScoreDataForValidation shape. */
export interface ReplayComputedScore {
  score: number;
  distance: number;
  coins: number;
  bossesDefeated: number;
  enemiesDefeated: number;
  longestCoinStreak: number;
  bossTiers: number[];
  enemyTypes: number[];
  bossHits: number;
}
