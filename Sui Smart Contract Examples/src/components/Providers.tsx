'use client';

import React from 'react';
import { SuiClientProvider, WalletProvider as SuiWalletProvider } from '@mysten/dapp-kit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WalletProvider } from '@/contexts/WalletContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ErrorBoundary } from './ErrorBoundary';

// Create a QueryClient instance
const queryClient = new QueryClient();

interface ProvidersProps {
  children: React.ReactNode;
}

export const Providers: React.FC<ProvidersProps> = ({ children }) => {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <SuiClientProvider 
          networks={{ 
            testnet: { 
              url: 'https://fullnode.testnet.sui.io:443' 
            } 
          }} 
          defaultNetwork="testnet"
        >
          <SuiWalletProvider 
            autoConnect={false}
            preferredWallets={['Sui Wallet', 'Ethos Wallet', 'OKX Wallet', 'Suiet']}
          >
            <WalletProvider>
              <ThemeProvider>
                {children}
              </ThemeProvider>
            </WalletProvider>
          </SuiWalletProvider>
        </SuiClientProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};