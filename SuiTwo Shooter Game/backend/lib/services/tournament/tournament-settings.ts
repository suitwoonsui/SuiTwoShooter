// ==========================================
// Tournament settings (game-admin configurable)
// Phase 2: Grace period source of truth is Helm event_distribution_config; fallback to data/tournament-settings.json.
// ==========================================

import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { PlatformLogger } from '@/lib/services/platform/logging/platform-logger';
import { platformAppConfigClient } from '@/lib/services/platform/client/platform-client';

const DEFAULT_GRACE_PERIOD_MS = 60 * 60 * 1000; // 1 hour

export interface TournamentSettings {
  /** Grace period after tournament end before distribution is allowed / score submission is rejected (ms). */
  gracePeriodMs: number;
}

const SETTINGS_FILENAME = 'tournament-settings.json';

function getSettingsPath(): string {
  const dataDir = process.env.TOURNAMENT_SETTINGS_DIR ?? join(process.cwd(), 'data');
  return join(dataDir, SETTINGS_FILENAME);
}

let memoryCache: TournamentSettings | null = null;

/**
 * Resolve grace period (ms): platform Helm event_distribution_config first, then file, then default.
 */
async function resolveGracePeriodMs(): Promise<number> {
  try {
    const res = await platformAppConfigClient.getEventDistributionConfig();
    if (res.success && res.eventDistributionConfig?.grace_period_ms != null) {
      const ms = Number(res.eventDistributionConfig.grace_period_ms);
      if (Number.isFinite(ms) && ms >= 0) return ms;
    }
  } catch {
    // Platform unavailable or not configured; use file or default
  }
  const path = getSettingsPath();
  try {
    const raw = await readFile(path, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<TournamentSettings>;
    if (typeof parsed.gracePeriodMs === 'number' && parsed.gracePeriodMs >= 0) return parsed.gracePeriodMs;
  } catch {
    /* ignore */
  }
  return DEFAULT_GRACE_PERIOD_MS;
}

/**
 * Get tournament settings. Grace period from platform (Helm) first, then file; defaults to 1 hour.
 */
export async function getTournamentSettings(): Promise<TournamentSettings> {
  if (memoryCache) return memoryCache;
  const gracePeriodMs = await resolveGracePeriodMs();
  memoryCache = { gracePeriodMs };
  return memoryCache;
}

/**
 * Get grace period in milliseconds. Platform Helm first, then file, then default.
 */
export async function getTournamentGracePeriodMs(): Promise<number> {
  const s = await getTournamentSettings();
  return s.gracePeriodMs;
}

/**
 * Update tournament settings (e.g. from admin PUT). Persists to file and invalidates cache.
 */
export async function setTournamentSettings(settings: Partial<TournamentSettings>): Promise<TournamentSettings> {
  const current = await getTournamentSettings();
  const gracePeriodMs =
    typeof settings.gracePeriodMs === 'number' && settings.gracePeriodMs >= 0
      ? settings.gracePeriodMs
      : current.gracePeriodMs;
  const next: TournamentSettings = { gracePeriodMs };
  const path = getSettingsPath();
  const dataDir = process.env.TOURNAMENT_SETTINGS_DIR ?? join(process.cwd(), 'data');
  await mkdir(dataDir, { recursive: true });
  await writeFile(path, JSON.stringify(next, null, 2), 'utf-8');
  memoryCache = next;
  PlatformLogger.info('Tournament settings updated', { gracePeriodMs });
  return next;
}

/** Invalidate in-memory cache (e.g. after external file edit). */
export function invalidateTournamentSettingsCache(): void {
  memoryCache = null;
}
