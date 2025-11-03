'use client';

import React, { useState } from 'react';
import { useWallet } from '@/contexts/WalletContext';

export const WalletConnection: React.FC = () => {
  const { isConnected, accountAddress, balance, isLoading, connect, disconnect, error } = useWallet();

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatBalance = (balance: string) => {
    const suiBalance = parseInt(balance) / 1_000_000_000; // Convert MIST to SUI
    return suiBalance.toFixed(4);
  };

  if (isConnected && accountAddress) {
    return (
      <div className="wallet-connected bg-[var(--color-surface)] p-6 rounded-lg border border-[var(--color-border)]">
        <div className="flex items-center justify-between">
          <div className="wallet-info">
            <div className="flex items-center gap-4">
              <div className="address">
                <span className="text-[var(--color-text-secondary)] text-sm">Address:</span>
                <span className="text-[var(--color-text)] font-mono ml-2">{formatAddress(accountAddress)}</span>
              </div>
              <div className="balance">
                <span className="text-[var(--color-text-secondary)] text-sm">Balance:</span>
                <span className="text-[var(--color-accent1)] font-bold ml-2">{formatBalance(balance)} SUI</span>
              </div>
            </div>
          </div>
          <button 
            onClick={disconnect}
            disabled={isLoading}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            {isLoading ? 'Disconnecting...' : 'Disconnect'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="wallet-connection bg-[var(--color-surface)] p-6 rounded-lg border border-[var(--color-border)]">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-[var(--color-text)] mb-4">Connect Your Wallet</h2>
        <p className="text-[var(--color-text-secondary)] mb-6">
          Connect your Sui wallet to interact with smart contracts and explore the examples.
        </p>
        <button 
          onClick={connect}
          disabled={isLoading}
          className="px-6 py-3 bg-[var(--color-accent1)] text-white rounded-lg hover:bg-[var(--color-accent1)]/80 disabled:opacity-50 font-medium"
        >
          {isLoading ? 'Connecting...' : 'Connect Wallet'}
        </button>
        {error && (
          <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            Error: {error}
          </div>
        )}
      </div>
    </div>
  );
};
