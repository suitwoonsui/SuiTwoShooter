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
    'SUI_NETWORK',
    'SUI_RPC_URL',
    'MEWS_TOKEN_TYPE_ID',
    'MIN_TOKEN_BALANCE'
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.warn(`⚠️  Missing environment variables: ${missing.join(', ')}`);
    console.warn('Some features may not work correctly.');
  }
}

/**
 * Get configuration object
 */
export function getConfig(): Config {
  // Simple: Just set SUI_NETWORK to 'mainnet' or 'testnet' to switch
  const network = (process.env.SUI_NETWORK || 'mainnet') as SuiNetwork;
  
  // Support both mainnet and testnet URLs in env (optional, defaults provided)
  const mainnetRpcUrl = process.env.SUI_MAINNET_RPC_URL || 'https://fullnode.mainnet.sui.io:443';
  const testnetRpcUrl = process.env.SUI_TESTNET_RPC_URL || 'https://fullnode.testnet.sui.io:443';
  
  // Use network-specific RPC URL based on SUI_NETWORK
  const rpcUrl = network === 'mainnet' 
    ? mainnetRpcUrl 
    : network === 'testnet'
    ? testnetRpcUrl
    : process.env.SUI_RPC_URL || testnetRpcUrl;

  return {
    server: {
      port: parseInt(process.env.PORT || '3000', 10),
      nodeEnv: (process.env.NODE_ENV || 'development') as NodeEnv,
      corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000'
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
      gameScore: process.env.GAME_SCORE_CONTRACT || '',
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

