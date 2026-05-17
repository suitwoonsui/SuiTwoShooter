// ==========================================
// Admin API - Remove Tournament Ticket from Player (proxies to platform API)
// ==========================================

import { NextRequest } from 'next/server';
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';
import { platformGamePassClient } from '@/lib/services/platform/client/platform-client';

export const POST = withApiHandler(
  async (request: NextRequest) => {
    const body = await getRequestBody<{
      playerAddress: string;
      ticketId: number;
      ecosystemId?: string;
    }>(request);

    const { playerAddress, ticketId } = body;

    if (!playerAddress || typeof playerAddress !== 'string') {
      throw new Error('Player address is required');
    }

    if (typeof ticketId !== 'number' || ticketId <= 0 || !Number.isInteger(ticketId)) {
      throw new Error('Ticket ID must be a positive integer');
    }

    const result = await platformGamePassClient.adminRemoveTicket(playerAddress, ticketId);

    if (!result.success) {
      throw new Error(result.error || 'Failed to remove ticket');
    }

    return {
      success: true,
      digest: result.digest,
      playerAddress,
      ticketId,
    };
  }
);
