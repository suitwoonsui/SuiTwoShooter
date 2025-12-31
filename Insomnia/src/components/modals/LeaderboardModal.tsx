'use client';

import React from 'react';
import { Trophy, Users, TrendingUp, RefreshCw } from 'lucide-react';
import { Leaderboard } from '@/components/Leaderboard';

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({ isOpen, onClose }) => {
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
          maxWidth: '896px',
          maxHeight: '90vh',
          overflowY: 'auto',
          backgroundColor: 'var(--color-background)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="
          flex items-center justify-between p-6
          border-b border-[var(--color-border)] border-opacity-30
          sticky top-0 bg-[var(--color-background)] bg-opacity-95 backdrop-blur-md
        ">
          {/* Left side - empty for balance */}
          <div className="w-16"></div>
          
          {/* Center - Title */}
          <div className="flex items-center justify-center">
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Leaderboard</h2>
          </div>
          
          {/* Right side - Buttons */}
          <div className="flex items-center space-x-2 w-16">
            <button
              onClick={() => {
                // Trigger refresh in the Leaderboard component
                window.dispatchEvent(new CustomEvent('leaderboard-refresh'));
              }}
              className="
                p-2 text-[var(--color-text-secondary)] hover:text-[var(--color-accent1)]
                transition-colors duration-200 rounded-lg hover:bg-[var(--color-background-secondary)]
              "
              title="Refresh Leaderboard"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            
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
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Leaderboard Component */}
          <div className="
            bg-[var(--color-background-secondary)] bg-opacity-30
            border border-[var(--color-border)] border-opacity-20 rounded-lg
            overflow-hidden
          ">
            <Leaderboard />
          </div>

          {/* Additional Info */}
          <div className="mt-6 p-4 bg-gradient-to-r from-[var(--color-accent1)] to-[var(--color-accent2)] border border-[var(--color-accent1)] border-opacity-30 rounded-lg shadow-[0_0_15px_var(--color-glow)]">
            <div className="flex items-start space-x-3">
              <TrendingUp className="w-5 h-5 text-[var(--color-background)] mt-0.5" />
              <div>
                <h4 className="font-medium text-[var(--color-background)] mb-2">How Rankings Work</h4>
                <ul className="text-sm text-[var(--color-background)] space-y-1">
                  <li>• Scores are based on clicks, time survived, and efficiency</li>
                  <li>• Rankings update in real-time as new scores are submitted</li>
                  <li>• Premium players can compete for higher positions</li>
                  <li>• Leaderboard resets periodically for fair competition</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
