// ==========================================
// Badge Retry Queue - Handles failed badge updates with exponential backoff
// ==========================================

import { getBadgeService } from '@/lib/services/badge/core/badge-service';

/**
 * Retry queue entry
 */
interface RetryQueueEntry {
  playerAddress: string;
  sessionId: string;
  attempts: number;
  lastAttempt: number;
  nextRetry: number; // Timestamp for next retry attempt
  error?: string;
}

/**
 * BadgeRetryQueue - Manages retry queue for failed badge updates
 * 
 * Features:
 * - Exponential backoff (1s, 2s, 4s, 8s, 16s, 32s, max 60s)
 * - Idempotency (checks session ID before retry)
 * - In-memory storage (can be migrated to database/Redis later)
 * - Automatic retry processing
 */
export class BadgeRetryQueue {
  private queue: Map<string, RetryQueueEntry> = new Map(); // sessionId -> entry
  private maxAttempts: number = 5;
  private maxBackoff: number = 60000; // 60 seconds max
  private processingInterval: NodeJS.Timeout | null = null;
  private isProcessing: boolean = false;

  constructor() {
    // Start processing queue every 10 seconds
    this.startProcessing();
    console.log('✅ BadgeRetryQueue initialized');
  }

  /**
   * Add failed badge update to retry queue
   */
  addToQueue(
    playerAddress: string,
    sessionId: string,
    error?: string
  ): void {
    const existing = this.queue.get(sessionId);
    
    if (existing) {
      // Update existing entry
      existing.attempts += 1;
      existing.lastAttempt = Date.now();
      existing.nextRetry = this.calculateNextRetry(existing.attempts);
      if (error) {
        existing.error = error;
      }
    } else {
      // Create new entry
      const entry: RetryQueueEntry = {
        playerAddress,
        sessionId,
        attempts: 1,
        lastAttempt: Date.now(),
        nextRetry: this.calculateNextRetry(1),
        error,
      };
      this.queue.set(sessionId, entry);
    }

    console.log(`📋 Added to retry queue: ${playerAddress}, session: ${sessionId}, attempts: ${this.queue.get(sessionId)!.attempts}`);
  }

  /**
   * Calculate next retry time using exponential backoff
   */
  private calculateNextRetry(attempts: number): number {
    // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 32s, then cap at 60s
    const backoff = Math.min(
      Math.pow(2, attempts - 1) * 1000, // 2^(attempts-1) seconds in milliseconds
      this.maxBackoff
    );
    return Date.now() + backoff;
  }

  /**
   * Start processing queue periodically
   */
  private startProcessing(): void {
    // Process queue every 10 seconds
    this.processingInterval = setInterval(() => {
      this.processQueue();
    }, 10000); // 10 seconds
  }

  /**
   * Stop processing queue
   */
  stopProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
  }

  /**
   * Process retry queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing) {
      return; // Already processing
    }

    this.isProcessing = true;

    try {
      const now = Date.now();
      const entriesToRetry: RetryQueueEntry[] = [];

      // Find entries ready for retry
      for (const entry of this.queue.values()) {
        if (entry.nextRetry <= now && entry.attempts <= this.maxAttempts) {
          entriesToRetry.push(entry);
        } else if (entry.attempts > this.maxAttempts) {
          // Max attempts reached - remove from queue
          console.warn(`⚠️ Max retry attempts reached for session ${entry.sessionId}, removing from queue`);
          this.queue.delete(entry.sessionId);
        }
      }

      // Retry entries
      for (const entry of entriesToRetry) {
        await this.retryEntry(entry);
      }
    } catch (error) {
      console.error('❌ Error processing retry queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Retry a single queue entry
   */
  private async retryEntry(entry: RetryQueueEntry): Promise<void> {
    try {
      console.log(`🔄 Retrying badge update: ${entry.playerAddress}, session: ${entry.sessionId}, attempt: ${entry.attempts}`);

      const badgeService = getBadgeService();
      
      // Attempt to update badge
      const result = await badgeService.checkAndBuildBadgeUpdate(
        entry.playerAddress,
        entry.sessionId
      );

      if (result.success) {
        if (result.tierUpgraded) {
          // Tier upgrade needed - transaction built successfully
          // Note: Frontend still needs to sign and execute
          // For now, we'll consider this a success and remove from queue
          // In production, you might want to track pending transactions
          console.log(`✅ Badge update transaction built successfully for ${entry.playerAddress}`);
          this.queue.delete(entry.sessionId);
        } else {
          // No tier upgrade needed - remove from queue
          console.log(`✅ No tier upgrade needed for ${entry.playerAddress}, removing from queue`);
          this.queue.delete(entry.sessionId);
        }
      } else {
        // Still failing - update entry for next retry
        entry.attempts += 1;
        entry.lastAttempt = Date.now();
        entry.nextRetry = this.calculateNextRetry(entry.attempts);
        entry.error = result.error;

        if (entry.attempts > this.maxAttempts) {
          console.error(`❌ Max retry attempts reached for ${entry.playerAddress}, session: ${entry.sessionId}`);
          this.queue.delete(entry.sessionId);
        }
      }
    } catch (error) {
      // Error during retry - update entry
      entry.attempts += 1;
      entry.lastAttempt = Date.now();
      entry.nextRetry = this.calculateNextRetry(entry.attempts);
      entry.error = error instanceof Error ? error.message : 'Unknown error';

      if (entry.attempts > this.maxAttempts) {
        console.error(`❌ Max retry attempts reached for ${entry.playerAddress}, session: ${entry.sessionId}`);
        this.queue.delete(entry.sessionId);
      }
    }
  }

  /**
   * Get queue status
   */
  getQueueStatus(): {
    totalEntries: number;
    entries: Array<{
      playerAddress: string;
      sessionId: string;
      attempts: number;
      nextRetry: number;
      error?: string;
    }>;
  } {
    const entries = Array.from(this.queue.values()).map(entry => ({
      playerAddress: entry.playerAddress,
      sessionId: entry.sessionId,
      attempts: entry.attempts,
      nextRetry: entry.nextRetry,
      error: entry.error,
    }));

    return {
      totalEntries: this.queue.size,
      entries,
    };
  }

  /**
   * Remove entry from queue (manual cleanup)
   */
  removeFromQueue(sessionId: string): boolean {
    return this.queue.delete(sessionId);
  }

  /**
   * Clear all entries from queue
   */
  clearQueue(): void {
    this.queue.clear();
    console.log('🧹 Retry queue cleared');
  }
}

// Singleton instance
let retryQueueInstance: BadgeRetryQueue | null = null;

export function getBadgeRetryQueue(): BadgeRetryQueue {
  if (!retryQueueInstance) {
    retryQueueInstance = new BadgeRetryQueue();
  }
  return retryQueueInstance;
}

export const badgeRetryQueue = getBadgeRetryQueue();
export default badgeRetryQueue;

