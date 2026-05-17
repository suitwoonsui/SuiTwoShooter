// ==========================================
// TOKEN BALANCE UTILS - Consolidated Token Balance Fetching
// ==========================================
// Centralized utility for fetching token balances (MEWS, SUI, USDC)
// Eliminates code duplication across store modules

console.log('✅ [TOKEN BALANCE UTILS] Token balance utilities module loaded');

// Short-lived cache: balances can change, but for UX we mainly need to avoid re-checking
// multiple times during menu → store → tab switches.
const TOKEN_BALANCE_CACHE_TTL_MS = 2 * 60 * 1000;
const _tokenBalanceCache = new Map(); // key -> { at, data }
const _tokenBalanceInFlight = new Map(); // key -> Promise

function prefetchTokenBalancesIfStale(walletAddress, network = 'testnet', tokens) {
  const addr = String(walletAddress || '').trim();
  if (!addr) return;
  const wanted = Array.isArray(tokens) && tokens.length
    ? tokens.map((t) => String(t || '').trim().toLowerCase()).filter(Boolean)
    : ['sui', 'mews']; // default warm set for store
  // Use fire-and-forget; fetchTokenBalance has cache + in-flight dedupe.
  for (const t of wanted) {
    void fetchTokenBalance(t, addr, network).catch(() => {});
  }
}

/**
 * Game backend Sui JSON-RPC proxy (same-origin + server failover). Falls back to public fullnode only if config missing.
 * @param {string} network - 'testnet' or 'mainnet'
 * @returns {string|null} POST target URL or null
 */
function getSuiJsonRpcProxyUrl(network) {
  const gameApiBase = typeof window !== 'undefined' && window.GAME_CONFIG
    ? window.GAME_CONFIG.GAME_BACKEND_URL || window.GAME_CONFIG.API_BASE_URL
    : '';
  const base = String(gameApiBase || '').replace(/\/api\/?$/, '');
  if (!base) return null;
  const net = network === 'mainnet' ? 'mainnet' : 'testnet';
  return `${base}/api/sui-json-rpc?network=${net}`;
}

/** @deprecated Prefer getSuiJsonRpcProxyUrl; kept for emergency fallback only */
function getRpcUrl(network) {
  return network === 'testnet'
    ? 'https://fullnode.testnet.sui.io:443'
    : network === 'mainnet'
    ? 'https://fullnode.mainnet.sui.io:443'
    : 'https://fullnode.testnet.sui.io:443';
}

/**
 * Get USDC token type ID from config
 * @param {string} network - 'testnet' or 'mainnet'
 * @returns {string|null} USDC token type ID or null if not configured
 */
function getUsdcTokenTypeId(network = 'testnet') {
  // Try GAME_CONFIG first (most common)
  if (window.GAME_CONFIG?.CONTRACTS?.usdcTokenTypeId) {
    return window.GAME_CONFIG.CONTRACTS.usdcTokenTypeId;
  }
  
  // Try CONTRACT_CONFIG (alternative)
  if (window.CONTRACT_CONFIG?.[network]?.usdcTokenTypeId) {
    return window.CONTRACT_CONFIG[network].usdcTokenTypeId;
  }
  
  // Fallback: Use testnet USDC token type ID (should match backend config)
  if (network === 'testnet') {
    return '0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC';
  }
  
  return null;
}

/**
 * Fetch USDC balance using RPC API
 * @param {string} walletAddress - Wallet address
 * @param {string} network - 'testnet' or 'mainnet' (default: 'testnet')
 * @returns {Promise<Object>} { success: boolean, balance: number, formattedBalance: string, rawBalance: string, error?: string }
 */
