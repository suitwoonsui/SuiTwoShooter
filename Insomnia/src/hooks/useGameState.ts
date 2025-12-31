'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useWallet } from '@/contexts/WalletContext';
import { PlayerStats, GameMetrics, PlayerPerformance } from '@/lib/types';
import { useBlockchain } from '@/contexts/BlockchainContext';
import { useGamePass } from '@/contexts/GamePassContext';

export interface GameState {
  isActive: boolean;
  
  // Current Game Metrics
  currentGame: GameMetrics;
  
  // Historical Performance
  performance: PlayerPerformance;
  
  // Legacy fields (for backward compatibility)
  personalBest: number;
  gamesPlayed: number;
  totalScore: number;
  blockchainSessionId: string | null;
  playerStats: PlayerStats | null;
}

export const useGameState = () => {
  // Context hooks
  const { isConnected, accountAddress } = useWallet();
  const { playerStats, isReady, submitScore, baseService } = useBlockchain();
  const { 
    gamePass: gamePassStatus, 
    isLoading: isLoadingGamePass,
    consumeGameCredit,
    refreshGamePass,
    purchaseGamePass,
    addGamesToPass
  } = useGamePass();
  
  // Game state
  const [gameState, setGameState] = useState<GameState>({
    isActive: false,
    currentGame: {
      clicks: 0,
      timeElapsed: 0,
      score: 0
    },
    performance: {
      highestClicks: 0,
      highestTimeElapsed: 0,
      highestScore: 0,
      averageClicks: 0,
      averageTimeElapsed: 0,
      averageScore: 0,
      totalGames: 0,
      currentStreak: 0,
      bestStreak: 0
    },
    personalBest: 0,
    gamesPlayed: 0,
    totalScore: 0,
    blockchainSessionId: null,
    playerStats: null,
  });

  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());

  // Guards
  const startingOnChainRef = useRef(false);

  // Score calculation function
  const calculateScore = useCallback((clicks: number, timeElapsed: number): number => {
    // Convert centiseconds to seconds (1 centisecond = 0.01 seconds)
    const timeSeconds = timeElapsed / 100;
    
    // Base score from clicks
    const baseScore = clicks;
    
    // Time bonus (surviving longer = more points)
    const timeBonus = Math.floor(timeSeconds / 10); // +1 point per 10 seconds
    
    // Efficiency bonus (clicks per second, with diminishing returns)
    // Guard against division by zero
    let efficiencyBonus = 0;
    if (timeSeconds > 0) {
      const clicksPerSecond = clicks / timeSeconds;
      efficiencyBonus = Math.floor(clicksPerSecond * 5);
    }
    
    const finalScore = baseScore + timeBonus + efficiencyBonus;
    
    // Ensure we never return NaN or negative values
    if (isNaN(finalScore) || finalScore < 0) {
      console.warn('⚠️ Invalid score calculated, using base score only:', { clicks, timeElapsed, finalScore });
      return Math.max(0, baseScore);
    }
    
    return finalScore;
  }, []);

  // Performance update logic
  const updatePerformance = useCallback((gameMetrics: GameMetrics) => {
    const { clicks, timeElapsed, score } = gameMetrics;
    
    setGameState(prev => {
      const performance = prev.performance;
      
      // Update highest achievements
      const newHighestClicks = Math.max(performance.highestClicks, clicks);
      const newHighestTime = Math.max(performance.highestTimeElapsed, timeElapsed);
      const newHighestScore = Math.max(performance.highestScore, score);
      
      // Update averages
      const totalGames = performance.totalGames + 1;
      const newAverageClicks = (performance.averageClicks * performance.totalGames + clicks) / totalGames;
      const newAverageTime = (performance.averageTimeElapsed * performance.totalGames + timeElapsed) / totalGames;
      const newAverageScore = (performance.averageScore * performance.totalGames + score) / totalGames;
      
      // Update streak
      const isImproving = score > performance.highestScore;
      const newCurrentStreak = isImproving ? performance.currentStreak + 1 : 0;
      const newBestStreak = Math.max(performance.bestStreak, newCurrentStreak);
      
      return {
        ...prev,
        performance: {
          ...performance,
          // Highest achievements
          highestClicks: newHighestClicks,
          highestTimeElapsed: newHighestTime,
          highestScore: newHighestScore,
          
          // Averages
          averageClicks: newAverageClicks,
          averageTimeElapsed: newAverageTime,
          averageScore: newAverageScore,
          
          // Counts and streaks
          totalGames: totalGames,
          currentStreak: newCurrentStreak,
          bestStreak: newBestStreak,
        }
      };
    });
  }, []);

  // Update game state when player stats change
  useEffect(() => {
    if (playerStats) {
      setGameState(prev => ({
        ...prev,
        performance: {
          highestClicks: playerStats.highestClicks || 0,
          highestTimeElapsed: playerStats.highestTimeElapsed || 0,
          highestScore: playerStats.highestScore || 0,
          averageClicks: playerStats.averageClicks || 0,
          averageTimeElapsed: playerStats.averageTimeElapsed || 0,
          averageScore: playerStats.averageScore || 0,
          totalGames: playerStats.totalGames || 0,
          currentStreak: playerStats.currentStreak || 0,
          bestStreak: playerStats.bestStreak || 0,
        },
        personalBest: playerStats.highestScore || playerStats.personalBest || 0,
        gamesPlayed: playerStats.totalGames || playerStats.gamesPlayed || 0,
        totalScore: playerStats.averageScore || playerStats.score || 0,
        playerStats: playerStats,
      }));
    }
  }, [playerStats]);

  // Reset state on disconnect/address change
  useEffect(() => {
    if (!isConnected || !accountAddress) {
      setGameState(prev => ({ ...prev, playerStats: null, blockchainSessionId: null }));
    }
  }, [isConnected, accountAddress]);

  const startGame = useCallback(async () => {
    setGameState(prev => ({
      ...prev,
      isActive: true,
      currentGame: {
        clicks: 0,
        timeElapsed: 0,
        score: 0
      },
      performance: {
        ...prev.performance,
        totalGames: prev.performance.totalGames + 1,
        currentStreak: 0
      }
    }));

    // Only create blockchain session ONCE per batch, not per game
    if (isConnected && accountAddress && isReady && (!gamePassStatus || gamePassStatus.isActive)) {
      if (startingOnChainRef.current) return; // prevent duplicate prompts
      
      // Check if we already have a session for this batch
      if (!gameState.blockchainSessionId) {
        startingOnChainRef.current = true;
        try {
          // Game owner pays gas, no user signature needed
          if (gamePassStatus && gamePassStatus.id) {
            console.log('🎮 Starting game session with GamePass:', gamePassStatus.id);
            // Game start is successful - credit consumption handled separately
            console.log('✅ Game started successfully');
            return true;
          } else {
            console.log('⚠️ No active game pass found - playing in demo mode');
            return true;
          }
        } catch (error) {
          console.error('❌ Failed to start game session:', error);
        } finally {
          startingOnChainRef.current = false;
        }
      }
    }
    
    return true;
  }, [isConnected, accountAddress, isReady, gamePassStatus, gameState.blockchainSessionId]);

    const submitGameScore = useCallback(async (finalScore: number, enduranceLevel: number = 1) => {
    console.log('🏆 Submitting game score:', finalScore);
    
    if (!isConnected || !accountAddress) {
      console.log('⚠️ Wallet not connected - score not submitted to blockchain');
      // Still update local state
      setGameState(prev => ({ 
        ...prev, 
        currentGame: {
          ...prev.currentGame,
          score: finalScore
        },
        personalBest: Math.max(prev.personalBest, finalScore)
      }));
      setLastUpdate(Date.now());
      return false;
    }

    if (!isReady) {
      console.log('⚠️ Blockchain not ready - score not submitted');
      setGameState(prev => ({ 
        ...prev, 
        currentGame: {
          ...prev.currentGame,
          score: finalScore
        },
        personalBest: Math.max(prev.personalBest, finalScore)
      }));
      setLastUpdate(Date.now());
      return false;
    }

    try {
      // Submit score directly to blockchain using player's address
      const success = await submitScore(accountAddress, finalScore, enduranceLevel);
      
      if (success) {
        console.log('✅ Score submitted to blockchain successfully');
        
        // Update local game state
        setGameState(prev => ({ 
          ...prev, 
          currentGame: {
            ...prev.currentGame,
            score: finalScore
          },
          personalBest: Math.max(prev.personalBest, finalScore),
          gamesPlayed: prev.gamesPlayed + 1,
          totalScore: prev.totalScore + finalScore
        }));
        
        // Update performance metrics
        updatePerformance({
          clicks: gameState.currentGame.clicks,
          timeElapsed: gameState.currentGame.timeElapsed,
          score: finalScore
        });
        
        // Trigger a refresh of player stats to get updated blockchain data
        await refreshGamePass();
        setLastUpdate(Date.now());
        
        return true;
      } else {
        console.log('❌ Failed to submit score to blockchain');
        // Still update local state
        setGameState(prev => ({ 
          ...prev, 
          currentGame: {
            ...prev.currentGame,
            score: finalScore
          },
          personalBest: Math.max(prev.personalBest, finalScore)
        }));
        setLastUpdate(Date.now());
        return false;
      }
    } catch (error) {
      console.error('Error submitting score:', error);
      // Still update local state
      setGameState(prev => ({ 
        ...prev, 
        currentGame: {
          ...prev.currentGame,
          score: finalScore
        },
        personalBest: Math.max(prev.personalBest, finalScore)
      }));
      setLastUpdate(Date.now());
      return false;
    }
  }, [isConnected, accountAddress, isReady, submitScore, refreshGamePass, gameState.currentGame.clicks, gameState.currentGame.timeElapsed, updatePerformance]);

  const endGame = useCallback(async (finalScore: number, actualClicks?: number, actualTimeElapsed?: number) => {
    console.log('🎯 Game ended with score:', finalScore);
    
    // Use passed values if available, otherwise fall back to state
    const clicks = actualClicks ?? gameState.currentGame.clicks;
    const timeElapsed = actualTimeElapsed ?? gameState.currentGame.timeElapsed;
    
    console.log('🎯 Using values - Clicks:', clicks, 'TimeElapsed:', timeElapsed);
    
    // Calculate final score using the actual values
    const finalCalculatedScore = calculateScore(clicks, timeElapsed);
    
    console.log('🎯 Calculated score:', finalCalculatedScore, 'Type:', typeof finalCalculatedScore);
    
    // Update local state immediately
    setGameState(prev => ({
      ...prev,
      isActive: false,
      currentGame: {
        ...prev.currentGame,
        score: finalCalculatedScore
      },
      performance: {
        ...prev.performance,
        currentStreak: 0
      }
    }));

    // Submit score to blockchain if user is connected and has premium
    console.log('🔍 Score submission conditions check:', {
      isConnected,
      accountAddress: !!accountAddress,
      isReady,
      accountAddressValue: accountAddress
    });
    
    if (isConnected && accountAddress && isReady) {
      try {
        console.log('🏆 Submitting score to blockchain:', finalCalculatedScore);
        
        // Calculate endurance level (time survived in seconds)
        let enduranceLevel = Math.floor(timeElapsed / 100);
        console.log('🎯 Endurance level:', enduranceLevel, 'Type:', typeof enduranceLevel);
        
        // Ensure endurance level is valid
        if (isNaN(enduranceLevel) || enduranceLevel < 0) {
          console.warn('⚠️ Invalid endurance level, using 0:', enduranceLevel);
          enduranceLevel = 0;
        }
        
        // Submit score to blockchain using player's address
        const success = await submitScore(accountAddress, finalCalculatedScore, enduranceLevel, clicks, timeElapsed);
        
        if (success) {
          console.log('✅ Score submitted to blockchain successfully');
          
          // Update performance metrics after successful submission
          updatePerformance({
            clicks: clicks,
            timeElapsed: timeElapsed,
            score: finalCalculatedScore
          });
        } else {
          console.warn('⚠️ Failed to submit score to blockchain, but game ended normally');
        }
      } catch (error) {
        console.error('❌ Error submitting score to blockchain:', error);
      }
    } else {
      console.log('ℹ️ Score not submitted to blockchain (demo mode or not connected)');
    }
  }, [isConnected, accountAddress, isReady, submitScore, calculateScore, updatePerformance, gameState.currentGame.clicks, gameState.currentGame.timeElapsed]);

  const resetGame = useCallback(() => {
    console.log('🔄 Resetting game state');
    
    setGameState(prev => ({
      ...prev,
      isActive: false,
      currentGame: {
        clicks: 0,
        timeElapsed: 0,
        score: 0
      },
      performance: {
        ...prev.performance,
        currentStreak: 0
      }
    }));
  }, []);

  const updateEnduranceLevel = useCallback((level: number) => {
    // This function is called to update the endurance level display
    // We don't want to override the actual timeElapsed value
    console.log('🎯 Endurance level updated:', level, 'seconds');
    // Note: We're not updating timeElapsed here anymore since it should preserve the actual milliseconds
  }, []);

  // Handle game pass purchase
  const handleGamePassPurchase = useCallback(async (passType: string, priceInSui: number): Promise<boolean> => {
    try {
      console.log('🎮 Processing game pass transaction:', passType, 'for', priceInSui, 'SUI');
      
      if (!isConnected) {
        console.error('Cannot purchase: wallet not connected');
        return false;
      }
      
      // Convert pass type string to the expected format
      const passTypeMap: Record<string, 'basic' | 'premium' | 'unlimited'> = {
        'basic': 'basic',
        'premium': 'premium', 
        'unlimited': 'unlimited'
      };
      
      const mappedPassType = passTypeMap[passType];
      if (!mappedPassType) {
        console.error('Invalid pass type:', passType);
        return false;
      }
      
      let success = false;
      
      if (gamePassStatus?.isActive) {
        // User has existing pass - add games to it
        console.log('➕ Adding games to existing pass');
        
        // Calculate how many games to add based on pass type
        const gamesToAdd = mappedPassType === 'basic' ? 10 : mappedPassType === 'premium' ? 50 : 999999;
        
        success = await addGamesToPass(mappedPassType, gamesToAdd);
        
        if (success) {
          console.log('✅ Games added to existing pass successfully');
        } else {
          console.error('❌ Failed to add games to existing pass');
        }
      } else {
        // User doesn't have a pass - purchase new one
        console.log('🆕 Purchasing new game pass');
        
        success = await purchaseGamePass(mappedPassType);
        
        if (success) {
          console.log('✅ New game pass purchased successfully');
        } else {
          console.error('❌ Failed to purchase new game pass');
        }
      }
      
      return success;
    } catch (error) {
      console.error('Error processing game pass transaction:', error);
      return false;
    }
  }, [purchaseGamePass, addGamesToPass, isConnected, gamePassStatus]);

  // Legacy functions for backward compatibility
  const addGamesToExistingPass = useCallback(async (
    _gamePassId: string,
    _passType: 'basic' | 'premium' | 'unlimited',
    _additionalGames: number
  ) => {
    // This is now handled by GamePassContext - delegate to it
    console.log('⚠️ addGamesToExistingPass called from useGameState - delegating to GamePassContext');
    return false; // Placeholder - components should use GamePassContext directly
  }, []);

  // Return the game state and functions
  return {
    // Game state
    gameState,
    
    // Game actions
    startGame,
    endGame,
    resetGame,
    
    // Performance tracking
    updatePerformance,
    calculateScore,
    
    // Legacy functions (for backward compatibility)
    updateEnduranceLevel,
    
    // Game pass actions
    handleGamePassPurchase,
    addGamesToExistingPass,
    
    // Loading states
    isLoadingGamePass,
    
    // Last update timestamp
    lastUpdate,
  };
};