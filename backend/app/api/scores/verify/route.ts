import { NextRequest, NextResponse } from 'next/server';
import { suiService } from '@/lib/sui/suiService';

/**
 * POST /api/scores/verify
 * Verify a transaction hash for score submission
 * 
 * Frontend sends transaction hash after user signs and submits score.
 * Backend verifies the transaction exists and succeeded on-chain.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { txHash } = body;

    if (!txHash) {
      return NextResponse.json(
        { error: 'Transaction hash is required' },
        { status: 400 }
      );
    }

    // Validate hash format (basic check)
    if (!txHash.startsWith('0x') || txHash.length < 10) {
      return NextResponse.json(
        { error: 'Invalid transaction hash format' },
        { status: 400 }
      );
    }

    const verification = await suiService.verifyTransaction(txHash);

    return NextResponse.json(verification);
  } catch (error) {
    console.error('Error in score verification endpoint:', error);
    return NextResponse.json(
      { 
        error: 'Invalid request body',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 400 }
    );
  }
}

