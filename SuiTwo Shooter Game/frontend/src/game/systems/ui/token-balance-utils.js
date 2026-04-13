// ==========================================
// TOKEN BALANCE UTILS - Consolidated Token Balance Fetching
// ==========================================
// Centralized utility for fetching token balances (MEWS, SUI, USDC)
// Eliminates code duplication across store modules

console.log('✅ [TOKEN BALANCE UTILS] Token balance utilities module loaded');

/**
 * Get RPC URL for a given network
 * @param {string} network - 'testnet' or 'mainnet'
 * @returns {string} RPC URL
 */
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
    
    const rpcUrl = getRpcUrl(network);
    
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
    
    // Parse formatted balance - handle commas and K/M suffixes
    let balanceStr = balanceResult.formattedBalance.replace(/,/g, '');
    
    // Handle K (thousands) and M (millions) suffixes
    let multiplier = 1;
    if (balanceStr.endsWith('K')) {
      multiplier = 1000;
      balanceStr = balanceStr.replace('K', '');
    } else if (balanceStr.endsWith('M')) {
      multiplier = 1000000;
      balanceStr = balanceStr.replace('M', '');
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
  
  if (normalizedType === 'sui') {
    return await fetchSuiBalance(walletAddress, network);
  } else if (normalizedType === 'mews') {
    return await fetchMewsBalance(walletAddress, network);
  } else if (normalizedType === 'usdc') {
    return await fetchUsdcBalance(walletAddress, network);
  } else {
    return {
      success: false,
      balance: 0,
      formattedBalance: '0',
      error: `Unknown token type: ${tokenType}`
    };
  }
}

// Expose globally
if (typeof window !== 'undefined') {
  window.TokenBalanceUtils = {
    fetchSuiBalance,
    fetchMewsBalance,
    fetchUsdcBalance,
    fetchTokenBalance,
    getRpcUrl,
    getUsdcTokenTypeId
  };
}

