// ==========================================
// Admin API - Discover Wallets with Badges
// ==========================================
// Discovers all wallets that have badges in the current BadgeRegistry

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
    BadgeLogger.info('Received GET request to /api/admin/badges/discover-wallets');

    const config = getConfig();
    const adminWallet = getAdminWalletService();

    const badgeRegistryId = config.contracts.achievementRegistry;

    if (!badgeRegistryId || badgeRegistryId === '' || badgeRegistryId === '0x...') {
      throw new Error('Badge registry not configured');
    }

    // Initialize Sui client
    const network = config.sui.network;
    const rpcUrl = network === 'testnet'
      ? getFullnodeUrl('testnet')
      : network === 'mainnet'
      ? getFullnodeUrl('mainnet')
      : config.sui.rpcUrl;

    const client = new SuiClient({ url: rpcUrl });

    BadgeLogger.info('Fetching all wallets with badges from current registry', {
      badgeRegistryId,
    });

    try {
      // Get the BadgeRegistry object to access the badges table
      const registryObj = await client.getObject({
        id: badgeRegistryId,
        options: { showContent: true },
      });

      if (registryObj.error || !registryObj.data?.content) {
        throw new Error('Failed to read BadgeRegistry object');
      }

      const content = registryObj.data.content as any;
      const fields = content.fields as any;

      if (!fields.badges) {
        BadgeLogger.warn('BadgeRegistry has no badges table');
        return {
          success: true,
          wallets: [],
          count: 0,
        };
      }

      // Get the table ID (Tables are stored as dynamic fields)
      let tableId: string;
      if (fields.badges.fields && fields.badges.fields.id) {
        tableId = fields.badges.fields.id.id || fields.badges.fields.id;
      } else if (fields.badges.id) {
        tableId = fields.badges.id.id || fields.badges.id;
      } else {
        throw new Error('Could not find table ID in badges structure');
      }

      BadgeLogger.debug(`Badges table ID: ${tableId}`);

      // Get all dynamic fields from the table (each field is a player address -> Badge entry)
      const dynamicFields = await client.getDynamicFields({
        parentId: tableId,
      });

      BadgeLogger.debug(`Found ${dynamicFields.data.length} dynamic fields (badges)`);

      // Extract wallet addresses from dynamic field names
      const wallets: string[] = [];
      for (const field of dynamicFields.data) {
        if (field.name?.type === 'address' && field.name?.value) {
          wallets.push(String(field.name.value));
        }
      }

      BadgeLogger.info(`Found ${wallets.length} wallets with badges`);

      return {
        success: true,
        wallets,
        count: wallets.length,
      };
    } catch (error) {
      BadgeLogger.error('Error fetching wallets with badges', error);
      throw new Error(
        error instanceof Error ? error.message : 'Failed to fetch wallets with badges'
      );
    }
  }
);

