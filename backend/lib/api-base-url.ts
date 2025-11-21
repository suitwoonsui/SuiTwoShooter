/**
 * Get the API base URL for making requests
 * 
 * If NEXT_PUBLIC_API_BASE_URL is set, use it (e.g., "http://localhost:3000")
 * Otherwise, use empty string for relative URLs (same origin)
 */
export function getApiBaseUrl(): string {
  // In browser/client-side code, use the environment variable
  if (typeof window !== 'undefined') {
    return process.env.NEXT_PUBLIC_API_BASE_URL || '';
  }
  
  // In server-side code, also check the env var
  return process.env.NEXT_PUBLIC_API_BASE_URL || '';
}

