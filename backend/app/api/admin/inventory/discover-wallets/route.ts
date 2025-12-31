// ==========================================
// Admin API - Discover Wallets with Inventory
// ==========================================
// Discovers all wallets that have inventory in the current PremiumStore contract

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
    BadgeLogger.info('Received GET request to /api/admin/inventory/discover-wallets');

    const config = getConfig();
    const adminWallet = getAdminWalletService();

    const storeObjectId = config.contracts.premiumStoreObject;

    if (!storeObjectId || storeObjectId === '' || storeObjectId === '0x...') {
      throw new Error('Premium store object ID not configured');
    }

    // Initialize Sui client
    const network = config.sui.network;
    const rpcUrl = network === 'testnet'
      ? getFullnodeUrl('testnet')
      : network === 'mainnet'
      ? getFullnodeUrl('mainnet')
      : config.sui.rpcUrl;

    const client = new SuiClient({ url: rpcUrl });

    BadgeLogger.info('Fetching all wallets with inventory from current store', {
      storeObjectId,
    });

    try {
      // Get all dynamic fields from the PremiumStore
      // Each dynamic field represents a PlayerInventory for a wallet address
      const allFields = await client.getDynamicFields({
        parentId: storeObjectId,
      });

      BadgeLogger.debug(`Found ${allFields.data.length} dynamic fields (inventories)`);

      // Extract wallet addresses from dynamic field names
      const wallets: string[] = [];
      for (const field of allFields.data) {
        // Dynamic field name should be of type 'address'
        if (field.name?.type === 'address' && field.name?.value) {
          wallets.push(String(field.name.value));
        }
      }

      BadgeLogger.info(`Found ${wallets.length} wallets with inventory`);

      return {
        success: true,
        wallets,
        count: wallets.length,
      };
    } catch (error) {
      BadgeLogger.error('Error fetching wallets with inventory', error);
      throw new Error(
        error instanceof Error ? error.message : 'Failed to fetch wallets with inventory'
      );
    }
  }
);

