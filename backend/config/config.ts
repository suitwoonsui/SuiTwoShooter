// ==========================================
// Configuration Management (TypeScript)
// ==========================================

type SuiNetwork = 'testnet' | 'mainnet' | 'devnet';
type NodeEnv = 'development' | 'production' | 'test';

interface ServerConfig {
  port: number;
  nodeEnv: NodeEnv;
  corsOrigin: string;
  apiBaseUrl: string;  // Base URL for API endpoints (e.g., "https://suitwo.game" or "http://localhost:3000")
}

interface SuiConfig {
  network: SuiNetwork;
  rpcUrl: string;
  gasBudget: number;
}

interface TokenConfig {
  mewsTokenTypeId: string;
  minTokenBalance: number;
}

interface ContractsConfig {
  gameScore: string;
  sessionRegistry: string;  // Session registry object ID (from init function)
  statisticsRegistry: string;  // Statistics registry object ID (from init function) - for player stats tracking
  badgeRegistry: string;  // Badge registry object ID (from badge_system::init function)
  badgePublisher: string;  // Badge Publisher object ID (created automatically by init() function) - for updating badge display metadata
  badgeDisplay: string;  // Badge Display object ID (created via create_display function) - configures how badges appear in wallets
  adminCapability: string;   // Admin capability object ID (from create_admin_capability function) - for score submission
  tokenBurn: string;
  subscription: string;
  premiumStore: string;      // Premium store package ID
  premiumStoreObject: string; // Premium store object ID (from init function)
  premiumStoreAdminCapability: string; // Premium store admin capability object ID (separate from score submission)
  oldPremiumStorePackageId: string; // Old premium store package ID (for migration from old contract)
  oldPremiumStoreObjectId: string; // Old premium store object ID (for migration from old contract)
}

interface SecurityConfig {
  apiKey: string;
  jwtSecret: string;
}

export interface Config {
  server: ServerConfig;
  sui: SuiConfig;
  token: TokenConfig;
  contracts: ContractsConfig;
  security: SecurityConfig;
}

/**
 * Validate required environment variables
 */
function validateConfig(): void {
  const required = [
    'MEWS_TOKEN_TYPE_ID',
    'MIN_TOKEN_BALANCE'
  ];

  const recommended = [
    'GAME_WALLET_PRIVATE_KEY'
  ];
  
  // Determine network for validation (same logic as getConfig)
  let network: SuiNetwork = 'mainnet';
  if (process.env.SUI_TESTNET_NETWORK) {
    network = 'testnet';
  } else if (process.env.SUI_MAINNET_NETWORK) {
    network = 'mainnet';
  } else if (process.env.SUI_NETWORK) {
    network = process.env.SUI_NETWORK as SuiNetwork;
  }
  
  // Check for contract address (either network-specific or general)
  const hasContractAddress = network === 'testnet'
    ? !!(process.env.GAME_SCORE_CONTRACT_TESTNET || process.env.GAME_SCORE_CONTRACT)
    : !!(process.env.GAME_SCORE_CONTRACT_MAINNET || process.env.GAME_SCORE_CONTRACT);
  
  if (!hasContractAddress) {
    recommended.push(`GAME_SCORE_CONTRACT_${network.toUpperCase()}`);
  }

  const missing = required.filter(key => !process.env[key]);
  const missingRecommended = recommended.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  if (missingRecommended.length > 0) {
    console.warn(`⚠️  Missing recommended environment variables: ${missingRecommended.join(', ')}`);
    console.warn('Some features may not work correctly.');
  }
}

/**
 * Get configuration object
 */
