// ==========================================
// Badge Validators Tests
// ==========================================

import { BadgeValidators } from '../lib/sui/badge-validators';
import { BadgeError, BadgeErrorCode } from '../lib/sui/badge-errors';

describe('BadgeValidators', () => {
  describe('validateAddress', () => {
    it('should accept valid Sui address', () => {
      const validAddress = '0x' + '1'.repeat(64);
      expect(() => BadgeValidators.validateAddress(validAddress)).not.toThrow();
    });

    it('should throw for missing address', () => {
      expect(() => BadgeValidators.validateAddress('')).toThrow(BadgeError);
      expect(() => BadgeValidators.validateAddress('')).toThrow('Address is required');
    });

    it('should throw for non-string address', () => {
      expect(() => BadgeValidators.validateAddress(null as any)).toThrow(BadgeError);
      expect(() => BadgeValidators.validateAddress(undefined as any)).toThrow(BadgeError);
    });

    it('should throw for address without 0x prefix', () => {
      const address = '1'.repeat(64);
      expect(() => BadgeValidators.validateAddress(address)).toThrow(BadgeError);
      expect(() => BadgeValidators.validateAddress(address)).toThrow('Must start with');
    });

    it('should throw for wrong length address', () => {
      const shortAddress = '0x' + '1'.repeat(63);
      const longAddress = '0x' + '1'.repeat(65);
      expect(() => BadgeValidators.validateAddress(shortAddress)).toThrow(BadgeError);
      expect(() => BadgeValidators.validateAddress(longAddress)).toThrow(BadgeError);
    });

    it('should throw for non-hex characters', () => {
      const invalidAddress = '0x' + 'g'.repeat(64);
      expect(() => BadgeValidators.validateAddress(invalidAddress)).toThrow(BadgeError);
      expect(() => BadgeValidators.validateAddress(invalidAddress)).toThrow('hex characters');
    });
  });

  describe('validateTier', () => {
    it('should accept valid tiers (0-5)', () => {
      for (let tier = 0; tier <= 5; tier++) {
        expect(() => BadgeValidators.validateTier(tier)).not.toThrow();
      }
    });

    it('should throw for missing tier', () => {
      expect(() => BadgeValidators.validateTier(undefined as any)).toThrow(BadgeError);
      expect(() => BadgeValidators.validateTier(null as any)).toThrow(BadgeError);
    });

    it('should throw for non-number tier', () => {
      expect(() => BadgeValidators.validateTier('1' as any)).toThrow(BadgeError);
    });

    it('should throw for non-integer tier', () => {
      expect(() => BadgeValidators.validateTier(1.5)).toThrow(BadgeError);
    });

    it('should throw for tier < 0', () => {
      expect(() => BadgeValidators.validateTier(-1)).toThrow(BadgeError);
    });

    it('should throw for tier > 5', () => {
      expect(() => BadgeValidators.validateTier(6)).toThrow(BadgeError);
    });
  });

  describe('validateBadgeId', () => {
    it('should accept valid badge ID', () => {
      const validId = '0x' + '1'.repeat(64);
      expect(() => BadgeValidators.validateBadgeId(validId)).not.toThrow();
    });

    it('should throw for invalid badge ID', () => {
      expect(() => BadgeValidators.validateBadgeId('invalid')).toThrow(BadgeError);
    });
  });

  describe('validateSessionId', () => {
    it('should accept valid session ID', () => {
      expect(() => BadgeValidators.validateSessionId('session-123')).not.toThrow();
    });

    it('should throw for missing session ID', () => {
      expect(() => BadgeValidators.validateSessionId('')).toThrow(BadgeError);
      expect(() => BadgeValidators.validateSessionId(null as any)).toThrow(BadgeError);
    });

    it('should throw for empty session ID', () => {
      expect(() => BadgeValidators.validateSessionId('   ')).toThrow(BadgeError);
    });
  });

  describe('validateGamesPlayed', () => {
    it('should accept valid games played', () => {
      expect(() => BadgeValidators.validateGamesPlayed(0)).not.toThrow();
      expect(() => BadgeValidators.validateGamesPlayed(100)).not.toThrow();
    });

    it('should throw for negative games played', () => {
      expect(() => BadgeValidators.validateGamesPlayed(-1)).toThrow(BadgeError);
    });

    it('should throw for non-integer games played', () => {
      expect(() => BadgeValidators.validateGamesPlayed(1.5)).toThrow(BadgeError);
    });
  });

  describe('validateImageUrl', () => {
    it('should accept valid HTTP URL', () => {
      expect(() => BadgeValidators.validateImageUrl('http://example.com/image.png')).not.toThrow();
    });

    it('should accept valid HTTPS URL', () => {
      expect(() => BadgeValidators.validateImageUrl('https://example.com/image.png')).not.toThrow();
    });

    it('should throw for non-HTTP(S) URL', () => {
      expect(() => BadgeValidators.validateImageUrl('ftp://example.com/image.png')).toThrow(BadgeError);
    });

    it('should throw for missing URL', () => {
      expect(() => BadgeValidators.validateImageUrl('')).toThrow(BadgeError);
    });
  });

  describe('validatePaymentCoinId', () => {
    it('should accept valid payment coin ID', () => {
      const validId = '0x' + '1'.repeat(64);
      expect(() => BadgeValidators.validatePaymentCoinId(validId)).not.toThrow();
    });

    it('should accept undefined (optional)', () => {
      expect(() => BadgeValidators.validatePaymentCoinId(undefined)).not.toThrow();
    });

    it('should throw for invalid payment coin ID', () => {
      expect(() => BadgeValidators.validatePaymentCoinId('invalid')).toThrow(BadgeError);
    });
  });
});

