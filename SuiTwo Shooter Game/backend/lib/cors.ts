// ==========================================
// CORS utility for game API routes (game-owned; no platform dependency)
// ==========================================

import { NextRequest, NextResponse } from 'next/server';

/**
 * Get CORS headers for API responses.
 * Handles development by allowing localhost when CORS_ORIGIN is *.
 */
export function getCorsHeaders(request?: NextRequest): Record<string, string> {
  const allowedOrigin = process.env.CORS_ORIGIN || '*';

  let origin = allowedOrigin;
  if (allowedOrigin === '*' && request) {
    const requestOrigin = request.headers.get('origin');
    if (requestOrigin && (requestOrigin.includes('localhost') || requestOrigin.includes('127.0.0.1'))) {
      origin = requestOrigin;
    }
  }

  // Mysten SuiClient sends custom headers (e.g. client-sdk-version). Browsers preflight with
  // Access-Control-Request-Headers; we must echo them or the proxy used for wallet balances fails.
  const defaultAllowHeaders =
    'Content-Type, Authorization, X-Admin-Wallet, X-Corridor-Capability-Object-Id, X-Corridor-Admin-Capability-Object-Id, client-sdk-version';
  const requestedHeaders = request?.headers.get('access-control-request-headers')?.trim();
  const allowHeaders = requestedHeaders || defaultAllowHeaders;

  const headers: Record<string, string> = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': allowHeaders,
  };

  if (origin !== '*') {
    headers['Access-Control-Allow-Credentials'] = 'true';
  }

  return headers;
}

/**
 * Handle CORS preflight (OPTIONS) request.
 */
export function handleCorsPreflight(request: NextRequest): NextResponse {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(request),
  });
}
