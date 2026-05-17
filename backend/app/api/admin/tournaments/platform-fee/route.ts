import { NextRequest } from 'next/server';
import { withApiHandler } from '@/lib/api/api-handler';
import { handleCorsPreflight } from '@/lib/cors';
import { platformTournamentClient, buildPlatformCallOptions } from '@/lib/services/platform/client/platform-client';
import { priceConverter } from '@/lib/services/payments/converter/price-converter';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export const GET = withApiHandler(async () => {
  const [tournamentFeeRes, vaultFeeRes] = await Promise.all([
    platformTournamentClient.getTournamentFee(buildPlatformCallOptions()),
    platformTournamentClient.getVaultFee(buildPlatformCallOptions()),
  ]);
  if (!tournamentFeeRes.success || typeof tournamentFeeRes.tournamentCreationFeeMist !== 'number') {
    return {
      success: false,
      error: tournamentFeeRes.error || 'Failed to fetch platform tournament fee.',
    };
  }
  if (!vaultFeeRes.success || typeof vaultFeeRes.vaultCreationFeeMist !== 'number') {
    return {
      success: false,
      error: vaultFeeRes.error || 'Failed to fetch platform vault fee.',
    };
  }

  const tournamentCreationFeeMist = Math.max(0, Math.floor(tournamentFeeRes.tournamentCreationFeeMist));
  const vaultCreationFeeMist = Math.max(0, Math.floor(vaultFeeRes.vaultCreationFeeMist));
  let tournamentCreationFeeUsdCentsEstimate: number | undefined;
  let vaultCreationFeeUsdCentsEstimate: number | undefined;
  let tokenPrices:
    | {
        SUI: number;
        MEWS: number;
        USDC: number;
      }
    | undefined;

  const prices = await priceConverter.getTokenPrices();
  if (prices.success && prices.prices && typeof prices.prices.sui === 'number' && prices.prices.sui > 0) {
    const tournamentFeeSui = tournamentCreationFeeMist / 1_000_000_000;
    const vaultFeeSui = vaultCreationFeeMist / 1_000_000_000;
    tournamentCreationFeeUsdCentsEstimate = Math.round(tournamentFeeSui * prices.prices.sui * 100);
    vaultCreationFeeUsdCentsEstimate = Math.round(vaultFeeSui * prices.prices.sui * 100);
    tokenPrices = {
      SUI: prices.prices.sui,
      MEWS: prices.prices.mews,
      USDC: prices.prices.usdc,
    };
  }

  return {
    success: true,
    tournamentCreationFeeMist,
    tournamentCreationFeeUsdCentsEstimate,
    vaultCreationFeeMist,
    vaultCreationFeeUsdCentsEstimate,
    tokenPrices,
  };
});

