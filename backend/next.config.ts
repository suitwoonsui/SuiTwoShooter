import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  // API-only backend, no pages needed
  output: 'standalone',
  
  // Set the workspace root to the backend directory to avoid lockfile warnings
  outputFileTracingRoot: path.join(__dirname),
  
  
  // CORS is handled dynamically in API routes (see lib/cors.ts)
  // We don't set static headers here because they can't respond to request origins
  
  // Suppress warnings for transitive dependencies
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
};

export default nextConfig;

