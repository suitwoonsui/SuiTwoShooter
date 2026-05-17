// ==========================================
// Transaction Status (chain-confirmed) API Route
// Uses the browser-safe Sui JSON-RPC proxy to fetch tx effects and determine success.
// ==========================================

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { withApiHandler, getDigestParam } from '@/lib/api/api-handler';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

type SuiJsonRpcResponse<T> =
  | { jsonrpc: '2.0'; id: string | number | null; result: T }
  | { jsonrpc: '2.0'; id: string | number | null; error: { code: number; message: string; data?: unknown } };

function getNetworkFromRequest(request: NextRequest): 'testnet' | 'mainnet' {
  const u = new URL(request.url);
  const q = (u.searchParams.get('network') || '').trim().toLowerCase();
  return q === 'mainnet' ? 'mainnet' : 'testnet';
}

export const GET = withApiHandler(
  async (request: NextRequest, context: { params: Promise<{ digest: string }> }) => {
    const digest = await getDigestParam(context.params);
    const network = getNetworkFromRequest(request);

    // Call our own CORS-safe proxy, so frontend can also hit this endpoint safely.
    const proxyUrl = new URL('/api/sui-json-rpc', request.url);
    proxyUrl.searchParams.set('network', network);

    const payload = {
      jsonrpc: '2.0',
      id: 1,
      method: 'sui_getTransactionBlock',
      params: [
        digest,
        {
          showEffects: true,
          showEvents: false,
          showInput: false,
          showBalanceChanges: false,
          showObjectChanges: false,
        },
      ],
    };

    const res = await fetch(proxyUrl.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = (await res.json().catch(() => null)) as SuiJsonRpcResponse<any> | null;
    if (!data) {
      return { success: false, digest, exists: false, confirmed: false, status: 'unknown', error: 'Invalid RPC response' };
    }
    if ('error' in data) {
      // Common for "not found yet" during propagation.
      const msg = data.error?.message || 'RPC error';
      const notFound = /not\s*found|Unknown transaction|Could not find transaction/i.test(msg);
      return {
        success: true,
        digest,
        exists: !notFound,
        confirmed: false,
        status: 'unknown',
        error: msg,
      };
    }

    const effects = (data.result as any)?.effects;
    const statusObj = effects?.status;
    const status =
      (statusObj && typeof statusObj === 'object' && typeof statusObj.status === 'string')
        ? String(statusObj.status)
        : 'unknown';
    const error = statusObj?.error != null ? String(statusObj.error) : undefined;

    return {
      success: true,
      digest,
      exists: true,
      confirmed: status === 'success' || status === 'failure',
      status,
      error,
    };
  }
);

