// ==========================================
// Config API Route
// Returns backend configuration (network, etc.) for frontend
// ==========================================

import { NextRequest, NextResponse } from 'next/server';
import { getCorsHeaders, handleCorsPreflight } from '@/lib/cors';
import { getConfig } from '@/config/config';

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function GET(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request);
  const config = getConfig();
  
  // Return only safe configuration that frontend needs
  // Don't expose sensitive data like private keys, API keys, etc.
  return NextResponse.json({
    network: config.sui.network,
    rpcUrl: config.sui.rpcUrl,
    // Add other safe config as needed
  }, { headers: corsHeaders });
}

