'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useWallets, useSuiClient, useCurrentWallet, useConnectWallet, useDisconnectWallet } from '@mysten/dapp-kit';

interface WalletContextType {
  isConnected: boolean;
  accountAddress: string | null;
  network: string;
  balance: string | null;
  isLoading: boolean;
  refreshBalance: () => Promise<void>;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

interface WalletProviderProps {
  children: ReactNode;
}

export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  const wallets = useWallets();
  const currentWallet = useCurrentWallet();
  const connectWallet = useConnectWallet();
  const disconnectWallet = useDisconnectWallet();
  const suiClient = useSuiClient();
  const [balance, setBalance] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasManuallyConnected, setHasManuallyConnected] = useState(false);

  // Debug wallet connection state
  React.useEffect(() => {
    console.log('🔍 Wallet connection state:', {
      wallets: wallets?.map(w => ({ id: w.id, name: w.name })),
      currentWallet: currentWallet,
      isConnected: currentWallet?.isConnected,
      connectionStatus: currentWallet?.connectionStatus,
      accountAddress: currentWallet?.currentWallet?.accounts?.[0]?.address,
      hasManuallyConnected
    });
  }, [wallets, currentWallet, hasManuallyConnected]);

  const isConnected = currentWallet?.isConnected || false;
  const accountAddress = currentWallet?.currentWallet?.accounts?.[0]?.address || null;

  // Connect to wallet
  const connect = async () => {
    if (!wallets || wallets.length === 0) return;
    
    try {
      setIsLoading(true);
      await connectWallet.mutateAsync({ wallet: wallets[0] });
      
      // Mark that user has manually connected (persist this fact)
      setHasManuallyConnected(true);
      localStorage.setItem('insomnia-wallet-was-connected', 'true');
      console.log('✅ Wallet connected manually, persistence set');
    } catch (error) {
      console.error('Wallet connection failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Disconnect wallet
  const disconnect = async () => {
    try {
      await disconnectWallet.mutateAsync();
      
      // Clear persistence when user manually disconnects
      setHasManuallyConnected(false);
      localStorage.removeItem('insomnia-wallet-was-connected');
      console.log('✅ Wallet disconnected manually, persistence cleared');
    } catch (error) {
      console.error('Wallet disconnect failed:', error);
    }
  };

  // Refresh balance
  const refreshBalance = useCallback(async () => {
    if (!accountAddress || !suiClient) {
      setBalance(null);
      return;
    }
    
    try {
      const balance = await suiClient.getBalance({
        owner: accountAddress,
        coinType: '0x2::sui::SUI'
      });
      
      const balanceInSui = (Number(balance.totalBalance) / 1_000_000_000).toFixed(4);
      setBalance(balanceInSui);
    } catch (error) {
      console.error('Failed to fetch balance:', error);
      setBalance(null);
    }
  }, [accountAddress, suiClient]);

  // Update balance when account changes
  React.useEffect(() => {
    if (isConnected && accountAddress) {
      refreshBalance();
    } else {
      setBalance(null);
    }
  }, [isConnected, accountAddress, refreshBalance]);

  // Check if user has manually connected before (survives Fast Refresh)
  React.useEffect(() => {
    const wasConnected = localStorage.getItem('insomnia-wallet-was-connected');
    if (wasConnected === 'true') {
      setHasManuallyConnected(true);
      console.log('🔍 Wallet was previously connected, attempting to restore...');
    }
  }, []);

  // Auto-reconnect if user has manually connected before and wallet is available
  React.useEffect(() => {
    if (hasManuallyConnected && wallets && wallets.length > 0 && !isConnected) {
      console.log('🔄 Auto-reconnecting to previously connected wallet...');
      
      // Small delay to ensure wallet extension is fully ready
      const timer = setTimeout(async () => {
        try {
          await connectWallet.mutateAsync({ wallet: wallets[0] });
          console.log('✅ Auto-reconnection successful');
        } catch (error) {
          console.log('⚠️ Auto-reconnection failed, user may need to reconnect manually:', error);
          // Clear persistence if auto-reconnection fails
          setHasManuallyConnected(false);
          localStorage.removeItem('insomnia-wallet-was-connected');
        }
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [hasManuallyConnected, wallets, isConnected, connectWallet]);

  const value: WalletContextType = {
    isConnected,
    accountAddress,
    network: 'Testnet',
    balance,
    isLoading,
    refreshBalance,
    connect,
    disconnect,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};