async function fetchUsdcBalance(walletAddress, network = 'testnet') {
  try {
    const usdcTokenTypeId = getUsdcTokenTypeId(network);
    if (!usdcTokenTypeId) {
      return {
        success: false,
        balance: 0,
        formattedBalance: '0.00',
        rawBalance: '0',
        error: 'USDC token type ID not configured'
      };
    }
    
    const rpcUrl = getSuiJsonRpcProxyUrl(network) || getRpcUrl(network);

    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'suix_getCoins',
        params: [walletAddress, usdcTokenTypeId, null, null]
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.message || 'RPC error');
    }
    
    const coins = data.result?.data || [];
    
    // Calculate total balance
    let totalBalance = BigInt(0);
    coins.forEach((coin) => {
      totalBalance += BigInt(coin.balance);
    });
    
    // Format balance (USDC has 6 decimals)
    const divisor = 1_000_000; // 10^6
    const balanceInUSDC = Number(totalBalance) / divisor;
    const formattedBalance = balanceInUSDC.toLocaleString('en-US', {
      notation: 'standard',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      useGrouping: true
    });
    
    return {
      success: true,
      balance: balanceInUSDC,
      formattedBalance: formattedBalance,
      rawBalance: totalBalance.toString(),
      coinsFound: coins.length
    };
  } catch (error) {
    console.error('❌ [TOKEN BALANCE UTILS] Error fetching USDC balance:', error);
    return {
      success: false,
      balance: 0,
      formattedBalance: '0.00',
      rawBalance: '0',
      error: error.message || 'Unknown error'
    };
  }
}

/**
 * Fetch MEWS balance using wallet API
 * @param {string} walletAddress - Wallet address
 * @param {string} network - 'testnet' or 'mainnet' (default: 'testnet')
 * @returns {Promise<Object>} { success: boolean, balance: number, formattedBalance: string, error?: string }
 */
async function fetchMewsBalance(walletAddress, network = 'testnet') {
  if (!window.walletAPIInstance || typeof window.walletAPIInstance.checkMEWSBalance !== 'function') {
    return {
      success: false,
      balance: 0,
      formattedBalance: '0',
      error: 'MEWS balance check not available'
    };
  }
  
  try {
    const balanceResult = await window.walletAPIInstance.checkMEWSBalance(walletAddress, network);
    
    if (!balanceResult.success) {
      return {
        success: false,
        balance: 0,
        formattedBalance: '0',
        error: balanceResult.error || 'Failed to check MEWS balance'
      };
    }
    
    // Parse formatted balance - handle commas and K/M/B/T compact suffixes (parseFloat stops at letters)
    let balanceStr = String(balanceResult.formattedBalance || '').replace(/,/g, '').trim();
    let multiplier = 1;
    const compact = /^([\d.+-eE]+)\s*([KMBT])$/i.exec(balanceStr.replace(/\s/g, ''));
    if (compact) {
      balanceStr = compact[1];
      const suf = compact[2].toUpperCase();
      if (suf === 'K') multiplier = 1e3;
      else if (suf === 'M') multiplier = 1e6;
      else if (suf === 'B') multiplier = 1e9;
      else if (suf === 'T') multiplier = 1e12;
    } else if (balanceStr.endsWith('K')) {
      multiplier = 1e3;
      balanceStr = balanceStr.slice(0, -1);
    } else if (balanceStr.endsWith('M')) {
      multiplier = 1e6;
      balanceStr = balanceStr.slice(0, -1);
    }
    const balance = parseFloat(balanceStr) * multiplier;
    
    return {
      success: true,
      balance: balance,
      formattedBalance: balanceResult.formattedBalance
    };
  } catch (error) {
    console.error('❌ [TOKEN BALANCE UTILS] Error fetching MEWS balance:', error);
    return {
      success: false,
      balance: 0,
      formattedBalance: '0',
      error: error.message || 'Unknown error'
    };
  }
}

/**
 * Fetch SUI balance using wallet API
 * @param {string} walletAddress - Wallet address
 * @param {string} network - 'testnet' or 'mainnet' (default: 'testnet')
 * @returns {Promise<Object>} { success: boolean, balance: number, formattedBalance: string, error?: string }
 */
