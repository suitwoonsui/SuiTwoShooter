// ==========================================
// Badge Service - Manages badge minting and tier updates
// ==========================================

import { getConfig } from '@/config/config';
import { getAdminWalletService } from '@/lib/services/wallet/admin/admin-wallet-service';
import { getBadgeRetryQueue } from '@/lib/services/badge/retry/badge-retry-queue';
import { validateAndSanitizeImage, getImageInfo } from '@/lib/services/badge/validation/badge-image-validator';
import { PlatformLogger } from '@/lib/services/platform/logging/platform-logger';
import { PlatformValidators } from '@/lib/services/platform/validators/platform-validators';
import { getBadgeImageCache } from '@/lib/services/badge/cache/badge-image-cache';
import { getBadgeRequestCache } from '@/lib/services/badge/cache/badge-request-cache';
import { calculateTierFromGames, getDiscounts } from '@/lib/services/badge/utilities/badge-utilities';
import {
  getHasSoulboundBadge,
  buildShipyardBadgeMint,
  buildShipyardIssueSoulboundMintPermit,
  buildShipyardMintSoulboundWithPermit,
  findSoulboundMintPermitCreatedObjectId,
  buildShipyardBadgeUpgrade,
  getBadgeTierConfigFromPlatform,
  getPlatformBackendUrl,
  getEcosystemIdFromEnv,
  getAppIdFromEnv,
  getCorridorCapabilityObjectIdFromEnv,
  getDefaultBadgeCollectionId,
  platformTxClient,
  signAndSubmitViaPlatform,
  getSonarClient,
  platformGameScoreClient,
  platformSonarClient,
  type BadgeTierConfig,
} from '@/lib/services/platform/client/platform-client';
import { BadgeImages } from '@/lib/services/badge/images/badge-images';
import * as fs from 'fs';
import * as path from 'path';

/** Stored in BadgeRequestCache when Shipyard reports no badge (distinct from cache miss). */
const CACHED_GET_BADGE_NO_BADGE = { __cachedNoBadge: true as const };

/**
 * Optional values from another step in the same HTTP request to skip redundant
 * Hydroscope / Shipyard reads (e.g. badgeId from getHasSoulboundBadge, totalGames from stats).
 */
export type CheckBadgeUpgradeHints = {
  badgeId?: string;
  /**
   * When this property is present (`hasOwnProperty`), skip `getPlayerStats` / Hydroscope.
   * Pass games from the same request that already fetched Hydroscope (e.g. parallel with game config + badge tier).
   */
  totalGames?: number;
  /** Tier already read from Sonar in the same HTTP request — skips a second getObject. */
  resolvedTier?: number;
  /**
   * When this property is present (`hasOwnProperty`), skip Sonar/`getBadge` entirely for upgrade math.
   * Use the same `{ badgeId, tier }` already loaded for GET /api/badges (one Sonar read for the whole handler).
   */
  preloadedBadgeRow?: { badgeId: string; tier: number } | null;
  /**
   * When this property is present (use `Object.hasOwn`), skip `getBadgeTierConfigFromPlatform` / fetchPlatformAppConfig.
   * Pass the tier config derived from the same `badgeConfig` as GET /api/game-config / menu bootstrap (e.g. `badgeConfigToBadgeTierConfig(gameConfig.badgeConfig)`).
   */
  preloadedBadgeTierConfig?: BadgeTierConfig | null;
};

/** Reuse `getHasSoulboundBadge` output in the same request to avoid a second Shipyard call before Sonar. */
export type GetBadgeOptions = {
  shipyardResult?: {
    success: boolean;
    hasBadge: boolean;
    badgeId?: string;
  };
};

/**
 * BadgeService - Manages badge operations (minting, tier updates, queries)
 */
export class BadgeService {
  private adminWallet: ReturnType<typeof getAdminWalletService>;
  private config: ReturnType<typeof getConfig>;
  private imageCache = getBadgeImageCache(); // Improved cache with TTL and size limits
  private requestCache = getBadgeRequestCache(); // Request-level cache for badge data
  private badgeImages: BadgeImages;

  constructor() {
    this.config = getConfig();
    this.adminWallet = getAdminWalletService();

    this.badgeImages = new BadgeImages({
      getConfig: () => this.config,
    });
  }

