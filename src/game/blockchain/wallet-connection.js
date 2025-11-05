// ==========================================
// SUI WALLET CONNECTION MODULE (VANILLA JS)
// ==========================================

let connectedWallet = null;
let connectedAddress = null;
let walletEventListeners = [];
let walletProvider = null; // Wallet Standard provider

/**
 * Initialize Wallet Standard listener
 * This listens for the wallet-standard:register-wallet event
 */
function initializeWalletStandardListener() {
  if (typeof window === 'undefined') return;
  
  // Listen for Wallet Standard registration event
  window.addEventListener('wallet-standard:register-wallet', ({ detail }) => {
    console.log('🔔 Wallet Standard: Wallet registration detected');
    
    try {
      detail({
        register(val) {
          console.log('✅ Wallet Standard: Wallet registered', val);
          
          // Check if this is a Slush wallet (formerly Sui Wallet)
          // Slush Wallet might register as "Sui Wallet" since it's the replacement
          if (val.name && (
            val.name.toLowerCase().includes('slush') || 
            val.name.toLowerCase().includes('sui') ||
            val.name === 'Sui Wallet' ||
            val.name === 'Slush Wallet'
          )) {
            console.log('✅ Sui/Slush Wallet detected via Wallet Standard:', val.name);
            walletProvider = val;
            connectedWallet = val;
          }
        },
      });
    } catch (error) {
      console.warn('Error in Wallet Standard registration:', error);
    }
  });
  
  // Also check if wallets are already registered
  // Wallet Standard API stores wallets in window.navigator.wallets
  // It might be a direct array or a Promise-based API
  if (window.navigator && window.navigator.wallets) {
    const walletsAPI = window.navigator.wallets;
    
    // Direct array access (synchronous check)
    if (Array.isArray(walletsAPI)) {
      console.log('🔍 Checking navigator.wallets (array):', walletsAPI.length, 'wallet(s) found');
      
      if (walletsAPI.length > 0) {
        // Log all available wallets for debugging
        walletsAPI.forEach(w => {
          console.log('  - Wallet:', w.name, 'Features:', Object.keys(w.features || {}));
        });
        
        const slushWallet = walletsAPI.find(w => 
          w.name && (
            w.name.toLowerCase().includes('slush') || 
            w.name.toLowerCase().includes('sui') ||
            w.name === 'Sui Wallet' ||
            w.name === 'Slush Wallet'
          )
        );
        if (slushWallet) {
          console.log('✅ Sui/Slush Wallet found in navigator.wallets:', slushWallet.name);
          walletProvider = slushWallet;
          connectedWallet = slushWallet;
        } else {
          console.log('⚠️ No Sui/Slush Wallet found. Available wallets:', walletsAPI.map(w => w.name).join(', '));
        }
      }
    } else if (typeof walletsAPI.get === 'function') {
      // Promise-based API - handle asynchronously in initializeWalletConnection
      console.log('🔍 Wallet Standard API detected (Promise-based) - will check in async function');
    } else {
      console.log('⚠️ window.navigator.wallets exists but is not an array or Promise-based API:', typeof walletsAPI);
    }
  } else {
    console.log('⚠️ window.navigator.wallets not available');
    console.log('💡 This might mean:');
    console.log('   1. Slush Wallet extension is not installed');
    console.log('   2. Wallet Standard API is not supported');
    console.log('   3. Wallet adapter libraries need to be loaded');
  }
  
  // Try to trigger wallet detection by dispatching a custom event
  // Some wallets listen for this event to inject themselves
  try {
    const walletDetectionEvent = new Event('wallet-detection');
    window.dispatchEvent(walletDetectionEvent);
    console.log('🔔 Dispatched wallet-detection event');
  } catch (e) {
    // Ignore if event dispatch fails
  }
  
  // Also check if there's a global wallet registry or adapter
  // Some wallets use @mysten/wallet-adapter which might be loaded
  if (window.walletAdapters || window.__WALLET_ADAPTERS__) {
    console.log('🔍 Found wallet adapters:', window.walletAdapters || window.__WALLET_ADAPTERS__);
  }
}

/**
 * Check if Slush Wallet extension is available
 * Checks multiple possible injection points including Wallet Standard
 * @returns {boolean}
 */
