// ==========================================
// Game balance + gatekeeping (platform Sonar balance + game policy)
// GET /api/platform/tokens/balance/[address] → platform Sonar balance, then game applies min MEWS gate.
// Gatekeeping is game-specific; platform read goes through Sonar batch (getBalance leg), same semantics as legacy GET balance route.
// ==========================================

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { withApiHandler, getAddressParam } from '@/lib/api/api-handler';
import { platformSonarBalanceClient, buildPlatformCallOptions } from '@/lib/services/platform/client/platform-client';
import { getConfig } from '@/config/config';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

/**
 * GET /api/platform/tokens/balance/[address]
 * Calls platform Sonar balance (MEWS by default), then applies game gatekeeping (hasMinimumBalance from MIN_TOKEN_BALANCE).
 */
export const GET = withApiHandler(
  async (
    request: NextRequest,
    context: { params: Promise<{ address: string }> }
  ) => {
    const address = await getAddressParam(context.params);
    const config = getConfig();
    const mewsCoinType = config.token?.mewsTokenTypeId?.trim();
    const minBalance = BigInt(config.token?.minTokenBalance ?? 0);

    const result = await platformSonarBalanceClient.getBalance(address, {
      ...buildPlatformCallOptions(request),
      coinType: mewsCoinType || undefined, // default from platform is SUI when omitted; game passes MEWS for gatekeeping
    });

    if (!result.success || result.error) {
      return {
        success: false,
        address,
        totalBalance: '0',
        coinType: mewsCoinType ?? '',
        hasMinimumBalance: false,
        error: result.error,
      };
    }

    const hasMinimumBalance = minBalance <= BigInt(result.totalBalance);

    return {
      success: true,
      address: result.address,
      totalBalance: result.totalBalance,
      coinType: result.coinType,
      hasMinimumBalance,
    };
  }
);
