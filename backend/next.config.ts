import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // API-only backend, no pages needed
  output: 'standalone',
  
  // CORS is handled dynamically in API routes (see lib/cors.ts)
  // We don't set static headers here because they can't respond to request origins
  
  // Suppress warnings for transitive dependencies
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
};

export default nextConfig;

