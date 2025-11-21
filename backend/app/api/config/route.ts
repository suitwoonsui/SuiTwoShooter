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
  
  // Determine wallet module URL based on environment
  // Check for explicit env var first, then fall back to defaults
  const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
  
  // Use local frontend dev server (port 8000) in development, Vercel URL in production
  // The frontend dev server serves wallet-module/dist/wallet-api.umd.cjs
  // Can be overridden with WALLET_MODULE_URL env var
  const walletModuleUrl = process.env.WALLET_MODULE_URL || (
    isProduction
      ? 'https://sui-two-shooter-wallet-module-test.vercel.app/wallet-api.umd.cjs'
      : 'http://localhost:8000/wallet-module/dist/wallet-api.umd.cjs'  // Frontend dev server
  );
  
  return NextResponse.json({
    network: config.sui.network,
    rpcUrl: config.sui.rpcUrl,
    walletModuleUrl,
    // Add other safe config as needed
  }, { headers: corsHeaders });
}

