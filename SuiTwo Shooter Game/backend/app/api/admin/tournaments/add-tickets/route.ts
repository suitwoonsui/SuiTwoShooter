// ==========================================
// Admin API - Add Tournament Tickets to Player (proxies to platform API)
// ==========================================

import { NextRequest } from 'next/server';
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';
import { platformGamePassClient } from '@/lib/services/platform/client/platform-client';

export const POST = withApiHandler(
  async (request: NextRequest) => {
    const body = await getRequestBody<{
      playerAddress: string;
      quantity: number;
      valuePerTicketUsdCents?: number;
      ecosystemId?: string;
    }>(request);

    const { playerAddress, quantity, valuePerTicketUsdCents = 0 } = body;

    if (!playerAddress || typeof playerAddress !== 'string') {
      throw new Error('Player address is required');
    }

    if (typeof quantity !== 'number' || quantity <= 0 || !Number.isInteger(quantity)) {
      throw new Error('Quantity must be a positive integer');
    }

    if (typeof valuePerTicketUsdCents !== 'number' || valuePerTicketUsdCents < 0) {
      throw new Error('Value per ticket must be a non-negative number');
    }

    const result = await platformGamePassClient.adminAddTickets(
      playerAddress,
      quantity,
      valuePerTicketUsdCents
    );

    if (!result.success) {
      throw new Error(result.error || 'Failed to add tickets');
    }

    return {
      success: true,
      digest: result.digest,
      playerAddress,
      quantity,
      valuePerTicketUsdCents,
    };
  }
);
