// ==========================================
// Admin API: Tournament settings (grace period, auto_distribute, etc.)
// GET: return current settings (platform Helm first, then file). PUT: update Helm + file (admin wallet required).
// Phase 6: GET returns auto_distribute, max_retries, max_concurrent_distributions; PUT accepts them and merges with existing Helm config.
// ==========================================

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';
import { getAdminWalletService } from '@/lib/services/wallet/admin/admin-wallet-service';
import { getTournamentSettings, setTournamentSettings, invalidateTournamentSettingsCache } from '@/lib/services/tournament/tournament-settings';
import { platformAppConfigClient, platformTxClient } from '@/lib/services/platform/client/platform-client';

const EVENT_DISTRIBUTION_CONFIG_KEY = 'event_distribution_config';
const CREATOR_REWARD_CONFIG_KEY = 'creator_reward_config';
const TIDE_CALLBACK_CONFIG_KEY = 'tide_callback_config';

type TournamentSettingsPutBody = {
  adminWalletAddress?: string;
  gracePeriodMinutes?: number;
  gracePeriodMs?: number;
  auto_distribute?: boolean;
  max_retries?: number;
  max_concurrent_distributions?: number;
  tideCallbackUrl?: string;
  creator_reward_enabled?: boolean;
  creator_reward_creation_fee_usd_cents?: number;
  creator_reward_boost_percentage?: number;
  creator_reward_standard_percentage?: number;
  creator_reward_token?: 'MEWS' | 'SUI' | 'USDC';
};

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export const GET = withApiHandler(async () => {
  const settings = await getTournamentSettings();
  let auto_distribute: boolean | undefined;
  let max_retries: number | undefined;
  let max_concurrent_distributions: number | undefined;
  let creator_reward_enabled: boolean | undefined;
  let creator_reward_creation_fee_usd_cents: number | undefined;
  let creator_reward_boost_percentage: number | undefined;
  let creator_reward_standard_percentage: number | undefined;
  let creator_reward_token: 'MEWS' | 'SUI' | 'USDC' | undefined;
  let tideCallbackUrl: string | undefined;
  try {
    const res = await platformAppConfigClient.getEventDistributionConfig();
    if (res.success && res.eventDistributionConfig) {
      auto_distribute = res.eventDistributionConfig.auto_distribute;
      max_retries = res.eventDistributionConfig.max_retries;
      max_concurrent_distributions = res.eventDistributionConfig.max_concurrent_distributions;
    }
  } catch {
    // use undefined when platform unavailable
  }
  try {
    const crRes = await platformAppConfigClient.getCreatorRewardConfig();
    if (crRes.success && crRes.creatorRewardConfig) {
      creator_reward_enabled = crRes.creatorRewardConfig.creator_reward_enabled;
      creator_reward_creation_fee_usd_cents = crRes.creatorRewardConfig.creator_reward_creation_fee_usd_cents;
      creator_reward_boost_percentage = crRes.creatorRewardConfig.creator_reward_boost_percentage;
      creator_reward_standard_percentage = crRes.creatorRewardConfig.creator_reward_standard_percentage;
      creator_reward_token = crRes.creatorRewardConfig.creator_reward_token;
    }
  } catch {
    // use undefined when platform unavailable
  }
  try {
    const tcRes = await platformAppConfigClient.getTideCallbackConfig();
    if (tcRes.success && tcRes.tideCallbackConfig?.callback_url) {
      tideCallbackUrl = tcRes.tideCallbackConfig.callback_url;
    }
  } catch {
    // use undefined when platform unavailable
  }
  return {
    success: true,
    settings: {
      gracePeriodMs: settings.gracePeriodMs,
      gracePeriodMinutes: Math.round(settings.gracePeriodMs / (60 * 1000)),
      auto_distribute,
      max_retries,
      max_concurrent_distributions,
      creator_reward_enabled,
      creator_reward_creation_fee_usd_cents,
      creator_reward_boost_percentage,
      creator_reward_standard_percentage,
      creator_reward_token,
      tideCallbackUrl,
    },
  };
});

