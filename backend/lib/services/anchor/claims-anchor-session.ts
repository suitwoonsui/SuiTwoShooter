import { PlatformLogger } from '@/lib/services/platform/logging/platform-logger';
import {
  platformAnchorClient,
  platformTxClient,
  getCorridorAdminCapabilityObjectIdFromEnv,
} from '@/lib/services/platform/client/platform-client';
import { getAdminWalletService } from '@/lib/services/wallet/admin/admin-wallet-service';

const CLAIMS_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const CLAIMS_SESSION_MAX_USES = 1_000_000;

let cachedClaimsSessionId: number | null = null;
let createClaimsSessionInFlight: Promise<number> | null = null;

function toBytes(v: [number[] | Uint8Array, string] | unknown): Uint8Array {
  if (!v || !Array.isArray(v) || v.length < 1) return new Uint8Array(0);
  const raw = v[0];
  if (raw instanceof Uint8Array) return raw;
  if (Array.isArray(raw)) return new Uint8Array(raw);
  return new Uint8Array(0);
}

function readU64(buf: Uint8Array): number {
  if (buf.length < 8) return 0;
  return Number(buf[0]! | (buf[1]! << 8) | (buf[2]! << 16) | (buf[3]! << 24)) + Number(buf[4]! | (buf[5]! << 8) | (buf[6]! << 16) | (buf[7]! << 24)) * 0x1_0000_0000;
}

const SESSION_CREATED_EVENT_TYPE = 'SessionCreated';

function parseSessionIdFromEvents(events: unknown): number | null {
  const arr = events as Array<{ type?: string; parsedJson?: Record<string, unknown> }> | undefined;
  if (!Array.isArray(arr)) return null;
  for (const ev of arr) {
    if (!ev?.type?.endsWith(SESSION_CREATED_EVENT_TYPE)) continue;
    const sessionId = ev.parsedJson?.session_id;
    if (typeof sessionId === 'number' && Number.isInteger(sessionId) && sessionId >= 0) return sessionId;
    if (typeof sessionId === 'string') {
      const n = Number(sessionId);
      if (Number.isInteger(n) && n >= 0) return n;
    }
  }
  return null;
}

function parseSessionIdFromResult(effects: unknown, topLevelResults: unknown, events: unknown): number | null {
  const tryResults = (results: unknown): number | null => {
    const arr = results as Array<{ returnValues?: Array<[number[] | Uint8Array, string]> }> | undefined;
    if (!Array.isArray(arr) || arr.length === 0) return null;
    const returnValues = arr[0]?.returnValues;
    if (!returnValues || returnValues.length < 1) return null;
    try {
      const bytes = toBytes(returnValues[0]);
      if (bytes.length >= 8) return readU64(bytes);
      if (bytes.length >= 4) return bytes[0]! | (bytes[1]! << 8) | (bytes[2]! << 16) | (bytes[3]! << 24);
    } catch {
      /* ignore */
    }
    return null;
  };
  const fromTop = tryResults(topLevelResults);
  if (fromTop != null) return fromTop;
  if (effects && typeof effects === 'object') {
    const e = effects as Record<string, unknown>;
    const fromEffects = tryResults(e.results);
    if (fromEffects != null) return fromEffects;
  }
  return parseSessionIdFromEvents(events);
}

async function ensureAnchorRegistryInitialized(adminWalletAddress: string): Promise<void> {
  const corridorAdminCapId = getCorridorAdminCapabilityObjectIdFromEnv();
  if (!corridorAdminCapId?.trim().startsWith('0x')) {
    throw new Error(
      'CORRIDOR_ADMIN_CAP_OBJECT_ID_* is required in game backend config/contracts.<network>.json to create Anchor registry.'
    );
  }
  const regBuild = await platformAnchorClient.buildCreateRegistry(
    { senderAddress: adminWalletAddress },
    { corridorAdminCapabilityObjectId: corridorAdminCapId }
  );
  if (!regBuild.success) throw new Error(regBuild.error ?? 'Failed to build Anchor registry init transaction');
  if (!regBuild.transaction) return;
  const adminWallet = getAdminWalletService();
  const signed = await adminWallet.getKeypair().signTransaction(Buffer.from(regBuild.transaction, 'base64'));
  const exec = await platformTxClient.executeSigned(
    { transactionBytesBase64: regBuild.transaction, signature: signed.signature },
    { corridorAdminCapabilityObjectId: corridorAdminCapId }
  );
  if (!exec.success) throw new Error(exec.error ?? 'Failed to execute Anchor registry init transaction');
}

