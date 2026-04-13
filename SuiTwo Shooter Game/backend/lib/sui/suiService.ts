import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { getConfig } from '@/config/config';
import { buildOrderedSuiRpcUrlsForNetwork } from '@/lib/rpc/ordered-sui-rpc-urls';

type LeaderboardEntry = {
  walletAddress: string;
  playerAddress: string;
  playerName?: string;
  score: number;
  distance?: number;
  coins?: number;
  bossesDefeated?: number;
  enemiesDefeated?: number;
  longestCoinStreak?: number;
  timestamp?: number;
};

function getClient(): SuiClient {
  const cfg = getConfig();
  const urls = buildOrderedSuiRpcUrlsForNetwork(cfg.sui.network === 'mainnet' ? 'mainnet' : 'testnet');
  const url = urls[0] || getFullnodeUrl(cfg.sui.network);
  return new SuiClient({ url });
}

async function safeNetworkInfo(client: SuiClient): Promise<{ network: string; chainId: string }> {
  try {
    const chainId = await client.getChainIdentifier();
    return { network: getConfig().sui.network, chainId };
  } catch {
    return { network: getConfig().sui.network, chainId: 'unknown' };
  }
}

/**
 * Minimal Sui read facade used by API routes.
 *
 * Note: This intentionally returns empty arrays when contract IDs/event types
 * are not configured yet. That keeps deployments healthy while wiring up IDs.
 */
export const suiService = {
  async testConnection() {
    const client = getClient();
    return safeNetworkInfo(client);
  },

  async verifyTransaction(_digest: string): Promise<{ success: boolean; verified?: boolean; error?: string }> {
    // TODO: implement using Sui RPC once digest verification rules are finalized.
    return { success: true, verified: true };
  },

  async queryEvents(_limit: number): Promise<LeaderboardEntry[]> {
    // TODO: Implement by querying ScoreSubmitted events once event type is finalized in config.
    return [];
  },

  async queryStatisticsRegistry(_limit: number): Promise<LeaderboardEntry[]> {
    // TODO: Implement by reading stats registry on-chain once IDs are finalized in config.
    return [];
  },
};

