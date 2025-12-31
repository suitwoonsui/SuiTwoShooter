'use client';

import React from 'react';
import { User, Wallet, Crown, LogOut, Copy, ExternalLink } from 'lucide-react';
import { useWallet } from '@/contexts/WalletContext';
import { useGamePass } from '@/contexts/GamePassContext';
import { useGameMode } from '@/contexts/GameModeContext';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { isConnected, accountAddress, balance, disconnect } = useWallet();
  const { gamePass: gamePassStatus } = useGamePass();
  const { forceDemoMode } = useGameMode();

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const copyAddress = async () => {
    if (accountAddress) {
      try {
        await navigator.clipboard.writeText(accountAddress);
        // You could add a toast notification here
      } catch (error) {
        console.error('Failed to copy address:', error);
      }
    }
  };

  const getUserTierStatus = () => {
    if (!isConnected) return { tier: 'demo', label: 'Demo Mode', icon: User, color: 'text-[var(--color-accent3)]' };
    if (forceDemoMode) return { tier: 'demo', label: 'Demo Mode', icon: User, color: 'text-[var(--color-accent3)]' };
    if (gamePassStatus && gamePassStatus.isActive) {
      if (gamePassStatus.passType === 'unlimited') return { tier: 'unlimited', label: 'Unlimited', icon: Crown, color: 'text-[var(--color-accent3)]' };
      if (gamePassStatus.passType === 'premium') return { tier: 'premium', label: 'Premium', icon: Crown, color: 'text-[var(--color-accent1)]' };
      return { tier: 'basic', label: 'Basic', icon: Crown, color: 'text-[var(--color-accent2)]' };
    }
    return { tier: 'free', label: 'Free Tier', icon: User, color: 'text-[var(--color-text-secondary)]' };
  };

  const tierStatus = getUserTierStatus();
  const TierIcon = tierStatus.icon;

  if (!isOpen) return null;

    return (
    <div 
      className="fixed inset-0 z-[10000] bg-black bg-opacity-50 backdrop-blur-sm"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
      onClick={onClose}
    >
      {/* Modal */}
      <div 
        className="absolute border border-[var(--color-border)] rounded-xl overflow-hidden shadow-2xl"
        style={{ 
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '90%',
          maxWidth: '400px',
          backgroundColor: 'var(--color-background)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="
          flex items-center justify-between p-6
          border-b border-[var(--color-border)] border-opacity-30
        ">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[var(--color-accent1)] to-[var(--color-accent2)] rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-[var(--color-background)]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Profile</h2>
              <p className="text-sm text-[var(--color-text-secondary)]">Account Information</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="
              p-2 text-[var(--color-text-secondary)] hover:text-[var(--color-accent1)]
              transition-colors duration-200 rounded-lg hover:bg-[var(--color-background-secondary)]
            "
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Wallet Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-[var(--color-text-secondary)] uppercase tracking-wide">
              Wallet
            </h3>
            
            {/* Address */}
            <div className="
              p-4 bg-[var(--color-background-secondary)] bg-opacity-50
              border border-[var(--color-border)] border-opacity-30 rounded-lg
            ">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Wallet className="w-4 h-4 text-[var(--color-accent2)]" />
                  <span className="text-sm text-[var(--color-text-secondary)]">Address</span>
                </div>
                <button
                  onClick={copyAddress}
                  className="p-1 text-[var(--color-text-secondary)] hover:text-[var(--color-accent1)] transition-colors"
                  title="Copy address"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              <div className="mt-2">
                <span className="font-mono text-sm text-[var(--color-text-primary)]">
                  {accountAddress ? formatAddress(accountAddress) : 'Not connected'}
                </span>
              </div>
            </div>

            {/* Balance */}
            <div className="
              p-4 bg-[var(--color-background-secondary)] bg-opacity-50
              border border-[var(--color-border)] border-opacity-30 rounded-lg
            ">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-sm text-[var(--color-text-secondary)]">Balance</span>
              </div>
              <div className="mt-2">
                <span className="text-lg font-semibold text-[var(--color-text-primary)]">
                  {balance ? `${balance} SUI` : '0 SUI'}
                </span>
              </div>
            </div>

            {/* Network */}
            <div className="
              p-4 bg-[var(--color-background-secondary)] bg-opacity-50
              border border-[var(--color-border)] border-opacity-30 rounded-lg
            ">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <span className="text-sm text-[var(--color-text-secondary)]">Network</span>
              </div>
              <div className="mt-2">
                <span className="text-sm text-[var(--color-text-primary)]">Sui Testnet</span>
              </div>
            </div>
          </div>

          {/* Game Pass Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-[var(--color-text-secondary)] uppercase tracking-wide">
              Game Pass
            </h3>
            
            <div className="
              p-4 bg-[var(--color-background-secondary)] bg-opacity-50
              border border-[var(--color-border)] border-opacity-30 rounded-lg
            ">
              <div className="flex items-center space-x-3">
                <TierIcon className={`w-5 h-5 ${tierStatus.color}`} />
                <div>
                  <span className="text-sm text-[var(--color-text-secondary)]">Status</span>
                  <div className="text-lg font-semibold text-[var(--color-text-primary)]">
                    {tierStatus.label}
                  </div>
                </div>
              </div>
              
              {gamePassStatus && gamePassStatus.isActive && (
                <div className="mt-3 pt-3 border-t border-[var(--color-border)] border-opacity-30">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[var(--color-text-secondary)]">Credits Remaining</span>
                    <span className="text-sm font-medium text-[var(--color-accent2)]">
                      {gamePassStatus.gamesRemaining}
                      {gamePassStatus.passType === 'unlimited' && '∞'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={disconnect}
              className="
                w-full flex items-center justify-center space-x-2 px-4 py-3
                bg-gradient-to-r from-red-500 to-red-600
                text-white font-medium rounded-lg
                transition-all duration-200 hover:scale-105 active:scale-95
                hover:from-red-600 hover:to-red-700
                hover:shadow-[0_0_15px_rgba(239,68,68,0.5)]
              "
            >
              <LogOut className="w-4 h-4" />
              <span>Disconnect Wallet</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
