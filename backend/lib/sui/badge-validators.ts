// ==========================================
// Badge Validators - Input validation utilities
// ==========================================

import { BadgeError, BadgeErrorCode } from './badge-errors';

/**
 * Validation utilities for badge service
 * Provides consistent validation across all badge operations
 */
export class BadgeValidators {
  /**
   * Validate a Sui address
   * @param address - Address to validate
   * @throws {BadgeError} If address is invalid
   */
  static validateAddress(address: string): asserts address is string {
    if (!address || typeof address !== 'string') {
      throw new BadgeError(
        BadgeErrorCode.INVALID_ADDRESS,
        'Address is required and must be a string'
      );
    }
    
    // Sui addresses are 0x followed by 64 hex characters (66 total)
    if (!address.startsWith('0x')) {
      throw new BadgeError(
        BadgeErrorCode.INVALID_ADDRESS,
        `Invalid address format: ${address}. Must start with '0x'`
      );
    }
    
    if (address.length !== 66) {
      throw new BadgeError(
        BadgeErrorCode.INVALID_ADDRESS,
        `Invalid address length: ${address.length}. Must be 66 characters (0x + 64 hex)`
      );
    }
    
    // Validate hex characters
    const hexPart = address.slice(2);
    if (!/^[0-9a-fA-F]{64}$/.test(hexPart)) {
      throw new BadgeError(
        BadgeErrorCode.INVALID_ADDRESS,
        `Invalid address format: ${address}. Must contain only hex characters after '0x'`
      );
    }
  }
  
  /**
   * Validate a badge tier (0-5)
   * @param tier - Tier to validate
   * @throws {BadgeError} If tier is invalid
   */
  static validateTier(tier: number): asserts tier is 0 | 1 | 2 | 3 | 4 | 5 {
    if (tier === undefined || tier === null) {
      throw new BadgeError(
        BadgeErrorCode.INVALID_TIER,
        'Tier is required'
      );
    }
    
    if (typeof tier !== 'number') {
      throw new BadgeError(
        BadgeErrorCode.INVALID_TIER,
        `Invalid tier type: ${typeof tier}. Must be a number`
      );
    }
    
    if (!Number.isInteger(tier)) {
      throw new BadgeError(
        BadgeErrorCode.INVALID_TIER,
        `Invalid tier: ${tier}. Must be an integer`
      );
    }
    
    if (tier < 0 || tier > 5) {
      throw new BadgeError(
        BadgeErrorCode.INVALID_TIER,
        `Invalid tier: ${tier}. Must be between 0 and 5`
      );
    }
  }
  
  /**
   * Validate a badge ID (same format as address)
   * @param badgeId - Badge ID to validate
   * @throws {BadgeError} If badge ID is invalid
   */
  static validateBadgeId(badgeId: string): void {
    this.validateAddress(badgeId); // Same format as address
  }
  
  /**
   * Validate a session ID
   * @param sessionId - Session ID to validate
   * @throws {BadgeError} If session ID is invalid
   */
  static validateSessionId(sessionId: string): void {
    if (!sessionId || typeof sessionId !== 'string') {
      throw new BadgeError(
        BadgeErrorCode.INVALID_SESSION_ID,
        'Session ID is required and must be a string'
      );
    }
    
    if (sessionId.trim().length === 0) {
      throw new BadgeError(
        BadgeErrorCode.INVALID_SESSION_ID,
        'Session ID cannot be empty'
      );
    }
  }
  
  /**
   * Validate games played count
   * @param gamesPlayed - Games played count to validate
   * @throws {BadgeError} If games played is invalid
   */
  static validateGamesPlayed(gamesPlayed: number): void {
    if (gamesPlayed === undefined || gamesPlayed === null) {
      throw new BadgeError(
        BadgeErrorCode.INVALID_TIER,
        'Games played is required'
      );
    }
    
    if (typeof gamesPlayed !== 'number') {
      throw new BadgeError(
        BadgeErrorCode.INVALID_TIER,
        `Invalid games played type: ${typeof gamesPlayed}. Must be a number`
      );
    }
    
    if (!Number.isInteger(gamesPlayed)) {
      throw new BadgeError(
        BadgeErrorCode.INVALID_TIER,
        `Invalid games played: ${gamesPlayed}. Must be an integer`
      );
    }
    
    if (gamesPlayed < 0) {
      throw new BadgeError(
        BadgeErrorCode.INVALID_TIER,
        `Invalid games played: ${gamesPlayed}. Must be non-negative`
      );
    }
  }
  
  /**
   * Validate an image URL
   * @param imageUrl - Image URL to validate
   * @throws {BadgeError} If image URL is invalid
   */
  static validateImageUrl(imageUrl: string): void {
    if (!imageUrl || typeof imageUrl !== 'string') {
      throw new BadgeError(
        BadgeErrorCode.IMAGE_LOAD_FAILED,
        'Image URL is required and must be a string'
      );
    }
    
    if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
      throw new BadgeError(
        BadgeErrorCode.IMAGE_LOAD_FAILED,
        `Invalid image URL format: ${imageUrl}. Must start with http:// or https://`
      );
    }
  }
  
  /**
   * Validate payment coin ID (optional, but if provided must be valid)
   * @param paymentCoinId - Payment coin ID to validate
   * @throws {BadgeError} If payment coin ID is invalid
   */
  static validatePaymentCoinId(paymentCoinId: string | undefined): void {
    if (paymentCoinId === undefined || paymentCoinId === null) {
      return; // Optional field
    }
    
    if (typeof paymentCoinId !== 'string') {
      throw new BadgeError(
        BadgeErrorCode.INVALID_ADDRESS,
        `Invalid payment coin ID type: ${typeof paymentCoinId}. Must be a string`
      );
    }
    
    // Payment coin ID should be a valid object ID (same format as address)
    this.validateAddress(paymentCoinId);
  }
}

