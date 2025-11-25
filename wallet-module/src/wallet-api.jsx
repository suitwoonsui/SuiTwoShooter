/**
 * Wallet Connection API for Vanilla JS
 * Based on Insomnia game's working implementation
 * Uses @mysten/dapp-kit directly with React hooks
 */

import { SuiClientProvider, WalletProvider as SuiWalletProvider, useWallets, useConnectWallet, useCurrentWallet, useDisconnectWallet, useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit';
import { getFullnodeUrl } from '@mysten/sui/client';
import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import * as ReactDOM from 'react-dom';

// QueryClient instance
const queryClient = new QueryClient();

// MEWS Token Configuration - Network-aware
const MEWS_TOKEN_TYPE_IDS = {
  mainnet: '0x2dcf8629a70b235cda598170fc9b271f03f33d34dd6fa148adaff481e7a792d2::mews::MEWS',
  testnet: '0xcc01924c571e20ad9e7151e83cf43238c5b74c7836d54b39390ad071d74f477a::mews::MEWS',
  devnet: '0x2dcf8629a70b235cda598170fc9b271f03f33d34dd6fa148adaff481e7a792d2::mews::MEWS', // Fallback
  localnet: '0x2dcf8629a70b235cda598170fc9b271f03f33d34dd6fa148adaff481e7a792d2::mews::MEWS' // Fallback
};

// MEWS Decimal Precision - Network-aware
// Mainnet MEWS uses 6 decimals, testnet uses 9 decimals
const MEWS_DECIMALS = {
  mainnet: 6,
  testnet: 9,
  devnet: 9, // Fallback
  localnet: 9 // Fallback
};

function getMEWSTokenTypeId(network = 'mainnet') {
  return MEWS_TOKEN_TYPE_IDS[network] || MEWS_TOKEN_TYPE_IDS.mainnet;
}

function getMEWSDecimals(network = 'mainnet') {
  return MEWS_DECIMALS[network] || MEWS_DECIMALS.mainnet;
}

// Minimum balance requirement (in human-readable MEWS)
const MIN_BALANCE_MEWS = 500000; // 500,000 MEWS

function getMinBalanceRequired(network = 'mainnet') {
  const decimals = getMEWSDecimals(network);
  return BigInt(MIN_BALANCE_MEWS * Math.pow(10, decimals));
}

// Wallet API state
let walletAPIState = {
  connected: false,
  address: null,
  wallets: [],
  currentWallet: null,
  listeners: [],
  mewsBalance: null,
  hasMinimumBalance: false,
  minBalanceRequired: null, // Will be set based on network decimals
  network: 'testnet' // Default to testnet, will be set during initialization
};

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
  const signAndExecuteTransaction = useSignAndExecuteTransaction();
  const suiClient = useSuiClient();
  
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
      
      // Store transaction signing functions
      walletAPIState._signAndExecuteTransaction = signAndExecuteTransaction;
      walletAPIState._suiClient = suiClient;
      
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
    }, [wallets, currentWallet, connectWallet, disconnectWallet, signAndExecuteTransaction, suiClient, onUpdate]);
  
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
          preferredWallets={[
            'Slush Wallet',      // Mysten Labs official wallet
            'Sui Wallet',        // Mysten Labs official wallet
            'Surf Wallet',       // Mobile-first wallet with zkLogin
            'Suiet',             // Open-source browser extension
            'Ethos Wallet',      // Popular Sui wallet
            'OKX Wallet',        // Multi-chain wallet with Sui support
            'Phantom',           // Multi-chain wallet with Sui support
            'Klever Wallet',     // Multi-chain wallet with Sui support
            'Trust Wallet',      // Multi-chain wallet with Sui support
            'Coinbase Wallet'    // Multi-chain wallet with Sui support
          ]}
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
async function initializeWalletAPI(options = {}) {
  if (walletAPI) return walletAPI;
  
  const { network = 'testnet', containerId = 'wallet-react-root' } = options;
  
  // Store network in state
  walletAPIState.network = network;
  
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
        
        // Get the correct token type ID and decimal precision for this network
        const tokenTypeId = getMEWSTokenTypeId(network);
        const decimals = getMEWSDecimals(network);
        const divisor = Math.pow(10, decimals);
        const minBalanceRequired = getMinBalanceRequired(network);
        
        // Get coins for MEWS token
        const coins = await client.getCoins({
          owner: address,
          coinType: tokenTypeId,
        });
        
        // Calculate total balance
        let totalBalance = BigInt(0);
        coins.data.forEach((coin) => {
          totalBalance += BigInt(coin.balance);
        });
        
        const hasMinimumBalance = totalBalance >= minBalanceRequired;
        
        // Update state
        walletAPIState.mewsBalance = totalBalance.toString();
        walletAPIState.hasMinimumBalance = hasMinimumBalance;
        walletAPIState.minBalanceRequired = minBalanceRequired;
        
        // Format balance for display (divide by 10^decimals for human-readable)
        // Convert BigInt to number for calculation (safe for balances up to ~9 quadrillion)
        const balanceInMEWS = Number(totalBalance) / divisor;
        const minBalanceInMEWS = Number(minBalanceRequired) / divisor;
        
        // Format with proper thousands separators
        // Always show full number with commas (e.g., 5,085,000 not 5,085)
        const formattedBalance = balanceInMEWS.toLocaleString('en-US', { 
          maximumFractionDigits: 2,
          useGrouping: true  // Ensure thousands separators are shown
        });
        const formattedMinBalance = minBalanceInMEWS.toLocaleString('en-US', { 
          maximumFractionDigits: 0,
          useGrouping: true
        });
        
        // Detailed logging for debugging
        console.log('🔍 MEWS Balance Check (Detailed):', {
          address,
          network,
          tokenTypeId: tokenTypeId,
          decimals: decimals,
          divisor: divisor,
          coinCount: coins.data.length,
          rawBalance: totalBalance.toString(),
          rawBalanceFormatted: totalBalance.toLocaleString('en-US'),
          balanceInMEWS: balanceInMEWS,
          balanceInMEWSFormatted: balanceInMEWS.toLocaleString('en-US', { maximumFractionDigits: 6 }),
          formattedBalance,
          minimumRequired: minBalanceRequired.toString(),
          minBalanceInMEWS,
          formattedMinBalance,
          hasMinimumBalance,
          calculation: `${totalBalance.toString()} / ${divisor.toLocaleString('en-US')} = ${balanceInMEWS}`,
          // Show individual coin balances if multiple
          coinBalances: coins.data.length > 1 ? coins.data.map(c => ({
            balance: c.balance,
            balanceInMEWS: (Number(c.balance) / divisor).toLocaleString('en-US', { maximumFractionDigits: 6 })
          })) : undefined
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
    
    // Check SUI balance
    async checkSUIBalance(address, network = 'testnet') {
      try {
        if (!address) {
          return {
            success: false,
            balance: '0',
            formattedBalance: '0',
            error: 'No wallet address provided'
          };
        }
        
        const client = new SuiClient({ url: getFullnodeUrl(network) });
        
        // Get SUI balance (default coin type)
        const balance = await client.getBalance({
          owner: address
        });
        
        const balanceInSUI = parseInt(balance.totalBalance) / 1_000_000_000; // Convert MIST to SUI
        const formattedBalance = balanceInSUI.toLocaleString('en-US', {
          maximumFractionDigits: 4,
          useGrouping: true
        });
        
        return {
          success: true,
          balance: balance.totalBalance,
          formattedBalance,
          balanceInSUI
        };
      } catch (error) {
        console.error('❌ Error checking SUI balance:', error);
        return {
          success: false,
          balance: '0',
          formattedBalance: '0',
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
    },

    // Sign and execute transaction
    // Accepts either a Transaction object or Uint8Array bytes (will deserialize)
    async signAndExecuteTransaction(transactionInput) {
      if (!walletAPIState._signAndExecuteTransaction) {
        return {
          success: false,
          error: 'Transaction signing not available. Wallet may not be connected.'
        };
      }

      try {
        let transactionToSign;
        
        // dapp-kit accepts: Transaction object, base64 string, or Uint8Array
        // Based on Insomnia's implementation, it accepts string | Transaction
        if (transactionInput && typeof transactionInput === 'object') {
          // Check if it's already a Transaction object
          // Use property checks instead of instanceof to avoid scope issues
          const isTransactionObject = 'kind' in transactionInput || 'blockData' in transactionInput || 
                                      (transactionInput.constructor && transactionInput.constructor.name === 'Transaction');
          if (isTransactionObject) {
            // Already a Transaction object - pass directly
            transactionToSign = transactionInput;
            console.log('✅ [WALLET] Using provided Transaction object');
          } else if (transactionInput instanceof Uint8Array) {
            // Convert Uint8Array to base64 string (dapp-kit accepts base64 strings)
            transactionToSign = btoa(String.fromCharCode(...transactionInput));
            console.log('✅ [WALLET] Converted Uint8Array to base64 string');
          } else {
            // Try to convert array-like to Uint8Array then base64
            try {
              const bytes = new Uint8Array(transactionInput);
              transactionToSign = btoa(String.fromCharCode(...bytes));
              console.log('✅ [WALLET] Converted array-like input to base64 string');
            } catch (conversionError) {
              throw new Error(`Invalid transaction input. Expected Transaction object, base64 string, or bytes, got: ${typeof transactionInput}`);
            }
          }
        } else if (typeof transactionInput === 'string') {
          // Assume it's base64-encoded string - pass directly (dapp-kit accepts this)
          transactionToSign = transactionInput;
          console.log('✅ [WALLET] Using base64 string directly (dapp-kit accepts this format)');
        } else {
          throw new Error(`Invalid transaction input type: ${typeof transactionInput}`);
        }

        // Get the current network from wallet API state
        const currentNetwork = walletAPIState.network || 'testnet';
        const chainId = `sui:${currentNetwork}`;
        
        console.log('🔐 [WALLET] ========== SIGNING TRANSACTION ==========');
        console.log('🔐 [WALLET] Network:', currentNetwork);
        console.log('🔐 [WALLET] Chain ID:', chainId);
        console.log('🔐 [WALLET] Transaction type:', typeof transactionToSign);
        console.log('🔐 [WALLET] Transaction details:', {
          isTransaction: typeof transactionToSign === 'object' && ('kind' in transactionToSign || 'blockData' in transactionToSign || (transactionToSign.constructor && transactionToSign.constructor.name === 'Transaction')),
          hasKind: 'kind' in transactionToSign,
          hasBlockData: 'blockData' in transactionToSign,
          constructorName: transactionToSign?.constructor?.name,
        });
        
        console.log('⏳ [WALLET] Requesting wallet signature...');
        const result = await walletAPIState._signAndExecuteTransaction.mutateAsync({
          transaction: transactionToSign,
          chain: chainId, // Explicitly set the chain to match wallet network
          options: {
            showEffects: true,
            showEvents: true
          }
        });

        console.log('📦 [WALLET] Transaction response received:', {
          digest: result.digest,
          hasEffects: !!result.effects,
          hasEvents: !!result.events,
          effectsStatus: result.effects?.status?.status,
        });

        // Verify transaction actually succeeded on-chain
        // dapp-kit returns effects.status.status as 'success' or 'failure'
        // Some wallets may return effects in a different structure
        const status = result.effects?.status?.status;
        const hasDigest = !!result.digest;
        const hasEffects = !!result.effects;
        
        console.log('🔍 [WALLET] Transaction status:', status);
        console.log('🔍 [WALLET] Has digest:', hasDigest);
        console.log('🔍 [WALLET] Has effects:', hasEffects);
        console.log('🔍 [WALLET] Effects structure:', {
          hasStatus: !!result.effects?.status,
          statusType: typeof result.effects?.status,
          statusKeys: result.effects?.status ? Object.keys(result.effects.status) : [],
          effectsKeys: result.effects ? Object.keys(result.effects) : [],
        });
        
        // ALWAYS verify transaction on-chain to get definitive status
        // The on-chain query is the source of truth - wallet responses can be inconsistent
        let verifiedStatus = null; // null means we haven't checked yet
        let verifiedEffects = null;
        
        if (result.digest) {
          // Try to get status from on-chain query (with retries for indexing delay)
          const maxRetries = 3;
          let retryCount = 0;
          
          while (verifiedStatus === null && retryCount < maxRetries) {
            try {
              if (retryCount > 0) {
                // Wait before retry (transaction might not be indexed yet)
                const waitTime = 1000 * retryCount; // 1s, 2s, 3s
                console.log(`⏳ [WALLET] Waiting ${waitTime}ms before retry ${retryCount}...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
              }
              
              console.log('🔍 [WALLET] Verifying transaction on-chain...');
              const client = new SuiClient({ url: getFullnodeUrl(currentNetwork) });
              const txDetails = await client.getTransactionBlock({
                digest: result.digest,
                options: {
                  showEffects: true,
                  showEvents: true,
                  showObjectChanges: true,
                },
              });
              
              // Get status from on-chain query - this is the source of truth
              verifiedStatus = txDetails.effects?.status?.status;
              verifiedEffects = txDetails.effects;
              
              console.log('🔍 [WALLET] On-chain verification:', {
                status: verifiedStatus,
                statusType: typeof verifiedStatus,
                hasError: !!txDetails.effects?.status?.error,
                error: txDetails.effects?.status?.error,
              });
              
              // If we got a status (even if undefined), we're done
              // undefined status from on-chain means the transaction structure is unexpected
              if (verifiedStatus !== null || verifiedEffects) {
                break; // Got response, exit retry loop
              }
            } catch (verifyError) {
              retryCount++;
              if (retryCount >= maxRetries) {
                console.error('❌ [WALLET] Failed to verify transaction on-chain after retries:', verifyError);
                // If we can't verify, we can't determine success - treat as failure
                verifiedStatus = 'unknown';
              } else {
                console.warn(`⚠️ [WALLET] On-chain verification failed (attempt ${retryCount}/${maxRetries}), retrying...`);
              }
            }
          }
        }
        
        // If on-chain query didn't return a status, check wallet's response
        // But prioritize on-chain result
        let finalStatus = verifiedStatus;
        let finalEffects = verifiedEffects || result.effects;
        
        // If on-chain status is still null/undefined, try to get from wallet response
        if (finalStatus === null || finalStatus === undefined) {
          // Check if effects is a base64 string that needs decoding
          if (typeof finalEffects === 'string') {
            try {
              const decoded = atob(finalEffects);
              finalEffects = JSON.parse(decoded);
              console.log('📦 [WALLET] Decoded base64 effects from wallet response');
            } catch (e) {
              console.warn('⚠️ [WALLET] Could not decode effects as base64:', e);
            }
          }
          
          // Try to get status from decoded effects
          finalStatus = finalEffects?.status?.status;
        }
        
        // If status is still undefined/null, we can't determine success
        // This means either:
        // 1. Transaction hasn't been indexed yet (should have been caught by retries)
        // 2. Transaction structure is unexpected
        // 3. Transaction actually failed but error isn't in expected format
        if (finalStatus === null || finalStatus === undefined) {
          console.error('❌ [WALLET] Could not determine transaction status from on-chain or wallet response');
          console.error('❌ [WALLET] This indicates the transaction may have failed or structure is unexpected');
          finalStatus = 'unknown';
        }
        
        const hasError = finalEffects?.status?.error !== undefined;
        
        // Transaction succeeds ONLY if status is explicitly 'success'
        // If status is undefined, null, 'unknown', or anything else, it's a failure
        const isSuccess = finalStatus === 'success';
        
        console.log('🔍 [WALLET] Final status determination:', {
          finalStatus,
          source: verifiedStatus !== null ? 'on-chain' : 'wallet-response',
          hasError,
          hasDigest,
          hasEffects: !!finalEffects,
          isSuccess,
          note: 'Transaction succeeds ONLY if status === "success"',
        });
        
        if (!isSuccess) {
          // Get error from final effects (prioritize on-chain, fallback to wallet)
          const errorObj = finalEffects?.status?.error || result.effects?.status?.error;
          let errorMessage = 'Transaction failed on-chain';
          let errorCode = null;
          
          // Try to extract detailed error information
          if (errorObj) {
            if (typeof errorObj === 'string') {
              errorMessage = errorObj;
            } else if (errorObj.code) {
              errorCode = errorObj.code;
              errorMessage = errorObj.message || errorObj.code;
            } else if (errorObj.error) {
              errorMessage = errorObj.error;
            } else {
              errorMessage = JSON.stringify(errorObj);
            }
          }
          
          // Use decoded effects if we decoded them, otherwise use original
          const decodedEffects = finalEffects || result.effects;
          
          // Extract Move abort error if present
          if (errorMessage.includes('MoveAbort') || errorMessage.includes('move abort')) {
            // Move abort format: "MoveAbort(Location, code)"
            const abortMatch = errorMessage.match(/MoveAbort\([^,]+,\s*(\d+)\)/);
            if (abortMatch) {
              errorCode = abortMatch[1];
              console.error('🔍 [WALLET] Move abort code:', errorCode);
            }
          }
          
          console.error('❌ [WALLET] ========== TRANSACTION FAILED ==========');
          console.error('❌ [WALLET] Transaction digest:', result.digest);
          console.error('❌ [WALLET] Final Status:', finalStatus);
          console.error('❌ [WALLET] Status Source:', verifiedStatus !== null ? 'on-chain (definitive)' : 'wallet-response (may be unreliable)');
          console.error('❌ [WALLET] Error Code:', errorCode || 'N/A');
          console.error('❌ [WALLET] Error Message:', errorMessage);
          console.error('❌ [WALLET] Full error object:', JSON.stringify(errorObj, null, 2));
          console.error('❌ [WALLET] Full effects:', JSON.stringify(finalEffects, null, 2));
          console.error('❌ [WALLET] Events:', result.events);
          
          // Return with the correct variable name (errorMessage, not error)
          return {
            success: false,
            digest: result.digest,
            error: errorMessage,  // ✅ Fixed: was 'error' (undefined), now 'errorMessage'
            errorCode: errorCode,
            status: finalStatus, // Include the determined status
            effects: finalEffects,
            events: result.events
          };
        }
        
        console.log('✅ [WALLET] ========== TRANSACTION SUCCEEDED ==========');
        console.log('✅ [WALLET] Transaction digest:', result.digest);
        console.log('✅ [WALLET] Gas used:', result.effects?.gasUsed);
        console.log('✅ [WALLET] Transaction effects:', JSON.stringify(result.effects, null, 2));
        console.log('✅ [WALLET] Transaction events:', result.events);
        
        // Log object changes if available
        if (result.objectChanges) {
          console.log('📦 [WALLET] Object changes:', result.objectChanges);
        }
        
        // Log created objects
        const createdObjects = result.objectChanges?.filter(change => change.type === 'created') || [];
        if (createdObjects.length > 0) {
          console.log('✨ [WALLET] Created objects:', createdObjects);
        }
        
        // Log mutated objects
        const mutatedObjects = result.objectChanges?.filter(change => change.type === 'mutated') || [];
        if (mutatedObjects.length > 0) {
          console.log('🔄 [WALLET] Mutated objects:', mutatedObjects);
        }

        return {
          success: true,
          digest: result.digest,
          effects: result.effects,
          events: result.events
        };
      } catch (error) {
        console.error('❌ Transaction signing/execution error:', error);
        return {
          success: false,
          error: error.message || 'Transaction failed'
        };
      }
    },

    /**
     * Build badge mint transaction (wallet module has access to Sui SDK)
     * @param {Object} transactionData - Transaction data from backend
     * @param {string} playerAddress - Player's wallet address
     * @returns {Promise<Object>} Transaction object ready for signing
     */
    /**
     * Build badge mint transaction (fully client-side)
     * 
     * Flow:
     * 1. Validates contract config and wallet connection
     * 2. Estimates gas (0.01 SUI)
     * 3. Calculates fee = 0.1 SUI - gas
     * 4. Finds coin with sufficient balance (≥0.1 SUI)
     * 5. Sets coin as gas payment
     * 6. Splits fee amount from coin
     * 7. Builds transaction with contract addresses
     * 
     * @param {string} playerAddress - Player's wallet address
     * @returns {Promise<Object>} Transaction object ready for signing
     */
    async buildBadgeMintTransaction(playerAddress) {
      console.log('🔨 [BADGE MINT] ========== BUILDING TRANSACTION ==========');
      console.log('🔨 [BADGE MINT] Player Address:', playerAddress);
      
      try {
        // Validate inputs
        if (!playerAddress || typeof playerAddress !== 'string' || !playerAddress.startsWith('0x')) {
          console.error('❌ [BADGE MINT] Invalid player address:', playerAddress);
          return {
            success: false,
            error: 'Invalid player address',
          };
        }

        // Get network and client
        const network = walletAPIState.network || 'testnet';
        const client = new SuiClient({ url: getFullnodeUrl(network) });
        console.log('🌐 [BADGE MINT] Network:', network);
        console.log('🌐 [BADGE MINT] RPC URL:', getFullnodeUrl(network));
        
        // Validate contract config
        const contracts = window.GAME_CONFIG?.CONTRACTS;
        if (!contracts) {
          console.error('❌ [BADGE MINT] Contract configuration not found');
          return {
            success: false,
            error: 'Contract configuration not found. Please ensure contract-config.js is loaded.',
          };
        }

        console.log('📋 [BADGE MINT] Contract Configuration:', {
          packageId: contracts.packageId,
          badgeRegistry: contracts.badgeRegistry,
          statisticsRegistry: contracts.statisticsRegistry,
          clock: contracts.clock,
        });

        const missingFields = [];
        if (!contracts.packageId) missingFields.push('packageId');
        if (!contracts.badgeRegistry) missingFields.push('badgeRegistry');
        if (!contracts.statisticsRegistry) missingFields.push('statisticsRegistry');
        if (!contracts.clock) missingFields.push('clock');

        if (missingFields.length > 0) {
          console.error('❌ [BADGE MINT] Missing contract fields:', missingFields);
          return {
            success: false,
            error: `Missing contract configuration: ${missingFields.join(', ')}`,
          };
        }
        
        // Constants
        const TOTAL_PAYMENT_MIST = BigInt(100_000_000); // 0.1 SUI total payment
        const GAS_BUDGET_MIST = BigInt(10_000_000); // 0.01 SUI gas estimate
        
        // Calculate fee = total - gas
        const feeAmount = TOTAL_PAYMENT_MIST - GAS_BUDGET_MIST;
        
        console.log('💰 [BADGE MINT] Payment Breakdown:', {
          totalPayment: `${Number(TOTAL_PAYMENT_MIST) / 1_000_000_000} SUI (${TOTAL_PAYMENT_MIST} MIST)`,
          gasBudget: `${Number(GAS_BUDGET_MIST) / 1_000_000_000} SUI (${GAS_BUDGET_MIST} MIST)`,
          feeAmount: `${Number(feeAmount) / 1_000_000_000} SUI (${feeAmount} MIST)`,
        });
        
        if (feeAmount <= 0) {
          console.error('❌ [BADGE MINT] Fee calculation error: feeAmount <= 0');
          return {
            success: false,
            error: `Gas estimate (${Number(GAS_BUDGET_MIST) / 1_000_000_000} SUI) exceeds total payment (0.1 SUI)`,
          };
        }
        
        // Find coin with sufficient balance
        console.log('🔍 [BADGE MINT] Querying SUI coins for address:', playerAddress);
        const coins = await client.getCoins({
          owner: playerAddress,
          coinType: '0x2::sui::SUI',
        });
        
        console.log('💎 [BADGE MINT] Coins found:', {
          count: coins.data?.length || 0,
          coins: coins.data?.map(c => ({
            id: c.coinObjectId,
            balance: `${Number(c.balance) / 1_000_000_000} SUI (${c.balance} MIST)`,
            version: c.version,
            digest: c.digest,
          })) || [],
        });
        
        if (!coins.data || coins.data.length === 0) {
          console.error('❌ [BADGE MINT] No SUI coins found in wallet');
          return {
            success: false,
            error: 'No SUI coins found in wallet. Please ensure you have SUI in your wallet.',
          };
        }
        
        // Check total balance (need enough for payment + gas)
        const totalBalance = coins.data.reduce((sum, c) => sum + BigInt(c.balance), BigInt(0));
        const requiredBalance = TOTAL_PAYMENT_MIST; // 0.1 SUI total (fee + gas)
        
        console.log('💵 [BADGE MINT] Balance Check:', {
          totalBalance: `${Number(totalBalance) / 1_000_000_000} SUI (${totalBalance} MIST)`,
          requiredBalance: `${Number(requiredBalance) / 1_000_000_000} SUI (${requiredBalance} MIST)`,
          sufficient: totalBalance >= requiredBalance,
        });
        
        if (totalBalance < requiredBalance) {
          console.error('❌ [BADGE MINT] Insufficient balance');
          return {
            success: false,
            error: `Insufficient SUI balance. Need ${Number(requiredBalance) / 1_000_000_000} SUI (for payment + gas), but wallet has ${Number(totalBalance) / 1_000_000_000} SUI`,
          };
        }
        
        // Find a coin with sufficient balance for BOTH fee and gas
        // We need at least 0.1 SUI in a single coin (0.09 fee + 0.01 gas)
        // This ensures after splitting the fee, there's enough left for gas
        const paymentCoin = coins.data.find(c => BigInt(c.balance) >= TOTAL_PAYMENT_MIST);
        
        if (!paymentCoin) {
          console.error('❌ [BADGE MINT] No single coin has sufficient balance');
          const maxCoinBalance = coins.data.reduce((max, c) => {
            const balance = BigInt(c.balance);
            return balance > max ? balance : max;
          }, BigInt(0));
          return {
            success: false,
            error: `No single coin has enough balance. Need ${Number(TOTAL_PAYMENT_MIST) / 1_000_000_000} SUI in one coin (for fee + gas), but largest coin has ${Number(maxCoinBalance) / 1_000_000_000} SUI. You may need to merge coins first.`,
          };
        }
        
        const remainingAfterSplit = BigInt(paymentCoin.balance) - feeAmount;
        console.log('✅ [BADGE MINT] Found suitable payment coin:', {
          coinId: paymentCoin.coinObjectId,
          balance: `${Number(paymentCoin.balance) / 1_000_000_000} SUI (${paymentCoin.balance} MIST)`,
          willSplit: `${Number(feeAmount) / 1_000_000_000} SUI for fee`,
          remainingForGas: `${Number(remainingAfterSplit) / 1_000_000_000} SUI (${remainingAfterSplit} MIST)`,
          gasBudget: `${Number(GAS_BUDGET_MIST) / 1_000_000_000} SUI`,
          hasEnoughForGas: remainingAfterSplit >= GAS_BUDGET_MIST,
        });
        
        if (remainingAfterSplit < GAS_BUDGET_MIST) {
          console.error('❌ [BADGE MINT] Coin balance insufficient after fee split');
          return {
            success: false,
            error: `Coin balance insufficient. After splitting ${Number(feeAmount) / 1_000_000_000} SUI for fee, only ${Number(remainingAfterSplit) / 1_000_000_000} SUI remains, but need ${Number(GAS_BUDGET_MIST) / 1_000_000_000} SUI for gas.`,
          };
        }
        
        // Build transaction
        console.log('🔨 [BADGE MINT] Building transaction...');
        const txb = new Transaction();
        
        // Use txb.gas for splitting - this is the standard Sui SDK pattern
        // The wallet will automatically:
        // 1. Select a coin with sufficient balance (we verified one exists with >= 0.1 SUI)
        // 2. Split the fee (0.09 SUI) from it
        // 3. Use the remainder (>= 0.01 SUI) for gas automatically
        // 
        // This avoids any "setGasPayment" type errors and follows Sui best practices
        console.log('💸 [BADGE MINT] Splitting fee from gas coin (wallet auto-selects):', {
          verifiedCoinId: paymentCoin.coinObjectId,
          verifiedCoinBalance: `${Number(paymentCoin.balance) / 1_000_000_000} SUI (${paymentCoin.balance} MIST)`,
          feeAmount: `${Number(feeAmount) / 1_000_000_000} SUI (${feeAmount} MIST)`,
          remainingForGas: `${Number(remainingAfterSplit) / 1_000_000_000} SUI (${remainingAfterSplit} MIST)`,
          method: 'txb.splitCoins(txb.gas, [feeAmount])',
          note: 'Wallet will auto-select a coin with sufficient balance (we verified one exists)',
        });
        
        // Construct image URL first
        const apiBaseUrl = window.GAME_CONFIG?.API_BASE_URL || 'http://localhost:3000/api';
        const baseUrl = apiBaseUrl.replace(/\/api$/, '');
        const imageUrl = `${baseUrl}/Badges/Standard.webp`;
        
        console.log('🖼️ [BADGE MINT] Image URL:', imageUrl);
        
        // Split the fee from txb.gas - wallet handles coin selection automatically
        // This is the standard Sui SDK pattern and avoids duplicate object references
        // The wallet will:
        // 1. Select a coin with sufficient balance (we verified one exists with >= 0.1 SUI)
        // 2. Split the fee (0.09 SUI) from it
        // 3. Use the remainder (>= 0.01 SUI) for gas automatically
        const splitFeeCoin = txb.splitCoins(txb.gas, [feeAmount]);
        
        console.log('💸 [BADGE MINT] Split coin details:', {
          verifiedCoinId: paymentCoin.coinObjectId,
          verifiedCoinBalance: `${Number(paymentCoin.balance) / 1_000_000_000} SUI (${paymentCoin.balance} MIST)`,
          splitAmount: `${Number(feeAmount) / 1_000_000_000} SUI (${feeAmount} MIST)`,
          remainingForGas: `${Number(remainingAfterSplit) / 1_000_000_000} SUI (${remainingAfterSplit} MIST)`,
          method: 'txb.splitCoins(txb.gas, [feeAmount])',
          note: 'Wallet will auto-select a coin with sufficient balance (we verified one exists)',
        });
        
        // Build move call to mint_badge function
        // Contract signature:
        // public entry fun mint_badge(
        //   registry: &mut BadgeRegistry,
        //   stats_registry: &StatisticsRegistry,
        //   clock: &Clock,
        //   payment: Coin<SUI>,
        //   image_url: String,
        //   ctx: &mut TxContext  // Auto-provided
        // )
        const moveCallTarget = `${contracts.packageId}::badge_system::mint_badge`;
        
        console.log('📞 [BADGE MINT] ========== BUILDING MINT FUNCTION CALL ==========');
        console.log('📞 [BADGE MINT] Function Target:', moveCallTarget);
        console.log('📞 [BADGE MINT] Function will:');
        console.log('   1. Validate payment >= MIN_MINT_FEE_MIST');
        console.log('   2. Transfer payment to fee recipient');
        console.log('   3. Check player does not already have badge');
        console.log('   4. Get player stats from StatisticsRegistry');
        console.log('   5. Create EarlySupporterBadge with Standard tier');
        console.log('   6. Transfer badge to player (tx_context::sender())');
        console.log('   7. Register badge in BadgeRegistry');
        console.log('   8. Emit BadgeMinted event');
        
        console.log('📞 [BADGE MINT] Function Arguments:', {
          arg1_registry: {
            type: '&mut BadgeRegistry',
            value: contracts.badgeRegistry,
            method: 'txb.object()',
          },
          arg2_stats_registry: {
            type: '&StatisticsRegistry',
            value: contracts.statisticsRegistry,
            method: 'txb.object()',
          },
          arg3_clock: {
            type: '&Clock',
            value: contracts.clock,
            method: 'txb.object()',
          },
          arg4_payment: {
            type: 'Coin<SUI>',
            value: 'splitFeeCoin (from splitCoins)',
            amount: `${Number(feeAmount) / 1_000_000_000} SUI (${feeAmount} MIST)`,
            note: 'Split from payment coin, will be transferred to fee recipient',
          },
          arg5_image_url: {
            type: 'String',
            value: imageUrl,
            method: 'txb.pure.string() (same as admin mint)',
          },
          arg6_ctx: {
            type: '&mut TxContext',
            value: 'Auto-provided by Sui',
            note: 'Contains sender (player), timestamp, etc.',
          },
        });
        
        // Build the move call
        // Use txb.pure() for string - the SDK will infer the type
        txb.moveCall({
          target: moveCallTarget,
          arguments: [
            txb.object(contracts.badgeRegistry),      // &mut BadgeRegistry
            txb.object(contracts.statisticsRegistry),  // &StatisticsRegistry
            txb.object(contracts.clock),               // &Clock
            splitFeeCoin,                              // Coin<SUI> - payment (split from coin)
            txb.pure(imageUrl),                        // String - image URL (use txb.pure() instead of txb.pure.string())
            // ctx: &mut TxContext is automatically provided by Sui
          ],
        });
        
        console.log('✅ [BADGE MINT] Move call added to transaction');
        console.log('📞 [BADGE MINT] ========== MINT FUNCTION CALL COMPLETE ==========');
        
        // Set transaction sender (required for ctx.sender() in contract)
        txb.setSender(playerAddress);
        console.log('👤 [BADGE MINT] Transaction sender set:', playerAddress);
        console.log('   (This will be used as ctx.sender() in mint_badge function)');
        
        // Set gas budget
        txb.setGasBudget(Number(GAS_BUDGET_MIST));
        console.log('⛽ [BADGE MINT] Gas budget set:', `${Number(GAS_BUDGET_MIST) / 1_000_000_000} SUI`);
        
        console.log('✅ [BADGE MINT] Transaction built successfully');
        console.log('📝 [BADGE MINT] Final Transaction Summary:', {
          sender: playerAddress,
          gasBudget: `${Number(GAS_BUDGET_MIST) / 1_000_000_000} SUI`,
          moveCall: moveCallTarget,
          paymentAmount: `${Number(feeAmount) / 1_000_000_000} SUI`,
          imageUrl: imageUrl,
          willExecute: 'mint_badge function will create and transfer badge to player',
        });
        console.log('🔨 [BADGE MINT] ========== TRANSACTION BUILD COMPLETE ==========');
        
        return {
          success: true,
          transaction: txb,
        };
      } catch (error) {
        console.error('❌ [BADGE MINT] Error building transaction:', error);
        console.error('❌ [BADGE MINT] Error stack:', error.stack);
        return {
          success: false,
          error: error.message || 'Failed to build badge mint transaction',
        };
      }
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
    'window.surfWallet': typeof window.surfWallet !== 'undefined',
    'window.surf': typeof window.surf !== 'undefined',
    'window.ethosWallet': typeof window.ethosWallet !== 'undefined',
    'window.okxWallet': typeof window.okxWallet !== 'undefined',
    'window.okx': typeof window.okx !== 'undefined',
    'window.suiet': typeof window.suiet !== 'undefined',
    'window.klever': typeof window.klever !== 'undefined',
    'window.phantom': typeof window.phantom !== 'undefined',
    'window.phantom?.sui': typeof window.phantom?.sui !== 'undefined',
    'window.trustwallet': typeof window.trustwallet !== 'undefined',
    'window.coinbaseWallet': typeof window.coinbaseWallet !== 'undefined',
    'window.coinbase': typeof window.coinbase !== 'undefined',
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
      console.warn('⚠️ No wallets detected after waiting. Possible reasons:');
      console.warn('  1. No wallet extension installed');
      console.warn('  2. Wallet extension not compatible with @mysten/dapp-kit');
      console.warn('  3. Wallet extension needs page refresh after installation');
      console.warn('  Supported wallets: Sui Wallet, Slush Wallet, Surf Wallet, Suiet, Ethos Wallet, OKX Wallet, Phantom Wallet, Klever Wallet, Trust Wallet, Coinbase Wallet, or any wallet supporting Sui via Wallet Standard API');
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
