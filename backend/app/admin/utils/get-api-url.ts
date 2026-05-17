// ==========================================
// Admin Page Utilities - API URL Helper
// ==========================================

/**
 * Build API URLs for the admin page.
 *
 * Client-side calls must always hit the game backend (same-origin). The game backend
 * is responsible for proxying to platform where needed.
 */
export const getApiUrl = (path: string): string => {
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;

  // Browser: always call same-origin game backend API (no direct client -> platform calls).
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/${cleanPath}`;
  }

  // Server fallback: keep game backend as the target.
  const gameBackendBaseUrl =
    process.env.NEXT_PUBLIC_GAME_BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    'http://localhost:3001';

  return `${gameBackendBaseUrl.replace(/\/$/, '')}/${cleanPath}`;
};

