// ==========================================
// Wallet Discovery Utility
// Reusable utility for discovering wallets from various contracts
// ==========================================

import { getApiUrl } from './get-api-url';

export type WalletDiscoveryType = 'inventory' | 'stats' | 'game-pass' | 'tournament' | 'badges' | 'milestones';

export interface WalletDiscoveryOptions {
  type: WalletDiscoveryType;
  isAdminWalletConnected: boolean;
  connectedAddress: string | null;
  adminAddress: string | null;
  // Optional parameters for migration/old contracts
  oldStoreObjectId?: string;
  oldStatsRegistryId?: string;
  oldPackageId?: string;
  oldGamePassSystemId?: string;
}

export interface WalletDiscoveryResult {
  success: boolean;
  wallets?: string[];
  count?: number;
  error?: string;
}

/**
 * Discover wallets from current contracts or old contracts (for migration)
 */
export async function discoverWallets(
  options: WalletDiscoveryOptions
): Promise<WalletDiscoveryResult> {
  const { type, isAdminWalletConnected, connectedAddress, adminAddress } = options;

  // Validate admin wallet connection
  if (!isAdminWalletConnected || connectedAddress !== adminAddress) {
    return {
      success: false,
      error: 'Admin wallet not connected. Please connect the admin wallet.',
    };
  }

  try {
    let apiUrl: string;
    const queryParams = new URLSearchParams();

    switch (type) {
      case 'inventory':
        // Use migration endpoint for old contracts, or create new endpoint for current
        if (options.oldStoreObjectId) {
          queryParams.append('oldStoreObjectId', options.oldStoreObjectId);
          apiUrl = `${getApiUrl('api/store/migrate')}?${queryParams.toString()}`;
        } else {
          // Use new endpoint for current contract
          apiUrl = getApiUrl('api/admin/inventory/discover-wallets');
        }
        break;

      case 'stats':
        if (options.oldStatsRegistryId || options.oldPackageId) {
          if (options.oldStatsRegistryId) {
            queryParams.append('oldStatsRegistryId', options.oldStatsRegistryId);
          }
          if (options.oldPackageId) {
            queryParams.append('oldPackageId', options.oldPackageId);
          }
          apiUrl = `${getApiUrl('api/scores/migrate')}?${queryParams.toString()}`;
        } else {
          // Use new endpoint for current contract
          apiUrl = getApiUrl('api/admin/stats/discover-wallets');
        }
        break;

      case 'game-pass':
        if (options.oldGamePassSystemId || options.oldPackageId) {
          if (options.oldGamePassSystemId) {
            queryParams.append('oldGamePassSystemId', options.oldGamePassSystemId);
          }
          if (options.oldPackageId) {
            queryParams.append('oldPackageId', options.oldPackageId);
          }
          apiUrl = `${getApiUrl('api/game-pass/migrate')}?${queryParams.toString()}`;
        } else {
          // Use new endpoint for current contract
          apiUrl = getApiUrl('api/admin/game-pass/discover-wallets');
        }
        break;

      case 'tournament':
        // Tournaments don't have a direct wallet discovery - they have participants
        // This would need to query tournaments and extract participants
        apiUrl = getApiUrl('api/admin/tournaments/discover-participants');
        break;

      case 'badges':
        apiUrl = getApiUrl('api/admin/badges/discover-wallets');
        break;

      case 'milestones':
        apiUrl = getApiUrl('api/admin/milestones/discover-wallets');
        break;

      default:
        return {
          success: false,
          error: `Unknown wallet discovery type: ${type}`,
        };
    }

    const response = await fetch(apiUrl);
    const data = await response.json();

    if (response.ok && data.success) {
      return {
        success: true,
        wallets: data.wallets || [],
        count: data.count || data.wallets?.length || 0,
      };
    } else {
      return {
        success: false,
        error: data.error || 'Failed to discover wallets',
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

