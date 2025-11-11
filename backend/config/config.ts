// ==========================================
// Configuration Management (TypeScript)
// ==========================================

type SuiNetwork = 'testnet' | 'mainnet' | 'devnet';
type NodeEnv = 'development' | 'production' | 'test';

interface ServerConfig {
  port: number;
  nodeEnv: NodeEnv;
  corsOrigin: string;
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
  tokenBurn: string;
  subscription: string;
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
      corsOrigin: process.env.CORS_ORIGIN || '*' // Default to * for development (allows localhost:8000)
    },
    sui: {
      network,
      rpcUrl,
      gasBudget: parseInt(process.env.SUI_GAS_BUDGET || '10000000', 10)
    },
    token: {
      mewsTokenTypeId: process.env.MEWS_TOKEN_TYPE_ID || '0x2dcf8629a70b235cda598170fc9b271f03f33d34dd6fa148adaff481e7a792d2::mews::MEWS',
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
      tokenBurn: process.env.TOKEN_BURN_CONTRACT || '',
      subscription: process.env.SUBSCRIPTION_CONTRACT || ''
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

