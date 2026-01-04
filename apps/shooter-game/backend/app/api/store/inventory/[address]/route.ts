// ==========================================
// Store Inventory API Route
// Returns player's inventory from blockchain
// ==========================================

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '../../../../../../../../base/backend/lib/cors';
import { storeService } from '../../../../../../../../backend/lib/sui/store-service';
import { BadgeLogger } from '../../../../../../../../base/backend/lib/sui/badge-logger';
import { withApiHandler, getAddressParam } from '../../../../../../../../base/backend/lib/api/api-handler';

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export const GET = withApiHandler(
  async (
    request: NextRequest,
    context: { params: Promise<{ address: string }> }
  ) => {
    const address = await getAddressParam(context.params);

    BadgeLogger.info('Fetching inventory', { address });

    // Query inventory from blockchain
    const result = await storeService.getInventory(address);

    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch inventory');
    }

    return {
      success: true,
      address,
      inventory: result.inventory || {},
    };
  }
);

