// ==========================================
// Badge Image Cache Tests
// ==========================================

import { BadgeImageCache } from '../lib/sui/badge-image-cache';

describe('BadgeImageCache', () => {
  let cache: BadgeImageCache;

  beforeEach(() => {
    cache = new BadgeImageCache(1000, 10); // 1 second TTL, max 10 entries
  });

  describe('get and set', () => {
    it('should store and retrieve image', () => {
      const imageData = new Uint8Array([1, 2, 3, 4]);
      cache.set(1, imageData);
      const retrieved = cache.get(1);
      expect(retrieved).toEqual(imageData);
    });

    it('should return null for non-existent tier', () => {
      expect(cache.get(1)).toBeNull();
    });

    it('should return null for expired entry', async () => {
      const imageData = new Uint8Array([1, 2, 3, 4]);
      cache.set(1, imageData);
      
      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      expect(cache.get(1)).toBeNull();
    });
  });

  describe('has', () => {
    it('should return true for cached entry', () => {
      const imageData = new Uint8Array([1, 2, 3, 4]);
      cache.set(1, imageData);
      expect(cache.has(1)).toBe(true);
    });

    it('should return false for non-existent entry', () => {
      expect(cache.has(1)).toBe(false);
    });

    it('should return false for expired entry', async () => {
      const imageData = new Uint8Array([1, 2, 3, 4]);
      cache.set(1, imageData);
      
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      expect(cache.has(1)).toBe(false);
    });
  });

  describe('clear', () => {
    it('should clear all entries', () => {
      cache.set(1, new Uint8Array([1]));
      cache.set(2, new Uint8Array([2]));
      cache.clear();
      expect(cache.get(1)).toBeNull();
      expect(cache.get(2)).toBeNull();
    });
  });

  describe('clearExpired', () => {
    it('should remove expired entries', async () => {
      cache.set(1, new Uint8Array([1]));
      cache.set(2, new Uint8Array([2]));
      
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      const removed = cache.clearExpired();
      expect(removed).toBe(2);
      expect(cache.get(1)).toBeNull();
      expect(cache.get(2)).toBeNull();
    });

    it('should not remove valid entries', () => {
      cache.set(1, new Uint8Array([1]));
      const removed = cache.clearExpired();
      expect(removed).toBe(0);
      expect(cache.get(1)).not.toBeNull();
    });
  });

  describe('LRU eviction', () => {
    it('should evict oldest entry when max size reached', () => {
      // Fill cache to max size
      for (let i = 0; i < 10; i++) {
        cache.set(i, new Uint8Array([i]));
      }
      
      // Add one more - should evict oldest (tier 0)
      cache.set(10, new Uint8Array([10]));
      
      expect(cache.get(0)).toBeNull(); // Evicted
      expect(cache.get(10)).not.toBeNull(); // New entry
    });
  });

  describe('getStats', () => {
    it('should return cache statistics', () => {
      cache.set(1, new Uint8Array([1, 2, 3]));
      cache.set(2, new Uint8Array([4, 5, 6]));
      
      const stats = cache.getStats();
      expect(stats.size).toBe(2);
      expect(stats.maxSize).toBe(10);
      expect(stats.ttl).toBe(1000);
      expect(stats.entries).toHaveLength(2);
      expect(stats.entries[0].tier).toBe(1);
      expect(stats.entries[0].size).toBe(3);
    });
  });
});