export function getConfig(): Config {
  // Determine network: Support SUI_TESTNET_NETWORK, SUI_MAINNET_NETWORK, or SUI_NETWORK
  let network: SuiNetwork = 'mainnet'; // default
  
  if (process.env.SUI_TESTNET_NETWORK) {
    network = 'testnet';
  } else if (process.env.SUI_MAINNET_NETWORK) {
    network = 'mainnet';
  } else if (process.env.SUI_NETWORK) {
    network = process.env.SUI_NETWORK as SuiNetwork;
  }
  
  // Support network-specific RPC URLs
  // Check for SUI_TESTNET_RPC_URL, SUI_TESTET_RPC_URL (typo), or SUI_MAINNET_RPC_URL
  const mainnetRpcUrl = process.env.SUI_MAINNET_RPC_URL || 'https://fullnode.mainnet.sui.io:443';
  const testnetRpcUrl = process.env.SUI_TESTNET_RPC_URL || process.env.SUI_TESTET_RPC_URL || 'https://fullnode.testnet.sui.io:443';
  
  // Use network-specific RPC URL based on determined network
  const rpcUrl = network === 'mainnet' 
    ? mainnetRpcUrl 
    : network === 'testnet'
    ? testnetRpcUrl
    : process.env.SUI_RPC_URL || testnetRpcUrl;

  return {
    server: {
      port: parseInt(process.env.PORT || '3000', 10),
      nodeEnv: (process.env.NODE_ENV || 'development') as NodeEnv,
      corsOrigin: process.env.CORS_ORIGIN || '*', // Default to * for development (allows localhost:8000)
      // Determine API base URL:
      // Priority: explicit env var > production domain (always use fixed production URL, not deployment-specific VERCEL_URL)
      apiBaseUrl: (() => {
        // Fixed production domain URL (doesn't change with deployments)
        const PRODUCTION_URL = 'https://sui-two-shooter-backend-sui-integra.vercel.app';
        
        // Check explicit environment variables first
        const explicitUrl = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL;
        
        // If explicitly set to a non-localhost URL, use it
        if (explicitUrl && !explicitUrl.includes('localhost')) {
          console.log(`[CONFIG] Using explicit non-localhost URL: ${explicitUrl}`);
          return explicitUrl;
        }
        
        // If explicitly set to localhost, use it (for local development)
        if (explicitUrl && explicitUrl.includes('localhost')) {
          console.log(`[CONFIG] Using explicit localhost URL: ${explicitUrl}`);
          return explicitUrl;
        }
        
        // If on Vercel (VERCEL env var is set) or in production, use fixed production URL
        // NOTE: We use VERCEL env var to detect Vercel, but use the fixed production URL, not VERCEL_URL
        // This ensures we always use the production domain, not the deployment-specific URL
        if (process.env.VERCEL === '1' || process.env.NODE_ENV === 'production') {
          console.log(`[CONFIG] Vercel/Production detected, using fixed production URL: ${PRODUCTION_URL}`);
          return PRODUCTION_URL;
        }
        
        // Default to localhost for local development
        console.log(`[CONFIG] Defaulting to localhost: http://localhost:3000`);
        return 'http://localhost:3000';
      })()
    },
    sui: {
      network,
      rpcUrl,
      gasBudget: parseInt(process.env.SUI_GAS_BUDGET || '10000000', 10)
    },
    token: {
      mewsTokenTypeId: network === 'testnet'
        ? (process.env.MEWS_TOKEN_TYPE_ID_TESTNET || process.env.MEWS_TOKEN_TYPE_ID || '0x2dcf8629a70b235cda598170fc9b271f03f33d34dd6fa148adaff481e7a792d2::mews::MEWS')
        : (process.env.MEWS_TOKEN_TYPE_ID_MAINNET || process.env.MEWS_TOKEN_TYPE_ID || '0x2dcf8629a70b235cda598170fc9b271f03f33d34dd6fa148adaff481e7a792d2::mews::MEWS'),
      minTokenBalance: parseInt(process.env.MIN_TOKEN_BALANCE || '500000000', 10) // 500,000 with 9 decimals
    },
    contracts: {
      // Support network-specific contract addresses
      // Use GAME_SCORE_CONTRACT_TESTNET or GAME_SCORE_CONTRACT_MAINNET if available
      // Otherwise fall back to GAME_SCORE_CONTRACT (for backward compatibility)
      gameScore: network === 'testnet'
        ? (process.env.GAME_SCORE_CONTRACT_TESTNET || process.env.GAME_SCORE_CONTRACT || '')
        : (process.env.GAME_SCORE_CONTRACT_MAINNET || process.env.GAME_SCORE_CONTRACT || ''),
      // Support network-specific session registry object IDs
      // Use SESSION_REGISTRY_OBJECT_ID_TESTNET or SESSION_REGISTRY_OBJECT_ID_MAINNET if available
      // Otherwise fall back to SESSION_REGISTRY_OBJECT_ID (for backward compatibility)
      sessionRegistry: network === 'testnet'
        ? (process.env.SESSION_REGISTRY_OBJECT_ID_TESTNET || process.env.SESSION_REGISTRY_OBJECT_ID || '')
        : (process.env.SESSION_REGISTRY_OBJECT_ID_MAINNET || process.env.SESSION_REGISTRY_OBJECT_ID || ''),
      // Support network-specific statistics registry object IDs
      // Use STATISTICS_REGISTRY_OBJECT_ID_TESTNET or STATISTICS_REGISTRY_OBJECT_ID_MAINNET if available
      // Otherwise fall back to STATISTICS_REGISTRY_OBJECT_ID (for backward compatibility)
      // NOTE: Statistics registry is created by init() function, same as session registry
      statisticsRegistry: network === 'testnet'
        ? (process.env.STATISTICS_REGISTRY_OBJECT_ID_TESTNET || process.env.STATISTICS_REGISTRY_OBJECT_ID || '')
        : (process.env.STATISTICS_REGISTRY_OBJECT_ID_MAINNET || process.env.STATISTICS_REGISTRY_OBJECT_ID || ''),
      // Support network-specific badge registry object IDs
      // Use BADGE_REGISTRY_OBJECT_ID_TESTNET or BADGE_REGISTRY_OBJECT_ID_MAINNET if available
      // Otherwise fall back to BADGE_REGISTRY_OBJECT_ID (for backward compatibility)
      // NOTE: Badge registry is created by badge_system::init() function
      badgeRegistry: network === 'testnet'
        ? (process.env.BADGE_REGISTRY_OBJECT_ID_TESTNET || process.env.BADGE_REGISTRY_OBJECT_ID || '')
        : (process.env.BADGE_REGISTRY_OBJECT_ID_MAINNET || process.env.BADGE_REGISTRY_OBJECT_ID || ''),
      // Support network-specific badge publisher object IDs
      // Use BADGE_PUBLISHER_OBJECT_ID_TESTNET or BADGE_PUBLISHER_OBJECT_ID_MAINNET if available
      // Otherwise fall back to BADGE_PUBLISHER_OBJECT_ID (for backward compatibility)
      // NOTE: Badge Publisher is created automatically by init() function via package::claim_and_keep
      badgePublisher: network === 'testnet'
        ? (process.env.BADGE_PUBLISHER_OBJECT_ID_TESTNET || process.env.BADGE_PUBLISHER_OBJECT_ID || '')
        : (process.env.BADGE_PUBLISHER_OBJECT_ID_MAINNET || process.env.BADGE_PUBLISHER_OBJECT_ID || ''),
      // Support network-specific badge display object IDs
      // Use BADGE_DISPLAY_OBJECT_ID_TESTNET or BADGE_DISPLAY_OBJECT_ID_MAINNET if available
      // Otherwise fall back to BADGE_DISPLAY_OBJECT_ID (for backward compatibility)
      // NOTE: Badge Display is created via create_display function using the Publisher
      badgeDisplay: network === 'testnet'
        ? (process.env.BADGE_DISPLAY_OBJECT_ID_TESTNET || process.env.BADGE_DISPLAY_OBJECT_ID || '')
        : (process.env.BADGE_DISPLAY_OBJECT_ID_MAINNET || process.env.BADGE_DISPLAY_OBJECT_ID || ''),
      // Support network-specific admin capability object IDs
      // Use ADMIN_CAPABILITY_OBJECT_ID_TESTNET or ADMIN_CAPABILITY_OBJECT_ID_MAINNET if available
      // Otherwise fall back to ADMIN_CAPABILITY_OBJECT_ID (for backward compatibility)
      adminCapability: network === 'testnet'
        ? (process.env.ADMIN_CAPABILITY_OBJECT_ID_TESTNET || process.env.ADMIN_CAPABILITY_OBJECT_ID || '')
        : (process.env.ADMIN_CAPABILITY_OBJECT_ID_MAINNET || process.env.ADMIN_CAPABILITY_OBJECT_ID || ''),
      tokenBurn: process.env.TOKEN_BURN_CONTRACT || '',
      subscription: process.env.SUBSCRIPTION_CONTRACT || '',
      // Support network-specific premium store addresses
      premiumStore: network === 'testnet'
        ? (process.env.PREMIUM_STORE_CONTRACT_TESTNET || process.env.PREMIUM_STORE_CONTRACT || '')
        : (process.env.PREMIUM_STORE_CONTRACT_MAINNET || process.env.PREMIUM_STORE_CONTRACT || ''),
      premiumStoreObject: network === 'testnet'
        ? (process.env.PREMIUM_STORE_OBJECT_ID_TESTNET || process.env.PREMIUM_STORE_OBJECT_ID || '')
        : (process.env.PREMIUM_STORE_OBJECT_ID_MAINNET || process.env.PREMIUM_STORE_OBJECT_ID || ''),
      premiumStoreAdminCapability: network === 'testnet'
        ? (process.env.PREMIUM_STORE_ADMIN_CAPABILITY_OBJECT_ID_TESTNET || process.env.ADMIN_CAPABILITY_OBJECT_ID_TESTNET || process.env.ADMIN_CAPABILITY_OBJECT_ID || '')
        : (process.env.PREMIUM_STORE_ADMIN_CAPABILITY_OBJECT_ID_MAINNET || process.env.ADMIN_CAPABILITY_OBJECT_ID_MAINNET || process.env.ADMIN_CAPABILITY_OBJECT_ID || ''),
      // Old store IDs for migration (optional - can be provided in API request instead)
      // Supports both CONTRACT and PACKAGE_ID naming conventions
      oldPremiumStorePackageId: network === 'testnet'
        ? (process.env.OLD_PREMIUM_STORE_CONTRACT_TESTNET || process.env.OLD_PREMIUM_STORE_PACKAGE_ID_TESTNET || process.env.OLD_PREMIUM_STORE_PACKAGE_ID || process.env.OLD_PREMIUM_STORE_CONTRACT || '')
        : (process.env.OLD_PREMIUM_STORE_CONTRACT_MAINNET || process.env.OLD_PREMIUM_STORE_PACKAGE_ID_MAINNET || process.env.OLD_PREMIUM_STORE_PACKAGE_ID || process.env.OLD_PREMIUM_STORE_CONTRACT || ''),
      oldPremiumStoreObjectId: network === 'testnet'
        ? (process.env.OLD_PREMIUM_STORE_OBJECT_ID_TESTNET || process.env.OLD_PREMIUM_STORE_OBJECT_ID || '')
        : (process.env.OLD_PREMIUM_STORE_OBJECT_ID_MAINNET || process.env.OLD_PREMIUM_STORE_OBJECT_ID || '')
    },
    security: {
      apiKey: process.env.API_KEY || '',
      jwtSecret: process.env.JWT_SECRET || ''
    }
  };
}

// Validate on import
validateConfig();

export default getConfig;

