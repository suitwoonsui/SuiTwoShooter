// ==========================================
// Configuration Management (TypeScript)
// ==========================================

import { getContractConfig, pick } from './contract-config';

type SuiNetwork = 'testnet' | 'mainnet' | 'devnet';
type NodeEnv = 'development' | 'production' | 'test';

interface ServerConfig {
  port: number;
  nodeEnv: NodeEnv;
  corsOrigin: string;
  apiBaseUrl: string;  // Base URL for API endpoints (e.g., "https://suitwo.game" or "http://localhost:3000")
  appId: string;  // App identifier for platform (APP_ID / GAME_APP_ID env; must match AppCapability app_id)
}

interface SuiConfig {
  network: SuiNetwork;
  rpcUrl: string;
  gasBudget: number;
}

interface TokenConfig {
  mewsTokenTypeId: string;
  usdcTokenTypeId: string;
  minTokenBalance: number;
}

interface ContractsConfig {
  // Platform contract IDs are not in game config (strict split). Use platform API.
  platformPackageId?: string;
  /** Optional: legacy game score contract type string `package::module::type`. */
  gameScore?: string;
  /** Optional: legacy tournament admin cap object id (used for distribution status updates). */
  tournamentAdminCap?: string;
  /** @deprecated Use platform for score submission (Hydroscope). Game contract SessionRegistry not used when platform is configured. */
  sessionRegistry: string;  // Session registry object ID (from init function) — deprecated for score path
  /** Legacy: game package no longer has badge_system; badges are platform (Shipyard). Leave unset for new setups. */
  badgeRegistry: string;
  badgePublisher: string;
  /** Legacy: badge display was for game badge_system. Leave unset when using platform badges. */
  badgeDisplay: string;
  /** Admin capability (score_submission::create_admin_capability). Required for score submission. */
  adminCapability: string;
  tokenBurn: string;
  subscription: string;
  // Platform contracts: only premium store admin cap in game (game signs store admin tx). Rest via platform API.
  premiumStore?: string;      // Unset in game; platform owns. Use platform API.
  premiumStoreObject?: string;
  /** Premium store admin capability — game needs this to sign admin_add_items and related store admin tx. */
  premiumStoreAdminCapability?: string;
  /** Platform package premium_store AdminCapability (alternative). */
  platformPremiumStoreAdminCapability?: string;
  oldPremiumStorePackageId: string; // Old premium store package ID (for migration from old contract)
  oldPremiumStoreObjectId: string; // Old premium store object ID (for migration from old contract)
  /** Legacy: catalog is on platform (Terminal/Provisions). Game uses Corridor for catalog build; do not set PROVISIONS_* in game .env when using platform. */
  provisionsRegistry: string;
  provisionsAdminCap: string;
  /** Corridor capability (CorridorCap) object ID. From config file only (contracts.<network>.json). */
  corridorCapabilityObjectId?: string;
  /** CorridorAdminCap object ID. From config file only (contracts.<network>.json). Used for admin ops (catalog, create tournament, etc.). */
  appAdminCapId?: string;
  /** Legacy vault release cap when admin selects "old" contract. From config file only. */
  oldCorridorAdminCapObjectId?: string;
  /** Package containing provisions Move module (defaults to game package). Set when using platform package. */
  provisionsPackageId?: string;
  /** Legacy: game config is on platform app-config (Helm). Leave unset when using platform. */
  gameConfigRegistry: string;
  gameConfigAdminCap: string;
  /** Human-readable collection name for this app's platform badges (Shipyard). */
  badgeCollectionName?: string;
  gamePass?: string;          // Unset in game; platform owns. Use platform API.
  gamePassSystem?: string;   // Unset in game; platform owns. Use platform API.
  mewsTreasuryCap: string;   // MEWS TreasuryCap object ID (for minting tokens)
  mewsPackageId: string;     // MEWS package ID (for minting tokens)
  oldAchievementPackageId?: string; // Old achievement package ID (for migration from old contract)
  oldAchievementRegistryId?: string; // Old achievement registry object ID (for migration from old contract)
  oldAchievementAdminCapId?: string; // Old achievement admin capability object ID (for migration from old contract)
  oldStatisticsRegistryId?: string; // Old statistics registry object ID (for migration from old contract)
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
  const isDevelopment = process.env.NODE_ENV !== 'production' && process.env.VERCEL !== '1';
  
