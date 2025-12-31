// ==========================================
// Admin API - List All Players with Game Passes (Credits)
// ==========================================

import { NextRequest } from 'next/server';
import { withApiHandler } from '@/lib/api/api-handler';
import { getGamePassService } from '@/lib/sui/game-pass-service';
import { getConfig } from '@/config/config';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';

export const GET = withApiHandler(
  async (request: NextRequest) => {
    const config = getConfig();
    const gamePassService = getGamePassService();

    const systemObjectId = config.contracts.gamePassSystem;
    
    if (!systemObjectId || systemObjectId === '' || systemObjectId === '0x...') {
      throw new Error('Game pass system not configured');
    }

    // Initialize Sui client
    const network = config.sui.network;
    const rpcUrl = network === 'testnet' 
      ? getFullnodeUrl('testnet')
      : network === 'mainnet'
      ? getFullnodeUrl('mainnet')
      : config.sui.rpcUrl;

    const client = new SuiClient({ url: rpcUrl });

    try {
      // Get all dynamic fields from GamePassSystem (each field is a player's GamePass)
      const dynamicFields = await client.getDynamicFields({
        parentId: systemObjectId,
      });

      const players: Array<{
        address: string;
        gamesRemaining: number;
        isActive: boolean;
        packType?: number;
      }> = [];

      for (const field of dynamicFields.data) {
        try {
          // Extract player address from dynamic field name
          const name = field.name as any;
          let playerAddress: string = '';

          if (name) {
            if (typeof name === 'object' && name.value) {
              playerAddress = name.value;
            } else if (typeof name === 'string') {
              playerAddress = name;
            }
          }

          if (!playerAddress || !playerAddress.startsWith('0x')) {
            continue;
          }

          // Get game pass content
          if (field.objectId && field && typeof field === 'object' && 'content' in field && field.content && typeof field.content === 'object' && 'fields' in field.content) {
            const passData = field.content.fields as any;
            const gamesRemaining = Number(passData.games_remaining || 0);
            const isActive = passData.is_active === true || passData.is_active === 'true';
            const packType = passData.pack_type !== undefined ? Number(passData.pack_type) : undefined;

            players.push({
              address: playerAddress,
              gamesRemaining,
              isActive,
              packType,
            });
          } else {
            // Fallback: query the game pass status
            const status = await gamePassService.getGamePassStatus(playerAddress);
            if (status.success && status.hasPass) {
              players.push({
                address: playerAddress,
                gamesRemaining: status.gamesRemaining || 0,
                isActive: status.isActive || false,
                packType: status.packType,
              });
            }
          }
        } catch (error) {
          // Skip this player if there's an error
          console.error('Error processing player:', error);
        }
      }

      return {
        success: true,
        players: players.sort((a, b) => b.gamesRemaining - a.gamesRemaining), // Sort by credits descending
      };
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to list players');
    }
  }
);

