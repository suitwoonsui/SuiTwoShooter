import { BadgeError, BadgeErrorCode } from '@/lib/sui/badge-errors';

export const BadgeValidators = {
  validateAddress(address: string) {
    const a = (address || '').trim();
    if (!a) {
      throw new BadgeError(BadgeErrorCode.INVALID_ADDRESS, 'Address is required');
    }
    // Sui addresses are 0x-prefixed hex; accept 0x + 1..64 hex chars (padded/short forms exist).
    if (!/^0x[0-9a-fA-F]{1,64}$/.test(a)) {
      throw new BadgeError(BadgeErrorCode.INVALID_ADDRESS, `Invalid address format: ${address}`);
    }
  },
};

