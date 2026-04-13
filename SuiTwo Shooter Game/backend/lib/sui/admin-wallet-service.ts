import { getAdminWalletService as baseGetAdminWalletService } from '@/lib/services/wallet/admin/admin-wallet-service';

type ScoreData = {
  score: number;
  distance: number;
  coins: number;
  bossesDefeated: number;
  enemiesDefeated: number;
  longestCoinStreak: number;
};

/**
 * Export a service object that includes legacy methods expected by older API routes.
 * The underlying implementation is migrating toward platform-backed flows.
 */
export function getAdminWalletService() {
  const svc: any = baseGetAdminWalletService() as any;

  if (typeof svc.submitScoreForPlayer !== 'function') {
    svc.submitScoreForPlayer = async (
      _playerAddress: string,
      _scoreData: ScoreData,
      _playerName: string,
      _sessionId?: string
    ) => {
      return { success: false, error: 'submitScoreForPlayer not implemented in this deployment' as const };
    };
  }

  return svc;
}

// Legacy routes expect a module-level singleton export.
export const adminWalletService = getAdminWalletService();

