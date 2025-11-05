/**
 * Wallet Connection API for Vanilla JS
 * Based on Insomnia game's working implementation
 * Uses @mysten/dapp-kit directly with React hooks
 */

import { SuiClientProvider, WalletProvider as SuiWalletProvider, useWallets, useConnectWallet, useCurrentWallet, useDisconnectWallet } from '@mysten/dapp-kit';
import { getFullnodeUrl } from '@mysten/sui/client';
import { SuiClient } from '@mysten/sui/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import * as ReactDOM from 'react-dom';

// QueryClient instance
const queryClient = new QueryClient();

// Wallet API state
let walletAPIState = {
  connected: false,
  address: null,
  wallets: [],
  currentWallet: null,
  listeners: [],
  mewsBalance: null,
  hasMinimumBalance: false,
  minBalanceRequired: BigInt(500000000) // 500,000 MEWS with 9 decimals
};

// MEWS Token Configuration
const MEWS_TOKEN_TYPE_ID = '0x2dcf8629a70b235cda598170fc9b271f03f33d34dd6fa148adaff481e7a792d2::mews::MEWS'; // Default, can be overridden

// Wallet API instance
let walletAPI = null;

/**
 * Error Boundary Component for Wallet Hook Bridge
 * Re-renders children after a delay to recover from transient errors
 */
class WalletErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, retryCount: 0 };
    this.retryTimeout = null;
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('❌ WalletHookBridge Error:', error);
    console.error('  Error info:', errorInfo);
    console.error('  Error component stack:', errorInfo.componentStack);
    
    // Auto-retry after a delay (max 3 retries)
    if (this.state.retryCount < 3) {
      console.log(`🔄 Retrying WalletHookBridge after error (attempt ${this.state.retryCount + 1}/3)...`);
      this.retryTimeout = setTimeout(() => {
        this.setState({ hasError: false, error: null, retryCount: this.state.retryCount + 1 });
      }, 1000);
    } else {
      console.warn('⚠️ WalletHookBridge error caught, max retries reached. Component disabled.');
    }
  }

  componentWillUnmount() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
  }

  render() {
    if (this.state.hasError) {
      // Show children anyway - let React try to render
      // The error might be transient (e.g., during wallet connection)
      return this.props.children;
    }

    return this.props.children;
  }
}

/**
 * Wallet Hook Component - bridges React hooks to vanilla JS API
 * Based on Insomnia's WalletContext pattern
 */
function WalletHookBridge({ onUpdate }) {
  const wallets = useWallets();
  const connectWallet = useConnectWallet();
  const disconnectWallet = useDisconnectWallet();
  const currentWallet = useCurrentWallet();
  
  useEffect(() => {
    try {
      // Debug: Log wallet detection
      console.log('🔍 WalletHookBridge: wallets detected', {
        wallets: wallets,
        walletsType: typeof wallets,
        isArray: Array.isArray(wallets),
        walletsLength: Array.isArray(wallets) ? wallets.length : 'N/A',
        walletsKeys: wallets && typeof wallets === 'object' ? Object.keys(wallets) : []
      });
      
      // Update state - useWallets() returns an array directly (not an object with .all)
      // Based on Insomnia's pattern where they use wallets[0] and wallets.length
      const availableWallets = Array.isArray(wallets) ? wallets : (wallets?.all || []);
      const previousWalletsCount = walletAPIState.wallets.length;
      walletAPIState.wallets = availableWallets;
      walletAPIState.connected = currentWallet?.isConnected || false;
      walletAPIState.address = currentWallet?.currentWallet?.accounts?.[0]?.address || null;
      walletAPIState.currentWallet = currentWallet?.currentWallet || null;
      
      // Only log if wallets changed or if we have wallets now
      if (availableWallets.length !== previousWalletsCount || availableWallets.length > 0) {
        console.log('🔍 WalletHookBridge: State updated', {
          walletsCount: availableWallets.length,
          walletNames: availableWallets.map(w => w.name),
          connected: walletAPIState.connected,
          address: walletAPIState.address
        });
      }
      
      // Store connect/disconnect functions
      // useConnectWallet() returns a mutation object with mutateAsync method
      walletAPIState._connect = connectWallet;
      walletAPIState._disconnect = disconnectWallet;
      
      // Debug: Log what connectWallet actually is
      if (connectWallet) {
        console.log('🔍 connectWallet object:', {
          type: typeof connectWallet,
          keys: Object.keys(connectWallet),
          hasMutateAsync: typeof connectWallet.mutateAsync === 'function',
          hasMutate: typeof connectWallet.mutate === 'function',
          isFunction: typeof connectWallet === 'function'
        });
      }
      
      if (onUpdate) {
        onUpdate({
          connected: walletAPIState.connected,
          address: walletAPIState.address,
          wallets: walletAPIState.wallets
        });
      }
      
      // Notify listeners - filter out invalid listeners first
      const validListeners = walletAPIState.listeners.filter(listener => {
        const isValid = typeof listener === 'function';
        if (!isValid) {
          console.warn('⚠️ Removing invalid listener:', listener);
        }
        return isValid;
      });
      
      // Update listeners array to only include valid ones
      walletAPIState.listeners = validListeners;
      
      // Notify valid listeners
      validListeners.forEach((listener, index) => {
        try {
          listener({
            type: walletAPIState.connected ? 'connected' : 'disconnected',
            address: walletAPIState.address
          });
        } catch (listenerError) {
          console.error(`❌ Listener error (index ${index}):`, listenerError);
          console.error('  Error name:', listenerError.name);
          console.error('  Error message:', listenerError.message);
          // Remove the problematic listener
          walletAPIState.listeners = walletAPIState.listeners.filter((_, i) => i !== index);
        }
      });
    } catch (error) {
      console.error('❌ WalletHookBridge useEffect error:', error);
      console.error('  Error name:', error.name);
      console.error('  Error message:', error.message);
      console.error('  Error stack:', error.stack);
      // Don't throw - let component continue rendering
    }
  }, [wallets, currentWallet, connectWallet, disconnectWallet, onUpdate]);
  
  return null;
}

