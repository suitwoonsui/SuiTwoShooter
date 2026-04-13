/**
 * Runs once when the Next.js server starts.
 * In development, warms critical API routes after a short delay so the first
 * user request doesn't pay for cold compilation.
 */
const WARMUP_DUMMY_ADDRESS = '0x0000000000000000000000000000000000000000000000000000000000000000';

export async function register() {
  // Best-effort: ensure Anchor registry exists for this app as early as possible.
  // Disable with ANCHOR_REGISTRY_WARM_ENABLED=false.
  if (process.env.NEXT_RUNTIME === 'nodejs' && process.env.ANCHOR_REGISTRY_WARM_ENABLED !== 'false') {
    const jitterMs = Math.floor(Math.random() * 5_000);
    setTimeout(() => {
      const run = async () => {
        const { PlatformLogger } = await import('@/lib/services/platform/logging/platform-logger');
        try {
          const {
            platformAnchorClient,
            platformTxClient,
            buildPlatformCallOptions,
            getCorridorAdminCapabilityObjectIdFromEnv,
          } = await import('@/lib/services/platform/client/platform-client');
          const { getAdminWalletService } = await import('@/lib/services/wallet/admin/admin-wallet-service');

          const adminCap = getCorridorAdminCapabilityObjectIdFromEnv();
          if (!adminCap?.startsWith('0x')) {
            PlatformLogger.warn('Anchor registry warmup skipped: missing CorridorAdminCap in config', {
              hasAdminCap: Boolean(adminCap),
            });
            return;
          }

          const adminWallet = getAdminWalletService();
          const platformOptions = buildPlatformCallOptions(null, null, {
            corridorAdminCapabilityObjectId: adminCap,
          });

          for (let attempt = 1; attempt <= 3; attempt++) {
            try {
              PlatformLogger.info('Anchor registry warmup attempt start', {
                attempt,
                senderPrefix: adminWallet.getAddress().slice(0, 10) + '...',
                corridorAdminCapPrefix: adminCap.slice(0, 10) + '...',
              });
              const regBuild = await platformAnchorClient.buildCreateRegistry(
                { senderAddress: adminWallet.getAddress() },
                platformOptions
              );

              // If registry already exists, platform may return an error string; treat that as success.
              const err = (regBuild.success ? '' : regBuild.error || '').toLowerCase();
              const alreadyExists =
                err.includes('already') ||
                err.includes('exists') ||
                err.includes('registry already') ||
                err.includes('duplicate');
              if (!regBuild.success) {
                PlatformLogger.warn('Anchor registry warmup build failed', {
                  attempt,
                  error: regBuild.error,
                });
                if (alreadyExists) {
                  PlatformLogger.info('Anchor registry warmup: already initialized', { attempt });
                  return;
                }
                throw new Error(regBuild.error ?? 'Failed to build Anchor registry init transaction');
              }

              if (!regBuild.transaction) {
                PlatformLogger.info('Anchor registry warmup: no transaction returned (assuming initialized)', { attempt });
                return;
              }

              const signedReg = await adminWallet
                .getKeypair()
                .signTransaction(Buffer.from(regBuild.transaction, 'base64'));
              const regExec = await platformTxClient.executeSigned(
                { transactionBytesBase64: regBuild.transaction, signature: signedReg.signature },
                platformOptions
              );

              const execErr = (regExec.success ? '' : regExec.error || '').toLowerCase();
              if (!regExec.success) {
                PlatformLogger.warn('Anchor registry warmup exec failed', {
                  attempt,
                  error: regExec.error,
                });
                const execAlreadyExists = execErr.includes('already') || execErr.includes('exists') || execErr.includes('duplicate');
                if (execAlreadyExists) {
                  PlatformLogger.info('Anchor registry warmup: already initialized (exec)', { attempt });
                  return;
                }
                throw new Error(regExec.error ?? 'Failed to execute Anchor registry init transaction');
              }

              PlatformLogger.info('Anchor registry warmup: initialized', { attempt, digest: regExec.digest });
              return;
            } catch (e) {
              PlatformLogger.warn('Anchor registry warmup attempt failed', {
                attempt,
                error: e instanceof Error ? e.message : String(e),
              });
              // simple backoff: 1s, 2s, 4s
              await new Promise((r) => setTimeout(r, 1_000 * Math.pow(2, attempt - 1)));
            }
          }
        } catch (e) {
          PlatformLogger.warn('Anchor registry warmup failed (non-fatal)', {
            error: e instanceof Error ? e.message : String(e),
          });
        }
      };
      void run();
    }, jitterMs);
  }

  // Keep the public tournaments bootstrap slice warm in the *game backend process*.
  // Match the cadence to the cache TTL used by bootstrap/public routes.
  // Disable with TOURNAMENTS_PUBLIC_CACHE_WARM_ENABLED=false.
  if (process.env.NEXT_RUNTIME === 'nodejs' && process.env.TOURNAMENTS_PUBLIC_CACHE_WARM_ENABLED !== 'false') {
    // Override the TTL itself via PUBLIC_DATA_TOURNAMENTS_TTL_MS.
    const intervalMs = await (async () => {
      try {
        const { PUBLIC_TOURNAMENTS_TTL_MS } = await import('@/lib/cache/public-nonuser-data-cache');
        return Math.max(1_000, Number(PUBLIC_TOURNAMENTS_TTL_MS) || 120_000);
      } catch (_) {
        return 120_000; // 2 minutes fallback
      }
    })();

    // Small jitter so multiple processes don't thundering-herd at exact minute boundaries.
    const jitterMs = Math.floor(Math.random() * 5_000);

    setTimeout(() => {
      const run = async () => {
        try {
          const { getOrLoadTournamentsPublicList } = await import('@/lib/cache/public-nonuser-data-cache');
          await getOrLoadTournamentsPublicList('activeAndUpcoming', { forceRefresh: true });
        } catch (e) {
          // Avoid noisy logs; this is best-effort warm.
        }
      };
      void run();
      setInterval(() => {
        void run();
      }, intervalMs);
    }, jitterMs);
  }

  // Optional: keep the public leaderboard slice warm (useful when lots of score submissions happen).
  // Disable with LEADERBOARD_PUBLIC_CACHE_WARM_ENABLED=false.
  if (process.env.NEXT_RUNTIME === 'nodejs' && process.env.LEADERBOARD_PUBLIC_CACHE_WARM_ENABLED !== 'false') {
    const limit = Math.max(1, parseInt(process.env.LEADERBOARD_PUBLIC_CACHE_WARM_LIMIT || '100', 10) || 100);
    // Match the cadence to the cache TTL used by bootstrap/public routes.
    // Override the TTL itself via PUBLIC_DATA_LEADERBOARD_TTL_MS.
    const intervalMs = await (async () => {
      try {
        const { PUBLIC_LEADERBOARD_TTL_MS } = await import('@/lib/cache/public-nonuser-data-cache');
        return Math.max(1_000, Number(PUBLIC_LEADERBOARD_TTL_MS) || 120_000);
      } catch (_) {
        return 120_000; // 2 minutes fallback
      }
    })();
    const jitterMs = Math.floor(Math.random() * 5_000);

    setTimeout(() => {
      const run = async () => {
        try {
          const { getOrLoadLeaderboardResponse } = await import('@/lib/cache/public-nonuser-data-cache');
          await getOrLoadLeaderboardResponse({ limit, useMock: false }, { forceRefresh: true });
        } catch (e) {
          // Best-effort warm; ignore errors to avoid noisy logs.
        }
      };
      void run();
      setInterval(() => {
        void run();
      }, intervalMs);
    }, jitterMs);
  }

  if (process.env.NODE_ENV === 'development' && process.env.NEXT_RUNTIME === 'nodejs') {
    const port = process.env.PORT || '3001';
    const base = `http://127.0.0.1:${port}`;
    // Schedule warmup after the server is listening (register completes before server starts).
    setTimeout(() => {
      Promise.all([
        fetch(`${base}/api/game-config?source=server_warmup`).catch(() => {}),
        fetch(`${base}/api/config?source=server_warmup`).catch(() => {}),
        // Warm post-login routes so first wallet connect doesn't pay 6–8s OPTIONS/compile
        fetch(`${base}/api/stats/${WARMUP_DUMMY_ADDRESS}`).catch(() => {}),
        fetch(`${base}/api/badges/${WARMUP_DUMMY_ADDRESS}`).catch(() => {}),
        fetch(`${base}/api/game-pass/${WARMUP_DUMMY_ADDRESS}`).catch(() => {}),
        // Warm routes used when opening Leaderboard or Store (chain/platform reads)
        fetch(`${base}/api/leaderboard?limit=10`).catch(() => {}),
        fetch(`${base}/api/milestones/definitions`).catch(() => {}),
        fetch(`${base}/api/store/catalog`).catch(() => {}),
        fetch(`${base}/api/store/inventory/${WARMUP_DUMMY_ADDRESS}`).catch(() => {}),

        // Tournament lobby / player flows
        fetch(`${base}/api/tournaments`).catch(() => {}),
        fetch(`${base}/api/tournaments/my-tournaments?playerAddress=${encodeURIComponent(WARMUP_DUMMY_ADDRESS)}`).catch(() => {}),
        fetch(`${base}/api/tournaments/past`).catch(() => {}),
        // Entry builders (create-anchor-session is POST-only; warming it via GET causes noisy 405s)
        fetch(`${base}/api/tournaments/enter`).catch(() => {}),
      ]).catch(() => {});
    }, 5000);
  }
}