  // In development, these are optional (warn only)
  // In production, they are required. MEWS and min balance can come from config file or are on-chain.
  const requiredInProduction: string[] = [];

  const recommended = [
    'GAME_WALLET_PRIVATE_KEY'
  ];
  
  // Determine network for validation (same logic as getConfig; default testnet when none set)
  let network: SuiNetwork = 'testnet';
  if (process.env.SUI_TESTNET_NETWORK) {
    network = 'testnet';
  } else if (process.env.SUI_MAINNET_NETWORK) {
    network = 'mainnet';
  } else if (process.env.SUI_NETWORK) {
    network = process.env.SUI_NETWORK as SuiNetwork;
  }
  
  // Game package ID is optional when using platform API for scores/tournaments; do not recommend so we don't warn when unset.

  const missingRequired = requiredInProduction.filter(key => !process.env[key]);
  const missingRecommended = recommended.filter(key => !process.env[key]);
  
  // In development, only warn about missing variables
  // In production, throw errors for required variables
  if (missingRequired.length > 0) {
    if (isDevelopment) {
      console.warn(`⚠️  Missing environment variables (optional in dev): ${missingRequired.join(', ')}`);
      console.warn('⚠️  Some features may not work correctly. Set these for full functionality.');
    } else {
      console.error(`❌ Missing required environment variables: ${missingRequired.join(', ')}`);
      throw new Error(`Missing required environment variables: ${missingRequired.join(', ')}`);
    }
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
  // Determine network: Support SUI_TESTNET_NETWORK, SUI_MAINNET_NETWORK, or SUI_NETWORK.
  // When none set, default to testnet so config/contracts.testnet.json is used (contract IDs live in config files).
  let network: SuiNetwork = 'testnet';
  if (process.env.SUI_TESTNET_NETWORK) {
    network = 'testnet';
  } else if (process.env.SUI_MAINNET_NETWORK) {
    network = 'mainnet';
  } else if (process.env.SUI_NETWORK) {
    network = process.env.SUI_NETWORK as SuiNetwork;
  }

  const cfg = getContractConfig(network);
  const mainnetRpcUrl = pick(cfg, 'SUI_MAINNET_RPC_URL') || process.env.SUI_MAINNET_RPC_URL || 'https://fullnode.mainnet.sui.io:443';
  const testnetRpcUrl = pick(cfg, 'SUI_TESTNET_RPC_URL') || process.env.SUI_TESTNET_RPC_URL || process.env.SUI_TESTET_RPC_URL || 'https://fullnode.testnet.sui.io:443';

  // Safety: ensure we are effectively on testnet when the available contract config only provides
  // testnet corridor IDs. The platform requires corridor identity; running with "mainnet" selected
  // while using testnet corridor IDs leads to confusing partial failures.
  const hasTestnetCorridorCap = Boolean(pick(cfg, 'CORRIDOR_CAPABILITY_OBJECT_ID_TESTNET', 'CORRIDOR_CAPABILITY_OBJECT_ID'));
  const hasMainnetCorridorCap = Boolean(pick(cfg, 'CORRIDOR_CAPABILITY_OBJECT_ID_MAINNET', 'CORRIDOR_CAPABILITY_OBJECT_ID'));
  const effectiveNetwork: SuiNetwork =
    network === 'mainnet' && hasTestnetCorridorCap && !hasMainnetCorridorCap ? 'testnet' : network;

  const rpcUrl = effectiveNetwork === 'mainnet' ? mainnetRpcUrl : effectiveNetwork === 'testnet' ? testnetRpcUrl : testnetRpcUrl;

  return {
    server: {
      port: parseInt(process.env.PORT || '3000', 10),
      nodeEnv: (process.env.NODE_ENV || 'development') as NodeEnv,
      corsOrigin: process.env.CORS_ORIGIN || '*', // Default to * for development (allows localhost:8000)
      // App identifier for platform (inventory, game config, tournaments). Must match AppCapability app_id. Set APP_ID or GAME_APP_ID.
      appId: process.env.APP_ID || process.env.GAME_APP_ID || '',
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
      network: effectiveNetwork,
      rpcUrl,
      gasBudget: parseInt(process.env.SUI_GAS_BUDGET || '10000000', 10)
    },
    token: {
      // MEWS/USDC: config file then env. minTokenBalance is on-chain; default 0 here.
      mewsTokenTypeId: network === 'testnet'
        ? (pick(cfg, 'MEWS_TOKEN_TYPE_ID_TESTNET', 'MEWS_TOKEN_TYPE_ID') || process.env.MEWS_TOKEN_TYPE_ID_TESTNET || process.env.MEWS_TOKEN_TYPE_ID || '')
        : (pick(cfg, 'MEWS_TOKEN_TYPE_ID_MAINNET', 'MEWS_TOKEN_TYPE_ID') || process.env.MEWS_TOKEN_TYPE_ID_MAINNET || process.env.MEWS_TOKEN_TYPE_ID || ''),
      usdcTokenTypeId: network === 'testnet'
        ? (pick(cfg, 'USDC_TOKEN_TYPE_ID_TESTNET', 'USDC_TOKEN_TYPE_ID') || process.env.USDC_TOKEN_TYPE_ID_TESTNET || process.env.USDC_TOKEN_TYPE_ID || '')
        : (pick(cfg, 'USDC_TOKEN_TYPE_ID_MAINNET', 'USDC_TOKEN_TYPE_ID') || process.env.USDC_TOKEN_TYPE_ID_MAINNET || process.env.USDC_TOKEN_TYPE_ID || ''),
      minTokenBalance: 0
    },
    contracts: {
      // Support network-specific contract addresses (game package / stats / tournament / achievement IDs removed — use platform; migration will move to platform)
      // Support network-specific session registry object IDs
      // Use SESSION_REGISTRY_OBJECT_ID_TESTNET or SESSION_REGISTRY_OBJECT_ID_MAINNET if available
      // Otherwise fall back to SESSION_REGISTRY_OBJECT_ID (for backward compatibility)
      sessionRegistry: network === 'testnet'
        ? (process.env.SESSION_REGISTRY_OBJECT_ID_TESTNET || process.env.SESSION_REGISTRY_OBJECT_ID || '')
        : (process.env.SESSION_REGISTRY_OBJECT_ID_MAINNET || process.env.SESSION_REGISTRY_OBJECT_ID || ''),
      // Support network-specific badge registry object IDs
      // Use BADGE_REGISTRY_OBJECT_ID_TESTNET or BADGE_REGISTRY_OBJECT_ID_MAINNET if available
      // Otherwise fall back to BADGE_REGISTRY_OBJECT_ID (for backward compatibility)
      // Platform-only (Shipyard). Game package has no badge_system; leave unset for new setups.
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
      // Platform-only (Shipyard). Leave unset when using platform badges.
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
          // Platform / reservoir package ID for event types (optional; from contract JSON).
      platformPackageId: network === 'testnet'
        ? pick(cfg, 'PLATFORM_PACKAGE_ID_TESTNET', 'PLATFORM_PACKAGE_ID')
        : pick(cfg, 'PLATFORM_PACKAGE_ID_MAINNET', 'PLATFORM_PACKAGE_ID'),
      premiumStore: '',
      premiumStoreObject: '',
      // Terminal admin cap (Aqueduct: TERMINAL_STORE_ADMIN_CAPABILITY_*); contract JSON only.
      premiumStoreAdminCapability: network === 'testnet'
        ? pick(
            cfg,
            'TERMINAL_STORE_ADMIN_CAPABILITY_OBJECT_ID_TESTNET',
            'PREMIUM_STORE_ADMIN_CAPABILITY_OBJECT_ID_TESTNET',
            'PREMIUM_STORE_ADMIN_CAPABILITY_OBJECT_ID'
          )
        : pick(
            cfg,
            'TERMINAL_STORE_ADMIN_CAPABILITY_OBJECT_ID_MAINNET',
            'PREMIUM_STORE_ADMIN_CAPABILITY_OBJECT_ID_MAINNET',
            'PREMIUM_STORE_ADMIN_CAPABILITY_OBJECT_ID'
          ),
      platformPremiumStoreAdminCapability: network === 'testnet'
        ? pick(
            cfg,
            'TERMINAL_STORE_ADMIN_CAPABILITY_OBJECT_ID_TESTNET',
            'PLATFORM_PREMIUM_STORE_ADMIN_CAPABILITY_OBJECT_ID_TESTNET',
            'PLATFORM_PREMIUM_STORE_ADMIN_CAPABILITY_OBJECT_ID'
          )
        : pick(
            cfg,
            'TERMINAL_STORE_ADMIN_CAPABILITY_OBJECT_ID_MAINNET',
            'PLATFORM_PREMIUM_STORE_ADMIN_CAPABILITY_OBJECT_ID_MAINNET',
            'PLATFORM_PREMIUM_STORE_ADMIN_CAPABILITY_OBJECT_ID'
          ),
      // Old store IDs for migration (optional - can be provided in API request instead)
      // Supports both CONTRACT and PACKAGE_ID naming conventions
      oldPremiumStorePackageId: network === 'testnet'
        ? (process.env.OLD_PREMIUM_STORE_CONTRACT_TESTNET || process.env.OLD_PREMIUM_STORE_PACKAGE_ID_TESTNET || process.env.OLD_PREMIUM_STORE_PACKAGE_ID || process.env.OLD_PREMIUM_STORE_CONTRACT || '')
        : (process.env.OLD_PREMIUM_STORE_CONTRACT_MAINNET || process.env.OLD_PREMIUM_STORE_PACKAGE_ID_MAINNET || process.env.OLD_PREMIUM_STORE_PACKAGE_ID || process.env.OLD_PREMIUM_STORE_CONTRACT || ''),
      oldPremiumStoreObjectId: network === 'testnet'
        ? (process.env.OLD_PREMIUM_STORE_OBJECT_ID_TESTNET || process.env.OLD_PREMIUM_STORE_OBJECT_ID || '')
        : (process.env.OLD_PREMIUM_STORE_OBJECT_ID_MAINNET || process.env.OLD_PREMIUM_STORE_OBJECT_ID || ''),
      // Game pass: not loaded in game (strict split). Use platform API.
      gamePass: '',
      gamePassSystem: '',
      // Corridor IDs: from config file only (config/contracts.<network>.json). Do not set in .env.
      corridorCapabilityObjectId: network === 'testnet'
        ? (pick(cfg, 'CORRIDOR_CAPABILITY_OBJECT_ID_TESTNET', 'CORRIDOR_CAPABILITY_OBJECT_ID') || '')
        : (pick(cfg, 'CORRIDOR_CAPABILITY_OBJECT_ID_MAINNET', 'CORRIDOR_CAPABILITY_OBJECT_ID') || ''),
      mewsTreasuryCap: network === 'testnet'
        ? pick(cfg, 'MEWS_TREASURY_CAP_OBJECT_ID_TESTNET', 'MEWS_TREASURY_CAP_OBJECT_ID')
        : pick(cfg, 'MEWS_TREASURY_CAP_OBJECT_ID_MAINNET', 'MEWS_TREASURY_CAP_OBJECT_ID'),
      mewsPackageId: network === 'testnet'
        ? pick(cfg, 'MEWS_PACKAGE_ID_TESTNET', 'MEWS_PACKAGE_ID')
        : pick(cfg, 'MEWS_PACKAGE_ID_MAINNET', 'MEWS_PACKAGE_ID'),
      // Old achievement system IDs for migration (optional - can be provided in API request instead)
      oldAchievementPackageId: network === 'testnet'
        ? (process.env.OLD_ACHIEVEMENT_PACKAGE_ID_TESTNET || process.env.OLD_ACHIEVEMENT_PACKAGE_ID || process.env.OLD_GAME_PACKAGE_ID_TESTNET || process.env.OLD_GAME_SCORE_CONTRACT_TESTNET || process.env.OLD_GAME_SCORE_CONTRACT || '')
        : (process.env.OLD_ACHIEVEMENT_PACKAGE_ID_MAINNET || process.env.OLD_ACHIEVEMENT_PACKAGE_ID || process.env.OLD_GAME_PACKAGE_ID_MAINNET || process.env.OLD_GAME_SCORE_CONTRACT_MAINNET || process.env.OLD_GAME_SCORE_CONTRACT || ''),
      oldAchievementRegistryId: network === 'testnet'
        ? (process.env.OLD_ACHIEVEMENT_REGISTRY_OBJECT_ID_TESTNET || process.env.OLD_ACHIEVEMENT_REGISTRY_OBJECT_ID || '')
        : (process.env.OLD_ACHIEVEMENT_REGISTRY_OBJECT_ID_MAINNET || process.env.OLD_ACHIEVEMENT_REGISTRY_OBJECT_ID || ''),
      oldAchievementAdminCapId: network === 'testnet'
        ? (process.env.OLD_ACHIEVEMENT_ADMIN_CAP_OBJECT_ID_TESTNET || process.env.OLD_ACHIEVEMENT_ADMIN_CAP_OBJECT_ID || '')
        : (process.env.OLD_ACHIEVEMENT_ADMIN_CAP_OBJECT_ID_MAINNET || process.env.OLD_ACHIEVEMENT_ADMIN_CAP_OBJECT_ID || ''),
      // Old statistics registry ID for migration (optional)
      oldStatisticsRegistryId: network === 'testnet'
        ? (process.env.OLD_STATISTICS_REGISTRY_OBJECT_ID_TESTNET || process.env.OLD_STATISTICS_REGISTRY_OBJECT_ID || '')
        : (process.env.OLD_STATISTICS_REGISTRY_OBJECT_ID_MAINNET || process.env.OLD_STATISTICS_REGISTRY_OBJECT_ID || ''),
      // Platform-only (Terminal/store catalog). Game package has no provisions; leave unset for new setups.
      provisionsRegistry: network === 'testnet'
        ? pick(cfg, 'PROVISIONS_REGISTRY_ID_TESTNET', 'PROVISIONS_REGISTRY_ID')
        : pick(cfg, 'PROVISIONS_REGISTRY_ID_MAINNET', 'PROVISIONS_REGISTRY_ID'),
      provisionsAdminCap: network === 'testnet'
        ? pick(cfg, 'PROVISIONS_ADMIN_CAP_ID_TESTNET', 'PROVISIONS_ADMIN_CAP_ID')
        : pick(cfg, 'PROVISIONS_ADMIN_CAP_ID_MAINNET', 'PROVISIONS_ADMIN_CAP_ID'),
      // Corridor admin cap: from config file only (config/contracts.<network>.json).
      appAdminCapId: network === 'testnet'
        ? (pick(cfg, 'CORRIDOR_ADMIN_CAP_OBJECT_ID_TESTNET', 'CORRIDOR_ADMIN_CAP_OBJECT_ID') || '')
        : (pick(cfg, 'CORRIDOR_ADMIN_CAP_OBJECT_ID_MAINNET', 'CORRIDOR_ADMIN_CAP_OBJECT_ID') || ''),
      oldCorridorAdminCapObjectId: network === 'testnet'
        ? pick(cfg, 'OLD_CORRIDOR_ADMIN_CAP_OBJECT_ID_TESTNET', 'OLD_CORRIDOR_ADMIN_CAP_OBJECT_ID')
        : pick(cfg, 'OLD_CORRIDOR_ADMIN_CAP_OBJECT_ID_MAINNET', 'OLD_CORRIDOR_ADMIN_CAP_OBJECT_ID'),
      provisionsPackageId: network === 'testnet'
        ? pick(cfg, 'PROVISIONS_PACKAGE_ID_TESTNET', 'PROVISIONS_PACKAGE_ID')
        : pick(cfg, 'PROVISIONS_PACKAGE_ID_MAINNET', 'PROVISIONS_PACKAGE_ID'),
      // Platform-only (Helm app-config). Game package has no game_config; leave unset for new setups.
      gameConfigRegistry: network === 'testnet'
        ? (process.env.GAME_CONFIG_REGISTRY_ID_TESTNET || process.env.GAME_CONFIG_REGISTRY_ID || '')
        : (process.env.GAME_CONFIG_REGISTRY_ID_MAINNET || process.env.GAME_CONFIG_REGISTRY_ID || ''),
      // Platform-only (Helm). Leave unset when using platform app-config.
      gameConfigAdminCap: network === 'testnet'
        ? (process.env.GAME_CONFIG_ADMIN_CAP_ID_TESTNET || process.env.GAME_CONFIG_ADMIN_CAP_ID || '')
        : (process.env.GAME_CONFIG_ADMIN_CAP_ID_MAINNET || process.env.GAME_CONFIG_ADMIN_CAP_ID || ''),
      // Badge collection name: stored in contract config file (BADGE_COLLECTION_NAME), no .env required.
      badgeCollectionName: pick(cfg, 'BADGE_COLLECTION_NAME') || 'SuiTwo Shooter Game Player Badges',
    },
    security: {
      // Backward compatible: some env files use ADMIN_API_KEY for admin endpoints
      apiKey: process.env.API_KEY || process.env.ADMIN_API_KEY || '',
      jwtSecret: process.env.JWT_SECRET || ''
    }
  };
}

// Validate on import
validateConfig();

export default getConfig;