  /**
   * Get static image URL for a badge tier (external URL; badge images use platform Shipyard metadata.image_url).
   */
  public getBadgeImageUrl(tier: number): string {
    return this.badgeImages.getBadgeImageUrl(tier);
  }

  /**
   * Invalidate getBadge() request cache (e.g. after on-chain mint/upgrade to this wallet's badge row).
   */
  invalidatePlayerBadgeRowCache(playerAddress: string): void {
    const addr = playerAddress?.trim() ?? '';
    if (addr) this.requestCache.invalidate(addr);
  }

  private invalidateCache(playerAddress: string): void {
    this.invalidatePlayerBadgeRowCache(playerAddress);
  }

  /**
   * Check if player has a badge (platform Shipyard).
   */
  async hasBadge(playerAddress: string): Promise<boolean> {
    const res = await getHasSoulboundBadge(playerAddress, {
      corridorCapabilityObjectId: getCorridorCapabilityObjectIdFromEnv() || undefined,
    });
    return res.success && res.hasBadge === true;
  }

  /** Compute deserved tier from games played; use platform Helm config if present, else in-code thresholds. */
  private computeDeservedTier(gamesPlayed: number, config: BadgeTierConfig | null): number {
    if (!config?.thresholds?.length) return calculateTierFromGames(gamesPlayed);
    let tier = 0;
    for (let i = 0; i < config.thresholds.length; i++) {
      if (gamesPlayed >= config.thresholds[i]) tier = i + 1;
    }
    return tier;
  }

  /** Parse tier from Shipyard NFT object (content.fields.attributes or display). Default 0 if missing. */
  private parseTierFromNftObject(obj: unknown): number {
    try {
      const o = obj as { data?: { content?: Record<string, unknown>; display?: Record<string, unknown> }; content?: Record<string, unknown>; display?: Record<string, unknown> };
      const data = o?.data ?? o;
      const content = (data?.content ?? data) as { fields?: Record<string, unknown> } | undefined;
      const fields = content?.fields;
      if (fields && typeof fields.attributes !== 'undefined') {
        const att = fields.attributes;
        if (typeof att === 'object' && att !== null && 'tier' in att) {
          const t = (att as { tier: unknown }).tier;
          if (typeof t === 'number' && Number.isInteger(t) && t >= 0) return t;
        }
      }
      const display = (data?.display ?? o?.display) as Record<string, unknown> | undefined;
      if (display?.attributes && typeof display.attributes === 'object' && display.attributes !== null && 'tier' in display.attributes) {
        const t = (display.attributes as { tier: unknown }).tier;
        if (typeof t === 'number' && Number.isInteger(t) && t >= 0) return t;
      }
    } catch {
      // ignore
    }
    return 0;
  }

  /** Get badge tier metadata for Shipyard upgrade (from Helm config or fallback). */
  private getMetadataForTier(newTier: number, config: BadgeTierConfig | null): { name: string; image_url: string; description: string; attributes: Record<string, unknown> } {
    const tierInfo = config?.tiers?.find((t) => t.tier === newTier);
    const label = tierInfo?.label ?? (['Starter', 'Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'][newTier] ?? 'Badge');
    const imageUrl = tierInfo?.imageUrl ?? this.getBadgeImageUrl(newTier);
    return {
      name: `SuiTwo Player Badge · ${label}`,
      image_url: imageUrl,
      description: `Earned by playing SuiTwo. Tier: ${label}.`,
      attributes: { type: 'badge', tier: newTier },
    };
  }

