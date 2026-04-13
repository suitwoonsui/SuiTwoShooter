// ==========================================
// Badge Reconciliation - Background job to catch missed badge updates
// ==========================================

import { getBadgeService } from '@/lib/services/badge/core/badge-service';
import { getConfig } from '@/config/config';
import { platformGameScoreClient } from '@/lib/services/platform/client/platform-client';

/**
 * BadgeReconciliation - Background job to reconcile badge states
 * 
 * Runs periodically to check all badges and update them if needed
 * Catches missed updates from network errors, etc.
 */
export class BadgeReconciliation {
  private isRunning: boolean = false;
  private reconciliationInterval: NodeJS.Timeout | null = null;
  private config: ReturnType<typeof getConfig>;
  private badgeService: ReturnType<typeof getBadgeService>;

  constructor() {
    this.config = getConfig();
    this.badgeService = getBadgeService();
    console.log('✅ BadgeReconciliation initialized');
  }

  /**
   * Start reconciliation job
   * Runs every 24 hours by default
   */
  start(intervalMs: number = 24 * 60 * 60 * 1000): void {
    if (this.reconciliationInterval) {
      console.warn('⚠️ Reconciliation job already running');
      return;
    }

    console.log(`🔄 Starting badge reconciliation job (interval: ${intervalMs / 1000 / 60} minutes)`);
    
    // Run immediately on start
    this.runReconciliation();

    // Then run periodically
    this.reconciliationInterval = setInterval(() => {
      this.runReconciliation();
    }, intervalMs);
  }

  /**
   * Stop reconciliation job
   */
  stop(): void {
    if (this.reconciliationInterval) {
      clearInterval(this.reconciliationInterval);
      this.reconciliationInterval = null;
      console.log('🛑 Badge reconciliation job stopped');
    }
  }

  /**
   * Run reconciliation check
   * 
   * Note: This is a simplified version. In production, you would:
   * 1. Query all badges from the blockchain
   * 2. Check each badge's tier against current games_played
   * 3. Update badges that are out of sync
   * 
   * For now, this is a placeholder that can be enhanced later
   */
  private async runReconciliation(): Promise<void> {
    if (this.isRunning) {
      console.log('⏸️ Reconciliation already running, skipping...');
      return;
    }

    this.isRunning = true;
    console.log('🔄 Running badge reconciliation...');

    try {
      // TODO: Implement full reconciliation
      // 1. Query all badges from BadgeRegistry
      // 2. For each badge, check if tier matches games_played
      // 3. Update badges that are out of sync
      
      // For now, this is a placeholder
      // In production, you would query the blockchain for all badges
      // and check each one
      
      console.log('✅ Badge reconciliation completed (placeholder - full implementation pending)');
    } catch (error) {
      console.error('❌ Error during badge reconciliation:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Manually trigger reconciliation for a specific player
   */
  async reconcilePlayer(playerAddress: string): Promise<{
    success: boolean;
    updated: boolean;
    error?: string;
  }> {
    try {
      const badgeService = getBadgeService();
      
      // Check if player has badge
      const hasBadge = await badgeService.hasBadge(playerAddress);
      if (!hasBadge) {
        return {
          success: true,
          updated: false,
        };
      }

      // Get current badge
      const badge = await badgeService.getBadge(playerAddress);
      if (!badge) {
        return {
          success: true,
          updated: false,
        };
      }

      const stats = await platformGameScoreClient.getPlayerStats(playerAddress);

      if (!stats.success || !stats.totalGames) {
        return {
          success: false,
          updated: false,
          error: 'Failed to get player stats',
        };
      }

      // Calculate expected tier
      const expectedTier = badgeService.calculateTierFromGames(stats.totalGames);

      // If tier is out of sync, update it
      if (badge.tier < expectedTier) {
        // Generate a reconciliation session ID
        const sessionId = `reconciliation_${playerAddress}_${Date.now()}`;
        
        const updateResult = await badgeService.checkAndBuildBadgeUpdate(
          playerAddress,
          sessionId,
          false // Don't add to retry queue (we're already in reconciliation)
        );

        if (updateResult.success && updateResult.tierUpgraded) {
          return {
            success: true,
            updated: true,
          };
        } else {
          return {
            success: false,
            updated: false,
            error: updateResult.error || 'Failed to update badge',
          };
        }
      }

      return {
        success: true,
        updated: false,
      };
    } catch (error) {
      console.error(`Error reconciling player ${playerAddress}:`, error);
      return {
        success: false,
        updated: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Calculate tier from games played
   * Updated thresholds: Standard (1-4), Common (5-14), Uncommon (15-34), Rare (35-74), Epic (75-149), Legendary (150+)
   */
  private calculateTier(gamesPlayed: number): number {
    if (gamesPlayed >= 150) return 5; // Legendary
    if (gamesPlayed >= 75) return 4;  // Epic
    if (gamesPlayed >= 35) return 3;  // Rare
    if (gamesPlayed >= 15) return 2;  // Uncommon
    if (gamesPlayed >= 5) return 1;   // Common
    return 0; // Standard (1-4 games)
  }
}

// Singleton instance
let reconciliationInstance: BadgeReconciliation | null = null;

export function getBadgeReconciliation(): BadgeReconciliation {
  if (!reconciliationInstance) {
    reconciliationInstance = new BadgeReconciliation();
  }
  return reconciliationInstance;
}

export const badgeReconciliation = getBadgeReconciliation();
export default badgeReconciliation;

