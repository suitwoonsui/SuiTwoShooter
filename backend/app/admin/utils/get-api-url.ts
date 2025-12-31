// ==========================================
// Admin Page Utilities - API URL Helper
// ==========================================

import { getApiBaseUrl } from '@/lib/api-base-url';

/**
 * Helper function to get full API URL
 * Uses localhost when running locally, otherwise uses configured base URL
 */
export const getApiUrl = (path: string): string => {
  const baseUrl = getApiBaseUrl();
  console.log('[ADMIN-PAGE] getApiUrl called:', { path, baseUrl, envVar: process.env.NEXT_PUBLIC_API_BASE_URL });
  
  // Remove leading slash from path if baseUrl is provided (to avoid double slashes)
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  
  // Use localhost when running locally, otherwise use configured base URL
  let finalBaseUrl: string;
  if (typeof window !== 'undefined') {
    // Client-side: check if we're on localhost
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isLocalhost) {
      finalBaseUrl = 'http://localhost:3000';
    } else if (baseUrl && !baseUrl.includes('localhost')) {
      finalBaseUrl = baseUrl;
    } else {
      // Fallback to Vercel URL only if not localhost and no baseUrl configured
      finalBaseUrl = 'https://sui-two-shooter-backend-sui-integra.vercel.app';
    }
  } else {
    // Server-side: use baseUrl or fallback
    finalBaseUrl = baseUrl || 'http://localhost:3000';
  }
  
  const fullUrl = `${finalBaseUrl}/${cleanPath}`;
  console.log('[ADMIN-PAGE] Final URL:', fullUrl);
  return fullUrl;
};

