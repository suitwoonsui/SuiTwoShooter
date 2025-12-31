// ==========================================
// Admin Badge Management API Route
// ==========================================

import { NextRequest } from 'next/server';
import { getBadgeService } from '@/lib/sui/badge-service';
import { handleCorsPreflight } from '@/lib/cors';
import { getConfig } from '@/config/config';
import { getAdminWalletService } from '@/lib/sui/admin-wallet-service';
import { BadgeLogger } from '@/lib/sui/badge-logger';
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';
import { BadgeError, BadgeErrorCode } from '@/lib/sui/badge-errors';
import { BadgeValidators } from '@/lib/sui/badge-validators';

/**
 * POST /api/admin/badges
 * Admin-only endpoint for badge management (mint/burn/cleanup)
 * Supports both new and old contracts
 * 
 * Request body:
 * {
 *   action: 'mint' | 'burn' | 'cleanup',
 *   contract?: 'new' | 'old',  // Default: 'new'
 *   playerAddress?: string,     // Required for 'mint' and 'cleanup'
 *   tier?: number,              // Required for 'mint' (0-5)
 *   badgeId?: string,           // Required for 'burn'
 *   adminWalletAddress: string  // For verification
 * }
 */

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export const POST = withApiHandler(
  async (request: NextRequest) => {
    // Verify API key is configured (server-side check)
    const config = getConfig();
    if (!config.security.apiKey || config.security.apiKey === '') {
      throw new Error('API_KEY not configured on server. Please set API_KEY in backend/.env.local');
    }

    const body = await getRequestBody<{
      action: string;
      playerAddress?: string;
      tier?: number;
      badgeId?: string;
      adminWalletAddress: string;
      contract?: 'new' | 'old';
      packageId1?: string;
      packageId2?: string;
    }>(request);
    const { action, playerAddress, tier, badgeId, adminWalletAddress, contract } = body;

    // Verify admin wallet address matches
    const adminWallet = getAdminWalletService();
    const expectedAdminAddress = adminWallet.getAddress().toLowerCase();
    const providedAdminAddress = adminWalletAddress?.toLowerCase();

    if (!providedAdminAddress || providedAdminAddress !== expectedAdminAddress) {
      BadgeLogger.warn('Wallet verification failed', {
        expected: expectedAdminAddress,
        provided: providedAdminAddress || 'none',
      });
      throw new BadgeError(
        BadgeErrorCode.UNAUTHORIZED,
        'Unauthorized. Admin wallet verification failed. Please connect the correct admin wallet.'
      );
    }

    BadgeLogger.info('Admin wallet verified', { adminAddress: providedAdminAddress });

    const badgeService = getBadgeService();

    // Validate action
    const validActions = ['mint', 'burn', 'cleanup', 'find-old-objects', 'find-old-registry', 'inspect-old-contract', 'compare-packages', 'verify-old-config', 'verify-config'];
    if (!action || !validActions.includes(action)) {
      throw new Error(`Invalid action. Must be one of: ${validActions.join(', ')}`);
    }

    // Handle cleanup action
    if (action === 'cleanup') {
      // Validate cleanup parameters
      if (!playerAddress) {
        throw new BadgeError(
          BadgeErrorCode.INVALID_ADDRESS,
          'Invalid playerAddress. Must be a valid Sui address.'
        );
      }

      BadgeValidators.validateAddress(playerAddress);

      // Determine which contract to use (default to 'new')
      const contractType = contract || 'new';
      const useOldContract = contractType === 'old';

      BadgeLogger.info('Cleaning up orphaned entry', {
        playerAddress,
        contract: useOldContract ? 'OLD' : 'NEW',
      });

      const result = useOldContract
        ? await badgeService.adminCleanupOrphanedEntryOldContract(playerAddress)
        : await badgeService.adminCleanupOrphanedEntry(playerAddress);

      if (!result.success) {
        throw new Error(result.error || 'Failed to cleanup orphaned entry');
      }

      return {
        success: true,
        digest: result.digest,
        message: `Successfully cleaned up orphaned entry for ${playerAddress}`,
      };
    }

    if (action === 'inspect-old-contract') {
      // Inspect old contract functions
      BadgeLogger.info('Inspecting old contract functions');
      const inspectResult = await badgeService.inspectOldContractFunctions();
      
      if (!inspectResult.success) {
        throw new Error(inspectResult.error || 'Failed to inspect old contract');
      }

      return {
        success: true,
        functions: inspectResult.functions,
        message: `Found ${inspectResult.functions?.length || 0} functions in old contract`,
      };
    }

    if (action === 'find-old-registry') {
      // Find old BadgeRegistry object ID
      BadgeLogger.info('Finding old BadgeRegistry object');
      const findResult = await badgeService.findOldBadgeRegistry();
      
      if (!findResult.success) {
        throw new Error(findResult.error || 'Failed to find old BadgeRegistry');
      }

      return {
        success: true,
        registryId: findResult.registryId,
        registryType: findResult.registryType,
        message: `Found old BadgeRegistry: ${findResult.registryId}`,
      };
    }

    if (action === 'find-old-objects') {
      // Find all old contract objects (BadgeRegistry, AdminCapability, StatisticsRegistry)
      BadgeLogger.info('Finding all old contract objects');
      const findResult = await badgeService.findOldContractObjects();
      
      if (!findResult.success) {
        throw new Error(findResult.error || 'Failed to find old contract objects');
      }

      return {
        success: true,
        registryId: findResult.registryId,
        adminCapabilityId: findResult.adminCapabilityId,
        statisticsRegistryId: findResult.statisticsRegistryId,
        message: `Found all old contract objects from package ${process.env.OLD_GAME_SCORE_CONTRACT_TESTNET || 'unknown'}`,
      };
    }

    if (action === 'compare-packages') {
      // Compare two packages to determine which is older
      const { packageId1, packageId2 } = body;
      
      if (!packageId1 || !packageId2) {
        throw new Error('Both packageId1 and packageId2 are required');
      }
      
      BadgeLogger.info('Comparing packages', { packageId1, packageId2 });
      const compareResult = await badgeService.comparePackageAges(packageId1, packageId2);
      
      if (!compareResult.success) {
        throw new Error(compareResult.error || 'Failed to compare packages');
      }

      return {
        success: true,
        older: compareResult.older,
        newer: compareResult.newer,
        package1Date: compareResult.package1Date,
        package2Date: compareResult.package2Date,
        message: `Package ${compareResult.older?.substring(0, 10)}... is older than ${compareResult.newer?.substring(0, 10)}...`,
      };
    }

    if (action === 'verify-old-config') {
      // Verify old contract configuration
      BadgeLogger.info('Verifying old contract configuration');
      const verifyResult = await badgeService.verifyOldContractConfig();
      
      if (verifyResult.success) {
        return {
          success: true,
          config: verifyResult.config,
          message: 'Old contract configuration is correct - all objects are from the same package',
        };
      } else {
        return {
          success: false,
          config: verifyResult.config,
          issues: verifyResult.issues,
          error: verifyResult.error || 'Configuration issues found',
        };
      }
    }

    if (action === 'verify-config') {
      // Verify environment configuration
      BadgeLogger.info('Verifying environment configuration');
      const verifyResult = await badgeService.verifyEnvironmentConfig();
      
      if (verifyResult.success) {
        return {
          success: true,
          config: verifyResult.config,
          warnings: verifyResult.warnings,
          message: 'Environment configuration verified successfully',
        };
      } else {
        return {
          success: false,
          config: verifyResult.config,
          errors: verifyResult.errors,
          warnings: verifyResult.warnings,
          message: 'Environment configuration has errors',
        };
      }
    }

    if (action === 'mint') {
      // Validate mint parameters
      if (!playerAddress) {
        throw new BadgeError(
          BadgeErrorCode.INVALID_ADDRESS,
          'Invalid playerAddress. Must be a valid Sui address.'
        );
      }

      BadgeValidators.validateAddress(playerAddress);

      if (tier === undefined || tier === null || typeof tier !== 'number') {
        throw new BadgeError(
          BadgeErrorCode.INVALID_TIER,
          'Invalid tier. Must be a number (0-5).'
        );
      }

      if (tier < 0 || tier > 5) {
        throw new BadgeError(
          BadgeErrorCode.INVALID_TIER,
          'Invalid tier. Must be between 0 and 5.'
        );
      }

      // Determine which contract to use (default to 'new')
      const contractType = contract || 'new';
      const useOldContract = contractType === 'old';

      BadgeLogger.info('Building badge mint transaction', {
        playerAddress,
        tier,
        contract: useOldContract ? 'OLD' : 'NEW',
        note: 'Badge will be created at tier 0 (Standard), player must sign transaction',
      });

      const result = useOldContract
        ? await badgeService.adminMintBadgeOldContract(playerAddress, tier)
        : await badgeService.adminMintBadge(playerAddress, tier);

      if (!result.success) {
        throw new Error(result.error || 'Failed to mint badge');
      }

      return {
        success: true,
        digest: result.digest,
        message: result.note || `Badge minted successfully at tier ${tier}.`,
      };
    } else if (action === 'burn') {
      // Validate burn parameters
      if (!badgeId || typeof badgeId !== 'string') {
        throw new BadgeError(
          BadgeErrorCode.INVALID_BADGE_ID,
          'Invalid badgeId. Must be a valid Sui object ID.'
        );
      }

      // Determine which contract to use (default to 'new')
      const contractType = contract || 'new';
      const useOldContract = contractType === 'old';

      BadgeLogger.info('Burning badge', {
        badgeId,
        contract: useOldContract ? 'OLD' : 'NEW',
      });

      const result = useOldContract
        ? await badgeService.adminBurnBadgeOldContract(badgeId)
        : await badgeService.adminBurnBadge(badgeId);

      if (!result.success) {
        throw new Error(result.error || 'Failed to burn badge');
      }

      return {
        success: true,
        digest: result.digest,
        message: `Successfully burned badge ${badgeId}`,
      };
    }

    // If we get here, action was not handled (shouldn't happen due to validation above)
    throw new Error(`Action handler not implemented for: ${action}`);
  }
);