async function createClaimsSession(): Promise<number> {
  const adminWallet = getAdminWalletService();
  const adminAddress = adminWallet.getAddress();
  const buildCreateSession = async () =>
    platformAnchorClient.buildCreateSession({
      participant: adminAddress,
      ttlMs: CLAIMS_SESSION_TTL_MS,
      maxUses: CLAIMS_SESSION_MAX_USES,
      senderAddress: adminAddress,
    });

  let buildRes: Awaited<ReturnType<typeof buildCreateSession>>;
  try {
    buildRes = await buildCreateSession();
  } catch (e) {
    buildRes = { success: false, error: e instanceof Error ? e.message : String(e) };
  }

  const buildErr = (buildRes.error || '').toLowerCase();
  const isMissingRegistry =
    buildErr.includes('anchor registry not found') ||
    buildErr.includes('/api/anchor/registry') ||
    buildErr.includes('initialize it') ||
    buildErr.includes('api/anchor/registry');
  if (!buildRes.success && isMissingRegistry) {
    await ensureAnchorRegistryInitialized(adminAddress);
    buildRes = await buildCreateSession();
  }

  if (!buildRes.success || !buildRes.transaction) {
    throw new Error(buildRes.error ?? 'Failed to build create_session transaction');
  }
  const signed = await adminWallet.getKeypair().signTransaction(Buffer.from(buildRes.transaction, 'base64'));
  const execRes = await platformTxClient.executeSigned(
    { transactionBytesBase64: buildRes.transaction, signature: signed.signature },
    {}
  );
  if (!execRes.success) throw new Error(execRes.error ?? 'Failed to execute create_session transaction');
  const sessionId = parseSessionIdFromResult(execRes.effects, execRes.results, execRes.events);
  if (sessionId == null || sessionId < 0) {
    throw new Error('Anchor session was created but sessionId could not be read from transaction result or SessionCreated event.');
  }
  return sessionId;
}

/**
 * Ensure there is an Anchor session id usable for milestone claim tracking.
 * - Uses GAME_ANCHOR_SESSION_ID when set
 * - Otherwise creates a long-lived Anchor session (participant = game admin), caches it in-memory, and returns it.
 *
 * Note: to make it persist across restarts, set GAME_ANCHOR_SESSION_ID to the returned sessionId.
 */
export async function ensureGameClaimsAnchorSessionId(): Promise<{ success: boolean; sessionId?: number; error?: string }> {
  const fromEnvRaw = typeof process !== 'undefined' ? process.env.GAME_ANCHOR_SESSION_ID : undefined;
  const fromEnv = fromEnvRaw != null && fromEnvRaw !== '' ? parseInt(String(fromEnvRaw), 10) : NaN;
  if (!Number.isNaN(fromEnv) && fromEnv >= 0) return { success: true, sessionId: fromEnv };

  if (cachedClaimsSessionId != null) return { success: true, sessionId: cachedClaimsSessionId };
  if (!createClaimsSessionInFlight) {
    createClaimsSessionInFlight = createClaimsSession()
      .then((id) => {
        cachedClaimsSessionId = id;
        PlatformLogger.info('[ANCHOR] Created game claims session (in-memory)', {
          sessionId: id,
          hint: 'Set GAME_ANCHOR_SESSION_ID to persist across restarts.',
        });
        return id;
      })
      .finally(() => {
        createClaimsSessionInFlight = null;
      });
  }
  try {
    const id = await createClaimsSessionInFlight;
    return { success: true, sessionId: id };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

