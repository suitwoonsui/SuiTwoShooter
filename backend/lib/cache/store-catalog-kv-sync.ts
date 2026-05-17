// Cross-instance snapshot for merged store catalog when Vercel KV env is set (KV_REST_API_URL + KV_REST_API_TOKEN).
// @vercel/kv is deprecated for new projects in favor of Upstash via Vercel Marketplace; REST env vars remain compatible.

import { kv } from '@vercel/kv';
import type { StoreCatalogPayload } from '@/lib/services/store/terminal-store-catalog';

const KV_KEY = 'public:store-catalog:v1';

type StoreCatalogKvEnvelope = {
  savedAt: number;
  payload: StoreCatalogPayload;
};

export function isStoreCatalogKvConfigured(): boolean {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

export async function readStoreCatalogKvSnapshot(ttlMs: number): Promise<StoreCatalogPayload | null> {
  if (!isStoreCatalogKvConfigured()) return null;
  try {
    const raw = await kv.get<StoreCatalogKvEnvelope>(KV_KEY);
    if (!raw || typeof raw !== 'object' || !raw.payload) return null;
    if (Date.now() - raw.savedAt > ttlMs) return null;
    return raw.payload;
  } catch {
    return null;
  }
}

export async function writeStoreCatalogKvSnapshot(payload: StoreCatalogPayload, ttlMs: number): Promise<void> {
  if (!isStoreCatalogKvConfigured()) return;
  const exSeconds = Math.max(60, Math.ceil(ttlMs / 1000) * 2);
  const envelope: StoreCatalogKvEnvelope = { savedAt: Date.now(), payload };
  await kv.set(KV_KEY, envelope, { ex: exSeconds });
}

export async function deleteStoreCatalogKvSnapshot(): Promise<void> {
  if (!isStoreCatalogKvConfigured()) return;
  try {
    await kv.del(KV_KEY);
  } catch {
    // best-effort
  }
}
