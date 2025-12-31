'use client';

import { useState, useEffect } from 'react';

/**
 * Hook to safely check if we're in a browser environment
 * Prevents SSR issues with browser-only APIs
 */
export const useSSRSafe = () => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return {
    isClient,
    isServer: !isClient,
    // Safe browser API access
    safeRequestAnimationFrame: (callback: FrameRequestCallback) => {
      if (typeof window !== 'undefined' && window.requestAnimationFrame) {
        return window.requestAnimationFrame(callback);
      }
      // Fallback for SSR
      return setTimeout(callback, 16) as unknown as number;
    },
    safeCancelAnimationFrame: (id: number) => {
      if (typeof window !== 'undefined' && window.cancelAnimationFrame) {
        window.cancelAnimationFrame(id);
      } else {
        // Fallback for SSR
        clearTimeout(id);
      }
    },
    safePerformanceNow: () => {
      if (typeof performance !== 'undefined' && performance.now) {
        return performance.now();
      }
      // Fallback for SSR
      return Date.now();
    }
  };
};

/**
 * Utility function to safely access browser APIs
 */
export const isBrowser = () => typeof window !== 'undefined';

/**
 * Utility function to safely access Node.js APIs
 */
export const isServer = () => typeof window === 'undefined';

/**
 * Safe wrapper for browser-only operations
 */
export const withSSRSafety = <T>(
  browserOperation: () => T,
  fallback: T
): T => {
  if (isBrowser()) {
    try {
      return browserOperation();
    } catch (error) {
      console.warn('Browser operation failed, using fallback:', error);
      return fallback;
    }
  }
  return fallback;
};
