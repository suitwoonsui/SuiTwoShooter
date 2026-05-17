// ==========================================
// Single in-memory cache for non-user-specific data (store, tournaments, game-config,
// milestone definitions, leaderboard). Menu bootstrap and public API routes read/write here.
// TTLs align with former bootstrap slices; override with PUBLIC_DATA_*_TTL_MS (milliseconds).
// ==========================================

import { PlatformLogger } from '@/lib/services/platform/logging/platform-logger';
import { buildPlatformCallOptions } from '@/lib/services/platform/client/platform-client';
import { fetchNormalizedMilestoneDefinitions } from '@/lib/services/achievements/milestones/milestone-definitions-public-load';
import type { NormalizedMilestoneDefinitions } from '@/lib/services/achievements/milestones/milestone-definitions-public-load';
import {
  fetchCompleteStoreCatalogWithRetry,
  shouldAcceptAsNewSnapshot,
  type StoreCatalogPayload,
} from '@/lib/services/store/terminal-store-catalog';
import { loadGameConfigApiResponse } from '@/lib/services/config/game-config-public-response';
import { loadLeaderboardApiResponse } from '@/lib/services/stats/leaderboard-public-load';
import { getTournamentService } from '@/lib/services/tournament/core/tournament-service';
import {
  deleteStoreCatalogKvSnapshot,
  isStoreCatalogKvConfigured,
  readStoreCatalogKvSnapshot,
  writeStoreCatalogKvSnapshot,
} from '@/lib/cache/store-catalog-kv-sync';

function readMsFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function readAchievementMilestoneDefinitionsTtlMs(): number {
  return readMsFromEnv('ACHIEVEMENT_MILESTONE_DEFINITIONS_CACHE_TTL_MS', 24 * 60 * 60 * 1000);
}

// Store catalog changes infrequently; keep a longer default TTL. Override with PUBLIC_DATA_STORE_CATALOG_TTL_MS if needed.
export const PUBLIC_STORE_CATALOG_TTL_MS = readMsFromEnv('PUBLIC_DATA_STORE_CATALOG_TTL_MS', 60 * 60 * 1000);
export const PUBLIC_TOURNAMENTS_TTL_MS = readMsFromEnv('PUBLIC_DATA_TOURNAMENTS_TTL_MS', 2 * 60 * 1000);
// Game config rarely changes; keep a long default TTL. Override with PUBLIC_DATA_GAME_CONFIG_TTL_MS if needed.
export const PUBLIC_GAME_CONFIG_TTL_MS = readMsFromEnv('PUBLIC_DATA_GAME_CONFIG_TTL_MS', 6 * 60 * 60 * 1000);
export const PUBLIC_MILESTONE_DEFINITIONS_TTL_MS = readMsFromEnv(
  'PUBLIC_DATA_MILESTONE_DEFINITIONS_TTL_MS',
  readAchievementMilestoneDefinitionsTtlMs()
);
export const PUBLIC_LEADERBOARD_TTL_MS = readMsFromEnv('PUBLIC_DATA_LEADERBOARD_TTL_MS', 2 * 60 * 1000);

/** Default limit for menu bootstrap leaderboard slice (keep in sync with bootstrap route). */
// IMPORTANT: use the same cap as `/api/leaderboard` so opening the modal does not need a second fetch.
export const PUBLIC_LEADERBOARD_BOOTSTRAP_LIMIT = 200;

// --- Store catalog ---

let storeCatalogEntry: { at: number; data: StoreCatalogPayload } | null = null;
let storeCatalogInFlight: Promise<StoreCatalogPayload> | null = null;
/** Bumped when the merged catalog snapshot must be discarded (invalidate / notify / forceRefresh). */
let storeCatalogLastInvalidatedAt = 0;

