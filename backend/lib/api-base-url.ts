/**
 * Get the API base URL for making requests
 * 
 * If NEXT_PUBLIC_API_BASE_URL is set, use it (e.g., "http://localhost:3000")
 * Otherwise, default to Vercel URL in production, or empty string for relative URLs in development
 */
export function getApiBaseUrl(): string {
  // Check if environment variable is set (highest priority)
  if (process.env.NEXT_PUBLIC_API_BASE_URL) {
    return process.env.NEXT_PUBLIC_API_BASE_URL;
  }
  
  // In browser/client-side code, detect production environment
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    
    // If on Vercel domain or using HTTPS (production), use Vercel URL
    if (hostname.includes('vercel.app') || (protocol === 'https:' && hostname !== 'localhost' && hostname !== '127.0.0.1')) {
      return 'https://sui-two-shooter-backend-sui-integra.vercel.app';
    }
    
    // For localhost in development, check if we're on the same origin
    // If the admin page is part of the backend app, use relative URLs
    // Otherwise, default to Vercel URL even on localhost (for testing deployed backend)
    // This allows testing the admin page locally while connecting to deployed backend
    return 'https://sui-two-shooter-backend-sui-integra.vercel.app';
  }
  
  // Server-side: check NODE_ENV
  if (process.env.NODE_ENV === 'production') {
    return 'https://sui-two-shooter-backend-sui-integra.vercel.app';
  }
  
  // Server-side development: default to Vercel URL (allows testing against deployed backend)
  // To use local backend, set NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
  return 'https://sui-two-shooter-backend-sui-integra.vercel.app';
}