async function fetchSuiBalance(walletAddress, network = 'testnet') {
  if (!window.walletAPIInstance || typeof window.walletAPIInstance.checkSUIBalance !== 'function') {
    return {
      success: false,
      balance: 0,
      formattedBalance: '0',
      error: 'SUI balance check not available'
    };
  }
  
  try {
    const balanceResult = await window.walletAPIInstance.checkSUIBalance(walletAddress, network);
    
    if (!balanceResult.success) {
      return {
        success: false,
        balance: 0,
        formattedBalance: '0',
        error: balanceResult.error || 'Failed to check SUI balance'
      };
    }
    
    // Use balanceInSUI if available, otherwise parse formatted balance
    let balance = 0;
    if (balanceResult.balanceInSUI !== undefined) {
      balance = balanceResult.balanceInSUI;
    } else {
      // Parse formatted balance (remove commas)
      balance = parseFloat(balanceResult.formattedBalance.replace(/,/g, ''));
    }
    
    return {
      success: true,
      balance: balance,
      formattedBalance: balanceResult.formattedBalance
    };
  } catch (error) {
    console.error('❌ [TOKEN BALANCE UTILS] Error fetching SUI balance:', error);
    return {
      success: false,
      balance: 0,
      formattedBalance: '0',
      error: error.message || 'Unknown error'
    };
  }
}

/**
 * Fetch token balance for any token type
 * @param {string} tokenType - 'sui', 'mews', or 'usdc'
 * @param {string} walletAddress - Wallet address
 * @param {string} network - 'testnet' or 'mainnet' (default: 'testnet')
 * @returns {Promise<Object>} Balance result object
 */
async function fetchTokenBalance(tokenType, walletAddress, network = 'testnet') {
  const normalizedType = tokenType.toLowerCase();

  const addr = String(walletAddress || '').trim();
  const net = String(network || 'testnet').trim().toLowerCase();
  const cacheKey = `${normalizedType}:${net}:${addr.toLowerCase()}`;
  const now = Date.now();

  // Cache hit
  const cached = _tokenBalanceCache.get(cacheKey);
  if (cached && cached.at && (now - cached.at) < TOKEN_BALANCE_CACHE_TTL_MS) {
    return cached.data;
  }

  // In-flight dedupe
  const inflight = _tokenBalanceInFlight.get(cacheKey);
  if (inflight) return inflight;

  const p = (async () => {
    let result;
    if (normalizedType === 'sui') {
      result = await fetchSuiBalance(addr, net);
    } else if (normalizedType === 'mews') {
      result = await fetchMewsBalance(addr, net);
    } else if (normalizedType === 'usdc') {
      result = await fetchUsdcBalance(addr, net);
    } else {
      result = {
        success: false,
        balance: 0,
        formattedBalance: '0',
        error: `Unknown token type: ${tokenType}`
      };
    }
    _tokenBalanceCache.set(cacheKey, { at: Date.now(), data: result });
    return result;
  })().finally(() => {
    _tokenBalanceInFlight.delete(cacheKey);
  });

  _tokenBalanceInFlight.set(cacheKey, p);
  return p;
}

/**
 * Drop cached balances so the next fetch hits RPC (e.g. after a successful store purchase).
 * @param {string} walletAddress
 * @param {string} [network='testnet']
 * @param {string[]} [tokenTypes=['sui','mews','usdc']]
 */
function invalidateTokenBalanceCache(walletAddress, network = 'testnet', tokenTypes = ['sui', 'mews', 'usdc']) {
  const addr = String(walletAddress || '').trim().toLowerCase();
  const net = String(network || 'testnet').trim().toLowerCase();
  if (!addr) return;
  const types = Array.isArray(tokenTypes) && tokenTypes.length ? tokenTypes : ['sui', 'mews', 'usdc'];
  for (const t of types) {
    const key = `${String(t).toLowerCase()}:${net}:${addr}`;
    _tokenBalanceCache.delete(key);
  }
}

// Expose globally
if (typeof window !== 'undefined') {
  window.TokenBalanceUtils = {
    fetchSuiBalance,
    fetchMewsBalance,
    fetchUsdcBalance,
    fetchTokenBalance,
    prefetchTokenBalancesIfStale,
    invalidateTokenBalanceCache,
    getRpcUrl,
    getUsdcTokenTypeId
  };
}

