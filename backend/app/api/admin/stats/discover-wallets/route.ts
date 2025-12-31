// ==========================================
// Admin API - Discover Wallets with Stats
// ==========================================
// Discovers all wallets that have statistics in the current StatisticsRegistry

import { NextRequest } from 'next/server';
import { withApiHandler } from '@/lib/api/api-handler';
import { getAdminWalletService } from '@/lib/sui/admin-wallet-service';
import { getConfig } from '@/config/config';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { BadgeLogger } from '@/lib/sui/badge-logger';

export async function OPTIONS(request: NextRequest) {
  return new Response(null, { status: 204 });
}

export const GET = withApiHandler(
  async (request: NextRequest) => {
    BadgeLogger.info('Received GET request to /api/admin/stats/discover-wallets');

    const config = getConfig();
    const adminWallet = getAdminWalletService();

    const statsRegistryId = config.contracts.statisticsRegistry;

    if (!statsRegistryId || statsRegistryId === '' || statsRegistryId === '0x...') {
      throw new Error('Statistics registry not configured');
    }

    // Initialize Sui client
    const network = config.sui.network;
    const rpcUrl = network === 'testnet'
      ? getFullnodeUrl('testnet')
      : network === 'mainnet'
      ? getFullnodeUrl('mainnet')
      : config.sui.rpcUrl;

    const client = new SuiClient({ url: rpcUrl });

    BadgeLogger.info('Fetching all wallets with stats from current registry', {
      statsRegistryId,
    });

    try {
      // Get the StatisticsRegistry object to access the player_stats table
      const registryObj = await client.getObject({
        id: statsRegistryId,
        options: { showContent: true },
      });

      if (registryObj.error || !registryObj.data?.content) {
        throw new Error('Failed to read StatisticsRegistry object');
      }

      const content = registryObj.data.content as any;
      const fields = content.fields as any;

      if (!fields.player_stats) {
        BadgeLogger.warn('StatisticsRegistry has no player_stats table');
        return {
          success: true,
          wallets: [],
          count: 0,
        };
      }

      // Get the table ID (Tables are stored as dynamic fields)
      let tableId: string;
      if (fields.player_stats.fields && fields.player_stats.fields.id) {
        tableId = fields.player_stats.fields.id.id || fields.player_stats.fields.id;
      } else if (fields.player_stats.id) {
        tableId = fields.player_stats.id.id || fields.player_stats.id;
      } else {
        throw new Error('Could not find table ID in player_stats structure');
      }

      BadgeLogger.debug(`Player stats table ID: ${tableId}`);

      // Get all dynamic fields from the table (each field is a player address -> PlayerStats entry)
      const dynamicFields = await client.getDynamicFields({
        parentId: tableId,
      });

      BadgeLogger.debug(`Found ${dynamicFields.data.length} dynamic fields (player stats)`);

      // Extract wallet addresses from dynamic field names
      const wallets: string[] = [];
      for (const field of dynamicFields.data) {
        if (field.name?.type === 'address' && field.name?.value) {
          wallets.push(String(field.name.value));
        }
      }

      BadgeLogger.info(`Found ${wallets.length} wallets with stats`);

      return {
        success: true,
        wallets,
        count: wallets.length,
      };
    } catch (error) {
      BadgeLogger.error('Error fetching wallets with stats', error);
      throw new Error(
        error instanceof Error ? error.message : 'Failed to fetch wallets with stats'
      );
    }
  }
);

