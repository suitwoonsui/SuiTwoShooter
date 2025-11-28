// ==========================================
// Admin Badge Management API Route
// ==========================================

import { NextRequest, NextResponse } from 'next/server';
import { getBadgeService } from '@/lib/sui/badge-service';
import { getCorsHeaders, handleCorsPreflight } from '@/lib/cors';
import { getConfig } from '@/config/config';
import { getAdminWalletService } from '@/lib/sui/admin-wallet-service';

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

export async function POST(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request);

  try {
    // Verify API key is configured (server-side check)
    const config = getConfig();
    if (!config.security.apiKey || config.security.apiKey === '') {
      return NextResponse.json(
        {
          success: false,
          error: 'API_KEY not configured on server. Please set API_KEY in backend/.env.local',
        },
        { status: 500, headers: corsHeaders }
      );
    }

    const body = await request.json();
    const { action, playerAddress, tier, badgeId, adminWalletAddress, contract } = body;

    // Verify admin wallet address matches
    const adminWallet = getAdminWalletService();
    const expectedAdminAddress = adminWallet.getAddress().toLowerCase();
    const providedAdminAddress = adminWalletAddress?.toLowerCase();

    if (!providedAdminAddress || providedAdminAddress !== expectedAdminAddress) {
      console.warn('⚠️ [ADMIN BADGE API] Wallet verification failed');
      console.warn(`   Expected: ${expectedAdminAddress}`);
      console.warn(`   Provided: ${providedAdminAddress || 'none'}`);
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized. Admin wallet verification failed. Please connect the correct admin wallet.',
        },
        { status: 403, headers: corsHeaders }
      );
    }

    console.log('✅ [ADMIN BADGE API] Admin wallet verified:', providedAdminAddress);

    const badgeService = getBadgeService();

    // Validate action
    const validActions = ['mint', 'burn', 'cleanup', 'find-old-objects', 'find-old-registry', 'inspect-old-contract', 'compare-packages', 'verify-old-config'];
    if (!action || !validActions.includes(action)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid action. Must be one of: ${validActions.join(', ')}`,
        },
        { status: 400, headers: corsHeaders }
      );
    }

    // Handle cleanup action
    if (action === 'cleanup') {
      // Validate cleanup parameters
      if (!playerAddress || typeof playerAddress !== 'string' || !playerAddress.startsWith('0x')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid playerAddress. Must be a valid Sui address.',
          },
          { status: 400, headers: corsHeaders }
        );
      }

      // Determine which contract to use (default to 'new')
      const contractType = contract || 'new';
      const useOldContract = contractType === 'old';

      console.log(`🧹 [ADMIN BADGE API] Cleaning up orphaned entry for: ${playerAddress}`);
      console.log(`🧹 [ADMIN BADGE API] Contract: ${useOldContract ? 'OLD' : 'NEW'}`);

      const result = useOldContract
        ? await badgeService.adminCleanupOrphanedEntryOldContract(playerAddress)
        : await badgeService.adminCleanupOrphanedEntry(playerAddress);

      if (result.success) {
        return NextResponse.json(
          {
            success: true,
            digest: result.digest,
            message: `Successfully cleaned up orphaned entry for ${playerAddress}`,
          },
          { headers: corsHeaders }
        );
      } else {
        return NextResponse.json(
          {
            success: false,
            error: result.error || 'Failed to cleanup orphaned entry',
          },
          { status: 500, headers: corsHeaders }
        );
      }
    }

    if (action === 'inspect-old-contract') {
      // Inspect old contract functions
      console.log(`🔍 [ADMIN BADGE API] Inspecting old contract functions...`);
      const inspectResult = await badgeService.inspectOldContractFunctions();
      
      if (inspectResult.success) {
        return NextResponse.json(
          {
            success: true,
            functions: inspectResult.functions,
            message: `Found ${inspectResult.functions?.length || 0} functions in old contract`,
          },
          { headers: corsHeaders }
        );
      } else {
        return NextResponse.json(
          {
            success: false,
            error: inspectResult.error || 'Failed to inspect old contract',
          },
          { status: 500, headers: corsHeaders }
        );
      }
    }

    if (action === 'find-old-registry') {
      // Find old BadgeRegistry object ID
      console.log(`🔍 [ADMIN BADGE API] Finding old BadgeRegistry object...`);
      const findResult = await badgeService.findOldBadgeRegistry();
      
      if (findResult.success) {
        return NextResponse.json(
          {
            success: true,
            registryId: findResult.registryId,
            registryType: findResult.registryType,
            message: `Found old BadgeRegistry: ${findResult.registryId}`,
          },
          { headers: corsHeaders }
        );
      } else {
        return NextResponse.json(
          {
            success: false,
            error: findResult.error || 'Failed to find old BadgeRegistry',
          },
          { status: 500, headers: corsHeaders }
        );
      }
    }

    if (action === 'find-old-objects') {
      // Find all old contract objects (BadgeRegistry, AdminCapability, StatisticsRegistry)
      console.log(`🔍 [ADMIN BADGE API] Finding all old contract objects...`);
      const findResult = await badgeService.findOldContractObjects();
      
      if (findResult.success) {
        return NextResponse.json(
          {
            success: true,
            registryId: findResult.registryId,
            adminCapabilityId: findResult.adminCapabilityId,
            statisticsRegistryId: findResult.statisticsRegistryId,
            message: `Found all old contract objects from package ${process.env.OLD_GAME_SCORE_CONTRACT_TESTNET || 'unknown'}`,
          },
          { headers: corsHeaders }
        );
      } else {
        return NextResponse.json(
          {
            success: false,
            error: findResult.error || 'Failed to find old contract objects',
          },
          { status: 500, headers: corsHeaders }
        );
      }
    }

    if (action === 'compare-packages') {
      // Compare two packages to determine which is older
      const { packageId1, packageId2 } = body;
      
      if (!packageId1 || !packageId2) {
        return NextResponse.json(
          {
            success: false,
            error: 'Both packageId1 and packageId2 are required',
          },
          { status: 400, headers: corsHeaders }
        );
      }
      
      console.log(`🔍 [ADMIN BADGE API] Comparing packages...`);
      const compareResult = await badgeService.comparePackageAges(packageId1, packageId2);
      
      if (compareResult.success) {
        return NextResponse.json(
          {
            success: true,
            older: compareResult.older,
            newer: compareResult.newer,
            package1Date: compareResult.package1Date,
            package2Date: compareResult.package2Date,
            message: `Package ${compareResult.older?.substring(0, 10)}... is older than ${compareResult.newer?.substring(0, 10)}...`,
          },
          { headers: corsHeaders }
        );
      } else {
        return NextResponse.json(
          {
            success: false,
            error: compareResult.error || 'Failed to compare packages',
          },
          { status: 500, headers: corsHeaders }
        );
      }
    }

    if (action === 'verify-old-config') {
      // Verify old contract configuration
      console.log(`🔍 [ADMIN BADGE API] Verifying old contract configuration...`);
      const verifyResult = await badgeService.verifyOldContractConfig();
      
      if (verifyResult.success) {
        return NextResponse.json(
          {
            success: true,
            config: verifyResult.config,
            message: 'Old contract configuration is correct - all objects are from the same package',
          },
          { headers: corsHeaders }
        );
      } else {
        return NextResponse.json(
          {
            success: false,
            config: verifyResult.config,
            issues: verifyResult.issues,
            error: verifyResult.error || 'Configuration issues found',
          },
          { status: 400, headers: corsHeaders }
        );
      }
    }

    if (action === 'verify-config') {
      // Verify environment configuration
      console.log(`🔍 [ADMIN BADGE API] Verifying environment configuration...`);
      const verifyResult = await badgeService.verifyEnvironmentConfig();
      
      if (verifyResult.success) {
        return NextResponse.json(
          {
            success: true,
            config: verifyResult.config,
            warnings: verifyResult.warnings,
            message: 'Environment configuration verified successfully',
          },
          { headers: corsHeaders }
        );
      } else {
        return NextResponse.json(
          {
            success: false,
            config: verifyResult.config,
            errors: verifyResult.errors,
            warnings: verifyResult.warnings,
            message: 'Environment configuration has errors',
          },
          { status: 400, headers: corsHeaders }
        );
      }
    }

    if (action === 'mint') {
      // Validate mint parameters
      if (!playerAddress || typeof playerAddress !== 'string') {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid playerAddress. Must be a valid Sui address.',
          },
          { status: 400, headers: corsHeaders }
        );
      }

      if (tier === undefined || tier === null || typeof tier !== 'number') {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid tier. Must be a number (0-5).',
          },
          { status: 400, headers: corsHeaders }
        );
      }

      if (tier < 0 || tier > 5) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid tier. Must be between 0 and 5.',
          },
          { status: 400, headers: corsHeaders }
        );
      }

      // Determine which contract to use (default to 'new')
      const contractType = contract || 'new';
      const useOldContract = contractType === 'old';

      console.log(`🎖️ [ADMIN BADGE API] Building badge mint transaction for ${playerAddress}, tier: ${tier}`);
      console.log(`🎖️ [ADMIN BADGE API] Contract: ${useOldContract ? 'OLD' : 'NEW'}`);
      console.log(`🎖️ [ADMIN BADGE API] Note: Badge will be created at tier 0 (Standard), player must sign transaction`);

      const result = useOldContract
        ? await badgeService.adminMintBadgeOldContract(playerAddress, tier)
        : await badgeService.adminMintBadge(playerAddress, tier);

      if (result.success) {
        return NextResponse.json(
          {
            success: true,
            digest: result.digest,
            message: result.note || `Badge minted successfully at tier ${tier}.`,
          },
          { headers: corsHeaders }
        );
      } else {
        return NextResponse.json(
          {
            success: false,
            error: result.error || 'Failed to mint badge',
          },
          { status: 500, headers: corsHeaders }
        );
      }
    } else if (action === 'burn') {
      // Validate burn parameters
      if (!badgeId || typeof badgeId !== 'string') {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid badgeId. Must be a valid Sui object ID.',
          },
          { status: 400, headers: corsHeaders }
        );
      }

      // Determine which contract to use (default to 'new')
      const contractType = contract || 'new';
      const useOldContract = contractType === 'old';

      console.log(`🔥 [ADMIN BADGE API] Burning badge: ${badgeId}`);
      console.log(`🔥 [ADMIN BADGE API] Contract: ${useOldContract ? 'OLD' : 'NEW'}`);

      const result = useOldContract
        ? await badgeService.adminBurnBadgeOldContract(badgeId)
        : await badgeService.adminBurnBadge(badgeId);

      if (result.success) {
        return NextResponse.json(
          {
            success: true,
            digest: result.digest,
            message: `Successfully burned badge ${badgeId}`,
          },
          { headers: corsHeaders }
        );
      } else {
        return NextResponse.json(
          {
            success: false,
            error: result.error || 'Failed to burn badge',
          },
          { status: 500, headers: corsHeaders }
        );
      }
    }
  } catch (error) {
    console.error('❌ [ADMIN BADGE API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