  /**
   * Get player's badge data (Shipyard ownership + Sonar NFT tier).
   * Pass `options.shipyardResult` when this request already called `getHasSoulboundBadge` for this player
   * so Shipyard is not queried again; only Sonar `getObject(badgeId)` runs.
   */
  async getBadge(
    playerAddress: string,
    options?: GetBadgeOptions
  ): Promise<{
    badgeId: string | null;
    tier: number;
    gamesPlayed: number;
    mintDate: number;
    lastUpdated: number;
    imageUrl?: string;
  } | null> {
    const addr = playerAddress.trim();
    if (!options?.shipyardResult) {
      const cached = this.requestCache.get(addr);
      if (cached != null) {
        if (
          typeof cached === 'object' &&
          cached !== null &&
          '__cachedNoBadge' in cached &&
          (cached as { __cachedNoBadge?: boolean }).__cachedNoBadge === true
        ) {
          return null;
        }
        return cached as {
          badgeId: string | null;
          tier: number;
          gamesPlayed: number;
          mintDate: number;
          lastUpdated: number;
          imageUrl?: string;
        };
      }
    }

    const corridor = getCorridorCapabilityObjectIdFromEnv() || undefined;
    const res = options?.shipyardResult
      ? options.shipyardResult
      : await getHasSoulboundBadge(addr, { corridorCapabilityObjectId: corridor });
    if (!res.success || !res.hasBadge || !res.badgeId) {
      if (!options?.shipyardResult) {
        this.requestCache.set(addr, CACHED_GET_BADGE_NO_BADGE);
      }
      return null;
    }
    const badgeId = res.badgeId.trim();
    if (!badgeId) {
      if (!options?.shipyardResult) {
        this.requestCache.set(addr, CACHED_GET_BADGE_NO_BADGE);
      }
      return null;
    }
    let tier = 0;
    try {
      const obj = await platformSonarClient.getObject(badgeId, { showContent: true, showDisplay: true });
      if (obj) tier = this.parseTierFromNftObject(obj);
    } catch {
      // keep tier 0
    }
    const row = {
      badgeId,
      tier,
      gamesPlayed: 0,
      mintDate: 0,
      lastUpdated: 0,
    };
    if (!options?.shipyardResult) {
      this.requestCache.set(addr, row);
    }
    return row;
  }

  /**
   * Resolve badge id + on-chain tier for upgrade eligibility.
   * When resolvedTier is supplied (same request as a prior getObject), skip Sonar entirely.
   * When only badgeId is known, uses getBadge(..., { shipyardResult }) for one Sonar read (no second Shipyard).
   */
  private async resolveBadgeForUpgradeCheck(
    playerAddress: string,
    badgeIdHint?: string,
    resolvedTier?: number
  ): Promise<{ badgeId: string; tier: number } | null> {
    if (badgeIdHint && resolvedTier !== undefined && Number.isFinite(resolvedTier)) {
      return { badgeId: badgeIdHint, tier: resolvedTier };
    }
    if (badgeIdHint) {
      const row = await this.getBadge(playerAddress, {
        shipyardResult: { success: true, hasBadge: true, badgeId: badgeIdHint },
      });
      if (!row?.badgeId) return null;
      return { badgeId: row.badgeId, tier: row.tier };
    }
    const badge = await this.getBadge(playerAddress);
    if (!badge?.badgeId) return null;
    return { badgeId: badge.badgeId, tier: badge.tier };
  }

  /**
   * Build mint badge transaction for player to sign
   * Returns transaction data that frontend can use to build and sign
   * NOTE: This function creates the BadgeImageData object server-side using chunked upload
   * The frontend receives the object ID to use in the transaction
   */
  /**
   * Get mint badge transaction data (for frontend to build). Not used when badges are on platform (mint via platform API).
   */
  async getMintBadgeTransactionData(
    playerAddress: string,
    paymentCoinId: string
  ): Promise<{
    success: boolean;
    transactionData?: {
      packageId: string;
      module: string;
      function: string;
      arguments: {
        badgeRegistry: string;
        statsRegistry: string;
        clock: string;
        paymentCoinId: string;
        paymentAmount: string;
        imageDataObjectId: string;
      };
      gasBudget: number;
    };
    error?: string;
  }> {
    return {
      success: false,
      error:
        'Badges are on platform (Shipyard). Mint via POST /api/badges/mint/purchase + /fulfill (or POST /api/badges/mint/admin for break-glass).',
    };
  }


  /**
   * Build migrate badge transaction for player to sign
   * Uses migrate_badge() function which preserves old tier, games played, and mint date
   * NO payment required (free migration)
   * Returns base64 transaction string for frontend to sign
   * 
   * NOTE: The old badge must be manually deleted by the player after migration.
   * The migrate_badge() function cannot burn the old badge (soulbound NFTs).
   * 
   * @param playerAddress - Player's wallet address
   * @param oldTier - Tier from old badge (0-5)
   * @param oldGamesPlayed - Games played from old badge
   * @param oldMintDate - Original mint date from old badge
   */
  async buildMigrateBadgeTransaction(
    playerAddress: string,
    oldTier: number,
    oldGamesPlayed: number,
    oldMintDate: number
  ): Promise<{
    success: boolean;
    transaction?: string;
    gasEstimate?: string;
    error?: string;
  }> {
    return { success: false, error: 'Badges are on platform (Shipyard); migration not applicable.' };
  }

