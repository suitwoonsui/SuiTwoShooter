/**
 * API Configuration
 * Sets the backend API URL based on environment
 */

// Get backend URL from environment variable or use default
// For Vercel deployment, set VITE_BACKEND_URL in environment variables
// For local development, uses localhost
const getBackendUrl = () => {
  // Check if running in browser with environment variable (Vite style)
  if (typeof window !== 'undefined' && window.location) {
    // Try to get from meta tag or environment
    const metaTag = document.querySelector('meta[name="backend-url"]');
    if (metaTag) {
      return metaTag.getAttribute('content');
    }
    
    // Check if we're on Vercel production
    const hostname = window.location.hostname;
    if (hostname.includes('vercel.app') || hostname !== 'localhost') {
      // In production, backend should be on a subdomain or different path
      // Update this to match your actual backend URL
      return 'https://suitwo-backend.vercel.app/api';
    }
  }
  
  // Default to localhost for development
  return 'http://localhost:3000/api';
};

// Set global config for the game
if (typeof window !== 'undefined') {
  window.GAME_CONFIG = window.GAME_CONFIG || {};
  window.GAME_CONFIG.API_BASE_URL = getBackendUrl();
  
  console.log('🔧 API Base URL:', window.GAME_CONFIG.API_BASE_URL);
}

export default {
  API_BASE_URL: typeof window !== 'undefined' ? window.GAME_CONFIG?.API_BASE_URL : getBackendUrl()
};

