// ==========================================
// Browser-safe Sui JSON-RPC proxy (POST) with server-side failover.
// Wallet module and token-balance-utils cannot call Mysten fullnodes from the browser (CORS + 503 on primary).
// Query: ?network=testnet | mainnet
// ==========================================

import { NextRequest, NextResponse } from 'next/server';
import { getCorsHeaders, handleCorsPreflight } from '@/lib/cors';
import {
  buildOrderedSuiRpcUrlsForNetwork,
  parseSuiJsonRpcNetworkParam,
} from '@/lib/rpc/ordered-sui-rpc-urls';

const UPSTREAM_TIMEOUT_MS = 28_000;

function shouldTryNextUpstream(status: number): boolean {
  return status === 502 || status === 503 || status === 504 || status === 429;
}

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function POST(request: NextRequest) {
  const cors = getCorsHeaders(request);
  const url = new URL(request.url);
  const network = parseSuiJsonRpcNetworkParam(url.searchParams.get('network'));
  const rpcUrls = buildOrderedSuiRpcUrlsForNetwork(network);

  let bodyText: string;
  try {
    bodyText = await request.text();
  } catch {
    return NextResponse.json(
      { jsonrpc: '2.0', error: { code: -32700, message: 'Invalid body' }, id: null },
      { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } }
    );
  }

  if (!bodyText?.trim()) {
    return NextResponse.json(
      { jsonrpc: '2.0', error: { code: -32600, message: 'Empty body' }, id: null },
      { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } }
    );
  }

  let lastStatus = 502;
  let lastBody: string | null = null;

  for (let i = 0; i < rpcUrls.length; i++) {
    const rpcUrl = rpcUrls[i];
    try {
      const upstream = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: bodyText,
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      });

      const text = await upstream.text();
      if (!upstream.ok && shouldTryNextUpstream(upstream.status) && i < rpcUrls.length - 1) {
        lastStatus = upstream.status;
        lastBody = text;
        console.warn('[sui-json-rpc] upstream transient error; failing over', {
          network,
          status: upstream.status,
          rpcUrl,
          next: rpcUrls[i + 1],
        });
        continue;
      }

      return new NextResponse(text, {
        status: upstream.status,
        headers: {
          ...cors,
          'Content-Type': upstream.headers.get('Content-Type') || 'application/json',
        },
      });
    } catch (err) {
      if (i < rpcUrls.length - 1) {
        console.warn('[sui-json-rpc] upstream fetch failed; failing over', {
          network,
          rpcUrl,
          next: rpcUrls[i + 1],
          message: err instanceof Error ? err.message : String(err),
        });
        continue;
      }
      lastStatus = 502;
      lastBody = JSON.stringify({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: err instanceof Error ? err.message : 'All Sui RPC endpoints failed',
        },
        id: null,
      });
    }
  }

  return new NextResponse(lastBody || '{"error":"all endpoints failed"}', {
    status: lastStatus,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}
