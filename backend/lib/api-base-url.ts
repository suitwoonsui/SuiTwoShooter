/**
 * Get the API base URL for making requests
 * 
 * If NEXT_PUBLIC_API_BASE_URL is set, use it (e.g., "http://localhost:3000")
 * Otherwise, default to Vercel URL in production, or empty string for relative URLs in development
 */
export function getApiBaseUrl(): string {
  // Check if environment variable is set
  if (process.env.NEXT_PUBLIC_API_BASE_URL) {
    return process.env.NEXT_PUBLIC_API_BASE_URL;
  }
  
  // In browser/client-side code, detect production environment
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    
    // If not localhost, assume production and use Vercel URL
    if (hostname !== 'localhost' && hostname !== '127.0.0.1' && protocol === 'https:') {
      return 'https://sui-two-shooter-backend-sui-integra.vercel.app';
    }
    
    // For localhost, use empty string for relative URLs (same origin)
    return '';
  }
  
  // Server-side: check NODE_ENV
  if (process.env.NODE_ENV === 'production') {
    return 'https://sui-two-shooter-backend-sui-integra.vercel.app';
  }
  
  // Development: use empty string for relative URLs
  return '';
}

