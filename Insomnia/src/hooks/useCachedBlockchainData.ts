'use client';

import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useBlockchain } from '@/contexts/BlockchainContext';
import { useWallet } from '@/contexts/WalletContext';

// Cache keys for different data types
export const CACHE_KEYS = {
  PLAYER_STATS: 'playerStats',
  LEADERBOARD: 'leaderboard',
  GAME_PASS: 'gamePass',
  BALANCE: 'walletBalance',
  NETWORK_STATUS: 'networkStatus'
} as const;

// Cache configuration
const CACHE_CONFIG = {
  DEFAULT_STALE_TIME: 30 * 1000, // 30 seconds (reduced from 5 minutes)
  FAST_STALE_TIME: 10 * 1000, // 10 seconds (reduced from 30 seconds)
  SLOW_STALE_TIME: 5 * 60 * 1000, // 5 minutes (reduced from 15 minutes)
  CACHE_TIME: 10 * 60 * 1000, // 10 minutes (reduced from 30 minutes)
};

export const useCachedPlayerStats = () => {
  const { scoreSystemService, isReadyForReads } = useBlockchain();
  const { accountAddress, isConnected } = useWallet();

  // Ensure all values are properly defined before using them
  const isReadyBoolean = Boolean(isReadyForReads);
  const isConnectedBoolean = Boolean(isConnected);
  const hasAccountAddress = Boolean(accountAddress);

  return useQuery({
    queryKey: [CACHE_KEYS.PLAYER_STATS, accountAddress],
    queryFn: async () => {
      if (!isReadyBoolean || !hasAccountAddress) {
        throw new Error('Blockchain not ready or no account address');
      }
      return await scoreSystemService.getPlayerStats(accountAddress);
    },
    enabled: isReadyBoolean && hasAccountAddress,
    staleTime: CACHE_CONFIG.DEFAULT_STALE_TIME,
    gcTime: CACHE_CONFIG.CACHE_TIME,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: true, // Refresh when user returns to tab
    refetchOnMount: true, // Always refetch when component mounts
    refetchInterval: 60000, // Refresh every minute in background
  });
};

export const useCachedLeaderboard = (limit: number = 10) => {
  const { scoreSystemService, isReadyForReads } = useBlockchain();

  // Ensure isReady is properly defined before using it
  const isReadyBoolean = Boolean(isReadyForReads);

  return useQuery({
    queryKey: [CACHE_KEYS.LEADERBOARD, limit],
    queryFn: async () => {
      if (!isReadyBoolean) {
        throw new Error('Blockchain not ready');
      }
      return await scoreSystemService.getLeaderboard(limit);
    },
    enabled: isReadyBoolean,
    staleTime: CACHE_CONFIG.FAST_STALE_TIME, // Leaderboard updates frequently
    gcTime: CACHE_CONFIG.CACHE_TIME,
    retry: 2,
    refetchOnWindowFocus: true,
  });
};

export const useCachedGamePass = () => {
  const { gamePassService, isReadyForReads } = useBlockchain();
  const { accountAddress, isConnected } = useWallet();

  // Ensure all values are properly defined before using them
  const isReadyBoolean = Boolean(isReadyForReads);
  const isConnectedBoolean = Boolean(isConnected);
  const hasAccountAddress = Boolean(accountAddress);

  return useQuery({
    queryKey: [CACHE_KEYS.GAME_PASS, accountAddress],
    queryFn: async () => {
      if (!isReadyBoolean || !hasAccountAddress) {
        throw new Error('Blockchain not ready or no account address');
      }
      return await gamePassService.getGamePassStatus(accountAddress);
    },
    enabled: isReadyBoolean && hasAccountAddress,
    staleTime: CACHE_CONFIG.DEFAULT_STALE_TIME,
    gcTime: CACHE_CONFIG.CACHE_TIME,
    retry: 3,
  });
};

