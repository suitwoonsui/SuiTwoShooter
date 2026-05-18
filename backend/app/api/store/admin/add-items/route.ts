import { NextRequest } from 'next/server';
import { platformInventoryClient, getEcosystemIdFromRequest } from '@/lib/services/platform/client/platform-client';
import { handleCorsPreflight } from '@/lib/cors';
import { verifyApiKey, getAdminIdentifier } from '@/lib/auth';
import { PlatformLogger } from '@/lib/services/platform/logging/platform-logger';
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';
import { PlatformError, PlatformErrorCode } from '@/lib/services/platform/errors/platform-errors';
import { PlatformValidators } from '@/lib/services/platform/validators/platform-validators';
import {
  type AdminInventoryItemInput,
  normalizeAdminInventoryItemForPlatform,
  validateAdminInventoryItem,
} from '@/lib/services/inventory/admin-inventory-item';

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
 *   items: Array<{ itemId: string, quantity: number, level?: number }> — level only for leveled SKUs
 * }
 */
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export const POST = withApiHandler(
  async (request: NextRequest) => {
    // Require admin authentication
    if (!verifyApiKey(request)) {
      throw new PlatformError(
        PlatformErrorCode.UNAUTHORIZED,
        'Unauthorized. Valid API key required.'
      );
    }

    const adminId = getAdminIdentifier(request);
    PlatformLogger.info('Authenticated admin request', { adminId });

    const body = await getRequestBody<{ 
      playerAddress: string; 
      items: AdminInventoryItemInput[];
      ecosystemId?: string;
    }>(request);
    const { playerAddress, items } = body;
    const ecosystemId = getEcosystemIdFromRequest(request, body);

    // Validate request
    if (!playerAddress || typeof playerAddress !== 'string') {
      throw new PlatformError(
        PlatformErrorCode.INVALID_ADDRESS,
        'Invalid playerAddress. Must be a valid Sui address.'
      );
    }

    PlatformValidators.validateAddress(playerAddress);

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error('Invalid items. Must be a non-empty array.');
    }

    for (const item of items) {
      validateAdminInventoryItem(item);
    }
    const platformItems = items.map(normalizeAdminInventoryItemForPlatform);

    PlatformLogger.info('Received request to add items', {
      adminId,
      playerAddress,
      items: platformItems,
    });

    // Call platform inventory API (inventory separated from store; per-ecosystem)
    const result = await platformInventoryClient.adminAddItems(
      { playerAddress, items: platformItems },
      { ecosystemId: ecosystemId || undefined }
    );

    if (!result.success) {
      throw new Error(result.error || 'Failed to add items');
    }

    PlatformLogger.info('Items added successfully', {
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


