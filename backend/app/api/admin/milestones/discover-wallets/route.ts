// ==========================================
// Admin API - Discover Wallets with Milestone Claims
// ==========================================
// Discovers all wallets that have claimed milestones in the current AchievementRegistry

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
    BadgeLogger.info('Received GET request to /api/admin/milestones/discover-wallets');

    const config = getConfig();
    const adminWallet = getAdminWalletService();

    const achievementRegistryId = config.contracts.achievementRegistry;

    if (!achievementRegistryId || achievementRegistryId === '' || achievementRegistryId === '0x...') {
      throw new Error('Achievement registry not configured');
    }

    // Initialize Sui client
    const network = config.sui.network;
    const rpcUrl = network === 'testnet'
      ? getFullnodeUrl('testnet')
      : network === 'mainnet'
      ? getFullnodeUrl('mainnet')
      : config.sui.rpcUrl;

    const client = new SuiClient({ url: rpcUrl });

    BadgeLogger.info('Fetching all wallets with milestone claims from current registry', {
      achievementRegistryId,
    });

    try {
      // Get the AchievementRegistry object to access the claimed_milestone_ids table
      const registryObj = await client.getObject({
        id: achievementRegistryId,
        options: { showContent: true },
      });

      if (registryObj.error || !registryObj.data?.content) {
        throw new Error('Failed to read AchievementRegistry object');
      }

      const content = registryObj.data.content as any;
      const fields = content.fields as any;

      // Get the claimed_milestone_ids table (Table<address, vector<u64>>)
      if (!fields.claimed_milestone_ids) {
        BadgeLogger.warn('AchievementRegistry has no claimed_milestone_ids table');
        return {
          success: true,
          wallets: [],
          count: 0,
        };
      }

      // Get the table ID
      let tableId: string;
      if (fields.claimed_milestone_ids.fields && fields.claimed_milestone_ids.fields.id) {
        tableId = fields.claimed_milestone_ids.fields.id.id || fields.claimed_milestone_ids.fields.id;
      } else if (fields.claimed_milestone_ids.id) {
        tableId = fields.claimed_milestone_ids.id.id || fields.claimed_milestone_ids.id;
      } else {
        throw new Error('Could not find table ID in claimed_milestone_ids structure');
      }

      BadgeLogger.debug(`Claimed milestone IDs table ID: ${tableId}`);

      // Get all dynamic fields from the table
      // Each field is a player address (key) -> vector<u64> (value = milestone IDs)
      const dynamicFields = await client.getDynamicFields({
        parentId: tableId,
        limit: 10000, // Increase limit to get all wallets
      });

      BadgeLogger.debug(`Found ${dynamicFields.data.length} dynamic fields (wallets with claims)`);

      // Extract wallet addresses from dynamic field names
      const wallets: string[] = [];
      for (const field of dynamicFields.data) {
        if (field.name?.type === 'address' && field.name?.value) {
          wallets.push(String(field.name.value));
        } else if (typeof field.name === 'string') {
          // Fallback: if name is already a string address
          wallets.push(field.name);
        }
      }

      BadgeLogger.info(`Found ${wallets.length} wallets with milestone claims`);

      return {
        success: true,
        wallets,
        count: wallets.length,
      };
    } catch (error) {
      BadgeLogger.error('Error fetching wallets with milestone claims', error);
      throw new Error(
        error instanceof Error ? error.message : 'Failed to fetch wallets with milestone claims'
      );
    }
  }
);