export const useOptimisticScoreUpdate = () => {
  const queryClient = useQueryClient();
  const { scoreSystemService, isReadyForWrites } = useBlockchain(); // Changed from no readiness check to isReadyForWrites
  const { accountAddress } = useWallet();

  return useMutation({
    mutationFn: async ({ 
      gameSessionId, 
      finalScore, 
      speedLevel 
    }: { 
      gameSessionId: string; 
      finalScore: number; 
      speedLevel: number; 
    }) => {
      // Check if ready for writes before attempting score submission
      if (!isReadyForWrites) {
        throw new Error('Blockchain not ready for write operations or wallet not connected');
      }
      return await scoreSystemService.submitScore(gameSessionId, finalScore, speedLevel);
    },
    onMutate: async ({ finalScore }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ 
        queryKey: [CACHE_KEYS.PLAYER_STATS, accountAddress] 
      });
      await queryClient.cancelQueries({ 
        queryKey: [CACHE_KEYS.LEADERBOARD] 
      });

      // Snapshot previous values
      const previousPlayerStats = queryClient.getQueryData([CACHE_KEYS.PLAYER_STATS, accountAddress]);
      const previousLeaderboard = queryClient.getQueryData([CACHE_KEYS.LEADERBOARD]);

      // Optimistically update player stats
      if (previousPlayerStats) {
        queryClient.setQueryData([CACHE_KEYS.PLAYER_STATS, accountAddress], (old: Record<string, unknown>) => ({
          ...old,
          totalScore: (Number(old.totalScore) || 0) + finalScore,
          gamesPlayed: (Number(old.gamesPlayed) || 0) + 1,
          personalBest: Math.max(Number(old.personalBest) || 0, finalScore),
          lastUpdate: Date.now()
        }));
      }

      // Optimistically update leaderboard if this might be a top score
      if (previousLeaderboard && Array.isArray(previousLeaderboard)) {
        const lowestTopScore = Number(previousLeaderboard[previousLeaderboard.length - 1]?.score) || 0;
        if (finalScore > lowestTopScore) {
          queryClient.setQueryData([CACHE_KEYS.LEADERBOARD], (old: Array<Record<string, unknown>>) => {
            const newEntry = {
              address: accountAddress,
              score: finalScore,
              timestamp: Date.now()
            };
            return [...old, newEntry]
              .sort((a, b) => Number(b.score) - Number(a.score))
              .slice(0, 10);
          });
        }
      }

      return { previousPlayerStats, previousLeaderboard };
    },
    onError: (err, variables, context) => {
      // Rollback optimistic updates
      if (context?.previousPlayerStats) {
        queryClient.setQueryData([CACHE_KEYS.PLAYER_STATS, accountAddress], context.previousPlayerStats);
      }
      if (context?.previousLeaderboard) {
        queryClient.setQueryData([CACHE_KEYS.LEADERBOARD], context.previousLeaderboard);
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: [CACHE_KEYS.PLAYER_STATS, accountAddress] });
      queryClient.invalidateQueries({ queryKey: [CACHE_KEYS.LEADERBOARD] });
    },
  });
};

// Background cache warming
export const useCacheWarming = () => {
  const queryClient = useQueryClient();
  const { isReadyForReads } = useBlockchain();
  const { isConnected } = useWallet();

  const warmCache = useCallback(async () => {
    if (!isReadyForReads) return;

    // Prefetch leaderboard in the background
    queryClient.prefetchQuery({
      queryKey: [CACHE_KEYS.LEADERBOARD, 10],
      staleTime: CACHE_CONFIG.DEFAULT_STALE_TIME,
    });

    // Prefetch other commonly accessed data if connected
    if (isConnected) {
      queryClient.prefetchQuery({
        queryKey: [CACHE_KEYS.GAME_PASS],
        staleTime: CACHE_CONFIG.DEFAULT_STALE_TIME,
      });
    }
  }, [queryClient, isReadyForReads, isConnected]);

  return { warmCache };
};
