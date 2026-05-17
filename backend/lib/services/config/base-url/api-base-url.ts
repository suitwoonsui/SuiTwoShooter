// ==========================================
// API Base URL Helper — game backend base URL for shared services.
// Env: NEXT_PUBLIC_API_BASE_URL (optional). Defaults: localhost → http://localhost:3000; production → Vercel fallback.
// ==========================================

/**
 * Get the base API URL from environment variables or defaults
 * For game backend, this should point to the base backend (port 3000) for shared services
 * The admin page uses this to route shared service calls to base backend
 */
export function getApiBaseUrl(): string {
  // Check if we're on localhost
  if (typeof window !== 'undefined') {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isLocalhost) {
      // Localhost: default to base backend (port 3000)
      return process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';
    }
  }
  
  // Production: use environment variable or fallback
  const envUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (envUrl && !envUrl.includes('localhost')) {
    return envUrl;
  }
  
  // Fallback to Vercel URL for base backend
  return 'https://sui-two-shooter-backend-sui-integra.vercel.app';
}
