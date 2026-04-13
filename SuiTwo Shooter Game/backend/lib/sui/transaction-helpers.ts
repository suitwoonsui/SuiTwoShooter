import {
  executeTransactionWithFinalization as baseExecuteTransactionWithFinalization,
} from '@/lib/services/wallet/transaction-helpers/transaction-helpers';

// Re-export everything else.
export * from '@/lib/services/wallet/transaction-helpers/transaction-helpers';

/**
 * Compatibility wrapper: some legacy call sites pass an extra leading arg.
 */
export async function executeTransactionWithFinalization(...args: any[]) {
  if (args.length === 4) {
    // drop the first arg (often a client) and keep (signer, txb, options)
    return baseExecuteTransactionWithFinalization(args[1], args[2], args[3]);
  }
  return baseExecuteTransactionWithFinalization(args[0], args[1], args[2]);
}

