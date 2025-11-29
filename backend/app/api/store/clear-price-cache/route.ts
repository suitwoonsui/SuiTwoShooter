// ==========================================
// Clear Price Cache API Endpoint
// Forces fresh price fetch on next request
// ==========================================

import { NextRequest, NextResponse } from 'next/server';
import { getCorsHeaders, handleCorsPreflight } from '@/lib/cors';
import { priceConverter } from '@/lib/services/price-converter';

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function POST(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request);
  
  try {
    priceConverter.clearCache();
    
    return NextResponse.json(
      {
        success: true,
        message: 'Price cache cleared. Next request will fetch fresh prices.',
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('❌ Error clearing price cache:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

