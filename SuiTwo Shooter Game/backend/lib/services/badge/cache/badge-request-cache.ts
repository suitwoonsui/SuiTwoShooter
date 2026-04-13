// ==========================================
// Badge Request Cache - Request-level caching for badge data
// ==========================================

/**
 * Simple in-memory cache for badge data requests
 * TTL: 30 seconds (badge data doesn't change frequently)
 * Max size: 100 entries (LRU eviction)
 */
class BadgeRequestCache {
  private cache: Map<string, { data: any; expiresAt: number }> = new Map();
  private readonly TTL = 30 * 1000; // 30 seconds
  private readonly MAX_SIZE = 100;

  /**
   * Get cached badge data
   */
  get(playerAddress: string): any | null {
    const entry = this.cache.get(playerAddress);
    
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(playerAddress);
      return null;
    }

    return entry.data;
  }

  /**
   * Set badge data in cache
   */
  set(playerAddress: string, data: any): void {
    // Evict oldest entries if at max size
    if (this.cache.size >= this.MAX_SIZE) {
      // Remove oldest entry (first in map)
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(playerAddress, {
      data,
      expiresAt: Date.now() + this.TTL,
    });
  }

  /**
   * Invalidate cache for a player
   */
  invalidate(playerAddress: string): void {
    this.cache.delete(playerAddress);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; maxSize: number; ttl: number } {
    return {
      size: this.cache.size,
      maxSize: this.MAX_SIZE,
      ttl: this.TTL,
    };
  }
}

// Singleton instance
let badgeRequestCacheInstance: BadgeRequestCache | null = null;

export function getBadgeRequestCache(): BadgeRequestCache {
  if (!badgeRequestCacheInstance) {
    badgeRequestCacheInstance = new BadgeRequestCache();
  }
  return badgeRequestCacheInstance;
}

