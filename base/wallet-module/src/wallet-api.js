/**
 * Wallet Connection API for Vanilla JS
 * Bundles @mysten/dapp-kit and exposes a simple API
 */

import { SuiClientProvider, WalletProvider, useWallets, useConnectWallet, useCurrentAccount, useDisconnectWallet } from '@mysten/dapp-kit';
import { getFullnodeUrl } from '@mysten/sui/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';

// QueryClient instance
const queryClient = new QueryClient();

// Wallet API state
let walletAPIState = {
  connected: false,
  address: null,
  wallets: [],
  currentWallet: null,
  listeners: []
};

// Wallet API instance
let walletAPI = null;

/**
 * Wallet Hook Component - bridges React hooks to vanilla JS API
 */
function WalletHookBridge({ onUpdate }) {
  const wallets = useWallets();
  const { mutate: connectWallet } = useConnectWallet();
  const { mutate: disconnectWallet } = useDisconnectWallet();
  const currentAccount = useCurrentAccount();
  
  useEffect(() => {
    walletAPIState.wallets = wallets.all || [];
    walletAPIState.connected = !!currentAccount;
    walletAPIState.address = currentAccount?.address || null;
    walletAPIState.currentWallet = currentAccount?.wallet || null;
    
    // Store connect/disconnect functions
    walletAPIState._connect = connectWallet;
    walletAPIState._disconnect = disconnectWallet;
    
    if (onUpdate) {
      onUpdate({
        connected: walletAPIState.connected,
        address: walletAPIState.address,
        wallets: walletAPIState.wallets
      });
    }
    
    // Notify listeners
    walletAPIState.listeners.forEach(listener => {
      listener({
        type: walletAPIState.connected ? 'connected' : 'disconnected',
        address: walletAPIState.address
      });
    });
  }, [wallets, currentAccount, connectWallet, disconnectWallet, onUpdate]);
  
  return null;
}

/**
 * Wallet Provider Component
 */
function WalletProviderWrapper({ children, network, onUpdate }) {
  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider 
        networks={{ 
          mainnet: { url: getFullnodeUrl('mainnet') },
          testnet: { url: getFullnodeUrl('testnet') }
        }} 
        defaultNetwork={network || 'mainnet'}
      >
        <WalletProvider autoConnect={false}>
          <WalletHookBridge onUpdate={onUpdate} />
          {children}
        </WalletProvider>
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
  
  // Render wallet provider
  root.render(
    React.createElement(WalletProviderWrapper, {
      network,
      onUpdate: (state) => {
        walletAPIState = { ...walletAPIState, ...state };
      }
    })
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
    
    // Connect wallet
    async connect(walletName) {
      if (!walletAPIState._connect) {
        throw new Error('Wallet API not initialized');
      }
      
      const wallets = walletAPIState.wallets;
      const wallet = wallets.find(w => 
        w.name === walletName || 
        w.name.toLowerCase().includes('slush') ||
        w.name.toLowerCase().includes('sui') ||
        (walletName === undefined && wallets.length > 0)
      );
      
      if (!wallet) {
        throw new Error(`Wallet not found: ${walletName || 'no wallets available'}`);
      }
      
      return new Promise((resolve, reject) => {
        walletAPIState._connect(
          { wallet },
          {
            onSuccess: () => {
              // Wait for state update
              setTimeout(() => {
                resolve({
                  success: true,
                  address: walletAPIState.address,
                  wallet: wallet.name
                });
              }, 100);
            },
            onError: (error) => {
              reject(error);
            }
          }
        );
      });
    },
    
    // Disconnect wallet
    async disconnect() {
      if (!walletAPIState._disconnect) {
        throw new Error('Wallet API not initialized');
      }
      
      return new Promise((resolve, reject) => {
        walletAPIState._disconnect(undefined, {
          onSuccess: () => {
            resolve({ success: true });
          },
          onError: (error) => {
            reject(error);
          }
        });
      });
    },
    
    // Format address
    formatAddress(address) {
      if (!address) return '';
      return `${address.slice(0, 6)}...${address.slice(-4)}`;
    },
    
    // Add event listener
    on(eventType, callback) {
      walletAPIState.listeners.push(callback);
      return () => {
        const index = walletAPIState.listeners.indexOf(callback);
        if (index > -1) {
          walletAPIState.listeners.splice(index, 1);
        }
      };
    },
    
    // Remove event listener
    off(callback) {
      const index = walletAPIState.listeners.indexOf(callback);
      if (index > -1) {
        walletAPIState.listeners.splice(index, 1);
      }
    }
  };
  
  // Wait a bit for initialization
  await new Promise(resolve => setTimeout(resolve, 100));
  
  return walletAPI;
}

// Export for browser
if (typeof window !== 'undefined') {
  window.WalletAPI = {
    initialize: initializeWalletAPI
  };
}
