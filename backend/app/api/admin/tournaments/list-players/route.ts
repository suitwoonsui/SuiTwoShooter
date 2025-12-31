// ==========================================
// Admin API - List Players with Tournament Tickets
// ==========================================

import { NextRequest } from 'next/server';
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';
import { getGamePassService } from '@/lib/sui/game-pass-service';
import { getAdminWalletService } from '@/lib/sui/admin-wallet-service';
import { getConfig } from '@/config/config';
import { BadgeLogger } from '@/lib/sui/badge-logger';

export const GET = withApiHandler(
  async (request: NextRequest) => {
    const config = getConfig();
    const gamePassService = getGamePassService();
    const adminWallet = getAdminWalletService();
    const systemObjectId = config.contracts.gamePassSystem;
    
    if (!systemObjectId) {
      throw new Error('Game pass system not configured');
    }

    // Use admin wallet's client (has proper configuration and retry logic)
    const client = config.sui.network === 'testnet'
      ? adminWallet.getTestnetClient()
      : adminWallet.getMainnetClient();

    // Get all dynamic fields (players) from GamePassSystem
    // Add timeout and error handling for network issues
    let allFields;
    try {
      BadgeLogger.info('🏆 [LIST PLAYERS] Querying dynamic fields from GamePassSystem', {
        systemObjectId,
        network: config.sui.network,
      });

      // Use Promise.race to add timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout: getDynamicFields took longer than 30 seconds')), 30000);
      });

      allFields = await Promise.race([
        client.getDynamicFields({
      parentId: systemObjectId,
      limit: 1000, // Adjust if needed
        }),
        timeoutPromise,
      ]) as any;

      BadgeLogger.info('🏆 [LIST PLAYERS] Retrieved dynamic fields', {
        count: allFields.data?.length || 0,
      });
    } catch (error) {
      BadgeLogger.error('🏆 [LIST PLAYERS] Failed to get dynamic fields', {
        error: error instanceof Error ? error.message : String(error),
        systemObjectId,
        network: config.sui.network,
      });
      
      // Return empty list instead of failing completely
      return {
        success: true,
        players: [],
        totalPlayers: 0,
        error: error instanceof Error ? error.message : 'Failed to query players from blockchain',
      };
    }

    const players: Array<{
      address: string;
      ticketCount: number;
      gamesRemaining: number;
      isActive: boolean;
    }> = [];

    // Query each player's GamePass to get ticket count
    // Use Promise.allSettled to handle individual failures gracefully
    const playerPromises = allFields.data.map(async (field: any) => {
      try {
        if (field.name?.type === 'address' && field.name?.value) {
          const playerAddress = field.name.value as string;
          
          // Get game pass status with timeout
          const statusPromise = gamePassService.getGamePassStatus(playerAddress);
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Timeout')), 5000); // 5 second timeout per player
          });

          const statusResult = await Promise.race([statusPromise, timeoutPromise]) as any;
          
          if (statusResult?.success && statusResult.ticketCount !== undefined && statusResult.ticketCount > 0) {
            return {
              address: playerAddress,
              ticketCount: statusResult.ticketCount || 0,
              gamesRemaining: statusResult.gamesRemaining || 0,
              isActive: statusResult.isActive || false,
            };
          }
        }
        return null;
      } catch (error) {
        // Skip players that can't be queried
        BadgeLogger.debug('🏆 [LIST PLAYERS] Error querying player', {
          playerAddress: field.name?.value,
          error: error instanceof Error ? error.message : String(error),
        });
        return null;
      }
    });

    const playerResults = await Promise.allSettled(playerPromises);
    
    // Extract successful results
    for (const result of playerResults) {
      if (result.status === 'fulfilled' && result.value) {
        players.push(result.value);
      }
    }

    // Sort by ticket count (descending)
    players.sort((a, b) => b.ticketCount - a.ticketCount);

    return {
      success: true,
      players,
      totalPlayers: players.length,
    };
  }
);

