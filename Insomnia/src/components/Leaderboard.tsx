'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Trophy, Medal, Star, RefreshCw, Filter, TrendingUp, Clock, MousePointer, Zap, Users, Crown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useBlockchain } from '@/contexts/BlockchainContext';

interface LeaderboardPlayer {
  address: string;
  bestScore: number;
  bestTime: number;
  bestClicks: number;
  bestEfficiency: number;
  avgScore: number;
  avgTime: number;
  avgClicks: number;
  avgEfficiency: number;
  skillTier: number;
  totalGames: number;
  lastPlayed: number;

}

interface LeaderboardCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
}



export const Leaderboard: React.FC = () => {
  const [players, setPlayers] = useState<LeaderboardPlayer[]>([]);
  const [categories, setCategories] = useState<LeaderboardCategory[]>([]);

  const [selectedCategory, setSelectedCategory] = useState<string>('best_score');
  const [selectedSkillTier, setSelectedSkillTier] = useState<number | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [totalPlayers, setTotalPlayers] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [carouselIndex, setCarouselIndex] = useState(0);
  
  const { scoreSystemService, isReady } = useBlockchain();

  // Load categories on mount
  useEffect(() => {
    loadCategories();
  }, []);

  // Load leaderboard when category or skill tier changes
  useEffect(() => {
    if (isReady) {
      loadLeaderboard();
    }
  }, [selectedCategory, selectedSkillTier, isReady]);

  // Listen for external refresh events
  useEffect(() => {
    const handleRefresh = () => {
      if (isReady) {
        loadLeaderboard();
      }
    };
    
    window.addEventListener('leaderboard-refresh', handleRefresh);
    return () => window.removeEventListener('leaderboard-refresh', handleRefresh);
  }, [isReady]);

  const loadCategories = async () => {
    try {
      const result = await scoreSystemService.getLeaderboardCategories();
      if (result.success && result.categories) {
        // Filter out the 'overall' and 'skill_tier' categories since they're redundant
        const filteredCategories = result.categories.filter(cat => cat.id !== 'overall' && cat.id !== 'skill_tier');
        setCategories(filteredCategories);
        // Set initial carousel index to the first category
        if (filteredCategories.length > 0) {
          setCarouselIndex(0);
        }
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };



  const loadLeaderboard = useCallback(async () => {
    if (!isReady) {
      console.log('⚠️ Blockchain services not ready');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const result = await scoreSystemService.getLeaderboardByCategory(
        selectedCategory, 
        25, 
        selectedSkillTier ?? undefined
      );
      
      if (result.success && result.data) {
        console.log('🔍 Raw leaderboard data:', JSON.stringify(result.data, null, 2));
        setPlayers(result.data);
        setTotalPlayers(result.totalPlayers || 0);
        setLastUpdated(new Date());
        console.log('✅ Leaderboard loaded:', result.data);
      } else {
        setError(result.error || 'Failed to load leaderboard');
        setPlayers([]);
        setTotalPlayers(0);
      }
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
      setError('Failed to load leaderboard data');
      setPlayers([]);
      setTotalPlayers(0);
    } finally {
      setIsLoading(false);
    }
  }, [isReady, scoreSystemService, selectedCategory, selectedSkillTier]);

  const formatAddress = (address: string | undefined) => {
    if (!address) return 'Unknown';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp * 1000); // Convert from seconds to milliseconds
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return date.toLocaleDateString();
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getRankIcon = (rank: number) => {
    if (rank === 0) return <Crown className="w-5 h-5 text-yellow-400" />;
    if (rank === 1) return <Trophy className="w-5 h-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-300" />;
    if (rank === 3) return <Star className="w-5 h-5 text-amber-500" />;
    return <span className="text-sm font-bold text-[var(--color-text-secondary)]">{rank + 1}</span>;
  };

  const getCategoryIcon = (categoryId: string) => {
    switch (categoryId) {
      case 'best_score': return <Trophy className="w-4 h-4" />;
      case 'best_time': return <Clock className="w-4 h-4" />;
      case 'best_clicks': return <MousePointer className="w-4 h-4" />;
      case 'best_efficiency': return <Zap className="w-4 h-4" />;
      case 'avg_score': return <TrendingUp className="w-4 h-4" />;
      case 'avg_time': return <Clock className="w-4 h-4" />;
      case 'avg_clicks': return <MousePointer className="w-4 h-4" />;
      case 'avg_efficiency': return <Zap className="w-4 h-4" />;


      default: return <Trophy className="w-4 h-4" />;
    }
  };

  const getDisplayValue = (player: LeaderboardPlayer) => {
    switch (selectedCategory) {
      case 'best_score':
        return { value: player.bestScore, label: 'Best Score', icon: <Trophy className="w-4 h-4" /> };
      case 'best_time':
        return { value: formatTime(player.bestTime), label: 'Best Time', icon: <Clock className="w-4 h-4" /> };
      case 'best_clicks':
        return { value: player.bestClicks, label: 'Best Clicks', icon: <MousePointer className="w-4 h-4" /> };
      case 'best_efficiency':
        return { value: player.bestEfficiency, label: 'Best Efficiency', icon: <Zap className="w-4 h-4" /> };
      case 'avg_score':
        return { value: player.avgScore, label: 'Avg Score', icon: <TrendingUp className="w-4 h-4" /> };
      case 'avg_time':
        return { value: formatTime(player.avgTime), label: 'Avg Time', icon: <Clock className="w-4 h-4" /> };
      case 'avg_clicks':
        return { value: player.avgClicks, label: 'Avg Clicks', icon: <MousePointer className="w-4 h-4" /> };
      case 'avg_efficiency':
        return { value: player.avgEfficiency, label: 'Avg Efficiency', icon: <Zap className="w-4 h-4" /> };

      default:
        return { value: player.bestScore, label: 'Best Score', icon: <Trophy className="w-4 h-4" /> };
    }
  };

  const getSkillTierColor = (skillTier: number) => {
    switch (skillTier) {
      case 0: return 'text-blue-500';
      case 1: return 'text-green-500';
      case 2: return 'text-yellow-500';
      case 3: return 'text-orange-500';
      case 4: return 'text-purple-500';
      default: return 'text-gray-500';
    }
  };

  const getSkillTierName = (skillTier: number) => {
    switch (skillTier) {
      case 0: return 'Beginner';
      case 1: return 'Intermediate';
      case 2: return 'Advanced';
      case 3: return 'Expert';
      case 4: return 'Master';
      default: return 'Unknown';
    }
  };

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setCarouselIndex(categories.findIndex(cat => cat.id === categoryId));
  };

  const nextCategory = () => {
    if (categories.length > 0) {
      const nextIndex = (carouselIndex + 1) % categories.length;
      setCarouselIndex(nextIndex);
      setSelectedCategory(categories[nextIndex].id);
    }
  };

  const prevCategory = () => {
    if (categories.length > 0) {
      const prevIndex = carouselIndex === 0 ? categories.length - 1 : carouselIndex - 1;
      setCarouselIndex(prevIndex);
      setSelectedCategory(categories[prevIndex].id);
    }
  };



  return (
    <div className="bg-[var(--color-surface)] rounded-xl p-6 shadow-lg border border-[var(--color-border)]">
      {/* Header */}
      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold text-[var(--color-text)] flex items-center justify-center gap-3">
          {getCategoryIcon(selectedCategory)} {categories.find(cat => cat.id === selectedCategory)?.name || 'Loading...'}
        </h3>
      </div>







      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">
            ❌ {error}
          </p>
        </div>
      )}



      {/* Data Section with Navigation */}
      <div className="flex items-center gap-4">
        {/* Left Navigation Arrow */}
        <button
          onClick={prevCategory}
          className="flex-shrink-0 w-12 h-24 bg-[var(--color-background)] border border-[var(--color-border)] rounded-xl flex items-center justify-center text-[var(--color-text-secondary)] hover:text-[var(--color-accent1)] hover:border-[var(--color-accent1)] hover:scale-105 transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-sm"
          disabled={categories.length <= 1}
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        
        {/* Data Content */}
        <div className="flex-1 min-h-[200px]">
          {/* Loading State */}
          {isLoading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="w-8 h-8 animate-spin text-[var(--color-accent1)]" />
            </div>
          ) : players.length === 0 ? (
            <div className="text-center py-8 text-[var(--color-text-secondary)]">
              <p>{totalPlayers > 0 ? `${totalPlayers} total players` : 'Loading players...'}</p>
              <p className="text-sm mt-1">Try adjusting the filters or refreshing the data.</p>
            </div>
          ) : (
            /* Leaderboard Table */
            <div className="space-y-3">
              {players.map((player, index) => {
                const displayData = getDisplayValue(player);
                return (
                  <div
                    key={player.address || `player-${index}`}
                    className="flex items-center justify-between p-4 bg-[var(--color-background)] rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-surface)] transition-colors"
                  >
                    {/* Rank and Player Info */}
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-8 h-8">
                        {getRankIcon(index)}
                      </div>
                      <div>
                        <p className="font-mono text-sm text-[var(--color-text)]">
                          {formatAddress(player.address)}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs px-2 py-1 rounded-full ${getSkillTierColor(player.skillTier)} bg-[var(--color-text-secondary)]`}>
                            {getSkillTierName(player.skillTier)}
                          </span>
                          <span className="text-xs text-[var(--color-text-secondary)]">
                            {player.totalGames} games
                          </span>
                          <span className="text-xs text-[var(--color-text-secondary)]">
                            {formatTimestamp(player.lastPlayed)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Main Value */}
                    <div className="text-right">
                      <div className="flex items-center justify-end gap-2 mb-1">
                        {displayData.icon}
                        <p className="text-lg font-bold text-[var(--color-accent1)]">
                          {displayData.value}
                        </p>
                      </div>
                      <p className="text-xs text-[var(--color-text-secondary)]">{displayData.label}</p>
                    </div>

                    {/* Additional Stats */}
                    <div className="hidden md:block text-right text-xs text-[var(--color-text-secondary)] space-y-1">
                      <div>Best: {player.bestScore}</div>
                      <div>Time: {formatTime(player.bestTime)}</div>
                      <div>Efficiency: {player.bestEfficiency}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        {/* Right Navigation Arrow */}
        <button
          onClick={nextCategory}
          className="flex-shrink-0 w-12 h-24 bg-[var(--color-background)] border border-[var(--color-border)] rounded-xl flex items-center justify-center text-[var(--color-text-secondary)] hover:text-[var(--color-accent1)] hover:border-[var(--color-accent1)] hover:scale-105 transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-sm"
          disabled={categories.length <= 1}
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      {/* Tier Filter */}
      <div className="mt-6 flex justify-center">
        <div className="
          p-4 bg-[var(--color-background-secondary)] bg-opacity-50
          border border-[var(--color-border)] border-opacity-30 rounded-lg
          text-center hover:bg-[var(--color-background-secondary)] hover:bg-opacity-70 transition-colors cursor-pointer
          ${selectedSkillTier !== null ? 'bg-[var(--color-accent1)] bg-opacity-20 border-[var(--color-accent1)]' : ''}
        "
        onClick={() => {
          if (selectedSkillTier === null) {
            setSelectedSkillTier(0); // Start with Beginner tier
          } else if (selectedSkillTier < 4) {
            setSelectedSkillTier(selectedSkillTier + 1); // Move to next tier
          } else {
            setSelectedSkillTier(null); // Back to no filter (Overall)
          }
        }}
        >
          <div className="flex items-center justify-center mb-2">
            <Crown className="w-6 h-6 text-[var(--color-accent1)]" />
          </div>
          <div className="text-xl font-bold text-[var(--color-text)]">
            {selectedSkillTier === null ? 'Overall' : getSkillTierName(selectedSkillTier)}
          </div>
          <div className="text-sm text-[var(--color-text-secondary)]">
            Click to cycle tiers
          </div>
        </div>
      </div>

      {/* Last Updated - Bottom Right */}
      {lastUpdated && (
        <div className="mt-4 flex justify-end">
          <p className="text-sm text-[var(--color-text-secondary)]">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
      )}

      {/* Blockchain Status */}
      {!isReady && (
        <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <p className="text-sm text-yellow-600 dark:text-yellow-400">
            ⚠️ Blockchain integration not ready. Smart contract needs to be deployed.
          </p>
        </div>
      )}
    </div>
  );
};
