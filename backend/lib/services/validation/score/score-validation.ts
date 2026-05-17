/**
 * Score validation that mirrors the game's score_submission.move contract.
 * Used when submitting to platform without the game contract (platform-only path)
 * so we never send invalid scores to the platform.
 */
const MIN_DISTANCE = 35;
const MIN_SCORE_FOR_SUBMISSION = 100;
const MAX_COINS = 1000;
const POINTS_PER_ENEMY_BASE = 15;
const POINTS_PER_BOSS_BASE = 5000;

export interface ScoreDataForValidation {
  score: number;
  distance: number;
  coins: number;
  bossesDefeated: number;
  enemiesDefeated: number;
  longestCoinStreak: number;
  bossTiers?: number[];
  enemyTypes?: number[];
  bossHits?: number;
}

/**
 * Validates score data using the same rules as the game contract.
 * @throws Error if validation fails
 */
export function validateScoreData(scoreData: ScoreDataForValidation): void {
  const score = Math.round(scoreData.score);
  const distance = Math.round(scoreData.distance);
  const coins = Math.round(scoreData.coins);
  const bossesDefeated = Math.round(scoreData.bossesDefeated);
  const enemiesDefeated = Math.round(scoreData.enemiesDefeated);
  const longestCoinStreak = Math.round(scoreData.longestCoinStreak);

  if (distance < MIN_DISTANCE) {
    throw new Error(`Score validation failed: distance ${distance} is below minimum ${MIN_DISTANCE}`);
  }
  if (score < MIN_SCORE_FOR_SUBMISSION) {
    throw new Error(`Score validation failed: score ${score} is below minimum ${MIN_SCORE_FOR_SUBMISSION}`);
  }
  if (coins > MAX_COINS) {
    throw new Error(`Score validation failed: coins ${coins} exceeds maximum ${MAX_COINS}`);
  }
  if (longestCoinStreak > coins) {
    throw new Error(`Score validation failed: longestCoinStreak ${longestCoinStreak} exceeds coins ${coins}`);
  }

  const bossTiers = Array.isArray(scoreData.bossTiers) ? scoreData.bossTiers.map((t) => Math.round(t)) : [];
  const enemyTypes = Array.isArray(scoreData.enemyTypes) ? scoreData.enemyTypes.map((t) => Math.round(t)) : [];
  const bossHits = Math.round(scoreData.bossHits ?? 0);

  const enemyScoreComponent =
    enemyTypes.length === enemiesDefeated
      ? enemyTypes.reduce((sum, type) => sum + POINTS_PER_ENEMY_BASE * type, 0)
      : enemiesDefeated * POINTS_PER_ENEMY_BASE;
  const bossScoreComponent =
    bossTiers.length === bossesDefeated
      ? bossTiers.reduce((sum, tier) => sum + POINTS_PER_BOSS_BASE * tier, 0)
      : bossesDefeated * POINTS_PER_BOSS_BASE;
  const expectedScore = enemyScoreComponent + bossScoreComponent + bossHits;

  if (expectedScore > 0 && score < Math.floor((expectedScore * 90) / 100)) {
    throw new Error(
      `Score validation failed: score ${score} is below 90% of expected ${expectedScore}`
    );
  }
  if (score > expectedScore * 20) {
    throw new Error(
      `Score validation failed: score ${score} exceeds 20x expected ${expectedScore}`
    );
  }
}