function isSuiWalletAvailable() {
  if (typeof window === 'undefined') return false;
  
  // Check Wallet Standard API (modern wallet detection)
  // This is how @mysten/dapp-kit detects wallets
  // Wallet Standard API might be Promise-based (wallets.get()) or direct array
  if (window.navigator && window.navigator.wallets) {
    const walletsAPI = window.navigator.wallets;
    
    // Direct array access (synchronous check)
    if (Array.isArray(walletsAPI) && walletsAPI.length > 0) {
      const slushWallet = walletsAPI.find(w => 
        w.name && (
          w.name.toLowerCase().includes('slush') || 
          w.name.toLowerCase().includes('sui') ||
          w.name === 'Sui Wallet' ||
          w.name === 'Slush Wallet'
        )
      );
      if (slushWallet) {
        console.log('✅ Wallet available check: Found', slushWallet.name);
        return true;
      }
    }
    // Promise-based API check would need to be handled in async functions
    // For now, just check if the API exists
    if (typeof walletsAPI.get === 'function') {
      // API exists but we can't await in sync function
      // Will be checked in async functions
      return true; // Assume available if API exists
    }
  }
  
  // Check direct injection points (Slush Wallet might use different properties)
  if (window.slushWallet) return true;
  if (window.suiWallet) return true; // Legacy support
  if (window.__suiWallet) return true; // Legacy support
  if (window.ethereum && window.ethereum.isSuiWallet) return true;
  
  // Check for wallet adapter properties
  if (window.wallet && window.wallet.sui) return true;
  if (window.sui && window.sui.wallet) return true;
  
  return false;
}

/**
 * Get the Slush Wallet instance
 * @returns {Object|null} Wallet instance
 */
function getSuiWalletInstance() {
  if (typeof window === 'undefined') return null;
  
  // Try Wallet Standard provider first
  if (walletProvider) {
    return walletProvider;
  }
  
  // Try Wallet Standard API (modern standard)
  // Note: This might only be available after wallet adapters are loaded
  if (window.navigator && window.navigator.wallets) {
    const wallets = window.navigator.wallets;
    if (Array.isArray(wallets) && wallets.length > 0) {
      console.log('🔍 Found wallets via Wallet Standard:', wallets.map(w => w.name).join(', '));
      const slushWallet = wallets.find(w => 
        w.name && (
          w.name.toLowerCase().includes('slush') || 
          w.name.toLowerCase().includes('sui') ||
          w.name === 'Sui Wallet' ||
          w.name === 'Slush Wallet'
        )
      );
      if (slushWallet) {
        console.log('✅ Found wallet via Wallet Standard:', slushWallet.name);
        return slushWallet;
      }
    }
  }
  
  // Check ALL window properties for anything that looks like a wallet
  // Some wallets inject with non-standard names
  for (const key in window) {
    try {
      const val = window[key];
      if (val && typeof val === 'object' && val !== null) {
        const keyLower = key.toLowerCase();
        // Check if property name suggests it's a wallet
        if (keyLower.includes('slush') || 
            (keyLower.includes('sui') && !keyLower.includes('walletconnection'))) {
          // Check if it has wallet-like methods
          if (val.requestPermissions || val.connect || val.getAccounts || val.request) {
            console.log('🔍 Found potential wallet at window.' + key);
            return val;
          }
        }
      }
    } catch (e) {
      // Skip properties we can't access
      continue;
    }
  }
  
  // Try different injection points (legacy support)
  if (window.slushWallet) return window.slushWallet;
  if (window.suiWallet) return window.suiWallet; // Legacy
  if (window.__suiWallet) return window.__suiWallet; // Legacy
  if (window.ethereum && window.ethereum.isSuiWallet) return window.ethereum;
  
  // Check for wallet adapter standard properties
  if (window.wallet && window.wallet.sui) return window.wallet.sui;
  
  // Check for dapp-kit wallet detection (if it's loaded)
  if (window.sui && window.sui.wallet) return window.sui.wallet;
  
  return null;
}

/**
 * Wait for Slush Wallet extension to load
 * Some extensions inject asynchronously
 * @param {number} timeout - Maximum wait time in ms
 * @returns {Promise<Object|null>} Wallet instance or null
 */
