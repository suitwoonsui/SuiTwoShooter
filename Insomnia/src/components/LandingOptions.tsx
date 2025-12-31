'use client';

import React from 'react';
import Link from 'next/link';
import { useWallet } from '@/contexts/WalletContext';

export const LandingOptions: React.FC = () => {
  const { isConnected, connect } = useWallet();

  const handleConnectWallet = async () => {
    try {
      await connect();
    } catch (error) {
      console.error('Wallet connect failed:', error);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="flex flex-col items-center justify-center p-4">
        <p className="text-center mb-6 text-[var(--color-text-secondary)]">
          Choose your gaming experience
        </p>
        
        {/* Free Demo Option */}
        <div className="w-full p-4 bg-[var(--color-background-secondary)]/50 border border-[var(--color-border)] rounded-xl mb-4">
          <h2 className="text-lg font-bold text-[var(--color-accent1)] mb-2 text-center">🎮 Free Demo</h2>
          <div className="space-y-1 text-xs text-[var(--color-text-secondary)] mb-3 text-center">
            <div>• Full game experience</div>
            <div>• Score display at game end</div>
            <div>• No data persistence</div>
            <div>• No wallet required</div>
          </div>
          <div className="flex justify-center">
            <Link 
              href="/game?mode=demo"
              className="py-3 px-6 bg-[var(--color-accent1)] hover:bg-[var(--color-accent1)]/80 text-[var(--color-background)] font-bold rounded-lg transition-all duration-200 hover:scale-105 shadow-lg border-2 border-[var(--color-accent1)] hover:border-[var(--color-accent1)]/80 max-w-xs text-center block"
            >
              🆓 Play Free Demo
            </Link>
          </div>
        </div>

        {/* Premium Option */}
        <div className="w-full p-4 bg-[var(--color-background-secondary)]/30 border border-[var(--color-accent2)]/50 rounded-xl">
          <h2 className="text-lg font-bold text-[var(--color-accent2)] mb-2 text-center">💎 Premium Features</h2>
          <div className="space-y-1 text-xs text-[var(--color-text-secondary)] mb-3 text-center">
            <div>• Global leaderboards</div>
            <div>• Achievement tracking</div>
            <div>• Blockchain rewards</div>
            <div>• Tournament entry</div>
          </div>
          <div className="flex justify-center">
            {isConnected ? (
              <Link 
                href="/game"
                className="py-3 px-6 bg-[var(--color-accent2)] hover:bg-[var(--color-accent2)]/80 text-[var(--color-background)] font-bold rounded-lg transition-all duration-200 hover:scale-105 shadow-lg border-2 border-[var(--color-accent2)] hover:border-[var(--color-accent2)]/80 max-w-xs text-center block"
              >
                💎 Play Premium
              </Link>
            ) : (
              <Link 
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  handleConnectWallet();
                }}
                className="py-3 px-6 bg-[var(--color-accent2)] hover:bg-[var(--color-accent2)]/80 text-[var(--color-background)] font-bold rounded-lg transition-all duration-200 hover:scale-105 shadow-lg border-2 border-[var(--color-accent2)] hover:border-[var(--color-accent2)]/80 max-w-xs text-center block"
              >
                🔗 Connect Wallet
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
