// ==========================================
// Create Anchor session for tournament score submission
// POST /api/tournaments/create-anchor-session
// Builds create_session via platform, signs with game admin (corridor cap), executes, returns sessionId.
// ==========================================

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';
import { PlatformError, PlatformErrorCode } from '@/lib/services/platform/errors/platform-errors';
import { PlatformValidators } from '@/lib/services/platform/validators/platform-validators';
import { PlatformLogger } from '@/lib/services/platform/logging/platform-logger';
import { platformAnchorClient, platformTxClient, buildPlatformCallOptions } from '@/lib/services/platform/client/platform-client';
import { getAdminWalletService } from '@/lib/services/wallet/admin/admin-wallet-service';
import { getCorridorAdminCapabilityObjectIdFromEnv } from '@/lib/services/platform/client/platform-client';

const ANCHOR_SESSION_TTL_MS = 60 * 60 * 1000; // 1 hour
const ANCHOR_SESSION_MAX_USES = 5;

let anchorRegistryInitPromise: Promise<void> | null = null;

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

/** SessionCreated event type suffix (anchor package may vary). */
const SESSION_CREATED_EVENT_TYPE = 'SessionCreated';

/**
 * Parse session_id from Anchor SessionCreated event (parsedJson.session_id).
 * Used when executeTransactionBlock does not return command results.
 */
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

/**
 * Parse Anchor create_session return value (u64 session_id) from transaction result.
 * Prefer top-level results or effects.results (returnValues); fall back to SessionCreated event.
 */
function parseSessionIdFromResult(
  effects: unknown,
  topLevelResults: unknown,
  events: unknown
): number | null {
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

async function ensureAnchorRegistryInitialized(
  platformOptions: ReturnType<typeof buildPlatformCallOptions>,
  adminWallet: ReturnType<typeof getAdminWalletService>
): Promise<void> {
  if (!anchorRegistryInitPromise) {
    anchorRegistryInitPromise = (async () => {
      const regBuild = await platformAnchorClient.buildCreateRegistry(
        { senderAddress: adminWallet.getAddress() },
        platformOptions
      );
      if (!regBuild.success || !regBuild.transaction) {
        throw new PlatformError(
          PlatformErrorCode.TRANSACTION_FAILED,
          regBuild.error ?? 'Failed to build Anchor registry init transaction'
        );
      }
      const signedReg = await adminWallet.getKeypair().signTransaction(Buffer.from(regBuild.transaction, 'base64'));
      const regExec = await platformTxClient.executeSigned(
        { transactionBytesBase64: regBuild.transaction, signature: signedReg.signature },
        platformOptions
      );
      if (!regExec.success) {
        throw new PlatformError(
          PlatformErrorCode.TRANSACTION_FAILED,
          regExec.error ?? 'Failed to create Anchor registry for this app'
        );
      }
    })().catch((e) => {
      // allow retry on subsequent requests if init failed
      anchorRegistryInitPromise = null;
      throw e;
    });
  }
  await anchorRegistryInitPromise;
}

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

/**
 * POST /api/tournaments/create-anchor-session
 * Body: { playerAddress: string, tournamentObjectId?: string }
 * Returns: { success: true, sessionId: number } or { success: false, error: string }
 */
export const POST = withApiHandler(
  async (request: NextRequest) => {
    const body = await getRequestBody<{
      playerAddress: string;
      tournamentObjectId?: string | null;
    }>(request);
    const { playerAddress, tournamentObjectId } = body;

    if (!playerAddress?.trim()) {
      throw new PlatformError(
        PlatformErrorCode.INVALID_ADDRESS,
        'playerAddress is required'
      );
    }
    PlatformValidators.validateAddress(playerAddress.trim());

    // Include CorridorAdminCap so platform can auto-create Anchor registry on first use.
    const platformOptions = buildPlatformCallOptions(request, body, {
      corridorAdminCapabilityObjectId: getCorridorAdminCapabilityObjectIdFromEnv(),
    });
    const adminWallet = getAdminWalletService();

    const buildCreateSession = async () => {
      return await platformAnchorClient.buildCreateSession(
        {
          participant: playerAddress.trim(),
          ttlMs: ANCHOR_SESSION_TTL_MS,
          maxUses: ANCHOR_SESSION_MAX_USES,
          stationEventId: tournamentObjectId?.trim() && tournamentObjectId.startsWith('0x') ? tournamentObjectId : undefined,
          // Platform Anchor build requires senderAddress; the game backend signs/executes as admin.
          senderAddress: adminWallet.getAddress(),
        },
        platformOptions
      );
    };

    let buildRes: Awaited<ReturnType<typeof buildCreateSession>>;
    try {
      buildRes = await buildCreateSession();
    } catch (e) {
      buildRes = { success: false, error: e instanceof Error ? e.message : String(e) };
    }

    // If the app's Anchor registry is missing, initialize it once, then retry buildCreateSession.
    const buildErr = (buildRes.error || '').toLowerCase();
    const isMissingRegistry =
      buildErr.includes('anchor registry not found') ||
      buildErr.includes('/api/anchor/registry') ||
      buildErr.includes('initialize it') ||
      buildErr.includes('api/anchor/registry');
    if (!buildRes.success && isMissingRegistry) {
      await ensureAnchorRegistryInitialized(platformOptions, adminWallet);
      // Retry create_session build after registry init attempt.
      let retry: Awaited<ReturnType<typeof buildCreateSession>>;
      try {
        retry = await buildCreateSession();
      } catch (e) {
        retry = { success: false, error: e instanceof Error ? e.message : String(e) };
      }
      if (retry.success && retry.transaction) {
        (buildRes as any).success = true;
        (buildRes as any).transaction = retry.transaction;
        (buildRes as any).error = undefined;
      }
    }

    if (!buildRes.success || !buildRes.transaction) {
      throw new PlatformError(
        PlatformErrorCode.TRANSACTION_FAILED,
        buildRes.error ?? 'Failed to build create_session transaction'
      );
    }

    const transactionBytesBase64 = buildRes.transaction;
    const signed = await adminWallet.getKeypair().signTransaction(Buffer.from(transactionBytesBase64, 'base64'));

    const execRes = await platformTxClient.executeSigned(
      { transactionBytesBase64, signature: signed.signature },
      platformOptions
    );

    if (!execRes.success) {
      PlatformLogger.error('Create Anchor session: execute failed', { playerAddress, error: execRes.error });
      throw new PlatformError(
        PlatformErrorCode.TRANSACTION_FAILED,
        execRes.error ?? 'Failed to execute create_session transaction'
      );
    }

    const sessionId = parseSessionIdFromResult(
      execRes.effects,
      execRes.results,
      execRes.events
    );
    if (sessionId == null || sessionId < 0) {
      PlatformLogger.warn('Create Anchor session: could not parse sessionId from results or events', {
        playerAddress,
        digest: execRes.digest,
      });
      throw new PlatformError(
        PlatformErrorCode.TRANSACTION_FAILED,
        'Anchor session was created but sessionId could not be read from transaction result or SessionCreated event.'
      );
    }

    PlatformLogger.info('Anchor session created for tournament', {
      playerAddress,
      sessionId,
      digest: execRes.digest,
    });

    return {
      success: true,
      sessionId,
      digest: execRes.digest,
      message: 'Anchor session created. Use this sessionId when submitting tournament score.',
    };
  },
  { logRequest: true }
);