export async function getOrLoadStoreCatalogPayload(options?: {
  forceRefresh?: boolean;
}): Promise<StoreCatalogPayload> {
  const kvOn = isStoreCatalogKvConfigured();

  if (options?.forceRefresh) {
    invalidateStoreCatalogPublicCache();
  }

  const now = Date.now();

  if (!options?.forceRefresh && kvOn) {
    const fromKv = await readStoreCatalogKvSnapshot(PUBLIC_STORE_CATALOG_TTL_MS);
    if (fromKv) {
      storeCatalogEntry = { at: now, data: fromKv };
      PlatformLogger.debug('[PUBLIC CACHE] store catalog kv hit');
      return fromKv;
    }
    storeCatalogEntry = null;
  }

  if (!options?.forceRefresh && !kvOn && storeCatalogEntry && now - storeCatalogEntry.at < PUBLIC_STORE_CATALOG_TTL_MS) {
    PlatformLogger.debug('[PUBLIC CACHE] store catalog hit');
    return storeCatalogEntry.data;
  }

  if (storeCatalogInFlight) return storeCatalogInFlight;

  storeCatalogInFlight = (async () => {
    try {
      let fetchStartedAt = Date.now();
      let fresh = await fetchCompleteStoreCatalogWithRetry();
      if (fetchStartedAt < storeCatalogLastInvalidatedAt) {
        fetchStartedAt = Date.now();
        fresh = await fetchCompleteStoreCatalogWithRetry();
      }
      const mayWriteKv = fetchStartedAt >= storeCatalogLastInvalidatedAt;

      const prev = storeCatalogEntry?.data ?? null;
      let served: StoreCatalogPayload;
      if (!prev) {
        served = fresh;
        storeCatalogEntry = { at: Date.now(), data: served };
      } else if (shouldAcceptAsNewSnapshot(fresh, prev)) {
        served = fresh;
        storeCatalogEntry = { at: Date.now(), data: served };
      } else {
        served = prev;
      }

      if (kvOn && mayWriteKv) {
        try {
          await writeStoreCatalogKvSnapshot(served, PUBLIC_STORE_CATALOG_TTL_MS);
        } catch (e) {
          PlatformLogger.warn('[PUBLIC CACHE] store catalog KV write failed', {
            message: e instanceof Error ? e.message : String(e),
          });
        }
      }

      return served;
    } catch (e) {
      if (storeCatalogEntry) return storeCatalogEntry.data;
      throw e;
    } finally {
      storeCatalogInFlight = null;
    }
  })();
  return storeCatalogInFlight;
}

export function invalidateStoreCatalogPublicCache(): void {
  storeCatalogEntry = null;
  storeCatalogInFlight = null;
  storeCatalogLastInvalidatedAt = Date.now();
}

/**
 * Call after any admin change that affects the merged public store catalog (definitions, stockroom, prices).
 * Deletes the cross-instance KV snapshot (if configured) then clears this instance’s in-memory catalog cache.
 */
export async function notifyPublicStoreCatalogChanged(meta?: { reason?: string }): Promise<void> {
  PlatformLogger.info('[PUBLIC CACHE] store catalog changed', meta ?? {});
  await deleteStoreCatalogKvSnapshot();
  invalidateStoreCatalogPublicCache();
}

// --- Tournaments (anonymous list only; same branches as GET /api/tournaments) ---

export type TournamentListBranch = 'activeAndUpcoming' | 'upcoming' | 'active';

const tournamentEntries = new Map<
  TournamentListBranch,
  { at: number; data: { success: boolean; tournaments: unknown[] } }
>();
const tournamentInFlight = new Map<TournamentListBranch, Promise<{ success: boolean; tournaments: unknown[] }>>();
const tournamentFetchGen = new Map<TournamentListBranch, number>();

