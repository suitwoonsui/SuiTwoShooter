// ==========================================
// Admin API - Add Items to Inventory
// ==========================================

import { NextRequest } from 'next/server';
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';
import { storeService } from '@/lib/sui/store-service';
import { getAdminWalletService } from '@/lib/sui/admin-wallet-service';
import { BadgeLogger } from '@/lib/sui/badge-logger';
import { BadgeError, BadgeErrorCode } from '@/lib/sui/badge-errors';
import { BadgeValidators } from '@/lib/sui/badge-validators';
import { getConfig } from '@/config/config';

export async function OPTIONS(request: NextRequest) {
  return new Response(null, { status: 204 });
}

export const POST = withApiHandler(
  async (request: NextRequest) => {
    const config = getConfig();
    if (!config.security.apiKey || config.security.apiKey === '') {
      throw new Error('API_KEY not configured on server.');
    }

    const body = await getRequestBody<{ 
      playerAddress: string; 
      items: Array<{ itemId: string; level: number; quantity: number }>; 
      adminWalletAddress: string;
    }>(request);
    const { playerAddress, items, adminWalletAddress } = body;

    // Verify admin wallet address matches
    const adminWallet = getAdminWalletService();
    const expectedAdminAddress = adminWallet.getAddress().toLowerCase();
    const providedAdminAddress = adminWalletAddress?.toLowerCase();

    if (!providedAdminAddress || providedAdminAddress !== expectedAdminAddress) {
      BadgeLogger.warn('Wallet verification failed', {
        expected: expectedAdminAddress,
        provided: providedAdminAddress || 'none',
      });
      throw new BadgeError(
        BadgeErrorCode.UNAUTHORIZED,
        'Unauthorized. Admin wallet verification failed.'
      );
    }

    // Validate request
    if (!playerAddress || typeof playerAddress !== 'string') {
      throw new BadgeError(
        BadgeErrorCode.INVALID_ADDRESS,
        'Invalid playerAddress. Must be a valid Sui address.'
      );
    }

    BadgeValidators.validateAddress(playerAddress);

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error('Invalid items. Must be a non-empty array.');
    }

    // Validate each item
    for (const item of items) {
      if (!item.itemId || !item.level || !item.quantity) {
        throw new Error('Each item must have itemId, level, and quantity.');
      }
      if (item.quantity <= 0) {
        throw new Error('Quantity must be greater than 0.');
      }
    }

    BadgeLogger.info('Server-side request to add items', {
      playerAddress,
      items,
    });

    // Use adminAddItems to add items
    const result = await storeService.adminAddItems(playerAddress, items);

    if (!result.success) {
      throw new Error(result.error || 'Failed to add items');
    }

    BadgeLogger.info('Items added successfully', {
      playerAddress,
      itemCount: items.length,
      digest: result.digest,
    });

    return {
      success: true,
      digest: result.digest,
      message: `Successfully added ${items.length} item(s) to inventory`,
    };
  }
);