  /**
   * Issue a `SoulboundMintPermit` (game admin executes), then build the player-signed `mint_soulbound_with_permit` tx.
   */
  private async issuePermitAndBuildPlayerMintTransaction(
    playerAddress: string,
    collectionId: string,
    metadata: Record<string, unknown>,
    embeddedImage: boolean = false
  ): Promise<{ success: boolean; transaction?: string; error?: string }> {
    const capOpts = { corridorCapabilityObjectId: getCorridorCapabilityObjectIdFromEnv() || undefined };
    const adminAddress = this.adminWallet.getAddress();
    const issueRes = await buildShipyardIssueSoulboundMintPermit(
      { recipient: playerAddress, sender: adminAddress, collectionId, metadata },
      capOpts
    );
    if (!issueRes.success || !issueRes.transaction) {
      return { success: false, error: issueRes.error ?? 'Failed to build permit issue transaction' };
    }

    const keypair = this.adminWallet.getKeypair();
    const issueBytes = Buffer.from(issueRes.transaction, 'base64');
    const signedIssue = await keypair.signTransaction(issueBytes);
    const issueSignature =
      typeof signedIssue === 'object' && signedIssue !== null && 'signature' in signedIssue
        ? (signedIssue as { signature: string }).signature
        : String(signedIssue);

    const execIssue = await platformTxClient.executeSigned(
      { transactionBytesBase64: issueRes.transaction, signature: issueSignature },
      capOpts
    );
    if (!execIssue.success) {
      return { success: false, error: execIssue.error ?? 'Permit issue execute failed' };
    }

    const permitId = findSoulboundMintPermitCreatedObjectId(execIssue.objectChanges);
    if (!permitId) {
      return {
        success: false,
        error:
          'Permit was issued but object id was not found in execute response. Upgrade on-chain Shipyard (SoulboundMintPermit) and ensure platform channel/execute returns objectChanges.',
      };
    }

    const mintRes = await buildShipyardMintSoulboundWithPermit(
      { sender: playerAddress, permitObjectId: permitId, embeddedImage },
      capOpts
    );
    if (!mintRes.success || !mintRes.transaction) {
      return { success: false, error: mintRes.error ?? 'Failed to build mint-with-permit transaction' };
    }
    return { success: true, transaction: mintRes.transaction };
  }

