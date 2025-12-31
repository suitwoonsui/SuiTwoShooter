import { NextRequest } from 'next/server';
import { storeService } from '@/lib/sui/store-service';
import { handleCorsPreflight } from '@/lib/cors';
import { getConfig } from '@/config/config';
import { getAdminWalletService } from '@/lib/sui/admin-wallet-service';
import { BadgeLogger } from '@/lib/sui/badge-logger';
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';
import { BadgeError, BadgeErrorCode } from '@/lib/sui/badge-errors';
import { BadgeValidators } from '@/lib/sui/badge-validators';

/**
 * POST /api/admin/add-items
 * 
 * Server-side proxy for admin add items
 * Automatically uses API_KEY from environment (no need to send it from browser)
 * This allows a web UI to work without exposing the API key
 */
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export const POST = withApiHandler(
  async (request: NextRequest) => {
    // Verify API key is configured (server-side check)
    const config = getConfig();
    if (!config.security.apiKey || config.security.apiKey === '') {
      throw new Error('API_KEY not configured on server. Please set API_KEY in backend/.env.local');
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
        'Unauthorized. Admin wallet verification failed. Please connect the correct admin wallet.'
      );
    }

    BadgeLogger.info('Admin wallet verified', { adminAddress: providedAdminAddress });

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

    // Call store service (API key is already configured server-side)
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