export async function getOrLoadTournamentsPublicList(
  branch: TournamentListBranch,
  options?: { forceRefresh?: boolean }
): Promise<{ success: boolean; tournaments: unknown[] }> {
  if (options?.forceRefresh) {
    tournamentEntries.delete(branch);
    tournamentFetchGen.set(branch, (tournamentFetchGen.get(branch) ?? 0) + 1);
    tournamentInFlight.delete(branch);
  }
  const genAtStart = tournamentFetchGen.get(branch) ?? 0;
  const now = Date.now();
  const hit = tournamentEntries.get(branch);
  if (hit && now - hit.at < PUBLIC_TOURNAMENTS_TTL_MS) {
    PlatformLogger.debug('[PUBLIC CACHE] tournaments hit', { branch });
    return hit.data;
  }
  const inflight = tournamentInFlight.get(branch);
  if (inflight) return inflight;

  const p = (async () => {
    try {
      const tournamentService = getTournamentService();
      const forceRefresh = Boolean(options?.forceRefresh);
      let tournaments: unknown[] = [];
      if (branch === 'upcoming') {
        tournaments = await tournamentService.getUpcomingTournaments(forceRefresh);
      } else if (branch === 'active') {
        tournaments = await tournamentService.getActiveTournamentsOnly(forceRefresh);
      } else {
        tournaments = await tournamentService.getActiveTournaments(forceRefresh);
      }
      if ((tournamentFetchGen.get(branch) ?? 0) !== genAtStart) {
        const stale = tournamentEntries.get(branch);
        return stale?.data ?? { success: true as const, tournaments: [] as unknown[] };
      }
      const data = { success: true as const, tournaments };
      tournamentEntries.set(branch, { at: Date.now(), data });
      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (
        errorMessage.includes('Tournament registry not configured') ||
        errorMessage.includes('not configured')
      ) {
        if ((tournamentFetchGen.get(branch) ?? 0) !== genAtStart) {
          const stale = tournamentEntries.get(branch);
          return stale?.data ?? { success: true as const, tournaments: [] as unknown[] };
        }
        const data = { success: true as const, tournaments: [] as unknown[] };
        tournamentEntries.set(branch, { at: Date.now(), data });
        return data;
      }
      throw error;
    } finally {
      tournamentInFlight.delete(branch);
    }
  })();
  tournamentInFlight.set(branch, p);
  return p;
}

export function invalidateTournamentsPublicCache(branch?: TournamentListBranch): void {
  if (branch) {
    tournamentEntries.delete(branch);
    tournamentFetchGen.set(branch, (tournamentFetchGen.get(branch) ?? 0) + 1);
    tournamentInFlight.delete(branch);
    return;
  }
  tournamentEntries.clear();
  tournamentInFlight.clear();
  for (const b of ['activeAndUpcoming', 'upcoming', 'active'] as TournamentListBranch[]) {
    tournamentFetchGen.set(b, (tournamentFetchGen.get(b) ?? 0) + 1);
  }
}

// --- Game config (successful payloads only) ---

let gameConfigEntry: { at: number; data: Record<string, unknown> } | null = null;
let gameConfigInFlight: Promise<Record<string, unknown>> | null = null;

export async function getOrLoadGameConfigResponse(options?: {
  forceRefresh?: boolean;
}): Promise<Record<string, unknown>> {
  if (options?.forceRefresh) {
    gameConfigEntry = null;
  }
  const now = Date.now();
  if (gameConfigEntry && now - gameConfigEntry.at < PUBLIC_GAME_CONFIG_TTL_MS) {
    PlatformLogger.debug('[PUBLIC CACHE] game-config hit');
    return gameConfigEntry.data;
  }
  if (gameConfigInFlight) return gameConfigInFlight;
  gameConfigInFlight = (async () => {
    try {
      const data = await loadGameConfigApiResponse();
      if (data.success === true) {
        gameConfigEntry = { at: Date.now(), data };
      }
      return data;
    } finally {
      gameConfigInFlight = null;
    }
  })();
  return gameConfigInFlight;
}

export function invalidateGameConfigPublicCache(): void {
  gameConfigEntry = null;
  gameConfigInFlight = null;
}

// --- Milestone definitions (normalized, shared by HTTP + AchievementService) ---

let milestoneDefinitionsEntry: { at: number; data: NormalizedMilestoneDefinitions } | null = null;
let milestoneDefinitionsInFlight: Promise<NormalizedMilestoneDefinitions> | null = null;
let milestoneDefinitionsFetchGen = 0;

export async function getOrLoadNormalizedMilestoneDefinitions(
  request: Request | undefined,
  options?: { forceRefresh?: boolean }
): Promise<NormalizedMilestoneDefinitions> {
  if (options?.forceRefresh) {
    milestoneDefinitionsEntry = null;
    milestoneDefinitionsFetchGen += 1;
    milestoneDefinitionsInFlight = null;
  }
  const genAtStart = milestoneDefinitionsFetchGen;
  const now = Date.now();
  if (milestoneDefinitionsEntry && now - milestoneDefinitionsEntry.at < PUBLIC_MILESTONE_DEFINITIONS_TTL_MS) {
    PlatformLogger.debug('[PUBLIC CACHE] milestone definitions hit');
    return milestoneDefinitionsEntry.data;
  }
  if (milestoneDefinitionsInFlight) return milestoneDefinitionsInFlight;
  milestoneDefinitionsInFlight = (async () => {
    try {
      const platformOptions = buildPlatformCallOptions(request, undefined);
      const data = await fetchNormalizedMilestoneDefinitions(platformOptions);
      if (milestoneDefinitionsFetchGen !== genAtStart) {
        return milestoneDefinitionsEntry?.data ?? data;
      }
      milestoneDefinitionsEntry = { at: Date.now(), data };
      return data;
    } finally {
      milestoneDefinitionsInFlight = null;
    }
  })();
  return milestoneDefinitionsInFlight;
}