  /**
   * Build mint badge transaction for the **player** to sign: server issues `SoulboundMintPermit` (game admin signs once on-chain),
   * then returns the **consume-permit** mint PTB. Player submits that via channel/execute.
   */
  async buildMintBadgeTransaction(playerAddress: string, _sessionId?: string): Promise<{
    success: boolean;
    transaction?: string;
    error?: string;
  }> {
    try {
      const collectionId = getDefaultBadgeCollectionId(getEcosystemIdFromEnv());
      const badgeName = process.env.BADGE_NFT_NAME?.trim() || 'SuiTwo Player Badge';
      const imageUrl = (process.env.BADGE_NFT_IMAGE_URL?.trim() || 'https://example.com/badges/standard.webp') || 'https://example.com/badges/standard.webp';
      const description = process.env.BADGE_NFT_DESCRIPTION?.trim() || 'Earned by playing SuiTwo. Unlocks store and gameplay discounts.';
      const metadata = {
        name: badgeName,
        image_url: imageUrl,
        description,
        attributes: { type: 'badge', source: 'app', tier: 0 },
      };
      return await this.issuePermitAndBuildPlayerMintTransaction(playerAddress, collectionId, metadata, false);
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  /**
   * Break-glass mint: game admin wallet signs and pays gas; the soulbound NFT is minted **to the admin
   * address** (recipient = payer/owner). Shipyard `recipient` is the on-chain owner — not the platform.
   * Optional `grantTargetPlayerAddress` is stored in metadata only (soulbound cannot be transferred to them).
   */
  async executeMintBadgeAsAdmin(grantTargetPlayerAddress: string, tier: number = 0): Promise<{
    success: boolean;
    digest?: string;
    error?: string;
  }> {
    try {
      PlatformValidators.validateTier(tier);
      const adminAddress = this.adminWallet.getAddress();
      const grantTarget = grantTargetPlayerAddress?.trim() ?? '';
      if (grantTarget.startsWith('0x')) {
        PlatformValidators.validateAddress(grantTarget);
      }

      const alreadyAdmin = await this.hasBadge(adminAddress);
      if (alreadyAdmin) {
        return { success: false, error: 'Game admin wallet already has a badge in this collection.' };
      }

      const collectionId = getDefaultBadgeCollectionId(getEcosystemIdFromEnv());
      const badgeName = process.env.BADGE_NFT_NAME?.trim() || 'SuiTwo Player Badge';
      const imageUrl = this.getBadgeImageUrl(tier);
      const description = process.env.BADGE_NFT_DESCRIPTION?.trim() || 'Earned by playing SuiTwo. Unlocks store and gameplay discounts.';
      const attributes: Record<string, unknown> = {
        type: 'badge',
        source: 'admin',
        tier,
        games_played: 0,
        mint_owner: 'game_admin_wallet',
      };
      if (grantTarget.startsWith('0x') && grantTarget.toLowerCase() !== adminAddress.toLowerCase()) {
        attributes.grant_target_player = grantTarget;
      }
      const res = await buildShipyardBadgeMint(
        {
          recipient: adminAddress,
          sender: adminAddress,
          collectionId,
          metadata: {
            name: badgeName,
            image_url: imageUrl,
            description,
            attributes,
          },
        },
        { corridorCapabilityObjectId: getCorridorCapabilityObjectIdFromEnv() || undefined }
      );
      if (!res.success || !res.transaction) {
        return { success: false, error: res.error ?? 'Failed to build mint transaction' };
      }
      const txBytes = Buffer.from(res.transaction, 'base64');
      const keypair = this.adminWallet.getKeypair();
      const signed = await keypair.signTransaction(txBytes);
      const signature = typeof signed === 'object' && signed !== null && 'signature' in signed
        ? (signed as { signature: string }).signature
        : String(signed);
      const exec = await platformTxClient.executeSigned(
        { transactionBytesBase64: res.transaction, signature },
        { corridorCapabilityObjectId: getCorridorCapabilityObjectIdFromEnv() || undefined }
      );
      if (!exec.success) return { success: false, error: exec.error ?? 'Execute failed' };
      this.invalidateCache(adminAddress);
      return { success: true, digest: exec.digest };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  /**
   * Build upgrade badge transaction
   * Returns base64 transaction string for frontend to sign
   * 
   * @param playerAddress - Player's wallet address
   * @param badgeId - Badge object ID to upgrade
   * @param newTier - New tier number
   * @param sessionId - Session ID for idempotency
   */
  async buildUpgradeBadgeTransaction(
    playerAddress: string,
    badgeId: string,
    newTier: number,
    _sessionId: string
  ): Promise<{
    success: boolean;
    transaction?: string;
    gasEstimate?: string;
    error?: string;
  }> {
    try {
      const config = await getBadgeTierConfigFromPlatform({ corridorCapabilityObjectId: getCorridorCapabilityObjectIdFromEnv() || undefined });
      const metadata = this.getMetadataForTier(newTier, config);
      const res = await buildShipyardBadgeUpgrade(
        {
          sender: playerAddress,
          nftObjectId: badgeId,
          metadata: {
            name: metadata.name,
            image_url: metadata.image_url,
            description: metadata.description,
            attributes: metadata.attributes,
          },
        },
        { corridorCapabilityObjectId: getCorridorCapabilityObjectIdFromEnv() || undefined }
      );
      if (!res.success) return { success: false, error: res.error ?? 'Failed to build upgrade transaction' };
      return { success: true, transaction: res.transaction };
    } catch (err) {
      PlatformLogger.warn('Platform buildUpgradeBadgeTransaction failed', { playerAddress, badgeId, newTier, error: err });
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  /**
   * Check if badge tier upgrade is available (read-only, no transaction building).
   * Platform path: tier config from Helm, games from Hydroscope, current tier from badge NFT; upgrade if deserved > current.
   * Runs Helm config, Hydroscope stats, and Sonar tier resolution in parallel when possible.
   * Pass hints from the same HTTP request to skip duplicate Shipyard/Hydroscope/Sonar work.
   */
  async checkBadgeUpgrade(
    playerAddress: string,
    hints?: CheckBadgeUpgradeHints
  ): Promise<{
    success: boolean;
    hasPendingUpgrade: boolean;
    newTier?: number;
    badgeId?: string;
    error?: string;
    /** NFT tier when a badge was resolved (for GET /badges body); omitted if no badge */
    currentTier?: number;
  }> {
    try {
      const corridor = getCorridorCapabilityObjectIdFromEnv() || undefined;
      const usePreloadedTierConfig =
        hints != null && Object.prototype.hasOwnProperty.call(hints, 'preloadedBadgeTierConfig');
      const usePreloadedTotalGames =
        hints != null && Object.prototype.hasOwnProperty.call(hints, 'totalGames');
      const usePreloadedBadgeRow =
        hints != null && Object.prototype.hasOwnProperty.call(hints, 'preloadedBadgeRow');
      const [config, statsRes, badgeRow] = await Promise.all([
        usePreloadedTierConfig
          ? Promise.resolve(hints!.preloadedBadgeTierConfig ?? null)
          : getBadgeTierConfigFromPlatform({ corridorCapabilityObjectId: corridor }),
        usePreloadedTotalGames
          ? Promise.resolve({ success: true as const, totalGames: hints!.totalGames ?? 0 })
          : platformGameScoreClient.getPlayerStats(playerAddress, { corridorCapabilityObjectId: corridor }),
        usePreloadedBadgeRow
          ? Promise.resolve(hints!.preloadedBadgeRow ?? null)
          : this.resolveBadgeForUpgradeCheck(playerAddress, hints?.badgeId, hints?.resolvedTier),
      ]);

      const totalGames = usePreloadedTotalGames
        ? (hints!.totalGames ?? 0)
        : (statsRes.totalGames ?? 0);
      const deservedTier = this.computeDeservedTier(totalGames, config);
      if (!badgeRow) {
        return { success: true, hasPendingUpgrade: false };
      }
      const { badgeId, tier } = badgeRow;
      if (deservedTier <= tier) {
        return {
          success: true,
          hasPendingUpgrade: false,
          badgeId,
          currentTier: tier,
        };
      }
      return {
        success: true,
        hasPendingUpgrade: true,
        newTier: deservedTier,
        badgeId,
        currentTier: tier,
      };
    } catch (err) {
      PlatformLogger.warn('Platform checkBadgeUpgrade failed', { playerAddress, error: err });
      return { success: false, hasPendingUpgrade: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  /**
   * Check if badge tier should be updated and build transaction if needed
   * This is used when actually performing the upgrade (requires gas)
   */
  async checkAndBuildBadgeUpdate(
    playerAddress: string,
    sessionId: string,
    addToRetryQueue: boolean = true
  ): Promise<{
    success: boolean;
    tierUpgraded: boolean;
    newTier?: number;
    transactionData?: {
      packageId: string;
      module: string;
      function: string;
      arguments: any[];
      badgeId: string;
      imageData: Uint8Array;
    };
    error?: string;
  }> {
    return { success: true, tierUpgraded: false };
  }

  /**
   * Calculate badge tier from games played
   * Public method for external use (e.g., reconciliation)
   */
  public calculateTierFromGames(gamesPlayed: number): number {
    return calculateTierFromGames(gamesPlayed);
  }

  /**
   * Mint badge for a player: permit issue (admin executes) + return player-signed consume-permit tx (same as fulfill flow).
   */
  private async adminMintBadgeViaPlatform(
    playerAddress: string,
    tier: number
  ): Promise<{
    success: boolean;
    transaction?: string;
    digest?: string;
    error?: string;
    note?: string;
  }> {
    const hasBadge = await this.hasBadge(playerAddress);
    if (hasBadge) {
      return {
        success: false,
        error: 'Player already has a badge (platform).',
      };
    }
    const badgeName = process.env.BADGE_NFT_NAME || 'SuiTwo Player Badge';
    const imageUrl = this.getBadgeImageUrl(tier);
    const description = process.env.BADGE_NFT_DESCRIPTION || 'Earned by playing. Unlocks store and gameplay discounts.';
    const collectionId = getDefaultBadgeCollectionId(getEcosystemIdFromEnv());
    const res = await this.issuePermitAndBuildPlayerMintTransaction(playerAddress, collectionId, {
      name: badgeName,
      image_url: imageUrl,
      description,
      attributes: { type: 'badge', source: 'admin', tier, games_played: 0 },
    });
    if (!res.success) {
      return { success: false, error: res.error ?? 'Platform mint build failed' };
    }
    return {
      success: true,
      transaction: res.transaction,
      note: 'Build only. Player must sign and submit via POST /api/channel/execute (or game proxy).',
    };
  }

  /**
   * Admin function: Mint badge for a player (for testing)
   * @param playerAddress - Player's wallet address
   * @param tier - Badge tier (0-5)
   * @returns Transaction result
   */
  async adminMintBadge(
    playerAddress: string,
    tier: number
  ): Promise<{
    success: boolean;
    transaction?: string; // Serialized transaction bytes (base64) for player to sign
    digest?: string; // Not used anymore - transaction must be signed by player
    error?: string;
    note?: string;
  }> {
    PlatformLogger.info('Starting admin mint badge', {
      playerAddress,
      tier,
      timestamp: new Date().toISOString(),
    });

    // Validate input
    PlatformValidators.validateAddress(playerAddress);
    PlatformValidators.validateTier(tier);

    return this.adminMintBadgeViaPlatform(playerAddress, tier);
  }

  /**
   * Admin function: Clean up orphaned registry entry
   * Removes registry entry if badge object doesn't exist
   * @param playerAddress - Player address to clean up
   * @returns Transaction result
   */
  async adminCleanupOrphanedEntry(
    playerAddress: string
  ): Promise<{
    success: boolean;
    digest?: string;
    error?: string;
  }> {
    return { success: false, error: 'Badges are on platform (Shipyard); cleanup not applicable.' };
  }

  /**
   * Admin function: Burn (delete) a badge (for testing)
   * @param badgeId - Badge object ID to burn
   * @returns Transaction result
   */
  async adminBurnBadge(
    badgeId: string
  ): Promise<{
    success: boolean;
    digest?: string;
    error?: string;
  }> {
    return { success: false, error: 'Badges are on platform (Shipyard). Use platform NFT burn if available.' };
  }

  /**
   * Get discount percentages for a tier. No config = no discount (caller should pass config from game config when available).
   */
  getDiscounts(tier: number, config?: Parameters<typeof getDiscounts>[1]): {
    store: number;
    gameplay: number;
  } {
    return getDiscounts(tier, config);
  }

  /**
   * Update badge image URL via platform Shipyard (metadata upgrade).
   * Builds upgrade tx via Channel/Shipyard; the badge owner (player) must sign and submit.
   * @param playerAddress - Player's wallet address (badge owner)
   * @param imageUrl - URL to the badge image (optional, will construct from tier if not provided)
   * @returns Success with transaction for player to sign, or error. No game contract tx.
   */
  async updateBadgeImageUrl(
    playerAddress: string,
    imageUrl?: string
  ): Promise<{ success: boolean; transaction?: string; error?: string }> {
    try {
      const badge = await this.getBadge(playerAddress);
      if (!badge || !badge.badgeId) {
        return { success: false, error: 'Player does not have a badge' };
      }
      const url = imageUrl || this.getBadgeImageUrl(badge.tier);
      const config = await getBadgeTierConfigFromPlatform({ corridorCapabilityObjectId: getCorridorCapabilityObjectIdFromEnv() || undefined });
      const metadata = this.getMetadataForTier(badge.tier, config);
      const res = await buildShipyardBadgeUpgrade(
        {
          sender: playerAddress,
          nftObjectId: badge.badgeId,
          metadata: { ...metadata, image_url: url },
        },
        { corridorCapabilityObjectId: getCorridorCapabilityObjectIdFromEnv() || undefined }
      );
      if (!res.success) {
        return { success: false, error: res.error ?? 'Failed to build Shipyard upgrade for image URL' };
      }
      PlatformLogger.info('Built Shipyard upgrade for badge image URL', { playerAddress, badgeId: badge.badgeId, imageUrl: url });
      return { success: true, transaction: res.transaction };
    } catch (error) {
      PlatformLogger.error('Error updating badge image URL', { error, playerAddress });
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}

// Singleton instance
let badgeServiceInstance: BadgeService | null = null;

export function getBadgeService(): BadgeService {
  if (!badgeServiceInstance) {
    badgeServiceInstance = new BadgeService();
  }
  return badgeServiceInstance;
}

export const badgeService = getBadgeService();
export default badgeService;

