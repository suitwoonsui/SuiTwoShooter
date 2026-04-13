import { PlatformLogger } from '@/lib/services/platform/logging/platform-logger';
import { PlatformValidators } from '@/lib/services/platform/validators/platform-validators';
import {
  platformInsigniaClient,
  signAndExecuteSigned,
  getCorridorAdminCapabilityObjectIdFromEnv,
  type CallPlatformBackendOptions,
} from '@/lib/services/platform/client/platform-client';
import { getAdminWalletService } from '@/lib/services/wallet/admin/admin-wallet-service';

function toB64Utf8(s: string): string {
  return Buffer.from(s, 'utf8').toString('base64');
}

function fromB64Utf8(b64: string): string {
  try {
    return Buffer.from(b64, 'base64').toString('utf8');
  } catch {
    return '';
  }
}

/**
 * Best-effort drift repair: ensure Insignia key `tier` matches badge tier (number).
 * Reads via platform GET /api/insignia/{address}; writes via POST /api/insignia/{address} (CorridorAdminCap required).
 *
 * This is intentionally non-throwing by default so badge reads don't fail if Insignia is temporarily unavailable.
 */
export async function ensureInsigniaTierMatchesBadge(
  playerAddress: string,
  badgeTier: number,
  options?: CallPlatformBackendOptions & { throwOnError?: boolean }
): Promise<{ success: boolean; repaired?: boolean; insigniaTier?: number | null; error?: string }> {
  const throwOnError = options?.throwOnError === true;
  try {
    const addr = (playerAddress || '').trim();
    PlatformValidators.validateAddress(addr);
    const tier = Number(badgeTier);
    if (!Number.isFinite(tier) || tier < 0) {
      return { success: false, error: 'badgeTier must be a non-negative number' };
    }

    const read = await platformInsigniaClient.getPlayerConfig(addr, options);
    const config = read.success ? (read.config ?? {}) : {};
    const rawTierB64 = typeof config.tier === 'string' ? config.tier : '';
    const decoded = rawTierB64 ? fromB64Utf8(rawTierB64).trim() : '';
    const insigniaTier = decoded !== '' && /^[0-9]+$/.test(decoded) ? Number(decoded) : null;

    if (insigniaTier === tier) {
      PlatformLogger.info('Insignia tier repair: no-op (already matches)', {
        playerAddress: addr,
        tier,
      });
      return { success: true, repaired: false, insigniaTier };
    }

    // Write/repair using the game admin wallet, via platform Channel execute.
    const adminWallet = getAdminWalletService();
    const senderAddress = adminWallet.getAddress();

    // Platform Insignia writes require CorridorAdminCap (corridor-scoped identity + write capability).
    // Ensure we always include the configured admin cap from the game backend environment/config.
    const corridorAdminCapabilityObjectId =
      (options?.corridorAdminCapabilityObjectId ?? getCorridorAdminCapabilityObjectIdFromEnv())?.trim() || undefined;

    const writeOptions: CallPlatformBackendOptions = {
      ...(options ?? {}),
      ...(corridorAdminCapabilityObjectId ? { corridorAdminCapabilityObjectId } : {}),
    };

    PlatformLogger.info('Insignia tier repair: attempting write', {
      playerAddress: addr,
      badgeTier: tier,
      previousInsigniaTier: insigniaTier,
      senderAddress,
      corridorAdminCapabilityObjectId: corridorAdminCapabilityObjectId ? `${corridorAdminCapabilityObjectId.slice(0, 8)}...` : null,
    });

    const built = await platformInsigniaClient.buildSetPlayerEntry(
      addr,
      { key: 'tier', valueBase64: toB64Utf8(String(tier)), senderAddress },
      writeOptions
    );
    if (!built.success || !built.transaction) {
      const error = built.error ?? 'Failed to build Insignia setPlayerEntry transaction';
      if (throwOnError) throw new Error(error);
      PlatformLogger.warn('Insignia tier repair: build failed', { playerAddress: addr, tier, error });
      return { success: false, error, repaired: false, insigniaTier };
    }

    PlatformLogger.info('Insignia tier repair: built transaction', { playerAddress: addr, tier });

    const exec = await signAndExecuteSigned({
      keypair: adminWallet.getKeypair(),
      transactionBytesBase64: built.transaction,
      options: writeOptions,
    });
    if (!exec.success) {
      const error = exec.error ?? 'Failed to execute Insignia setPlayerEntry transaction';
      if (throwOnError) throw new Error(error);
      PlatformLogger.warn('Insignia tier repair: execute failed', { playerAddress: addr, tier, error });
      return { success: false, error, repaired: false, insigniaTier };
    }

    PlatformLogger.info('Insignia tier repaired from badge tier', {
      playerAddress: addr,
      badgeTier: tier,
      previousInsigniaTier: insigniaTier,
      digest: exec.digest,
    });
    return { success: true, repaired: true, insigniaTier: tier };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (throwOnError) throw err;
    PlatformLogger.warn('Insignia tier repair failed (non-fatal)', { playerAddress, badgeTier, error: msg });
    return { success: false, error: msg };
  }
}

