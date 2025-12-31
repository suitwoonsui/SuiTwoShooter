'use client';

import React, { useEffect, useState } from 'react';
import { BarChart3, Trophy, Clock, Target, TrendingUp, Gamepad2, Loader2 } from 'lucide-react';
import { useCachedPlayerStats } from '@/hooks/useCachedBlockchainData';
import { useWallet } from '@/contexts/WalletContext';

interface StatisticsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface GameStats {
  gamesPlayed: number;
  bestScore: number;
  totalTimePlayed: number;
  averageEfficiency: number;
  recentGames: Array<{
    score: number;
    time: number;
    efficiency: number;
    date: string;
  }>;
}

export const StatisticsModal: React.FC<StatisticsModalProps> = ({ isOpen, onClose }) => {
  const { isConnected, accountAddress } = useWallet();
  const { data: playerStats, isLoading, error, refetch } = useCachedPlayerStats();
  
  const [stats, setStats] = useState<GameStats>({
    gamesPlayed: 0,
    bestScore: 0,
    totalTimePlayed: 0,
    averageEfficiency: 0,
    recentGames: []
  });

  useEffect(() => {
    if (isOpen && playerStats) {
      // Debug logging to understand time values
      console.log('🔍 StatisticsModal - Raw blockchain data:', {
        highestTimeElapsed: playerStats.highestTimeElapsed,
        averageTimeElapsed: playerStats.averageTimeElapsed,
        type: typeof playerStats.highestTimeElapsed,
        isNaN: isNaN(playerStats.highestTimeElapsed || 0)
      });
      
      // Convert blockchain player stats to display format
      // Note: Blockchain stores time in seconds
      const blockchainStats: GameStats = {
        gamesPlayed: playerStats.totalGames || 0,
        bestScore: playerStats.highestScore || 0,
        totalTimePlayed: playerStats.highestTimeElapsed || 0, // Keep in seconds for now
        averageEfficiency: playerStats.averageClicks > 0 && playerStats.averageTimeElapsed > 0 
          ? Math.round((playerStats.averageClicks / playerStats.averageTimeElapsed) * 100) / 100
          : 0, // Calculate efficiency from clicks/time (time is in seconds)
        recentGames: [] // We'll need to implement recent games tracking separately
      };
      
      console.log('🔍 StatisticsModal - Processed stats:', blockchainStats);
      setStats(blockchainStats);
    }
  }, [isOpen, playerStats]);

  const formatTime = (milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${remainingSeconds}s`;
  };

  const formatTimeFromSeconds = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${remainingSeconds}s`;
  };

  const formatEfficiency = (efficiency: number) => {
    return efficiency.toFixed(2);
  };

  const getScoreColor = (score: number) => {
    if (score >= 1000) return 'text-[var(--color-accent3)]';
    if (score >= 500) return 'text-[var(--color-accent1)]';
    if (score >= 100) return 'text-[var(--color-accent2)]';
    return 'text-[var(--color-text-secondary)]';
  };

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
          maxWidth: '640px',
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
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[var(--color-accent1)] to-[var(--color-accent2)] rounded-full flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-[var(--color-background)]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Statistics</h2>
              <p className="text-sm text-[var(--color-text-secondary)]">
                {isConnected ? 'Your Game Performance' : 'Connect Wallet for Statistics'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                console.log('🔄 Manual refresh requested');
                refetch();
              }}
              className="
                p-2 text-[var(--color-text-secondary)] hover:text-[var(--color-accent1)]
                transition-colors duration-200 rounded-lg hover:bg-[var(--color-background-secondary)]
                text-xs
              "
              title="Refresh statistics"
            >
              🔄
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
        <div className="p-6 space-y-6">
          {/* Connection Status */}
          {!isConnected ? (
            <div className="
              p-6 text-center
              bg-[var(--color-background-secondary)] bg-opacity-30
              border border-[var(--color-border)] border-opacity-20 rounded-lg
            ">
              <Gamepad2 className="w-12 h-12 text-[var(--color-text-secondary)] mx-auto mb-4" />
              <p className="text-[var(--color-text-primary)] font-medium mb-2">Wallet Not Connected</p>
              <p className="text-sm text-[var(--color-text-secondary)]">
                Connect your wallet to view your personal game statistics and achievements!
              </p>
            </div>
          ) : isLoading ? (
            <div className="
              p-6 text-center
              bg-[var(--color-background-secondary)] bg-opacity-30
              border border-[var(--color-border)] border-opacity-20 rounded-lg
            ">
              <Loader2 className="w-12 h-12 text-[var(--color-text-secondary)] mx-auto mb-4 animate-spin" />
              <p className="text-[var(--color-text-primary)] font-medium mb-2">Loading Statistics...</p>
              <p className="text-sm text-[var(--color-text-secondary)]">
                Fetching your blockchain data...
              </p>
            </div>
          ) : error ? (
            <div className="
              p-6 text-center
              bg-red-500/20 border border-red-500/30 rounded-lg
            ">
              <p className="text-red-400 font-medium mb-2">Error Loading Statistics</p>
              <p className="text-sm text-red-300">
                Failed to load your statistics. Please try again later.
              </p>
            </div>
          ) : (
            <>
              {/* Overview Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Games Played */}
                <div className="
                  p-4 bg-[var(--color-background-secondary)] bg-opacity-50
                  border border-[var(--color-border)] border-opacity-30 rounded-lg
                  text-center
                ">
                  <div className="flex items-center justify-center mb-2">
                    <Gamepad2 className="w-6 h-6 text-[var(--color-accent1)]" />
                  </div>
                  <div className="text-2xl font-bold text-[var(--color-text-primary)]">
                    {stats.gamesPlayed}
                  </div>
                  <div className="text-sm text-[var(--color-text-secondary)]">Games Played</div>
                </div>

                {/* Best Score */}
                <div className="
                  p-4 bg-[var(--color-background-secondary)] bg-opacity-50
                  border border-[var(--color-border)] border-opacity-30 rounded-lg
                  text-center
                ">
                  <div className="flex items-center justify-center mb-2">
                    <Trophy className="w-6 h-6 text-[var(--color-accent3)]" />
                  </div>
                  <div className={`text-2xl font-bold ${getScoreColor(stats.bestScore)}`}>
                    {stats.bestScore}
                  </div>
                  <div className="text-sm text-[var(--color-text-secondary)]">Best Score</div>
                </div>

                {/* Average Score */}
                <div className="
                  p-4 bg-[var(--color-background-secondary)] bg-opacity-50
                  border border-[var(--color-border)] border-opacity-30 rounded-lg
                  text-center
                ">
                  <div className="flex items-center justify-center mb-2">
                    <TrendingUp className="w-6 h-6 text-[var(--color-accent2)]" />
                  </div>
                  <div className="text-2xl font-bold text-[var(--color-text-primary)]">
                    {Math.round(playerStats?.averageScore || 0)}
                  </div>
                  <div className="text-sm text-[var(--color-text-secondary)]">Average Score</div>
                </div>

                {/* Average Efficiency */}
                <div className="
                  p-4 bg-[var(--color-background-secondary)] bg-opacity-50
                  border border-[var(--color-border)] border-opacity-30 rounded-lg
                  text-center
                ">
                  <div className="flex items-center justify-center mb-2">
                    <Target className="w-6 h-6 text-[var(--color-accent3)]" />
                  </div>
                  <div className="text-2xl font-bold text-[var(--color-text-primary)]">
                    {playerStats && playerStats.averageClicks > 0 && playerStats.averageTimeElapsed > 0 
                      ? formatEfficiency(playerStats.averageClicks / playerStats.averageTimeElapsed)
                      : '0.00'
                    }
                  </div>
                  <div className="text-sm text-[var(--color-text-secondary)]">Avg Efficiency</div>
                </div>
              </div>

              {/* Detailed Performance Metrics */}
              {playerStats && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {/* Personal Best Clicks */}
                  <div className="
                    p-4 bg-[var(--color-background-secondary)] bg-opacity-50
                    border border-[var(--color-border)] border-opacity-30 rounded-lg
                    text-center
                  ">
                    <div className="text-lg font-bold text-[var(--color-accent1)]">
                      {playerStats.highestClicks || 0}
                    </div>
                    <div className="text-sm text-[var(--color-text-secondary)]">Best Clicks</div>
                  </div>

                  {/* Personal Best Time */}
                  <div className="
                    p-4 bg-[var(--color-background-secondary)] bg-opacity-50
                    border border-[var(--color-border)] border-opacity-30 rounded-lg
                    text-center
                  ">
                    <div className="text-lg font-bold text-[var(--color-accent2)]">
                      {formatTimeFromSeconds(playerStats.highestTimeElapsed || 0)}
                    </div>
                    <div className="text-sm text-[var(--color-text-secondary)]">Longest Survival</div>
                  </div>

                  {/* Average Clicks */}
                  <div className="
                    p-4 bg-[var(--color-background-secondary)] bg-opacity-50
                    border border-[var(--color-border)] border-opacity-30 rounded-lg
                    text-center
                  ">
                    <div className="text-lg font-bold text-[var(--color-accent3)]">
                      {playerStats.averageClicks || 0}
                    </div>
                    <div className="text-sm text-[var(--color-text-secondary)]">Avg Clicks</div>
                  </div>
                </div>
              )}

              {/* Blockchain Stats Info */}
              {playerStats && (
                <div className="
                  p-4 bg-gradient-to-r from-[var(--color-accent2)] to-[var(--color-accent3)]
                  border border-[var(--color-accent2)] border-opacity-30 rounded-lg
                  shadow-[0_0_15px_var(--color-glow)]
                ">
                  <div className="flex items-start space-x-3">
                    <BarChart3 className="w-5 h-5 text-[var(--color-background)] mt-0.5" />
                    <div>
                      <h4 className="font-medium text-[var(--color-background)] mb-2">Blockchain Statistics</h4>
                      <div className="text-sm text-[var(--color-background)] space-y-1">
                        <p>• Network: Sui Testnet</p>
                        <p>• Wallet: {accountAddress?.slice(0, 6)}...{accountAddress?.slice(-4)}</p>
                        <p>• Skill Tier: {playerStats.currentSkillTier || 0}</p>
                        <p>• Last Updated: {new Date(playerStats.lastPlayed || Date.now()).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Debug Information - Raw Blockchain Data */}
              {playerStats && (
                <div className="
                  p-4 bg-[var(--color-background-secondary)] bg-opacity-50
                  border border-[var(--color-border)] border-opacity-30 rounded-lg
                ">
                  <div className="flex items-center space-x-2 mb-3">
                    <div className="w-4 h-4 bg-[var(--color-accent1)] rounded-full"></div>
                    <h4 className="font-medium text-[var(--color-text-primary)]">Raw Blockchain Data (Debug)</h4>
                  </div>
                  <div className="text-xs text-[var(--color-text-secondary)] space-y-1 font-mono">
                    <p>Total Games: {playerStats.totalGames}</p>
                    <p>Highest Score: {playerStats.highestScore}</p>
                    <p>Highest Clicks: {playerStats.highestClicks}</p>
                    <p>Highest Time (raw): {playerStats.highestTimeElapsed || 0} (seconds)</p>
                    <p>Highest Time (formatted): {formatTimeFromSeconds(playerStats.highestTimeElapsed || 0)}</p>
                    <p>Average Score: {playerStats.averageScore}</p>
                    <p>Average Clicks: {playerStats.averageClicks}</p>
                    <p>Average Time (raw): {playerStats.averageTimeElapsed || 0} (seconds)</p>
                    <p>Average Time (formatted): {formatTimeFromSeconds(playerStats.averageTimeElapsed || 0)}</p>
                    <p>Skill Tier: {playerStats.currentSkillTier}</p>
                    <p>Endurance Level: {playerStats.highestEnduranceLevel}</p>
                  </div>
                </div>
              )}

              {/* Recent Games - Placeholder for now */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5 text-[var(--color-accent1)]" />
                  <h3 className="text-lg font-medium text-[var(--color-text-primary)]">Recent Games</h3>
                </div>
                
                <div className="
                  p-8 text-center
                  bg-[var(--color-background-secondary)] bg-opacity-30
                  border border-[var(--color-border)] border-opacity-20 rounded-lg
                ">
                  <Gamepad2 className="w-12 h-12 text-[var(--color-text-secondary)] mx-auto mb-4" />
                  <p className="text-[var(--color-text-secondary)]">Recent games tracking coming soon!</p>
                  <p className="text-sm text-[var(--color-text-secondary)] mt-2">
                    We&apos;re working on tracking your recent game sessions.
                  </p>
                </div>
              </div>

              {/* Performance Tips */}
              <div className="
                p-4 bg-gradient-to-r from-[var(--color-accent1)] to-[var(--color-accent2)]
                border border-[var(--color-accent1)] border-opacity-30 rounded-lg
                shadow-[0_0_15px_var(--color-glow)]
              ">
                <div className="flex items-start space-x-3">
                  <TrendingUp className="w-5 h-5 text-[var(--color-background)] mt-0.5" />
                  <div>
                    <h4 className="font-medium text-[var(--color-background)] mb-2">Performance Tips</h4>
                    <ul className="text-sm text-[var(--color-background)] space-y-1">
                      <li>• Focus on accuracy over speed initially</li>
                      <li>• Build endurance gradually</li>
                      <li>• Take short breaks between sessions</li>
                      <li>• Practice consistent clicking patterns</li>
                    </ul>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