async function waitForSuiWallet(timeout = 5000) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    const wallet = getSuiWalletInstance();
    if (wallet) {
      console.log('✅ Slush Wallet detected after wait');
      return wallet;
    }
    
    // Also check for Wallet Standard registration during wait
    if (window.navigator && window.navigator.wallets) {
      const wallets = window.navigator.wallets;
      if (Array.isArray(wallets) && wallets.length > 0) {
        console.log('🔍 Checking wallets during wait:', wallets.map(w => w.name).join(', '));
        const slushWallet = wallets.find(w => 
          w.name && (
            w.name.toLowerCase().includes('slush') || 
            w.name.toLowerCase().includes('sui') ||
            w.name === 'Sui Wallet' ||
            w.name === 'Slush Wallet'
          )
        );
        if (slushWallet) {
          console.log('✅ Sui/Slush Wallet found in navigator.wallets during wait:', slushWallet.name);
          return slushWallet;
        }
      }
    }
    
    // Wait 100ms before checking again
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return null;
}

/**
 * Initialize wallet connection system
 * @returns {Object} Initialization result
 */
async function initializeWalletConnection() {
  // Initialize Wallet Standard listener first
  initializeWalletStandardListener();
  
  // Check for Promise-based Wallet Standard API
  if (window.navigator && window.navigator.wallets && typeof window.navigator.wallets.get === 'function') {
    try {
      console.log('🔍 Checking Promise-based Wallet Standard API...');
      const wallets = await window.navigator.wallets.get();
      console.log('🔍 Checking navigator.wallets.get():', wallets.length, 'wallet(s) found');
      
      if (Array.isArray(wallets) && wallets.length > 0) {
        // Log all available wallets for debugging
        wallets.forEach(w => {
          console.log('  - Wallet:', w.name, 'Features:', Object.keys(w.features || {}));
        });
        
        const slushWallet = wallets.find(w => 
          w.name && (
            w.name.toLowerCase().includes('slush') || 
            w.name.toLowerCase().includes('sui') ||
            w.name === 'Sui Wallet' ||
            w.name === 'Slush Wallet'
          )
        );
        if (slushWallet) {
          console.log('✅ Sui/Slush Wallet found in navigator.wallets.get():', slushWallet.name);
          walletProvider = slushWallet;
          connectedWallet = slushWallet;
        } else {
          console.log('⚠️ No Sui/Slush Wallet found. Available wallets:', wallets.map(w => w.name).join(', '));
        }
      }
    } catch (error) {
      console.warn('Error accessing wallets.get():', error);
    }
  }
  
  // Wait a bit longer for extensions to inject (some inject after page load)
  await new Promise(resolve => setTimeout(resolve, 2000)); // Increased to 2 seconds
  
  // Try to get wallet immediately
  let wallet = getSuiWalletInstance();
  
  // If not found, wait for it to load (increased timeout)
  if (!wallet) {
    console.log('⏳ Waiting for Slush Wallet extension to load...');
    wallet = await waitForSuiWallet(10000); // Increased to 10 seconds
  }
  
  if (!wallet) {
    console.warn('⚠️ Slush Wallet extension not detected');
    console.log('📋 Troubleshooting steps:');
    console.log('1. Make sure Slush Wallet extension is installed and enabled');
    console.log('2. Open Slush Wallet extension and unlock it');
    console.log('3. Refresh this page');
    console.log('4. Run WalletConnection.debug() in console to see what wallets are available');
    console.log('5. Check browser console for any Slush Wallet errors');
    
    const suiKeys = typeof window !== 'undefined' ? Object.keys(window).filter(k => k.toLowerCase().includes('sui') || k.toLowerCase().includes('slush')) : [];
    const walletKeys = typeof window !== 'undefined' ? Object.keys(window).filter(k => k.toLowerCase().includes('wallet')) : [];
    
    // Check for Wallet Standard API
    const hasWalletStandard = typeof window !== 'undefined' && window.navigator && window.navigator.wallets;
    const walletStandardWallets = hasWalletStandard ? window.navigator.wallets : [];
    
    // Check ALL window properties that might be wallet-related
    const allWindowProps = typeof window !== 'undefined' ? Object.keys(window).filter(k => {
      const lower = k.toLowerCase();
      return lower.includes('wallet') || 
             lower.includes('sui') || 
             lower.includes('slush') ||
             lower.includes('ethereum') ||
             lower.includes('web3');
    }) : [];
    
    console.log('💡 Debug info:', {
      windowSlushWallet: typeof window !== 'undefined' ? window.slushWallet : 'N/A',
      windowSuiWallet: typeof window !== 'undefined' ? window.suiWallet : 'N/A',
      window__SuiWallet: typeof window !== 'undefined' ? window.__suiWallet : 'N/A',
      windowEthereum: typeof window !== 'undefined' ? window.ethereum : 'N/A',
      hasWalletStandard: hasWalletStandard,
      walletStandardWallets: walletStandardWallets.map(w => ({ name: w.name, features: Object.keys(w.features || {}) })),
      allSuiKeys: suiKeys.filter(k => !['isSuiWalletAvailable', 'getSuiWalletInstance', 'waitForSuiWallet'].includes(k)),
      navigatorKeys: typeof window !== 'undefined' && window.navigator ? Object.keys(window.navigator).filter(k => k.toLowerCase().includes('wallet')) : [],
      // Check for wallet adapter properties
      walletAdapters: walletKeys.filter(k => !k.includes('WalletConnection') && !k.includes('handleConnect') && !k.includes('updateWallet')),
      allWindowProps: allWindowProps
    });
    
    // More detailed check - try to access wallet properties
    if (typeof window !== 'undefined') {
      console.log('🔍 Full window check:', {
        hasNavigator: !!window.navigator,
        navigatorWallets: window.navigator?.wallets?.map(w => w.name) || [],
        allWindowKeys: Object.keys(window).filter(k => 
          k.toLowerCase().includes('sui') || 
          k.toLowerCase().includes('slush') ||
          k.toLowerCase().includes('wallet') ||
          k.toLowerCase().includes('ethereum')
        ).slice(0, 30) // Increased to 30
      });
      
      // Try to inspect window properties that might be wallet-related
      console.log('🔍 Inspecting potential wallet properties:', {
        windowKeys: Object.keys(window).slice(0, 50).filter(k => {
          try {
            const val = window[k];
            return val && typeof val === 'object' && (
              k.toLowerCase().includes('wallet') ||
              k.toLowerCase().includes('sui') ||
              k.toLowerCase().includes('slush')
            );
          } catch (e) {
            return false;
          }
        })
      });
    }
    
    return {
      success: false,
      error: 'Please install Slush Wallet extension. Run WalletConnection.debug() in console for more info.',
      wallets: []
    };
  }
  
  // Store wallet instance
  connectedWallet = wallet;
  
  // Listen for wallet events
  setupWalletEventListeners();
  
  // Check if wallet is already connected
  checkExistingConnection();
  
  return {
    success: true,
    wallets: [{ name: 'Slush Wallet', available: true }]
  };
}

