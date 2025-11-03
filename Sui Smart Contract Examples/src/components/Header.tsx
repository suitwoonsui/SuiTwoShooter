'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Wallet, User } from 'lucide-react';
import { useWallet } from '@/contexts/WalletContext';
import { ThemeToggle } from './ThemeToggle';
import { ProfileDropdown } from './ProfileDropdown';

export const Header: React.FC = () => {
  const { isConnected, accountAddress, balance, isLoading, connect, disconnect } = useWallet();
  const pathname = usePathname();

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatBalance = (balance: string) => {
    const suiBalance = parseInt(balance) / 1_000_000_000; // Convert MIST to SUI
    return suiBalance.toFixed(4);
  };

  const handleConnect = async () => {
    try {
      await connect();
    } catch (error) {
      console.error('Wallet connect failed:', error);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
    } catch (error) {
      console.error('Wallet disconnect failed:', error);
    }
  };

  return (
    <header className="w-full bg-[var(--color-surface)] border-b border-[var(--color-border)] sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo and Navigation */}
          <div className="flex items-center space-x-8">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-[var(--color-accent1)] to-[var(--color-accent2)] rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">S</span>
              </div>
              <span className="text-xl font-bold text-[var(--color-text)]">Sui Examples</span>
            </Link>
            
            <nav className="hidden md:flex items-center space-x-6">
              <Link 
                href="/contracts/examples/session-management" 
                className={`text-sm font-medium transition-colors ${
                  pathname.includes('session-management') 
                    ? 'text-[var(--color-accent1)]' 
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
                }`}
              >
                Process Management
              </Link>
              <Link 
                href="/contracts/examples/statistics-system" 
                className={`text-sm font-medium transition-colors ${
                  pathname.includes('statistics-system') 
                    ? 'text-[var(--color-accent2)]' 
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
                }`}
              >
                Data Analytics
              </Link>
              <Link 
                href="/contracts/examples/admin-controls" 
                className={`text-sm font-medium transition-colors ${
                  pathname.includes('admin-controls') 
                    ? 'text-[var(--color-accent3)]' 
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
                }`}
              >
                System Administration
              </Link>
              <Link 
                href="/contracts/examples/nft-payments" 
                className={`text-sm font-medium transition-colors ${
                  pathname.includes('nft-payments') 
                    ? 'text-[var(--color-accent1)]' 
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
                }`}
              >
                Payment System
              </Link>
            </nav>
          </div>

          {/* Wallet Connection and User Actions */}
          <div className="flex items-center space-x-4">
            <ThemeToggle />
            
            {isConnected && accountAddress ? (
              <div className="flex items-center space-x-3">
                {/* Balance Display */}
                <div className="hidden sm:flex items-center space-x-2 px-3 py-2 bg-[var(--color-background)] rounded-lg">
                  <span className="text-xs text-[var(--color-text-secondary)]">Balance:</span>
                  <span className="text-sm font-medium text-[var(--color-accent1)]">
                    {formatBalance(balance)} SUI
                  </span>
                </div>

                {/* Address Display */}
                <div className="flex items-center space-x-2 px-3 py-2 bg-[var(--color-background)] rounded-lg">
                  <User className="w-4 h-4 text-[var(--color-text-secondary)]" />
                  <span className="text-sm font-mono text-[var(--color-text)]">
                    {formatAddress(accountAddress)}
                  </span>
                </div>

                {/* Profile Dropdown */}
                <ProfileDropdown 
                  accountAddress={accountAddress}
                  balance={balance}
                  onDisconnect={handleDisconnect}
                />
              </div>
            ) : (
              <button
                onClick={handleConnect}
                disabled={isLoading}
                className="flex items-center space-x-2 px-4 py-2 bg-[var(--color-accent1)] text-white rounded-lg hover:bg-[var(--color-accent1)]/80 disabled:opacity-50 transition-colors"
              >
                <Wallet className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {isLoading ? 'Connecting...' : 'Connect Wallet'}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};