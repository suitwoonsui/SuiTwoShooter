// ==========================================
// Admin API - List Players with Tournament Tickets (proxies to platform API)
// ==========================================

import { NextRequest } from 'next/server';
import { withApiHandler } from '@/lib/api/api-handler';
import { platformGamePassClient } from '@/lib/services/platform/client/platform-client';

export const GET = withApiHandler(
  async (request: NextRequest) => {
    const result = await platformGamePassClient.listPlayers();

    if (!result.success) {
      return {
        success: true,
        players: [],
        totalPlayers: 0,
        error: result.error || 'Failed to list players from platform',
      };
    }

    // Filter to players with at least one ticket (tournament ticket holders)
    const players = (result.players || [])
      .filter((p) => (p.ticketCount ?? 0) > 0)
      .map((p) => ({
        address: p.address,
        ticketCount: p.ticketCount ?? 0,
        gamesRemaining: p.gamesRemaining ?? 0,
        isActive: p.isActive ?? false,
      }))
      .sort((a, b) => b.ticketCount - a.ticketCount);

    return {
      success: true,
      players,
      totalPlayers: players.length,
    };
  }
);
