import { NextRequest } from 'next/server';
import { suiService } from '../../../../../base/backend/lib/sui/suiService';
import { withApiHandler, getRequestBody } from '../../../../../base/backend/lib/api/api-handler';

/**
 * POST /api/scores/verify
 * Verify a transaction hash for score submission
 * 
 * Frontend sends transaction hash after user signs and submits score.
 * Backend verifies the transaction exists and succeeded on-chain.
 */
export const POST = withApiHandler(
  async (request: NextRequest) => {
    const body = await getRequestBody<{ txHash: string }>(request);
    const { txHash } = body;

    if (!txHash) {
      throw new Error('Transaction hash is required');
    }

    // Validate hash format (basic check)
    if (!txHash.startsWith('0x') || txHash.length < 10) {
      throw new Error('Invalid transaction hash format');
    }

    const verification = await suiService.verifyTransaction(txHash);

    return verification;
  }
);