/**
 * Setup wallet event listeners for connection/disconnection
 */
function setupWalletEventListeners() {
  const wallet = getSuiWalletInstance();
  if (!wallet) return;
  
  // Listen for account changes
  if (wallet.on) {
    try {
      wallet.on('accountsChanged', handleAccountsChanged);
      wallet.on('disconnect', handleDisconnect);
    } catch (error) {
      console.warn('Could not set up wallet event listeners:', error);
    }
  }
}

/**
 * Handle account changes from wallet
 */
function handleAccountsChanged(accounts) {
  if (accounts && accounts.length > 0) {
    connectedAddress = accounts[0].address;
    notifyWalletChange('connected', connectedAddress);
  } else {
    connectedAddress = null;
    connectedWallet = null;
    notifyWalletChange('disconnected', null);
  }
}

/**
 * Handle wallet disconnect event
 */
function handleDisconnect() {
  connectedAddress = null;
  connectedWallet = null;
  notifyWalletChange('disconnected', null);
}

/**
 * Check if wallet is already connected
 */
async function checkExistingConnection() {
  const wallet = getSuiWalletInstance();
  if (!wallet) return;
  
  try {
    // Try different methods to get accounts
    let accounts = null;
    
    if (wallet.getAccounts) {
      accounts = await wallet.getAccounts();
    } else if (wallet.request) {
      try {
        accounts = await wallet.request({ method: 'sui_getAccounts' });
      } catch (error) {
        // Try alternative method
        console.log('sui_getAccounts failed, trying alternative');
      }
    } else if (wallet.selectedAddress) {
      // Some wallets expose selectedAddress directly
      accounts = [{ address: wallet.selectedAddress }];
    }
    
    if (accounts && accounts.length > 0) {
      const address = accounts[0].address || accounts[0];
      connectedAddress = typeof address === 'string' ? address : address.address;
      connectedWallet = wallet;
      notifyWalletChange('connected', connectedAddress);
    }
  } catch (error) {
    console.log('No existing wallet connection found:', error.message);
  }
}

