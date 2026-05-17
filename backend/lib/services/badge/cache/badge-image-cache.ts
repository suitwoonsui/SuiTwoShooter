// ==========================================
// Badge Image Cache - Improved caching with TTL and size limits
// ==========================================

import { PlatformLogger } from '@/lib/services/platform/logging/platform-logger';

/**
 * Cached image entry
 */
interface CachedImage {
  data: Uint8Array;
  timestamp: number;
  tier: number;
}

/**
 * Improved image cache with TTL and size limits
 * Prevents memory leaks and ensures fresh data
 */
export class BadgeImageCache {
  private cache: Map<string, CachedImage> = new Map();
  private readonly ttl: number; // Time to live in milliseconds
  private readonly maxSize: number; // Maximum number of cached images
  
  constructor(
    ttl: number = 3600000, // Default: 1 hour
    maxSize: number = 100 // Default: 100 images
  ) {
    this.ttl = ttl;
    this.maxSize = maxSize;
    PlatformLogger.debug('BadgeImageCache initialized', { ttl, maxSize });
  }
  
  /**
   * Get cached image if available and not expired
   * @param tier - Badge tier
   * @returns Cached image data or null if not cached/expired
   */
  get(tier: number): Uint8Array | null {
    const cacheKey = this.getCacheKey(tier);
    const cached = this.cache.get(cacheKey);
    
    if (!cached) {
      PlatformLogger.debug(`Cache miss for tier ${tier}`);
      return null;
    }
    
    // Check TTL
    const age = Date.now() - cached.timestamp;
    if (age > this.ttl) {
      PlatformLogger.debug(`Cache expired for tier ${tier} (age: ${age}ms)`);
      this.cache.delete(cacheKey);
      return null;
    }
    
    PlatformLogger.debug(`Cache hit for tier ${tier} (age: ${age}ms)`);
    return cached.data;
  }
  
  /**
   * Set cached image
   * @param tier - Badge tier
   * @param data - Image data
   */
  set(tier: number, data: Uint8Array): void {
    // Implement LRU eviction if cache is full
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }
    
    const cacheKey = this.getCacheKey(tier);
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      tier,
    });
    
    PlatformLogger.debug(`Cached image for tier ${tier}`, {
      size: data.length,
      cacheSize: this.cache.size,
    });
  }
  
  /**
   * Check if image is cached and valid
   * @param tier - Badge tier
   * @returns True if cached and not expired
   */
  has(tier: number): boolean {
    const cacheKey = this.getCacheKey(tier);
    const cached = this.cache.get(cacheKey);
    
    if (!cached) {
      return false;
    }
    
    // Check TTL
    const age = Date.now() - cached.timestamp;
    if (age > this.ttl) {
      this.cache.delete(cacheKey);
      return false;
    }
    
    return true;
  }
  
  /**
   * Clear all cached images
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    PlatformLogger.debug(`Cleared image cache (removed ${size} entries)`);
  }
  
  /**
   * Clear expired entries
   * @returns Number of entries removed
   */
  clearExpired(): number {
    const now = Date.now();
    let removed = 0;
    
    for (const [key, cached] of this.cache.entries()) {
      const age = now - cached.timestamp;
      if (age > this.ttl) {
        this.cache.delete(key);
        removed++;
      }
    }
    
    if (removed > 0) {
      PlatformLogger.debug(`Cleared ${removed} expired cache entries`);
    }
    
    return removed;
  }
  
  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    ttl: number;
    entries: Array<{ tier: number; age: number; size: number }>;
  } {
    const now = Date.now();
    const entries = Array.from(this.cache.entries()).map(([key, cached]) => ({
      tier: cached.tier,
      age: now - cached.timestamp,
      size: cached.data.length,
    }));
    
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      ttl: this.ttl,
      entries,
    };
  }
  
  /**
   * Evict oldest entry (LRU)
   */
  private evictOldest(): void {
    if (this.cache.size === 0) {
      return;
    }
    
    // Find oldest entry
    let oldestKey: string | null = null;
    let oldestTimestamp = Infinity;
    
    for (const [key, cached] of this.cache.entries()) {
      if (cached.timestamp < oldestTimestamp) {
        oldestTimestamp = cached.timestamp;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      const tier = this.cache.get(oldestKey)!.tier;
      this.cache.delete(oldestKey);
      PlatformLogger.debug(`Evicted oldest cache entry (tier ${tier})`);
    }
  }
  
  /**
   * Get cache key for tier
   */
  private getCacheKey(tier: number): string {
    return `tier_${tier}`;
  }
}

// Singleton instance
let imageCacheInstance: BadgeImageCache | null = null;

/**
 * Get singleton image cache instance
 */
export function getBadgeImageCache(): BadgeImageCache {
  if (!imageCacheInstance) {
    // Use environment variables for configuration if available
    const ttl = process.env.BADGE_IMAGE_CACHE_TTL 
      ? parseInt(process.env.BADGE_IMAGE_CACHE_TTL, 10)
      : 3600000; // 1 hour default
    
    const maxSize = process.env.BADGE_IMAGE_CACHE_MAX_SIZE
      ? parseInt(process.env.BADGE_IMAGE_CACHE_MAX_SIZE, 10)
      : 100; // 100 images default
    
    imageCacheInstance = new BadgeImageCache(ttl, maxSize);
  }
  return imageCacheInstance;
}

