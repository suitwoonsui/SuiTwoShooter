/**
 * Get the API base URL for making requests
 * 
 * HARDCODED to Vercel URL - no localhost, no detection, no fallback
 * Set NEXT_PUBLIC_API_BASE_URL environment variable to override
 */
const VERCEL_BACKEND_URL = 'https://sui-two-shooter-backend-sui-integra.vercel.app';

export function getApiBaseUrl(): string {
  // Only use env var if it's explicitly set AND not localhost
  const envUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (envUrl && !envUrl.includes('localhost')) {
    console.log('[API-BASE-URL] Using env var (non-localhost):', envUrl);
    return envUrl;
  }
  
  // ALWAYS return Vercel URL - no exceptions
  if (typeof window !== 'undefined') {
    console.log('[API-BASE-URL] Client-side: FORCING Vercel URL:', VERCEL_BACKEND_URL);
    console.log('[API-BASE-URL] Window location:', window.location.href);
    console.log('[API-BASE-URL] Env var was:', envUrl || 'not set');
  }
  
  return VERCEL_BACKEND_URL;
}

