import { NextRequest } from 'next/server';
import { suiService } from '@/lib/sui/suiService';
import { handleCorsPreflight } from '@/lib/cors';
import { withApiHandler, getAddressParam } from '@/lib/api/api-handler';

/**
 * GET /api/tokens/balance/[address]
 * Get token balance for a wallet address
 * Used for token gatekeeping (check if user has minimum $Mews balance)
 */

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

    // Validate address format (basic check - getAddressParam already validates Sui format, but this is more lenient)
    if (!address.startsWith('0x') || address.length < 10) {
      throw new Error('Invalid address format');
    }

    const balance = await suiService.getTokenBalance(address);

    return balance;
  }
);

