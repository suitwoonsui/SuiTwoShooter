'use client';

import React from 'react';
import { SuiClientProvider, WalletProvider as SuiWalletProvider } from '@mysten/dapp-kit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { networkConfig } from '@/lib/networkConfig';
import { WalletProvider } from '@/contexts/WalletContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { GameModeProvider } from '@/contexts/GameModeContext';
import { BlockchainProvider } from '@/contexts/BlockchainContext';
import { GamePassProvider } from '@/contexts/GamePassContext';
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
        <SuiClientProvider networks={networkConfig.networks} defaultNetwork={networkConfig.defaultNetwork}>
          <SuiWalletProvider 
            autoConnect={false}
            preferredWallets={['Sui Wallet', 'Ethos Wallet', 'OKX Wallet', 'Suiet']}
          >
            <WalletProvider>
              <BlockchainProvider defaultNetwork="testnet">
                <GamePassProvider>
                  <ThemeProvider>
                    <GameModeProvider>
                      {children}
                    </GameModeProvider>
                  </ThemeProvider>
                </GamePassProvider>
              </BlockchainProvider>
            </WalletProvider>
          </SuiWalletProvider>
        </SuiClientProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};
