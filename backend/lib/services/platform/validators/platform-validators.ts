// ==========================================
// Platform Validators — Input validation (address, tier, badge id, session, image URL, etc.).
// Mirrors platform validation; uses game's platform-errors. Pass 2: consider re-export from @platform.
// ==========================================

import { PlatformError, PlatformErrorCode } from '@/lib/services/platform/errors/platform-errors';

export class PlatformValidators {
  static validateAddress(address: string): asserts address is string {
    if (!address || typeof address !== 'string') {
      throw new PlatformError(PlatformErrorCode.INVALID_ADDRESS, 'Address is required and must be a string');
    }
    if (!address.startsWith('0x')) {
      throw new PlatformError(PlatformErrorCode.INVALID_ADDRESS, `Invalid address format: ${address}. Must start with '0x'`);
    }
    if (address.length !== 66) {
      throw new PlatformError(PlatformErrorCode.INVALID_ADDRESS, `Invalid address length: ${address.length}. Must be 66 characters (0x + 64 hex)`);
    }
    const hexPart = address.slice(2);
    if (!/^[0-9a-fA-F]{64}$/.test(hexPart)) {
      throw new PlatformError(PlatformErrorCode.INVALID_ADDRESS, `Invalid address format: ${address}. Must contain only hex characters after '0x'`);
    }
  }

  static validateTier(tier: number): asserts tier is 0 | 1 | 2 | 3 | 4 | 5 {
    if (tier === undefined || tier === null) {
      throw new PlatformError(PlatformErrorCode.INVALID_TIER, 'Tier is required');
    }
    if (typeof tier !== 'number') {
      throw new PlatformError(PlatformErrorCode.INVALID_TIER, `Invalid tier type: ${typeof tier}. Must be a number`);
    }
    if (!Number.isInteger(tier)) {
      throw new PlatformError(PlatformErrorCode.INVALID_TIER, `Invalid tier: ${tier}. Must be an integer`);
    }
    if (tier < 0 || tier > 5) {
      throw new PlatformError(PlatformErrorCode.INVALID_TIER, `Invalid tier: ${tier}. Must be between 0 and 5`);
    }
  }

  static validateBadgeId(badgeId: string): void {
    this.validateAddress(badgeId);
  }

  static validateSessionId(sessionId: string): void {
    if (!sessionId || typeof sessionId !== 'string') {
      throw new PlatformError(PlatformErrorCode.INVALID_SESSION_ID, 'Session ID is required and must be a string');
    }
    if (sessionId.trim().length === 0) {
      throw new PlatformError(PlatformErrorCode.INVALID_SESSION_ID, 'Session ID cannot be empty');
    }
  }

  static validateGamesPlayed(gamesPlayed: number): void {
    if (gamesPlayed === undefined || gamesPlayed === null) {
      throw new PlatformError(PlatformErrorCode.INVALID_TIER, 'Games played is required');
    }
    if (typeof gamesPlayed !== 'number') {
      throw new PlatformError(PlatformErrorCode.INVALID_TIER, `Invalid games played type: ${typeof gamesPlayed}. Must be a number`);
    }
    if (!Number.isInteger(gamesPlayed) || gamesPlayed < 0) {
      throw new PlatformError(PlatformErrorCode.INVALID_TIER, `Invalid games played: ${gamesPlayed}. Must be a non-negative integer`);
    }
  }

  static validateImageUrl(imageUrl: string): void {
    if (!imageUrl || typeof imageUrl !== 'string') {
      throw new PlatformError(PlatformErrorCode.IMAGE_LOAD_FAILED, 'Image URL is required and must be a string');
    }
    if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
      throw new PlatformError(PlatformErrorCode.IMAGE_LOAD_FAILED, `Invalid image URL format: ${imageUrl}. Must start with http:// or https://`);
    }
  }

  static validatePaymentCoinId(paymentCoinId: string | undefined): void {
    if (paymentCoinId === undefined || paymentCoinId === null) return;
    if (typeof paymentCoinId !== 'string') {
      throw new PlatformError(PlatformErrorCode.INVALID_ADDRESS, `Invalid payment coin ID type: ${typeof paymentCoinId}. Must be a string`);
    }
    this.validateAddress(paymentCoinId);
  }
}
