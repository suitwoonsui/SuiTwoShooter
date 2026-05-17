// ==========================================
// Wallet Discovery Utility
// Reusable utility for discovering wallets from various contracts
// All discover-wallets calls pass ecosystemId and appId so platform routes receive identity (same pattern for inventory, game-pass, etc.)
// ==========================================

import { getApiUrl } from './get-api-url';

export type WalletDiscoveryType =
  | 'inventory'
  | 'stats'
  | 'game-pass'
  | 'tournament'
  | 'badges'
  | 'milestones'
  | 'insignia';

export interface WalletDiscoveryOptions {
  type: WalletDiscoveryType;
  isAdminWalletConnected: boolean;
  connectedAddress: string | null;
  adminAddress: string | null;
  // Contract selection (new or old)
  contract?: 'new' | 'old';
  // Optional parameters for migration/old contracts
  oldStoreObjectId?: string;
  oldStatsRegistryId?: string;
  oldPackageId?: string;
  oldGamePassSystemId?: string;
  // Optional: ecosystemId and appId (from env when not provided; used by platform discover-wallets)
  ecosystemId?: string;
  appId?: string;
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

    // Add contract parameter if provided
    if (options.contract) {
      queryParams.append('contract', options.contract);
    }

    // Add ecosystemId and appId when provided (platform routes use these for per-app lookup; game backend proxy adds from env when not in request)
    if (options.ecosystemId) queryParams.append('ecosystemId', options.ecosystemId);
    if (options.appId) queryParams.append('appId', options.appId);

    switch (type) {
      case 'inventory':
        // Use migration endpoint for old contracts, or create new endpoint for current
        if (options.oldStoreObjectId) {
          queryParams.append('oldStoreObjectId', options.oldStoreObjectId);
          apiUrl = `${getApiUrl('api/store/migrate')}?${queryParams.toString()}`;
        } else {
          // Use new endpoint for current contract
          const baseUrl = getApiUrl('api/admin/inventory/discover-wallets');
          apiUrl = queryParams.toString() ? `${baseUrl}?${queryParams.toString()}` : baseUrl;
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
          const baseUrl = getApiUrl('api/admin/stats/discover-wallets');
          apiUrl = queryParams.toString() ? `${baseUrl}?${queryParams.toString()}` : baseUrl;
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
          const baseUrl = getApiUrl('api/admin/game-pass/discover-wallets');
          apiUrl = queryParams.toString() ? `${baseUrl}?${queryParams.toString()}` : baseUrl;
        }
        break;

      case 'tournament':
        // Tournaments don't have a direct wallet discovery - they have participants
        // This would need to query tournaments and extract participants
        apiUrl = getApiUrl('api/admin/tournaments/discover-participants');
        break;

      case 'badges':
        const badgesBaseUrl = getApiUrl('api/admin/badges/discover-wallets');
        apiUrl = queryParams.toString() ? `${badgesBaseUrl}?${queryParams.toString()}` : badgesBaseUrl;
        break;

      case 'milestones':
        const milestonesBaseUrl = getApiUrl('api/admin/milestones/discover-wallets');
        apiUrl = queryParams.toString() ? `${milestonesBaseUrl}?${queryParams.toString()}` : milestonesBaseUrl;
        break;

      case 'insignia':
        // Platform does not expose a global "list insignia wallets" endpoint.
        // This endpoint exists for UI consistency; discovery is typically done by searching individual wallets.
        const insigniaBaseUrl = getApiUrl('api/admin/insignia/discover-wallets');
        apiUrl = queryParams.toString() ? `${insigniaBaseUrl}?${queryParams.toString()}` : insigniaBaseUrl;
        break;

      default:
        return {
          success: false,
          error: `Unknown wallet discovery type: ${type}`,
        };
    }

    const response = await fetch(apiUrl, {
      headers: { 'X-Admin-Wallet': connectedAddress || '' },
    });
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

