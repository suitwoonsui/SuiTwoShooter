'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useSuiClient, useCurrentAccount, useConnectWallet, useDisconnectWallet } from '@mysten/dapp-kit';

interface WalletContextType {
  isConnected: boolean;
  accountAddress: string | null;
  balance: string;
  isLoading: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  error: string | null;
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
  const client = useSuiClient();
  const currentAccount = useCurrentAccount();
  const { mutate: connectWallet } = useConnectWallet();
  const { mutate: disconnectWallet } = useDisconnectWallet();
  
  const [balance, setBalance] = useState<string>('0');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await connectWallet();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect wallet');
    } finally {
      setIsLoading(false);
    }
  };

  const disconnect = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await disconnectWallet();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect wallet');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch balance when account changes
  React.useEffect(() => {
    if (currentAccount?.address) {
      client.getBalance({
        owner: currentAccount.address,
        coinType: '0x2::sui::SUI'
      }).then(result => {
        setBalance(result.totalBalance);
      }).catch(err => {
        console.error('Failed to fetch balance:', err);
      });
    }
  }, [currentAccount?.address, client]);

  const value: WalletContextType = {
    isConnected: !!currentAccount,
    accountAddress: currentAccount?.address || null,
    balance,
    isLoading,
    connect,
    disconnect,
    error
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};