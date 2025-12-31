// ==========================================
// Admin Default Rewards Configuration API Route
// ==========================================

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';
import { BadgeError, BadgeErrorCode } from '@/lib/sui/badge-errors';
import { getAdminWalletService } from '@/lib/sui/admin-wallet-service';
import { BadgeLogger } from '@/lib/sui/badge-logger';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

// Path to store default rewards config
const DEFAULT_REWARDS_CONFIG_PATH = join(process.cwd(), 'data', 'default-rewards-config.json');

// Ensure data directory exists
async function ensureDataDirectory() {
  const dataDir = join(process.cwd(), 'data');
  if (!existsSync(dataDir)) {
    await mkdir(dataDir, { recursive: true });
  }
}

// Get system default rewards based on documented structure
// 1st: Destroy All + Boss Kill Shot + Random L1
// 2nd: Boss Kill Shot + Random L1
// 3rd: Destroy All + Random L1
// 4th-10th: Random L1 each
// "random" is resolved at distribution time to a random basic L1 item
function getSystemDefaultRewards() {
  return {
    rewardDepth: 10,
    poolDepth: 3,
    poolDistribution: [50, 30, 20],
    poolSource: 0,
    itemRewards: {
      1: [
        { itemId: 'destroyAll', level: 1, quantity: 1 },
        { itemId: 'bossKillShot', level: 1, quantity: 1 },
        { itemId: 'random', level: 1, quantity: 1 },
      ],
      2: [
        { itemId: 'bossKillShot', level: 1, quantity: 1 },
        { itemId: 'random', level: 1, quantity: 1 },
      ],
      3: [
        { itemId: 'destroyAll', level: 1, quantity: 1 },
        { itemId: 'random', level: 1, quantity: 1 },
      ],
      4: [{ itemId: 'random', level: 1, quantity: 1 }],
      5: [{ itemId: 'random', level: 1, quantity: 1 }],
      6: [{ itemId: 'random', level: 1, quantity: 1 }],
      7: [{ itemId: 'random', level: 1, quantity: 1 }],
      8: [{ itemId: 'random', level: 1, quantity: 1 }],
      9: [{ itemId: 'random', level: 1, quantity: 1 }],
      10: [{ itemId: 'random', level: 1, quantity: 1 }],
    } as Record<number, Array<{ itemId: string; level: number; quantity: number }>>,
  };
}

// Get default rewards configuration
export const GET = withApiHandler(
  async (request: NextRequest) => {
    try {
      await ensureDataDirectory();
      
      // Try to load saved config
      if (existsSync(DEFAULT_REWARDS_CONFIG_PATH)) {
        const configData = await readFile(DEFAULT_REWARDS_CONFIG_PATH, 'utf-8');
        const config = JSON.parse(configData);
        
        BadgeLogger.info('⚙️ [DEFAULT REWARDS] Loaded saved default rewards configuration');
        
        return {
          success: true,
          config,
        };
      }
      
      // Return system defaults if no saved config
      const systemDefaults = getSystemDefaultRewards();
      
      BadgeLogger.info('⚙️ [DEFAULT REWARDS] Using system default rewards configuration');
      
      return {
        success: true,
        config: systemDefaults,
      };
    } catch (error) {
      BadgeLogger.error('⚙️ [DEFAULT REWARDS] Failed to load default rewards configuration', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      
      // Return system defaults on error
      const systemDefaults = getSystemDefaultRewards();
      
      return {
        success: true,
        config: systemDefaults,
      };
    }
  }
);

// Save default rewards configuration
export const POST = withApiHandler(
  async (request: NextRequest) => {
    const body = await getRequestBody<{
      config: {
        rewardDepth: number;
        poolDepth: number;
        poolDistribution: number[];
        poolSource: number;
        itemRewards: Record<number, Array<{ itemId: string; level: number; quantity: number }>>;
      };
      adminWalletAddress?: string; // Optional verification
    }>(request);

    const { config, adminWalletAddress } = body;

    // Verify admin wallet if provided
    if (adminWalletAddress) {
      const adminWallet = getAdminWalletService();
      const expectedAdminAddress = adminWallet.getAddress().toLowerCase();
      const providedAdminAddress = adminWalletAddress.toLowerCase();

      if (providedAdminAddress !== expectedAdminAddress) {
        throw new BadgeError(
          BadgeErrorCode.UNAUTHORIZED,
          'Unauthorized. Admin wallet verification failed.'
        );
      }
    }

    // Validate config
    if (!config || typeof config.rewardDepth !== 'number' || config.rewardDepth < 1 || config.rewardDepth > 255) {
      throw new BadgeError(
        BadgeErrorCode.INVALID_ADDRESS,
        'rewardDepth must be between 1 and 255'
      );
    }

    if (!config.poolDepth || typeof config.poolDepth !== 'number' || config.poolDepth < 1 || config.poolDepth > 255) {
      throw new BadgeError(
        BadgeErrorCode.INVALID_ADDRESS,
        'poolDepth must be between 1 and 255'
      );
    }

    // Validate pool distribution sums to 100
    const poolSum = config.poolDistribution.reduce((a, b) => a + b, 0);
    if (Math.abs(poolSum - 100) > 0.01) {
      throw new BadgeError(
        BadgeErrorCode.INVALID_ADDRESS,
        `poolDistribution must sum to 100% (currently ${poolSum}%)`
      );
    }

    if (config.poolDistribution.length !== config.poolDepth) {
      throw new BadgeError(
        BadgeErrorCode.INVALID_ADDRESS,
        `poolDistribution length (${config.poolDistribution.length}) must match poolDepth (${config.poolDepth})`
      );
    }

    try {
      await ensureDataDirectory();
      
      // Save config to file
      await writeFile(DEFAULT_REWARDS_CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
      
      BadgeLogger.info('⚙️ [DEFAULT REWARDS] Saved default rewards configuration', {
        rewardDepth: config.rewardDepth,
        poolDepth: config.poolDepth,
        itemRewardsCount: Object.keys(config.itemRewards).length,
      });
      
      return {
        success: true,
        message: 'Default rewards configuration saved successfully',
      };
    } catch (error) {
      BadgeLogger.error('⚙️ [DEFAULT REWARDS] Failed to save default rewards configuration', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      
      throw new BadgeError(
        BadgeErrorCode.INVALID_ADDRESS,
        `Failed to save default rewards configuration: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
);
