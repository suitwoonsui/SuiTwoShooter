// ==========================================
// Store Consume API Route
// Consumes items from inventory (admin wallet signs)
// ==========================================

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { storeService } from '@/lib/sui/store-service';
import { BadgeLogger } from '@/lib/sui/badge-logger';
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';
import { BadgeError, BadgeErrorCode } from '@/lib/sui/badge-errors';
import { BadgeValidators } from '@/lib/sui/badge-validators';

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export const POST = withApiHandler(
  async (request: NextRequest) => {
    BadgeLogger.info('Received POST request to /api/store/consume');
    
    const body = await getRequestBody<{ playerAddress: string; items: Array<{ itemId: string; level: number; quantity: number }> }>(request);
    BadgeLogger.debug('Request body', { body });
    
    const { playerAddress, items } = body;

    // Validate required fields
    if (!playerAddress) {
      throw new BadgeError(
        BadgeErrorCode.INVALID_ADDRESS,
        'playerAddress is required'
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error('items array is required and must not be empty');
    }

    // Validate player address format
    BadgeValidators.validateAddress(playerAddress);

    // Validate items structure
    for (const item of items) {
      if (!item.itemId || typeof item.itemId !== 'string') {
        throw new Error('Each item must have a valid itemId');
      }

      if (!item.level || typeof item.level !== 'number' || item.level < 1 || item.level > 3) {
        throw new Error('Each item must have a valid level (1-3)');
      }

      if (!item.quantity || typeof item.quantity !== 'number' || item.quantity < 1) {
        throw new Error('Each item must have a valid quantity (>= 1)');
      }
    }

    BadgeLogger.info('Consuming items', {
      playerAddress,
      itemCount: items.length,
      items: items.map((item, idx) => ({
        index: idx + 1,
        itemId: item.itemId,
        level: item.level,
        quantity: item.quantity,
      })),
    });

    // Consume items (admin wallet signs)
    BadgeLogger.debug('Calling storeService.consumeItems', { playerAddress });
    const result = await storeService.consumeItems(playerAddress, items);
    BadgeLogger.debug('storeService.consumeItems returned', { result });

    if (!result.success) {
      throw new Error(result.error || 'Failed to consume items');
    }

    BadgeLogger.info('Items consumed successfully', {
      playerAddress,
      digest: result.digest,
      itemCount: items.length,
    });

    return {
      success: true,
      digest: result.digest,
      playerAddress,
      items,
      gasPaidBy: 'admin_wallet',
      message: 'Items consumed successfully. Admin wallet paid gas fees.',
    };
  }
);