/**
 * Wallet Provider Component
 * Based on Insomnia's Providers pattern
 */
function WalletProviderWrapper({ children, network, onUpdate }) {
  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider 
        networks={{ 
          mainnet: { url: getFullnodeUrl('mainnet'), name: 'Mainnet' },
          testnet: { url: getFullnodeUrl('testnet'), name: 'Testnet' }
        }} 
        defaultNetwork={network || 'mainnet'}
      >
        <SuiWalletProvider 
          autoConnect={false}
          preferredWallets={['Slush Wallet', 'Sui Wallet', 'Ethos Wallet', 'OKX Wallet', 'Suiet']}
          storageKey="shootergame-wallet"
        >
          <WalletErrorBoundary>
            <WalletHookBridge onUpdate={onUpdate} />
          </WalletErrorBoundary>
          {children}
        </SuiWalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}

/**
 * Initialize Wallet API
 * @param {Object} options - Configuration options
 * @param {string} options.network - Network to use ('mainnet' | 'testnet')
 * @param {string} options.containerId - Container ID for React root (default: 'wallet-react-root')
 * @returns {Promise<Object>} Wallet API instance
 */
export async function initializeWalletAPI(options = {}) {
  if (walletAPI) return walletAPI;
  
  const { network = 'mainnet', containerId = 'wallet-react-root' } = options;
  
  // Create container if it doesn't exist
  let container = document.getElementById(containerId);
  if (!container) {
    container = document.createElement('div');
    container.id = containerId;
    container.style.display = 'none'; // Hidden container
    document.body.appendChild(container);
  }
  
  // Initialize React root
  const root = createRoot(container);
  
  // Render wallet provider with error boundary
  root.render(
    React.createElement(
      WalletErrorBoundary,
      {},
      React.createElement(WalletProviderWrapper, {
        network,
        onUpdate: (state) => {
          walletAPIState = { ...walletAPIState, ...state };
        }
      })
    )
  );
  
  // Create API instance
  walletAPI = {
    network,
    
    // Get current address
    getAddress() {
      return walletAPIState.address;
    },
    
    // Check if connected
    isConnected() {
      return walletAPIState.connected;
    },
    
    // Get available wallets
    getWallets() {
      return walletAPIState.wallets.map(w => ({
        name: w.name,
        icon: w.icon,
        installed: w.installed
      }));
    },
    
    // Connect wallet - based on Insomnia's connect pattern
    async connect(walletName) {
      console.log('🔍 connect() called:', {
        hasConnect: !!walletAPIState._connect,
        walletsCount: walletAPIState.wallets?.length || 0,
        walletNames: walletAPIState.wallets?.map(w => w.name) || [],
        connectType: typeof walletAPIState._connect,
        connectKeys: walletAPIState._connect ? Object.keys(walletAPIState._connect) : []
      });
      
      if (!walletAPIState._connect || !walletAPIState.wallets || walletAPIState.wallets.length === 0) {
        return {
          success: false,
          error: walletAPIState.wallets.length === 0 
            ? 'No wallets available. Please install Slush Wallet extension.'
            : 'Wallet API not initialized'
        };
      }
      
      const wallets = walletAPIState.wallets;
      console.log('🔍 Available wallets:', wallets.map(w => ({
        name: w.name,
        id: w.id,
        icon: w.icon,
        installed: w.installed,
        keys: Object.keys(w),
        fullWallet: w // Log full wallet object for debugging
      })));
      
      // Find wallet - prefer Slush, then first available
      const wallet = wallets.find(w => 
        w.name.toLowerCase().includes('slush') ||
        w.name === walletName ||
        (walletName === undefined && wallets.length > 0)
      ) || wallets[0];
      
      if (!wallet) {
        return {
          success: false,
          error: 'No wallets available. Please install Slush Wallet extension.'
        };
      }
      
      // Debug: Check wallet object structure
      console.log('🔍 Wallet object details:', {
        walletName: wallet.name,
        walletId: wallet.id,
        walletIcon: wallet.icon,
        walletInstalled: wallet.installed,
        walletKeys: Object.keys(wallet),
        walletValue: wallet,
        walletType: typeof wallet,
        walletConstructor: wallet.constructor?.name,
        walletPrototype: Object.getPrototypeOf(wallet),
        hasFeatures: !!wallet.features,
        featuresKeys: wallet.features ? Object.keys(wallet.features) : null,
        hasAccounts: !!wallet.accounts,
        accountsLength: wallet.accounts ? wallet.accounts.length : null
      });
      
      console.log('🔍 Attempting to connect to wallet:', {
        walletName: wallet.name,
        walletId: wallet.id,
        walletKeys: Object.keys(wallet),
        connectType: typeof walletAPIState._connect,
        mutateAsyncType: typeof walletAPIState._connect?.mutateAsync,
        mutateAsyncExists: !!walletAPIState._connect?.mutateAsync
      });
      
      try {
        // Check if mutateAsync exists
        if (!walletAPIState._connect || typeof walletAPIState._connect.mutateAsync !== 'function') {
          console.error('❌ connectWallet.mutateAsync is not a function:', {
            connectType: typeof walletAPIState._connect,
            connectValue: walletAPIState._connect,
            hasMutateAsync: !!walletAPIState._connect?.mutateAsync,
            mutateAsyncType: typeof walletAPIState._connect?.mutateAsync
          });
          
          // Try alternative: maybe it's a function directly?
          if (typeof walletAPIState._connect === 'function') {
            console.log('⚠️ connectWallet is a function, trying direct call...');
            const result = await walletAPIState._connect({ wallet });
            console.log('✅ Direct call result:', result);
            
            await new Promise(resolve => setTimeout(resolve, 200));
            
            return {
              success: true,
              address: walletAPIState.address,
              wallet: wallet.name
            };
          }
          
          return {
            success: false,
            error: 'Wallet connection function not available'
          };
        }
        
        // Use Insomnia's pattern: connectWallet.mutateAsync({ wallet })
        console.log('🔗 Calling connectWallet.mutateAsync({ wallet })...');
        
        // Create a clean wallet object reference (not a copy) to avoid Proxy issues
        // The wallet object from useWallets() might be a Proxy, so we pass it directly
        const walletToConnect = wallet;
        
        console.log('🔍 Wallet object being passed:', {
          name: walletToConnect.name,
          id: walletToConnect.id,
          icon: walletToConnect.icon,
          installed: walletToConnect.installed,
          hasFeatures: !!walletToConnect.features,
          hasAccounts: !!walletToConnect.accounts,
          hasChains: !!walletToConnect.chains,
          walletType: typeof walletToConnect,
          walletConstructor: walletToConnect.constructor?.name,
          allKeys: Object.keys(walletToConnect),
          allKeysWithGetOwnPropertyNames: Object.getOwnPropertyNames(walletToConnect),
          walletStringified: JSON.stringify({
            name: walletToConnect.name,
            id: walletToConnect.id,
            icon: walletToConnect.icon,
            installed: walletToConnect.installed
          })
        });
        
        // Check if React Query mutation is in a valid state
        console.log('🔍 React Query mutation state:', {
          mutationStatus: walletAPIState._connect?.status,
          mutationError: walletAPIState._connect?.error,
          mutationData: walletAPIState._connect?.data,
          mutationIsPending: walletAPIState._connect?.isPending,
          mutationIsSuccess: walletAPIState._connect?.isSuccess,
          mutationIsError: walletAPIState._connect?.isError,
          mutationReset: typeof walletAPIState._connect?.reset
        });
        
        // Call mutateAsync with error handling
        // Wrap in try-catch to handle React errors separately from connection errors
        let connectionPromise;
        try {
          // Use setTimeout to defer the mutation call to next tick
          // This prevents React from trying to render during the mutation
          connectionPromise = new Promise((resolve, reject) => {
            setTimeout(async () => {
              try {
                const result = await walletAPIState._connect.mutateAsync({ wallet: walletToConnect });
                resolve(result);
              } catch (error) {
                reject(error);
              }
            }, 0);
          });
        } catch (syncError) {
          console.error('❌ Synchronous error calling mutateAsync:', syncError);
          throw syncError;
        }
        
        // Wait for connection with timeout
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout after 10 seconds')), 10000)
        );
        
        try {
          await Promise.race([connectionPromise, timeoutPromise]);
          console.log('✅ Connection promise resolved successfully');
        } catch (connectionError) {
          console.error('❌ Connection promise rejected:', connectionError);
          throw connectionError;
        }
        
        // Wait for state update (React state updates are asynchronous)
        console.log('⏳ Waiting for React state update...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check state multiple times (React updates might be delayed)
        let attempts = 0;
        while (attempts < 10 && !walletAPIState.connected) {
          await new Promise(resolve => setTimeout(resolve, 300));
          attempts++;
          console.log(`🔍 State check attempt ${attempts}:`, {
            address: walletAPIState.address,
            connected: walletAPIState.connected,
            currentWallet: walletAPIState.currentWallet?.name
          });
        }
        
        console.log('✅ Connection process completed. Final state:', {
          address: walletAPIState.address,
          connected: walletAPIState.connected,
          currentWallet: walletAPIState.currentWallet?.name,
          attempts: attempts
        });
        
        return {
          success: walletAPIState.connected,
          address: walletAPIState.address,
          wallet: wallet.name,
          error: walletAPIState.connected ? null : 'Connection completed but wallet state not updated'
        };
      } catch (error) {
        console.error('❌ Wallet connection error:', error);
        console.error('  Error name:', error.name);
        console.error('  Error message:', error.message);
        console.error('  Error stack:', error.stack);
        console.error('  Error details:', {
          cause: error.cause,
          walletName: wallet?.name,
          walletId: wallet?.id
        });
        
        return {
          success: false,
          error: error.message || 'Wallet connection failed'
        };
      }
    },
    
    // Disconnect wallet - based on Insomnia's disconnect pattern
    async disconnect() {
      if (!walletAPIState._disconnect) {
        return {
          success: false,
          error: 'Wallet API not initialized'
        };
      }
      
      try {
        // Use Insomnia's pattern: disconnectWallet.mutateAsync()
        await walletAPIState._disconnect.mutateAsync();
        
        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error.message || 'Wallet disconnection failed'
        };
      }
    },
    
    // Format address
    formatAddress(address) {
      if (!address) return '';
      return `${address.slice(0, 6)}...${address.slice(-4)}`;
    },
    
    // Add event listener
    on(eventTypeOrCallback, callback) {
      // Support both: on(callback) and on(eventType, callback)
      let eventType = null;
      let actualCallback = callback;
      
      if (typeof eventTypeOrCallback === 'function') {
        // Called as: on(callback) - no event type specified
        actualCallback = eventTypeOrCallback;
      } else if (typeof eventTypeOrCallback === 'string' && typeof callback === 'function') {
        // Called as: on(eventType, callback)
        eventType = eventTypeOrCallback;
        actualCallback = callback;
      } else {
        console.warn('⚠️ Invalid listener arguments provided:', { eventTypeOrCallback, callback });
        return () => {}; // Return empty cleanup function
      }
      
      if (typeof actualCallback !== 'function') {
        console.warn('⚠️ Invalid listener callback provided:', actualCallback);
        return () => {}; // Return empty cleanup function
      }
      
      walletAPIState.listeners.push(actualCallback);
      return () => {
        const index = walletAPIState.listeners.indexOf(actualCallback);
        if (index > -1) {
          walletAPIState.listeners.splice(index, 1);
        }
      };
    },
    
    // Remove event listener
    off(callback) {
      if (typeof callback !== 'function') {
        console.warn('⚠️ Invalid listener callback provided for removal:', callback);
        return;
      }
      const index = walletAPIState.listeners.indexOf(callback);
      if (index > -1) {
        walletAPIState.listeners.splice(index, 1);
      }
    },
    
    // Check MEWS token balance
    async checkMEWSBalance(address, network = 'mainnet') {
      try {
        if (!address) {
          return {
            success: false,
            balance: '0',
            hasMinimumBalance: false,
            error: 'No wallet address provided'
          };
        }
        
        const client = new SuiClient({ url: getFullnodeUrl(network) });
        
        // Get coins for MEWS token
        const coins = await client.getCoins({
          owner: address,
          coinType: MEWS_TOKEN_TYPE_ID,
        });
        
        // Calculate total balance
        let totalBalance = BigInt(0);
        coins.data.forEach((coin) => {
          totalBalance += BigInt(coin.balance);
        });
        
        const hasMinimumBalance = totalBalance >= walletAPIState.minBalanceRequired;
        
        // Update state
        walletAPIState.mewsBalance = totalBalance.toString();
        walletAPIState.hasMinimumBalance = hasMinimumBalance;
        
        // Format balance for display (divide by 10^9 for human-readable)
        const formattedBalance = (Number(totalBalance) / 1_000_000_000).toLocaleString();
        const formattedMinBalance = (Number(walletAPIState.minBalanceRequired) / 1_000_000_000).toLocaleString();
        
        console.log('🔍 MEWS Balance Check:', {
          address,
          balance: formattedBalance,
          minimum: formattedMinBalance,
          hasMinimumBalance
        });
        
        return {
          success: true,
          balance: totalBalance.toString(),
          formattedBalance,
          hasMinimumBalance,
          minimumRequired: walletAPIState.minBalanceRequired.toString(),
          formattedMinimum: formattedMinBalance
        };
      } catch (error) {
        console.error('❌ Error checking MEWS balance:', error);
        return {
          success: false,
          balance: '0',
          hasMinimumBalance: false,
          error: error.message || 'Failed to check balance'
        };
      }
    },
    
    // Get current balance status
    getBalanceStatus() {
      return {
        balance: walletAPIState.mewsBalance,
        hasMinimumBalance: walletAPIState.hasMinimumBalance,
        minimumRequired: walletAPIState.minBalanceRequired.toString()
      };
    }
  };
  
  // CRITICAL: Check if page is loaded via file:// protocol
  // Browser extensions often don't inject into file:// pages for security reasons
  const isFileProtocol = window.location.protocol === 'file:';
  console.log('🔍 Protocol check:', {
    protocol: window.location.protocol,
    isFileProtocol: isFileProtocol,
    url: window.location.href
  });
  
  if (isFileProtocol) {
    console.warn('⚠️ WARNING: Page is loaded via file:// protocol');
    console.warn('⚠️ Browser extensions (like Slush Wallet) may NOT inject into file:// pages');
    console.warn('⚠️ SOLUTION: Use a local HTTP server instead:');
    console.warn('   - Python: python -m http.server 8000');
    console.warn('   - Node.js: npx http-server');
    console.warn('   - VS Code: Install "Live Server" extension');
    console.warn('   Then access via: http://localhost:8000');
  }
  
  // Check for wallet extensions directly on window object
  // Some extensions inject themselves before @mysten/dapp-kit detects them
  console.log('🔍 Checking for wallet extensions directly...');
  const directWalletChecks = {
    'window.slush?.sui': typeof window.slush?.sui !== 'undefined',
    'window.slushWallet': typeof window.slushWallet !== 'undefined',
    'window.suiWallet': typeof window.suiWallet !== 'undefined',
    'window.ethosWallet': typeof window.ethosWallet !== 'undefined',
    'window.okxWallet': typeof window.okxWallet !== 'undefined',
    'window.suiet': typeof window.suiet !== 'undefined',
    'window.__SUI_WALLET__': typeof window.__SUI_WALLET__ !== 'undefined',
    'navigator.wallets': typeof window.navigator?.wallets !== 'undefined',
    'navigator.wallets.get': typeof window.navigator?.wallets?.get === 'function'
  };
  console.log('🔍 Direct wallet checks:', directWalletChecks);
  
  // Try to get wallets via Wallet Standard API if available
  if (typeof window.navigator?.wallets?.get === 'function') {
    console.log('🔍 Wallet Standard API detected, checking wallets...');
    try {
      const wallets = await window.navigator.wallets.get();
      console.log('🔍 Wallet Standard API returned:', {
        walletsCount: wallets.length,
        walletNames: wallets.map(w => w.name || w.id || 'unknown')
      });
      
      if (wallets.length > 0) {
        console.log('✅ Wallets found via Wallet Standard API:', wallets.map(w => ({
          name: w.name,
          id: w.id,
          features: Object.keys(w.features || {})
        })));
      }
    } catch (error) {
      console.error('❌ Error accessing Wallet Standard API:', error);
    }
  } else {
    console.log('⚠️ Wallet Standard API (navigator.wallets.get) not available');
  }
  
  // Check for window.slush?.sui specifically (Slush Wallet)
  if (window.slush?.sui) {
    console.log('✅ Slush Wallet detected at window.slush.sui');
  }
  
  // Check all window properties for wallet-related keys
  const walletKeys = Object.keys(window).filter(k => {
    const lower = k.toLowerCase();
    return lower.includes('slush') || 
           lower.includes('sui') || 
           lower.includes('wallet') ||
           lower.includes('ethereum');
  });
  if (walletKeys.length > 0) {
    console.log('🔍 Window properties that might be wallets:', walletKeys);
  }
  
  // Wait a bit for initialization and wallet detection
  // Wallet extensions inject themselves asynchronously, so we need to wait
  console.log('⏳ Waiting for wallet detection...');
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Check if wallets were detected
  console.log('🔍 After wait, wallets detected:', {
    walletsCount: walletAPIState.wallets.length,
    walletNames: walletAPIState.wallets.map(w => w.name),
    hasConnect: !!walletAPIState._connect
  });
  
  // If still no wallets, wait a bit more (extensions can take time to inject)
  if (walletAPIState.wallets.length === 0) {
    console.log('⏳ No wallets detected yet, waiting longer for extensions...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('🔍 After longer wait, wallets detected:', {
      walletsCount: walletAPIState.wallets.length,
      walletNames: walletAPIState.wallets.map(w => w.name)
    });
    
    // Final check - if still no wallets, log helpful message
    if (walletAPIState.wallets.length === 0) {
      console.warn('⚠️ No wallets detected after waiting. Possible reasons:');
      console.warn('  1. No wallet extension installed');
      console.warn('  2. Wallet extension not compatible with @mysten/dapp-kit');
      console.warn('  3. Wallet extension needs page refresh after installation');
      console.warn('  Supported wallets: Sui Wallet, Slush Wallet, Ethos Wallet, OKX Wallet, Suiet');
    }
  }
  
  return walletAPI;
}

// Export default for module systems (UMD will handle this)
// The UMD bundle creates WalletAPI={} and passes it as the first parameter (At)
// We need to assign properties to At.WalletAPI, not create a new object
const walletAPIExport = {
  initialize: initializeWalletAPI,
  // Expose React and ReactDOM so they're available after bundle loads
  // This ensures React.__CLIENT_INTERNALS is properly initialized
  React: React,
  ReactDOM: ReactDOM // Expose the full ReactDOM module
};

// For UMD: assign properties to the global WalletAPI object
// The UMD wrapper passes WalletAPI={} as the first parameter
// We need to populate it, not replace it
if (typeof window !== 'undefined') {
  // Set on window directly (for browser globals)
  window.WalletAPI = walletAPIExport;
  
  // Also expose React and ReactDOM on globalThis for compatibility
  if (typeof globalThis !== 'undefined') {
    globalThis.React = React;
    globalThis.ReactDOM = ReactDOM;
  }
}

export default walletAPIExport;
