import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  // API-only backend, no pages needed
  output: 'standalone',
  
  // Set the workspace root to the backend directory to avoid lockfile warnings
  outputFileTracingRoot: path.join(__dirname),
  
  // CORS is handled dynamically in API routes (game-owned lib/cors.ts)
  // We don't set static headers here because they can't respond to request origins
  
  // Suppress warnings for transitive dependencies
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
  
  // Game backend talks to platform via HTTP API only; no @platform code imports.
  webpack: (config) => {
    if (!config.resolve) {
      config.resolve = {};
    }
    if (!config.resolve.alias) {
      config.resolve.alias = {};
    }

    // Ensure extensions are resolved correctly
    if (!config.resolve.extensions) {
      config.resolve.extensions = ['.ts', '.tsx', '.js', '.jsx', '.json'];
    }
    
    // Ensure modules are resolved correctly
    // When importing from Aqueduct Platform/backend, we need to resolve node_modules from the game backend
    // (Aqueduct Platform/backend has its own node_modules; game backend takes precedence for shared deps)
    // Preserve existing module resolution paths and prepend game backend's node_modules
    const gameBackendNodeModules = path.resolve(__dirname, 'node_modules');
    if (!config.resolve.modules) {
      config.resolve.modules = [];
    }
    // Prepend game backend's node_modules to existing modules array
    if (Array.isArray(config.resolve.modules)) {
      // Remove duplicates and ensure game backend's node_modules is first
      const existingModules = config.resolve.modules.filter((m: string) => m !== gameBackendNodeModules && m !== 'node_modules');
      config.resolve.modules = [
        gameBackendNodeModules,  // Game backend's node_modules (has @mysten/sui) - highest priority
        ...existingModules,       // Preserve any existing module paths
        'node_modules',           // Default resolution (fallback)
      ];
    }
    
    // Also set resolveLoader to ensure loaders resolve from game backend
    if (!config.resolveLoader) {
      config.resolveLoader = {};
    }
    if (!config.resolveLoader.modules) {
      config.resolveLoader.modules = [];
    }
    if (Array.isArray(config.resolveLoader.modules)) {
      const existingLoaderModules = config.resolveLoader.modules.filter((m: string) => m !== gameBackendNodeModules && m !== 'node_modules');
      config.resolveLoader.modules = [
        gameBackendNodeModules,
        ...existingLoaderModules,
        'node_modules',
      ];
    }
    
    return config;
  },
};

export default nextConfig;