export const PUT = withApiHandler(async (request: NextRequest) => {
  const body = await getRequestBody<TournamentSettingsPutBody>(request).catch(
    (): TournamentSettingsPutBody => ({})
  );
  const adminWalletService = getAdminWalletService();
  const expectedAdmin = adminWalletService.getAddress().toLowerCase();
  const providedAdmin = body?.adminWalletAddress?.toLowerCase();
  if (!providedAdmin || providedAdmin !== expectedAdmin) {
    throw new Error('Unauthorized. adminWalletAddress must match the game admin.');
  }

  const gracePeriodMinutes = body.gracePeriodMinutes;
  const gracePeriodMs = body.gracePeriodMs;
  let ms: number | undefined;
  if (typeof gracePeriodMs === 'number' && gracePeriodMs >= 0) {
    ms = gracePeriodMs;
  } else if (typeof gracePeriodMinutes === 'number' && gracePeriodMinutes >= 0) {
    ms = gracePeriodMinutes * 60 * 1000;
  }

  // Build merged event_distribution_config: start from current Helm, overlay body fields.
  let currentConfig: Record<string, unknown> = {};
  try {
    const res = await platformAppConfigClient.getEventDistributionConfig();
    if (res.success && res.eventDistributionConfig) {
      const c = res.eventDistributionConfig;
      if (c.grace_period_ms != null) currentConfig.grace_period_ms = c.grace_period_ms;
      if (c.auto_distribute !== undefined) currentConfig.auto_distribute = c.auto_distribute;
      if (c.max_retries !== undefined) currentConfig.max_retries = c.max_retries;
      if (c.max_concurrent_distributions !== undefined) currentConfig.max_concurrent_distributions = c.max_concurrent_distributions;
    }
  } catch {
    // use empty, will only write provided fields
  }
  if (ms !== undefined) currentConfig.grace_period_ms = ms;
  if (typeof body?.auto_distribute === 'boolean') currentConfig.auto_distribute = body.auto_distribute;
  if (typeof body?.max_retries === 'number' && body.max_retries >= 0) currentConfig.max_retries = body.max_retries;
  if (typeof body?.max_concurrent_distributions === 'number' && body.max_concurrent_distributions >= 0) {
    currentConfig.max_concurrent_distributions = body.max_concurrent_distributions;
  }

  const hasGraceChange = ms !== undefined;
  const hasDistributionChange =
    typeof body?.auto_distribute === 'boolean' ||
    (typeof body?.max_retries === 'number' && body.max_retries >= 0) ||
    (typeof body?.max_concurrent_distributions === 'number' && body.max_concurrent_distributions >= 0);
  const hasCreatorRewardChange =
    typeof body?.creator_reward_enabled === 'boolean' ||
    (typeof body?.creator_reward_creation_fee_usd_cents === 'number' && body.creator_reward_creation_fee_usd_cents >= 0) ||
    (typeof body?.creator_reward_boost_percentage === 'number' && body.creator_reward_boost_percentage >= 0) ||
    (typeof body?.creator_reward_standard_percentage === 'number' && body.creator_reward_standard_percentage >= 0) ||
    (body?.creator_reward_token === 'MEWS' || body?.creator_reward_token === 'SUI' || body?.creator_reward_token === 'USDC');
  const hasTideCallbackChange = body?.tideCallbackUrl !== undefined;

  if (!hasGraceChange && !hasDistributionChange && !hasCreatorRewardChange && !hasTideCallbackChange) {
    const current = await getTournamentSettings();
    let auto_distribute: boolean | undefined;
    let max_retries: number | undefined;
    let max_concurrent_distributions: number | undefined;
    try {
      const res = await platformAppConfigClient.getEventDistributionConfig();
      if (res.success && res.eventDistributionConfig) {
        auto_distribute = res.eventDistributionConfig.auto_distribute;
        max_retries = res.eventDistributionConfig.max_retries;
        max_concurrent_distributions = res.eventDistributionConfig.max_concurrent_distributions;
      }
    } catch {
      /* ignore */
    }
    let creator_reward_enabled: boolean | undefined;
    let creator_reward_creation_fee_usd_cents: number | undefined;
    let creator_reward_boost_percentage: number | undefined;
    let creator_reward_standard_percentage: number | undefined;
    let creator_reward_token: 'MEWS' | 'SUI' | 'USDC' | undefined;
    try {
      const crRes = await platformAppConfigClient.getCreatorRewardConfig();
      if (crRes.success && crRes.creatorRewardConfig) {
        creator_reward_enabled = crRes.creatorRewardConfig.creator_reward_enabled;
        creator_reward_creation_fee_usd_cents = crRes.creatorRewardConfig.creator_reward_creation_fee_usd_cents;
        creator_reward_boost_percentage = crRes.creatorRewardConfig.creator_reward_boost_percentage;
        creator_reward_standard_percentage = crRes.creatorRewardConfig.creator_reward_standard_percentage;
        creator_reward_token = crRes.creatorRewardConfig.creator_reward_token;
      }
    } catch {
      /* ignore */
    }
    let tideCallbackUrl: string | undefined;
    try {
      const tcRes = await platformAppConfigClient.getTideCallbackConfig();
      if (tcRes.success && tcRes.tideCallbackConfig?.callback_url) tideCallbackUrl = tcRes.tideCallbackConfig.callback_url;
    } catch {
      /* ignore */
    }
    return {
      success: true,
      settings: {
        gracePeriodMs: current.gracePeriodMs,
        gracePeriodMinutes: Math.round(current.gracePeriodMs / (60 * 1000)),
        auto_distribute,
        max_retries,
        max_concurrent_distributions,
        creator_reward_enabled,
        creator_reward_creation_fee_usd_cents,
        creator_reward_boost_percentage,
        creator_reward_standard_percentage,
        creator_reward_token,
        tideCallbackUrl,
      },
      message: 'No change requested.',
    };
  }

  // Write event_distribution_config to Helm when distribution/grace changed
  let helmUpdated = false;
  let helmError: string | undefined;
  if (hasGraceChange || hasDistributionChange) {
    try {
      const valueBase64 = Buffer.from(JSON.stringify(currentConfig), 'utf-8').toString('base64');
      const setRes = await platformAppConfigClient.setAppConfig(
        { key: EVENT_DISTRIBUTION_CONFIG_KEY, value: valueBase64, senderAddress: adminWalletService.getAddress() },
        {}
      );
      if (!setRes.transactionBytesBase64) {
        helmError = setRes.error || 'Platform did not return a transaction for Helm update.';
      } else {
        const txBytes = Buffer.from(setRes.transactionBytesBase64, 'base64');
        const signed = await adminWalletService.getKeypair().signTransaction(txBytes);
        const sig = typeof signed === 'object' && signed !== null && 'signature' in signed ? (signed as { signature: string }).signature : String(signed);
        const execRes = await platformTxClient.executeSigned({ transactionBytesBase64: setRes.transactionBytesBase64, signature: sig });
        if (execRes.success) {
          helmUpdated = true;
        } else {
          helmError = execRes.error || 'Platform executeSigned failed for Helm update.';
        }
      }
    } catch (e) {
      helmError = e instanceof Error ? e.message : String(e);
    }
  }

  // Write creator_reward_config to Helm when creator reward fields changed
  if (hasCreatorRewardChange) {
    let currentCr: Record<string, unknown> = {};
    try {
      const crRes = await platformAppConfigClient.getCreatorRewardConfig();
      if (crRes.success && crRes.creatorRewardConfig) {
        const c = crRes.creatorRewardConfig;
        if (c.creator_reward_enabled !== undefined) currentCr.creator_reward_enabled = c.creator_reward_enabled;
        if (c.creator_reward_creation_fee_usd_cents !== undefined) currentCr.creator_reward_creation_fee_usd_cents = c.creator_reward_creation_fee_usd_cents;
        if (c.creator_reward_boost_percentage !== undefined) currentCr.creator_reward_boost_percentage = c.creator_reward_boost_percentage;
        if (c.creator_reward_standard_percentage !== undefined) currentCr.creator_reward_standard_percentage = c.creator_reward_standard_percentage;
        if (c.creator_reward_token !== undefined) currentCr.creator_reward_token = c.creator_reward_token;
      }
    } catch {
      /* ignore */
    }
    if (typeof body?.creator_reward_enabled === 'boolean') currentCr.creator_reward_enabled = body.creator_reward_enabled;
    if (typeof body?.creator_reward_creation_fee_usd_cents === 'number' && body.creator_reward_creation_fee_usd_cents >= 0) {
      currentCr.creator_reward_creation_fee_usd_cents = body.creator_reward_creation_fee_usd_cents;
    }
    if (typeof body?.creator_reward_boost_percentage === 'number' && body.creator_reward_boost_percentage >= 0) {
      currentCr.creator_reward_boost_percentage = body.creator_reward_boost_percentage;
    }
    if (typeof body?.creator_reward_standard_percentage === 'number' && body.creator_reward_standard_percentage >= 0) {
      currentCr.creator_reward_standard_percentage = body.creator_reward_standard_percentage;
    }
    if (body?.creator_reward_token === 'MEWS' || body?.creator_reward_token === 'SUI' || body?.creator_reward_token === 'USDC') {
      currentCr.creator_reward_token = body.creator_reward_token;
    }
    try {
      const valueBase64 = Buffer.from(JSON.stringify(currentCr), 'utf-8').toString('base64');
      const setRes = await platformAppConfigClient.setAppConfig(
        { key: CREATOR_REWARD_CONFIG_KEY, value: valueBase64, senderAddress: adminWalletService.getAddress() },
        {}
      );
      if (setRes.transactionBytesBase64) {
        const txBytes = Buffer.from(setRes.transactionBytesBase64, 'base64');
        const signed = await adminWalletService.getKeypair().signTransaction(txBytes);
        const sig = typeof signed === 'object' && signed !== null && 'signature' in signed ? (signed as { signature: string }).signature : String(signed);
        const execRes = await platformTxClient.executeSigned({ transactionBytesBase64: setRes.transactionBytesBase64, signature: sig });
        if (execRes.success) helmUpdated = true;
      }
    } catch {
      // Platform unavailable
    }
  }

  // Write tide_callback_config to Helm when Tide callback URL changed
  if (hasTideCallbackChange) {
    try {
      const url = typeof body.tideCallbackUrl === 'string' ? body.tideCallbackUrl.trim().replace(/\/+$/, '') : '';
      const tideConfig = { callback_url: url || undefined };
      const valueBase64 = Buffer.from(JSON.stringify(tideConfig), 'utf-8').toString('base64');
      console.log('[GAME] Writing tide_callback_config to Helm', {
        key: TIDE_CALLBACK_CONFIG_KEY,
        tideConfig,
        valueBase64Length: valueBase64.length,
      });
      const setRes = await platformAppConfigClient.setAppConfig(
        { key: TIDE_CALLBACK_CONFIG_KEY, value: valueBase64, senderAddress: adminWalletService.getAddress() },
        {}
      );
      if (setRes.transactionBytesBase64) {
        const txBytes = Buffer.from(setRes.transactionBytesBase64, 'base64');
        const signed = await adminWalletService.getKeypair().signTransaction(txBytes);
        const sig = typeof signed === 'object' && signed !== null && 'signature' in signed ? (signed as { signature: string }).signature : String(signed);
        const execRes = await platformTxClient.executeSigned({ transactionBytesBase64: setRes.transactionBytesBase64, signature: sig });
        console.log('[GAME] tide_callback_config Helm write executed', {
          success: execRes.success === true,
          error: execRes.error,
          digest: execRes.digest,
        });
        if (execRes.success) helmUpdated = true;
      }
    } catch {
      // Platform unavailable
    }
  }

  const graceForFile = ms ?? (await getTournamentSettings()).gracePeriodMs;
  const updated = await setTournamentSettings({ gracePeriodMs: graceForFile });
  invalidateTournamentSettingsCache();

  let outCreatorReward: Record<string, unknown> = {};
  try {
    const crRes = await platformAppConfigClient.getCreatorRewardConfig();
    if (crRes.success && crRes.creatorRewardConfig) {
      outCreatorReward = {
        creator_reward_enabled: crRes.creatorRewardConfig.creator_reward_enabled,
        creator_reward_creation_fee_usd_cents: crRes.creatorRewardConfig.creator_reward_creation_fee_usd_cents,
        creator_reward_boost_percentage: crRes.creatorRewardConfig.creator_reward_boost_percentage,
        creator_reward_standard_percentage: crRes.creatorRewardConfig.creator_reward_standard_percentage,
        creator_reward_token: crRes.creatorRewardConfig.creator_reward_token,
      };
    }
  } catch {
    /* ignore */
  }

  let outTideCallbackUrl: string | undefined;
  try {
    const tcRes = await platformAppConfigClient.getTideCallbackConfig();
    if (tcRes.success && tcRes.tideCallbackConfig?.callback_url) outTideCallbackUrl = tcRes.tideCallbackConfig.callback_url;
  } catch {
    /* ignore */
  }

  const outSettings = {
    gracePeriodMs: updated.gracePeriodMs,
    gracePeriodMinutes: Math.round(updated.gracePeriodMs / (60 * 1000)),
    auto_distribute: currentConfig.auto_distribute as boolean | undefined,
    max_retries: currentConfig.max_retries as number | undefined,
    max_concurrent_distributions: currentConfig.max_concurrent_distributions as number | undefined,
    ...outCreatorReward,
    tideCallbackUrl: outTideCallbackUrl,
  };

  return {
    success: true,
    settings: outSettings,
    message: helmUpdated
      ? 'Tournament settings updated (Helm + file).'
      : 'Tournament settings updated (file only; Helm update failed).',
    helmUpdated,
    helmError,
  };
});
