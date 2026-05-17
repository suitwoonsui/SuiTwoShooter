// ==========================================
// Admin API - Tournament ticket information
// Uses platform Reservoir: reservoir status + ticket-units (IDs and value metadata).
// ==========================================

import { NextRequest } from 'next/server';
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';
import { platformGamePassClient, buildPlatformCallOptions } from '@/lib/services/platform/client/platform-client';
import { handleCorsPreflight } from '@/lib/cors';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export const POST = withApiHandler(
  async (request: NextRequest) => {
    const body = await getRequestBody<{
      playerAddress?: string;
      ticketId?: number;
      contract?: 'new' | 'old' | 'both';
      ecosystemId?: string;
    }>(request);

    const { playerAddress } = body;

    if (!playerAddress) {
      throw new Error('playerAddress is required. Lookup by ticketId only is game-specific; implement in game backend if needed.');
    }

    const platformOptions = buildPlatformCallOptions(request, body);

    const [status, ticketsResult] = await Promise.all([
      platformGamePassClient.getReservoirStatus(playerAddress, platformOptions),
      platformGamePassClient.getAvailableTicketUnits(playerAddress, platformOptions),
    ]);

    if (!status.success) {
      throw new Error(status.error ?? 'Failed to get reservoir status');
    }

    const tickets = ticketsResult.success
      ? (ticketsResult.tickets ?? []).map((t) => ({
          ticketId: t.ticketId,
          valuePaidUsdCents: t.valuePaidUsdCents ?? 0,
          purchasedAt: t.purchasedAt ?? 0,
        }))
      : [];

    return {
      success: true,
      playerAddress,
      tickets,
      totalTickets: tickets.length,
      balance: status.balance ?? 0,
      itemCount: status.itemCount ?? 0,
    };
  }
);