/**
 * Connect to Sui Wallet
 * @returns {Promise<Object>} Connection result
 */
async function connectWallet() {
  try {
    // Try to get wallet instance
    let wallet = getSuiWalletInstance();
    
    // If not found, wait for it
    if (!wallet) {
      console.log('⏳ Waiting for Slush Wallet extension...');
      wallet = await waitForSuiWallet(3000);
    }
    
    if (!wallet) {
      return {
        success: false,
        error: 'Slush Wallet extension not found. Please install it first.\n\nInstall from: https://slush.app'
      };
    }

    // Request connection - try Wallet Standard API first
    let response = null;
    
    try {
      // Method 1: Wallet Standard API (modern standard)
      if (wallet.features && wallet.features['standard:connect']) {
        console.log('🔗 Using Wallet Standard API to connect');
        const connectFeature = wallet.features['standard:connect'];
        response = await connectFeature.connect();
      }
      // Method 2: requestPermissions (legacy Sui Wallet API)
      else if (wallet.requestPermissions) {
        console.log('🔗 Using requestPermissions to connect');
        response = await wallet.requestPermissions();
      }
      // Method 3: request with method name
      else if (wallet.request) {
        console.log('🔗 Using request() to connect');
        response = await wallet.request({ method: 'sui_requestPermissions' });
      }
      // Method 4: connect method
      else if (wallet.connect) {
        console.log('🔗 Using connect() to connect');
        response = await wallet.connect();
      }
    } catch (error) {
      console.error('Error requesting permissions:', error);
      // If requestPermissions fails, try to get existing accounts
      try {
        const accounts = wallet.getAccounts ? await wallet.getAccounts() : null;
        if (accounts && accounts.length > 0) {
          response = { accounts: accounts };
        } else {
          throw error;
        }
      } catch (innerError) {
        throw error;
      }
    }
    
    // Handle Wallet Standard response
    if (response && response.accounts && response.accounts.length > 0) {
      const account = response.accounts[0];
      connectedAddress = account.address || account;
      connectedWallet = wallet;
      
      console.log('✅ Wallet connected:', connectedAddress);
      
      notifyWalletChange('connected', connectedAddress);
      
      return {
        success: true,
        address: connectedAddress,
        wallet: 'Slush Wallet'
      };
    } 
    // Handle legacy response format
    else if (response && response.accounts && Array.isArray(response.accounts)) {
      const account = response.accounts[0];
      connectedAddress = account.address || account;
      connectedWallet = wallet;
      
      console.log('✅ Wallet connected:', connectedAddress);
      
      notifyWalletChange('connected', connectedAddress);
      
      return {
        success: true,
        address: connectedAddress,
        wallet: 'Slush Wallet'
      };
    } else {
      return {
        success: false,
        error: 'User rejected wallet connection'
      };
    }
  } catch (error) {
    console.error('Error connecting wallet:', error);
    return {
      success: false,
      error: error.message || 'Failed to connect wallet'
    };
  }
}

/**
 * Disconnect wallet
 * @returns {Promise<Object>} Disconnection result
 */