export function invalidateMilestoneDefinitionsPublicCache(): void {
  milestoneDefinitionsEntry = null;
  milestoneDefinitionsInFlight = null;
  milestoneDefinitionsFetchGen += 1;
}

// --- Leaderboard ---

function leaderboardKey(limit: number, useMock: boolean): string {
  return `${limit}:${useMock ? '1' : '0'}`;
}

const leaderboardEntries = new Map<string, { at: number; data: Record<string, unknown> }>();
const leaderboardInFlight = new Map<string, Promise<Record<string, unknown>>>();
const leaderboardFetchGen = new Map<string, number>();

export async function getOrLoadLeaderboardResponse(
  params: { limit: number; useMock: boolean },
  options?: { forceRefresh?: boolean }
): Promise<Record<string, unknown>> {
  const key = leaderboardKey(params.limit, params.useMock);
  if (options?.forceRefresh) {
    leaderboardEntries.delete(key);
    leaderboardFetchGen.set(key, (leaderboardFetchGen.get(key) ?? 0) + 1);
    leaderboardInFlight.delete(key);
  }
  const genAtStart = leaderboardFetchGen.get(key) ?? 0;
  const now = Date.now();
  const hit = leaderboardEntries.get(key);
  if (hit && now - hit.at < PUBLIC_LEADERBOARD_TTL_MS) {
    PlatformLogger.debug('[PUBLIC CACHE] leaderboard hit', { key });
    return hit.data;
  }
  const inflight = leaderboardInFlight.get(key);
  if (inflight) return inflight;
  const p = (async () => {
    try {
      const data = await loadLeaderboardApiResponse(params);
      if ((leaderboardFetchGen.get(key) ?? 0) !== genAtStart) {
        return leaderboardEntries.get(key)?.data ?? data;
      }
      leaderboardEntries.set(key, { at: Date.now(), data });
      return data;
    } finally {
      leaderboardInFlight.delete(key);
    }
  })();
  leaderboardInFlight.set(key, p);
  return p;
}

export function invalidateLeaderboardPublicCache(): void {
  leaderboardEntries.clear();
  leaderboardInFlight.clear();
  for (const k of leaderboardFetchGen.keys()) {
    leaderboardFetchGen.set(k, (leaderboardFetchGen.get(k) ?? 0) + 1);
  }
}

/** Snapshot TTL state before a bootstrap run (whether each slice was already fresh in this process). */
export function getPublicBootstrapCacheDiagnostics(): {
  storeServedFromCache: boolean;
  tournamentsServedFromCache: boolean;
  gameConfigServedFromCache: boolean;
  milestonesServedFromCache: boolean;
  leaderboardServedFromCache: boolean;
} {
  const now = Date.now();
  const lbKey = leaderboardKey(PUBLIC_LEADERBOARD_BOOTSTRAP_LIMIT, false);
  const tEntry = tournamentEntries.get('activeAndUpcoming');
  const lbEntry = leaderboardEntries.get(lbKey);
  return {
    storeServedFromCache:
      storeCatalogEntry != null && now - storeCatalogEntry.at < PUBLIC_STORE_CATALOG_TTL_MS,
    tournamentsServedFromCache: tEntry != null && now - tEntry.at < PUBLIC_TOURNAMENTS_TTL_MS,
    gameConfigServedFromCache: gameConfigEntry != null && now - gameConfigEntry.at < PUBLIC_GAME_CONFIG_TTL_MS,
    milestonesServedFromCache:
      milestoneDefinitionsEntry != null &&
      now - milestoneDefinitionsEntry.at < PUBLIC_MILESTONE_DEFINITIONS_TTL_MS,
    leaderboardServedFromCache: lbEntry != null && now - lbEntry.at < PUBLIC_LEADERBOARD_TTL_MS,
  };
}
