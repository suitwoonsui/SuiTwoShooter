/**
 * Replay Recorder - Records game events for server-side score verification.
 * Events match the backend replay schema (replay-schema.ts).
 * Server computes score from replay; do not send raw scoreData.
 */

const REPLAY_VERSION = 1;

let events = [];

function startRun() {
  events = [];
}

function recordDistanceTick(delta) {
  if (typeof delta !== 'number' || !Number.isFinite(delta)) return;
  events.push({ type: 'distance_tick', delta });
}

function recordCoin() {
  events.push({ type: 'coin' });
}

function recordEnemyKill(enemyType) {
  const t = typeof enemyType === 'number' && Number.isFinite(enemyType) ? enemyType : 1;
  events.push({ type: 'enemy_kill', enemyType: t });
}

function recordBossHit() {
  events.push({ type: 'boss_hit' });
}

function recordBossKill(tier) {
  const t = typeof tier === 'number' && Number.isFinite(tier) ? tier : 1;
  events.push({ type: 'boss_kill', tier: t });
}

function getReplay() {
  return { version: REPLAY_VERSION, events: events.slice() };
}

const ReplayRecorder = {
  startRun,
  recordDistanceTick,
  recordCoin,
  recordEnemyKill,
  recordBossHit,
  recordBossKill,
  getReplay,
  REPLAY_VERSION,
};

if (typeof window !== 'undefined') {
  window.ReplayRecorder = ReplayRecorder;
}
