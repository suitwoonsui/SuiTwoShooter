// ==========================================
// CORS Utility for API Routes
// ==========================================

import { NextRequest } from 'next/server';

/**
 * Get CORS headers for API responses
 * Handles development mode by allowing localhost origins when CORS_ORIGIN is *
 */
export function getCorsHeaders(request?: NextRequest): Record<string, string> {
  // Get allowed origin from env or default to * for development
  const allowedOrigin = process.env.CORS_ORIGIN || '*';
  
  // If request is provided and origin is *, use the request origin (for development)
  let origin = allowedOrigin;
  if (allowedOrigin === '*' && request) {
    const requestOrigin = request.headers.get('origin');
    // Allow localhost origins for development
    if (requestOrigin && (requestOrigin.includes('localhost') || requestOrigin.includes('127.0.0.1'))) {
      origin = requestOrigin;
    }
  }
  
  // If origin is still *, don't set credentials (browser doesn't allow * with credentials)
  const headers: Record<string, string> = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
  
  // Only set credentials if origin is not *
  if (origin !== '*') {
    headers['Access-Control-Allow-Credentials'] = 'true';
  }
  
  return headers;
}

/**
 * Handle CORS preflight (OPTIONS) request
 */
export function handleCorsPreflight(request: NextRequest) {
  return new Response(null, {
    status: 200,
    headers: getCorsHeaders(request),
  });
}

