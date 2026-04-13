import { NextRequest } from 'next/server';
import { storeService } from '@/lib/sui/store-service';
import { handleCorsPreflight } from '@/lib/cors';
import { verifyApiKey, getAdminIdentifier } from '@/lib/auth';
import { BadgeLogger } from '@/lib/sui/badge-logger';
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';
import { BadgeError, BadgeErrorCode } from '@/lib/sui/badge-errors';
import { BadgeValidators } from '@/lib/sui/badge-validators';

/**
 * POST /api/store/admin/add-items
 * 
 * Admin-only endpoint to add items to a player's inventory
 * Used for: testing, promotions, refunds, corrections
 * 
 * SECURITY: Protected with API key authentication
 * Requires: Authorization: Bearer <API_KEY> or X-API-Key: <API_KEY>
 * 
 * Request body:
 * {
 *   playerAddress: string,
 *   items: Array<{ itemId: string, level: number, quantity: number }>
 * }
 */
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export const POST = withApiHandler(
  async (request: NextRequest) => {
    // Require admin authentication
    if (!verifyApiKey(request)) {
      throw new BadgeError(
        BadgeErrorCode.UNAUTHORIZED,
        'Unauthorized. Valid API key required.'
      );
    }

    const adminId = getAdminIdentifier(request);
    BadgeLogger.info('Authenticated admin request', { adminId });

    const body = await getRequestBody<{ 
      playerAddress: string; 
      items: Array<{ itemId: string; level: number; quantity: number }>;
    }>(request);
    const { playerAddress, items } = body;

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

    BadgeLogger.info('Received request to add items', {
      adminId,
      playerAddress,
      items,
    });

    // Call store service
    const result = await storeService.adminAddItems(playerAddress, items);

    if (!result.success) {
      throw new Error(result.error || 'Failed to add items');
    }

    BadgeLogger.info('Items added successfully', {
      adminId,
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

