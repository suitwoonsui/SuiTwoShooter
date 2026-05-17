/**
 * Replay scorer: computes score and stats from a replay event log.
 * Uses the same scoring rules as score-validation.ts / game contract.
 */

import type { ReplayPayload, ReplayComputedScore, ReplayEvent } from './replay-schema';

const POINTS_PER_ENEMY_BASE = 15;
const POINTS_PER_BOSS_BASE = 5000;

function isReplayEvent(e: unknown): e is ReplayEvent {
  if (!e || typeof e !== 'object' || !('type' in e) || typeof (e as { type: unknown }).type !== 'string') return false;
  const t = (e as { type: string }).type;
  if (t === 'distance') return 'total' in e && typeof (e as { total: unknown }).total === 'number';
  if (t === 'distance_tick') return 'delta' in e && typeof (e as { delta: unknown }).delta === 'number';
  if (t === 'coin') return true;
  if (t === 'enemy_kill') return 'enemyType' in e && typeof (e as { enemyType: unknown }).enemyType === 'number';
  if (t === 'boss_hit') return true;
  if (t === 'boss_kill') return 'tier' in e && typeof (e as { tier: unknown }).tier === 'number';
  return false;
}

/**
 * Compute score and stats from a replay. Deterministic.
 * @throws Error if replay is invalid or empty
 */
export function computeScoreFromReplay(replay: ReplayPayload): ReplayComputedScore {
  if (!replay || typeof replay !== 'object' || !Array.isArray(replay.events)) {
    throw new Error('Invalid replay: missing or invalid events array');
  }

  let distanceFromTicks = 0;
  let finalDistance: number | null = null;
  let coins = 0;
  let currentCoinStreak = 0;
  let longestCoinStreak = 0;
  const enemyTypes: number[] = [];
  const bossTiers: number[] = [];
  let bossHits = 0;

  for (const e of replay.events) {
    if (!isReplayEvent(e)) continue;

    switch (e.type) {
      case 'distance':
        finalDistance = Math.round(e.total);
        break;
      case 'distance_tick':
        distanceFromTicks += Math.round(e.delta);
        break;
      case 'coin':
        coins++;
        currentCoinStreak++;
        longestCoinStreak = Math.max(longestCoinStreak, currentCoinStreak);
        break;
      case 'enemy_kill':
        enemyTypes.push(Math.round(e.enemyType));
        currentCoinStreak = 0;
        break;
      case 'boss_hit':
        bossHits++;
        currentCoinStreak = 0;
        break;
      case 'boss_kill':
        bossTiers.push(Math.round(e.tier));
        currentCoinStreak = 0;
        break;
    }
  }

  const distance = finalDistance ?? distanceFromTicks;
  const enemiesDefeated = enemyTypes.length;
  const bossesDefeated = bossTiers.length;

  const enemyScoreComponent =
    enemyTypes.length > 0
      ? enemyTypes.reduce((sum, type) => sum + POINTS_PER_ENEMY_BASE * type, 0)
      : 0;
  const bossScoreComponent =
    bossTiers.length > 0
      ? bossTiers.reduce((sum, tier) => sum + POINTS_PER_BOSS_BASE * tier, 0)
      : 0;
  const score = Math.round(enemyScoreComponent + bossScoreComponent + bossHits);

  return {
    score,
    distance,
    coins,
    bossesDefeated,
    enemiesDefeated,
    longestCoinStreak,
    bossTiers,
    enemyTypes,
    bossHits,
  };
}