async function disconnectWallet() {
  try {
    if (connectedWallet && connectedWallet.disconnect) {
      await connectedWallet.disconnect();
    }
    connectedWallet = null;
    connectedAddress = null;
    
    notifyWalletChange('disconnected', null);
    
    return { success: true };
  } catch (error) {
    console.error('Error disconnecting wallet:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get current wallet address
 * @returns {string|null} Wallet address
 */
function getWalletAddress() {
  return connectedAddress;
}

/**
 * Check if wallet is connected
 * @returns {boolean}
 */
function isWalletConnected() {
  return connectedAddress !== null && connectedWallet !== null;
}

/**
 * Get connected wallet instance
 * @returns {Object|null} Wallet instance
 */
function getWallet() {
  return connectedWallet;
}

/**
 * Format wallet address for display (truncate middle)
 * @param {string} address - Full wallet address
 * @param {number} startLength - Characters to show at start
 * @param {number} endLength - Characters to show at end
 * @returns {string} Formatted address
 */
function formatWalletAddress(address, startLength = 6, endLength = 4) {
  if (!address) return '';
  if (address.length <= startLength + endLength) return address;
  return `${address.slice(0, startLength)}...${address.slice(-endLength)}`;
}

/**
 * Add wallet event listener
 * @param {Function} callback - Callback function(event, address)
 */
function onWalletChange(callback) {
  if (typeof callback === 'function') {
    walletEventListeners.push(callback);
  }
}

/**
 * Remove wallet event listener
 * @param {Function} callback - Callback function to remove
 */
function offWalletChange(callback) {
  walletEventListeners = walletEventListeners.filter(cb => cb !== callback);
}

/**
 * Notify all listeners of wallet changes
 * @param {string} event - Event type ('connected' or 'disconnected')
 * @param {string|null} address - Wallet address or null
 */
function notifyWalletChange(event, address) {
  walletEventListeners.forEach(callback => {
    try {
      callback(event, address);
    } catch (error) {
      console.error('Error in wallet event listener:', error);
    }
  });
}

// Export functions for use in other modules
if (typeof window !== 'undefined') {
  window.WalletConnection = {
    initialize: initializeWalletConnection,
    connect: connectWallet,
    disconnect: disconnectWallet,
    getAddress: getWalletAddress,
    isConnected: isWalletConnected,
    getWallet: getWallet,
    isAvailable: isSuiWalletAvailable,
    formatAddress: formatWalletAddress,
    on: onWalletChange,
    off: offWalletChange,
    // Debug helper - run this in console to see what wallets are available
    debug: function() {
      console.log('🔍 Wallet Debug Info:');
      console.log('Window properties with "slush":', Object.keys(window).filter(k => k.toLowerCase().includes('slush')));
      console.log('Window properties with "sui":', Object.keys(window).filter(k => k.toLowerCase().includes('sui') && !k.includes('WalletConnection')));
      console.log('Window properties with "wallet":', Object.keys(window).filter(k => k.toLowerCase().includes('wallet') && !k.includes('WalletConnection')));
      console.log('navigator.wallets:', window.navigator?.wallets);
      console.log('Potential wallet objects:', Object.keys(window).filter(k => {
        try {
          const val = window[k];
          return val && typeof val === 'object' && (
            val.requestPermissions || val.connect || val.getAccounts || val.request
          );
        } catch (e) {
          return false;
        }
      }));
      
      // Check ALL window properties
      console.log('🔍 Checking ALL window properties...');
      const allProps = [];
      for (const key in window) {
        try {
          const val = window[key];
          if (val && typeof val === 'object' && val !== null) {
            const hasWalletMethods = val.requestPermissions || val.connect || val.getAccounts || val.request || val.signTransaction;
            if (hasWalletMethods) {
              allProps.push({
                key: key,
                type: typeof val,
                methods: Object.keys(val).filter(k => typeof val[k] === 'function').slice(0, 10)
              });
            }
          }
        } catch (e) {
          // Skip
        }
      }
      console.log('Objects with wallet-like methods:', allProps);
      
      // Try to manually trigger wallet detection
      console.log('🔍 Attempting to trigger wallet detection...');
      if (window.dispatchEvent) {
        try {
          window.dispatchEvent(new Event('wallet-detection'));
          window.dispatchEvent(new CustomEvent('wallet-standard:register-wallet'));
          console.log('✅ Dispatched wallet detection events');
        } catch (e) {
          console.log('❌ Could not dispatch events:', e);
        }
      }
      
      // Check if we need to load wallet adapter libraries
      console.log('\n💡 Note: Wallet Standard API (window.navigator.wallets) is not available.');
      console.log('This might require loading @mysten/wallet-adapter libraries.');
      console.log('Slush Wallet might require @mysten/dapp-kit to enable Wallet Standard API.');
      console.log('\n📋 Next steps:');
      console.log('1. Check if Slush Wallet extension is unlocked');
      console.log('2. Try refreshing the page');
      console.log('3. Check Slush Wallet documentation for vanilla JS integration');
      console.log('4. Consider loading wallet adapter libraries if needed');
    }
  };
}

