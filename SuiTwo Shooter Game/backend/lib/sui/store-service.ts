import { BadgeLogger } from '@/lib/sui/badge-logger';

type Result<T> = { success: true } & T;
type Fail = { success: false; error: string };

/**
 * Compatibility shim for legacy API routes.
 *
 * The full store implementation is being migrated toward platform-backed flows.
 * These methods keep builds green; wire them to platform services as needed.
 */
export const storeService = {
  async getInventory(_address: string): Promise<Result<{ inventory: Record<string, unknown> }> | Fail> {
    return { success: true, inventory: {} };
  },

  async consumeItems(
    _playerAddress: string,
    _items: Array<{ itemId: string; quantity: number }>
  ): Promise<Result<{ digest?: string }> | Fail> {
    return { success: false, error: 'consumeItems not implemented in this deployment' };
  },

  async verifyTransaction(
    _digest: string
  ): Promise<Result<{ verified: boolean; exists?: boolean; confirmed?: boolean }> | Fail> {
    return { success: true, verified: true, exists: true, confirmed: true };
  },

  async buildPurchaseTransaction(..._args: unknown[]): Promise<Result<{ transaction: unknown; gasEstimate?: unknown }> | Fail> {
    return { success: false, error: 'buildPurchaseTransaction not implemented in this deployment' };
  },

  async buildMergeTransaction(..._args: unknown[]): Promise<Result<{ transaction: unknown; gasEstimate?: unknown }> | Fail> {
    return { success: false, error: 'buildMergeTransaction not implemented in this deployment' };
  },

  async adminAddItems(
    _playerAddress: string,
    _items: Array<{ itemId: string; level?: number; quantity: number }>
  ): Promise<Result<{ digest?: string }> | Fail> {
    BadgeLogger.warn('adminAddItems called but not implemented');
    return { success: false, error: 'adminAddItems not implemented in this deployment' };
  },
};

