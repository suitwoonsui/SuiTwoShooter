'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Wallet, Crown, User } from 'lucide-react';
import { useWallet } from '@/contexts/WalletContext';
import { useGamePass } from '@/contexts/GamePassContext';
import { useGameMode } from '@/contexts/GameModeContext';
import { ThemeToggle } from './ThemeToggle';
import { GamePassPurchaseWithSuspense as GamePassPurchase } from './LazyComponents';
import { ProfileDropdown } from './ProfileDropdown';

export const Header: React.FC = () => {
  const { isConnected, accountAddress, balance, isLoading, connect, disconnect } = useWallet();
  const { 
    gamePass: gamePassStatus, 
    purchaseGamePass, 
    addGamesToPass: addGamesToExistingPass, 
    isLoading: isLoadingGamePass,
    refreshGamePass,
    error: gamePassError
  } = useGamePass();
  const { forceDemoMode, toggleGameMode } = useGameMode();
  const pathname = usePathname();
  const [showGamePassPurchase, setShowGamePassPurchase] = useState(false);

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
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

  const handleGamePassPurchase = useCallback(async (passType: string): Promise<boolean> => {
    if (!isConnected) {
      console.error('Wallet not connected for purchase');
      return false;
    }
    
    try {
      let success = false;
      
      if (gamePassStatus?.isActive) {
        // User has existing pass - add games to it
        console.log('➕ Adding games to existing pass');
        
        // Calculate how many games to add based on pass type
        const gamesToAdd = passType === 'basic' ? 10 : passType === 'premium' ? 50 : 999999;
        
        success = await addGamesToExistingPass(passType as 'basic' | 'premium' | 'unlimited', gamesToAdd);
        
        if (success) {
          console.log('✅ Games added to existing pass successfully');
        } else {
          console.error('❌ Failed to add games to existing pass');
        }
      } else {
        // User doesn't have a pass - purchase new one
        console.log('🆕 Purchasing new game pass');
        
        success = await purchaseGamePass(passType as 'basic' | 'premium' | 'unlimited');
        
                    if (success) {
        console.log('✅ New game pass purchased successfully');
      } else {
        console.error('❌ Failed to purchase new game pass');
        if (gamePassError) {
          console.error('❌ Purchase error details:', gamePassError);
        }
      }
      }
      
      if (success) {
        setShowGamePassPurchase(false);
        // Refresh game pass status to show updated credits
        setTimeout(() => {
          refreshGamePass();
        }, 1000); // Small delay to ensure blockchain update
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error('Error processing game pass transaction:', error);
      return false;
    }
  }, [isConnected, purchaseGamePass, addGamesToExistingPass, gamePassStatus]);

  // Determine user tier status
  const getUserTierStatus = () => {
    if (!isConnected) return { tier: 'demo', label: 'Demo Mode', icon: User, color: 'text-[var(--color-accent3)]' };
    if (forceDemoMode) return { tier: 'demo', label: 'Demo Mode', icon: User, color: 'text-[var(--color-accent3)]' };
    if (gamePassStatus && gamePassStatus.isActive) {
      if (gamePassStatus.passType === 'unlimited') return { tier: 'unlimited', label: 'Unlimited', icon: Crown, color: 'text-yellow-400' };
      if (gamePassStatus.passType === 'premium') return { tier: 'premium', label: 'Premium', icon: Crown, color: 'text-[var(--color-accent1)]' };
      return { tier: 'basic', label: 'Basic', icon: Crown, color: 'text-[var(--color-accent2)]' };
    }
    return { tier: 'free', label: 'Free Tier', icon: User, color: 'text-[var(--color-text-secondary)]' };
  };

  const tierStatus = getUserTierStatus();
  const TierIcon = tierStatus.icon;

  return (
    <header className="
      w-full bg-[var(--color-background)] bg-opacity-90 backdrop-blur-md
      border-b border-[var(--color-border)] border-opacity-30
      sticky top-0 z-50
    ">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Navigation */}
          <div className="flex items-center space-x-8">
            <Link 
              href="/" 
              className="flex items-center space-x-2 text-[var(--color-accent1)] hover:text-[var(--color-accent2)] transition-colors duration-200"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-[var(--color-accent1)] to-[var(--color-accent2)] rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">🎮</span>
              </div>
              <span className="text-xl font-bold">Insomnia</span>
            </Link>
            
            {/* Menu Dropdown */}
            <ProfileDropdown />
            
            <nav className="hidden md:flex items-center space-x-8">
              <Link 
                href="/" 
                className="text-[var(--color-text-secondary)] hover:text-[var(--color-accent1)] transition-colors duration-200 font-medium"
              >
                Home
              </Link>
              <Link 
                href="/game" 
                className="text-[var(--color-text-secondary)] hover:text-[var(--color-accent1)] transition-colors duration-200 font-medium"
              >
                Play Game
              </Link>
            </nav>
          </div>

          {/* Right Section: Status Toggle, Credits, Theme, Wallet */}
          <div className="flex items-center space-x-6">
            {/* User Tier Status - Clickable for Mode Toggle */}
            {isConnected && pathname === '/game' && (
              <div
                onClick={toggleGameMode}
                className="
                  flex items-center space-x-2 text-sm
                  cursor-pointer
                "
                title={forceDemoMode ? 'Click to switch to Premium Mode' : 'Click to switch to Demo Mode'}
              >
                <TierIcon className={`w-4 h-4 ${tierStatus.color}`} />
                <span className={`${tierStatus.color}`}>{tierStatus.label}</span>
              </div>
            )}
            
            {/* Divider */}
            {isConnected && pathname === '/game' && (
              <div className="w-px h-6 bg-[var(--color-border)] bg-opacity-30"></div>
            )}
            
            {/* Game Pass Credits - Show when connected and has active pass */}
            {isConnected && gamePassStatus && gamePassStatus.isActive && (
              <div className="
                flex items-center px-3 py-2 
                bg-[var(--color-background-secondary)] bg-opacity-50
                border border-[var(--color-border)] border-opacity-30
                rounded-lg
                transition-all duration-200
              ">
                <div className="flex items-center space-x-1">
                  <span className="text-sm text-[var(--color-accent2)] font-medium">
                    {isLoadingGamePass ? (
                      <span className="inline-flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-[var(--color-accent2)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        ...
                      </span>
                    ) : (
                      gamePassStatus.gamesRemaining
                    )}
                  </span>
                  <span className="text-xs text-[var(--color-text-secondary)]">
                    {gamePassStatus.passType === 'unlimited' ? '∞' : 'credits'}
                  </span>
                </div>
                {/* Refresh button for manual updates */}
                <button
                  onClick={() => refreshGamePass()}
                  disabled={isLoadingGamePass}
                  className="
                    ml-2 p-1 text-[var(--color-text-secondary)] hover:text-[var(--color-accent1)]
                    transition-colors duration-200 disabled:opacity-50
                  "
                  title="Refresh credits"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
            )}
            
            {/* Divider */}
            {isConnected && gamePassStatus && gamePassStatus.isActive && (
              <div className="w-px h-6 bg-[var(--color-border)] bg-opacity-30"></div>
            )}
            
            {/* Game Pass Purchase Button - Show when connected but no active pass */}
            {isConnected && (!gamePassStatus || !gamePassStatus.isActive) && (
              <div className="flex flex-col space-y-2">
                <button
                  onClick={() => setShowGamePassPurchase(true)}
                  disabled={isLoadingGamePass}
                  className="
                    flex items-center space-x-2 px-3 py-2
                    bg-gradient-to-r from-[var(--color-accent1)] to-[var(--color-accent2)]
                    text-white font-medium rounded-lg shadow-md
                    transition-all duration-200 hover:scale-105 active:scale-95
                    hover:shadow-lg border border-[var(--color-accent1)] hover:border-[var(--color-accent2)]
                    disabled:opacity-50 disabled:cursor-not-allowed
                  "
                  title="Purchase Game Pass"
                >
                  {isLoadingGamePass ? (
                    <span className="flex items-center space-x-2">
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="text-sm">Processing...</span>
                    </span>
                  ) : (
                    <span className="text-sm">💎 Upgrade</span>
                  )}
                </button>
                
                {/* Error message display */}
                {gamePassError && (
                  <div className="text-xs text-red-400 bg-red-900 bg-opacity-20 px-2 py-1 rounded border border-red-500 border-opacity-30">
                    {gamePassError}
                  </div>
                )}
              </div>
            )}
            
            {/* Add More Games Button - Show when connected and has active pass */}
            {isConnected && gamePassStatus && gamePassStatus.isActive && (
              <button
                onClick={() => setShowGamePassPurchase(true)}
                disabled={isLoadingGamePass}
                className="
                  flex items-center space-x-2 px-3 py-2
                  bg-gradient-to-r from-[var(--color-accent2)] to-[var(--color-accent1)]
                  text-white font-medium rounded-lg shadow-md
                  transition-all duration-200 hover:scale-105 active:scale-95
                  hover:shadow-lg border border-[var(--color-accent2)] hover:border-[var(--color-accent1)]
                  disabled:opacity-50 disabled:cursor-not-allowed
                "
                title="Add More Games"
              >
                {isLoadingGamePass ? (
                  <span className="flex items-center space-x-2">
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="text-sm">Processing...</span>
                  </span>
                ) : (
                  <span className="text-sm">➕ Add Games</span>
                )}
              </button>
            )}
            
            {/* Divider */}
            {isConnected && (
              <div className="w-px h-6 bg-[var(--color-border)] bg-opacity-30"></div>
            )}
            
            {/* Theme Toggle */}
            <ThemeToggle />
            
            {/* Divider */}
            <div className="w-px h-6 bg-[var(--color-border)] bg-opacity-30"></div>
            
            {/* Network Status */}
            <div className="hidden sm:flex items-center space-x-2 text-sm px-3 py-2 bg-[var(--color-background-secondary)] bg-opacity-30 border border-[var(--color-border)] border-opacity-20 rounded-lg">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-[var(--color-text-secondary)]">Sui Testnet</span>
            </div>


            
            {/* Compact Wallet Connection */}
            {isConnected && accountAddress ? (
              <div className="flex items-center space-x-3" data-testid="wallet-connected-state">
                {/* Connected Button with Dropdown */}
                <div className="relative group">
                  <button className="
                    flex items-center space-x-2 bg-gradient-to-r from-[var(--color-accent1)] to-[var(--color-accent2)]
                    text-[var(--color-background)] font-medium py-2 px-4 rounded-lg shadow-md backdrop-blur-sm
                    transition-all duration-200 ease-out transform hover:scale-105 active:scale-95
                    hover:shadow-lg hover:from-[var(--color-accent2)] hover:to-[var(--color-accent1)]
                    border border-[var(--color-accent1)] hover:border-[var(--color-accent2)]
                  ">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-sm">Connected</span>
                  </button>
                  
                  {/* Dropdown Menu */}
                  <div className="
                    absolute right-0 top-full mt-2 w-48 bg-[var(--color-background-secondary)] 
                    border border-[var(--color-border)] rounded-lg shadow-lg opacity-0 invisible 
                    group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50
                  ">
                    <div className="p-3 border-b border-[var(--color-border)] border-opacity-30">
                      <div className="text-sm text-[var(--color-text-secondary)] font-mono">
                        {formatAddress(accountAddress)}
                      </div>
                      <div className="text-sm text-[var(--color-text-secondary)] mt-1">
                        {isLoading ? '...' : balance ? `${balance} SUI` : '0 SUI'}
                      </div>
                    </div>
                    <button
                      onClick={handleDisconnect}
                      className="
                        w-full text-left px-3 py-2 text-sm text-[var(--color-accent2)] hover:text-[var(--color-accent1)]
                        hover:bg-[var(--color-accent1)] hover:bg-opacity-10 transition-colors
                        rounded-b-lg
                      "
                    >
                      Disconnect
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button
                onClick={handleConnect}
                disabled={isLoading}
                className="
                  flex items-center space-x-2 bg-gradient-to-r from-[var(--color-accent1)] to-[var(--color-accent2)]
                  text-[var(--color-background)] font-medium py-2 px-4 rounded-lg shadow-md backdrop-blur-sm
                  transition-all duration-200 ease-out transform hover:scale-105 active:scale-95
                  hover:shadow-lg hover:from-[var(--color-accent2)] hover:to-[var(--color-accent1)]
                  border border-[var(--color-accent1)] hover:border-[var(--color-accent2)]
                  disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
                "
                data-testid="wallet-connect-button"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="text-sm">Connecting...</span>
                  </>
                ) : (
                  <>
                    <Wallet className="w-4 h-4 text-[var(--color-accent3)]" />
                    <span className="text-sm">Connect</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Game Pass Purchase Modal */}
      {showGamePassPurchase && (
        <GamePassPurchase
          onPurchase={handleGamePassPurchase}
          onClose={() => setShowGamePassPurchase(false)}
          isLoading={isLoadingGamePass}
          existingGamePass={gamePassStatus}
        />
      )}
    </header>
  );
};
