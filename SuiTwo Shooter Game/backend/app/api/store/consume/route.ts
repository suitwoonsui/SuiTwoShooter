// ==========================================
// Store Consume API Route — DEPRECATED
// Use POST /api/inventory/consume instead. Inventory is separated from Store.
// ==========================================

import { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

/** @deprecated Use POST /api/inventory/consume. Store consume is deprecated; inventory has been separated from the store. */
export async function POST(request: NextRequest) {
  return NextResponse.json(
    {
      success: false,
      error: 'Deprecated: Use POST /api/inventory/consume instead. Store consume is deprecated; inventory has been separated from the store.',
      deprecated: true,
      replacement: '/api/inventory/consume',
    },
    { status: 410 }
  );
}


