/**
 * Parallel JSON GET utilities for aggregating multiple HTTP reads in one logical "batch".
 *
 * Use from game-backend routes (same-origin loopback), workers, or — with a platform base URL —
 * any caller that needs wall time ≈ max(latency) instead of sum(latency).
 *
 * This module does not implement GraphQL-style batching on the wire; it coordinates Promise.all
 * and optional retry/backoff per leg so routes like `/api/menu/bootstrap` stay thin.
 */

export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type FetchJsonInit = Omit<RequestInit, 'method' | 'cache'>;

/**
 * Single GET; returns parsed JSON or null on failure / empty body.
 */
export async function fetchJsonGet(
  baseOrigin: string,
  path: string,
  init?: FetchJsonInit
): Promise<unknown | null> {
  try {
    const res = await fetch(`${baseOrigin.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`, {
      method: 'GET',
      cache: 'no-store',
      ...init,
    });
    if (!res.ok) return null;
    return (await res.json().catch(() => null)) as unknown;
  } catch {
    return null;
  }
}

/**
 * Retries with incremental backoff (same pattern as menu bootstrap cold-start hardening).
 */
export async function fetchJsonGetWithBackoff(
  baseOrigin: string,
  path: string,
  attempts: number,
  init?: FetchJsonInit
): Promise<unknown | null> {
  const n = Math.max(1, Math.floor(attempts));
  for (let i = 0; i < n; i++) {
    if (i > 0) await sleep(Math.min(2000, 400 * (i + 1)));
    const row = await fetchJsonGet(baseOrigin, path, init);
    if (row != null) return row;
  }
  return null;
}

export type ParallelJsonLeg = {
  /** Result key in the output record */
  key: string;
  path: string;
  /** If >1, uses fetchJsonGetWithBackoff; otherwise single fetchJsonGet */
  retries?: number;
  init?: FetchJsonInit;
};

/**
 * Run multiple JSON GETs concurrently. Each leg resolves independently; failures are null for that key.
 */
export async function fetchJsonParallelLegs(
  baseOrigin: string,
  legs: ParallelJsonLeg[]
): Promise<Record<string, unknown | null>> {
  const tasks = legs.map(async ({ key, path, retries, init }) => {
    const value =
      retries != null && retries > 1
        ? await fetchJsonGetWithBackoff(baseOrigin, path, retries, init)
        : await fetchJsonGet(baseOrigin, path, init);
    return [key, value] as const;
  });
  const pairs = await Promise.all(tasks);
  return Object.fromEntries(pairs) as Record<string, unknown | null>;
}

/**
 * Run named async producers in parallel (arbitrary work, not only HTTP).
 * Wall time ≈ slowest task.
 */
export async function runParallelProducers<T extends Record<string, () => Promise<unknown>>>(
  producers: T
): Promise<{ [K in keyof T]: Awaited<ReturnType<T[K]>> }> {
  const keys = Object.keys(producers) as (keyof T)[];
  const values = await Promise.all(keys.map((k) => producers[k]()));
  const out = {} as { [K in keyof T]: Awaited<ReturnType<T[K]>> };
  keys.forEach((k, i) => {
    (out as Record<string, unknown>)[k as string] = values[i];
  });
  return out;
}
