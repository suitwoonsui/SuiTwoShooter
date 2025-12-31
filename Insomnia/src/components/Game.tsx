'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useWallet } from '@/contexts/WalletContext';
import { useGameMode } from '@/contexts/GameModeContext';
import { GameGrid } from './GameGrid';
import { GameStats } from './GameStats';
import { GameControls } from './GameControls';
import { 
  GameOverModalWithSuspense as GameOverModal
} from './LazyComponents';
import { useGameAudio } from '../hooks/useGameAudio';
import { useGameStore } from '../stores/gameStore';
import { useGamePass } from '../contexts/GamePassContext';
import { useGameWorker } from '../hooks/useGameWorker';
import { useBlockchain } from '../contexts/BlockchainContext';


export interface GameBlock {
  id: number;
  x: number;
  y: number;
  visible: boolean;
  spawnTime: number;
}

export const Game: React.FC = () => {
  const { isConnected, accountAddress } = useWallet();
  const { forceDemoMode } = useGameMode();
  const [showGameOverModal, setShowGameOverModal] = useState(false);
  // Game pass purchase is handled in header, no need for local state
  
  // Use context forceDemoMode if available, otherwise fall back to prop
  const effectiveForceDemoMode = forceDemoMode;
  const [isFreeTier, setIsFreeTier] = useState(effectiveForceDemoMode);
  
  const gameLoopRef = useRef<number | null>(null);
  const blockTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const gameStartTimeRef = useRef<number>(0); // Track when game started
  const currentTimeRef = useRef<number>(0); // Track current time without triggering re-renders
  
  const GRID_SIZE = 5; // 5x5 grid for mobile-first design
  const BASE_VISIBILITY_TIME = 1000; // 1 second base visibility
  
  // Helper functions (defined first to avoid hoisting issues)
  const getVisibilityTime = useCallback((timeElapsedCentiseconds: number): number => {
    // All time values are now in centiseconds
    if (timeElapsedCentiseconds < 3000) return BASE_VISIBILITY_TIME;
    if (timeElapsedCentiseconds < 6000) return BASE_VISIBILITY_TIME * 0.8;
    if (timeElapsedCentiseconds < 9000) return BASE_VISIBILITY_TIME * 0.6;
    if (timeElapsedCentiseconds < 12000) return BASE_VISIBILITY_TIME * 0.4;
    return BASE_VISIBILITY_TIME * 0.3;
  }, []);


  
  // Zustand store for game state
  const {
    isActive: gameActive,
    isStarted: gameStarted,
    score,
    timeElapsed,
    currentBlock,
    startGame: storeStartGame,
    clickBlock: storeClickBlock,
    updateTime: storeUpdateTime,
    spawnBlock: storeSpawnBlock,
    clearBlock: storeClearBlock,
    endGame: storeEndGame,
    resetGame: storeResetGame,
    getCalculatedScore: storeGetCalculatedScore,
  } = useGameStore();

  // Use GamePass context directly for better separation of concerns
  const { 
    gamePass: gamePassStatus,
    consumeGameCredit,
    refreshGamePass
  } = useGamePass();

  // Get blockchain submitScore function for score submission
  const { submitScore: blockchainSubmitScore } = useBlockchain();

  const { playRandomSound } = useGameAudio();

  // SSR Safety - not needed for this component

  // Web Worker message handler
  const handleWorkerMessage = useCallback((message: { type: string; data: { level?: number; timeElapsed?: number } }) => {
    const { type, data } = message;
    
    switch (type) {
      case 'TIME_UPDATED':
        if (data.level && typeof data.timeElapsed === 'number') {
          // Update store with calculated level data
          storeUpdateTime(data.timeElapsed);
        }
        break;
      default:
        break;
    }
  }, [storeUpdateTime]);

  // Initialize web worker
  const { isWorkerReady, postMessage: workerPostMessage } = useGameWorker(handleWorkerMessage);

  // Update free tier status based on game pass or user choice
  useEffect(() => {
    console.log('🎮 Free tier detection - effectiveForceDemoMode:', effectiveForceDemoMode, 'isConnected:', isConnected, 'gamePassStatus:', gamePassStatus);
    
    if (effectiveForceDemoMode) {
      console.log('🎮 Setting free tier due to forced demo mode');
      setIsFreeTier(true);
    } else if (gamePassStatus && gamePassStatus.isActive) {
      console.log('🎮 Setting premium tier - user has active game pass');
      setIsFreeTier(false);
    } else if (isConnected) {
      // Connected but no active pass = free tier
      console.log('🎮 Setting free tier - connected but no active pass');
      setIsFreeTier(true);
    } else {
      // Not connected = free tier
      console.log('🎮 Setting free tier - not connected');
      setIsFreeTier(true);
    }
  }, [gamePassStatus, isConnected, effectiveForceDemoMode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
      if (blockTimeoutRef.current) {
        clearTimeout(blockTimeoutRef.current);
      }
    };
  }, []);

  // Game end and cleanup function
  const endGameAndCleanup = useCallback(async () => {
    // This function is called for automatic game endings (wrong click, block timeout)
    // Manual game ending is handled by handleEndGame
    storeEndGame();
    setShowGameOverModal(true); // Show the modal instead of inline display
    
    // Calculate final score using the store
    const finalCalculatedScore = storeGetCalculatedScore();
    
    // Only call blockchain endGame if user is connected and has premium
    // AND is not in forced demo mode
    if (isConnected && gamePassStatus && gamePassStatus.isActive && !effectiveForceDemoMode) {
      // Get the current values directly from the store to ensure they're up-to-date
      const store = useGameStore.getState();
      const actualClickCount = store.clicks;
      const actualTimeElapsed = store.timeElapsed;
      console.log('🎯 Calling endGame with - Score:', finalCalculatedScore, 'Clicks:', actualClickCount, 'Time:', actualTimeElapsed);
      
      // Call the blockchain endGame function
      // Note: We'll need to implement this or use the existing one
      // For now, we'll just log the values
      console.log('🏆 Game ended - Final Score:', finalCalculatedScore, 'Clicks:', actualClickCount, 'Time:', actualTimeElapsed);
      
      // Submit score to blockchain
      try {
        const timeInSeconds = Math.floor(actualTimeElapsed / 100);  // Convert centiseconds to seconds for blockchain
        console.log('🎯 Submitting score with time data:', {
          originalTimeCentiseconds: actualTimeElapsed,
          timeInSeconds: timeInSeconds
        });
        
        const success = await blockchainSubmitScore(
          accountAddress!, 
          finalCalculatedScore, 
          actualClickCount, 
          timeInSeconds  // Send seconds, not centiseconds
        );
        
        if (success) {
          console.log('✅ Score submitted to blockchain successfully');
        } else {
          console.warn('⚠️ Failed to submit score to blockchain');
        }
      } catch (error) {
        console.error('❌ Error submitting score to blockchain:', error);
      }
    }
    
    // Clear timeouts
    if (blockTimeoutRef.current) {
      clearTimeout(blockTimeoutRef.current);
      blockTimeoutRef.current = null;
    }
    
    if (gameLoopRef.current) {
      cancelAnimationFrame(gameLoopRef.current);
      gameLoopRef.current = null;
    }
  }, [storeEndGame, storeGetCalculatedScore, isConnected, gamePassStatus, effectiveForceDemoMode, blockchainSubmitScore, accountAddress]);

  // Handle manual game ending (End Game button)
  const handleEndGame = useCallback(() => {
    // If the game wasn't started (no first block clicked), just reset to start state
    if (!gameStarted) {
      storeResetGame();
      setShowGameOverModal(false);
      
      // Clear timeouts
      if (blockTimeoutRef.current) {
        clearTimeout(blockTimeoutRef.current);
        blockTimeoutRef.current = null;
      }
      
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
        gameLoopRef.current = null;
      }
      
      return; // Exit early, don't show game over or call blockchain endGame
    }
    
    // Game was actually played - proceed with normal end game logic
    // Only call blockchain endGame if not in forced demo mode
    if (effectiveForceDemoMode) {
      // Just reset the game state without blockchain calls
      storeResetGame();
      setShowGameOverModal(false);
      
      // Clear timeouts
      if (blockTimeoutRef.current) {
        clearTimeout(blockTimeoutRef.current);
        blockTimeoutRef.current = null;
      }
      
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
        gameLoopRef.current = null;
      }
      
      return;
    }
    
          endGameAndCleanup();
  }, [endGameAndCleanup, effectiveForceDemoMode, gameStarted, storeResetGame]);

  // Spawn a new block
  const spawnBlock = useCallback(() => {
    console.log('🎯 spawnBlock called, gameActive:', gameActive);
    if (!gameActive) {
      console.log('❌ spawnBlock early return - game not active');
      return;
    }
    
    const x = Math.floor(Math.random() * GRID_SIZE);
    const y = Math.floor(Math.random() * GRID_SIZE);
    const id = Date.now();
    
    const newBlock: GameBlock = {
      id,
      x,
      y,
      visible: true,
      spawnTime: Date.now(),
    };
    
    storeSpawnBlock(newBlock);
    console.log('✅ Block spawned:', newBlock);
    
    // Set timeout for this block (first block has no timeout)
    if (gameStarted) {
      const currentTime = currentTimeRef.current || timeElapsed;
      const visibilityTime = getVisibilityTime(currentTime);
      
      console.log('⏰ Setting block timeout for', visibilityTime, 'ms at time', currentTime);
      
      blockTimeoutRef.current = setTimeout(() => {
        endGameAndCleanup();
      }, visibilityTime);
    }
  }, [timeElapsed, gameActive, gameStarted, storeSpawnBlock, endGameAndCleanup, getVisibilityTime]);

  // Auto-spawn first block when game becomes active
  useEffect(() => {
    if (gameActive && !currentBlock && !gameStarted) {
      console.log('🎯 Auto-spawning first block due to gameActive change');
      // Use setTimeout to ensure this runs after the current render cycle
      setTimeout(() => {
        spawnBlock();
      }, 0);
    }
  }, [gameActive, currentBlock, gameStarted, spawnBlock]);

  // Handle block click
  const handleBlockClick = useCallback((x: number, y: number) => {
    console.log('🎯 Block clicked at:', x, y, 'Current block:', currentBlock, 'Game active:', gameActive);
    
    if (!currentBlock || !gameActive) {
      console.log('❌ Block click ignored - no current block or game not active');
      return;
    }
    
    // Check if this is the first block click (game start)
    if (!gameStarted) {
      // Consume 1 game credit immediately (user is committed to playing)
      // Only consume if user is in premium mode (not forced demo)
      if (isConnected && gamePassStatus && gamePassStatus.isActive && !effectiveForceDemoMode) {
        console.log('🎮 Consuming game credit for premium user');
        // Call blockchain to consume 1 credit (game owner pays gas)
        consumeGameCredit(gamePassStatus.id).then(success => {
          if (success) {
            console.log('✅ Credit consumed successfully');
            // Refresh the game pass status to show updated credits
            refreshGamePass();
          } else {
            console.warn('❌ Failed to consume credit, but game continues');
          }
        }).catch(error => {
          console.error('❌ Error consuming credit:', error);
        });
      } else if (effectiveForceDemoMode) {
        console.log('🎮 Demo mode - no credit consumption');
      } else {
        console.log('🎮 No active game pass - no credit consumption');
      }
      
      console.log('🎯 Game: First block clicked, calling storeClickBlock()');
      // Use store to handle first click
      storeClickBlock();
      storeClearBlock();
      
      playRandomSound();
      
      // Schedule next block spawn
      setTimeout(() => {
        spawnBlock();
      }, 500);
      return;
    }
    
    // Check if click is on the correct block
    if (currentBlock.x === x && currentBlock.y === y) {
      console.log('🎯 Game: Correct block clicked! Current score state:', score, 'Calling storeClickBlock()');
      
      // Use store to handle block click
      storeClickBlock();
      storeClearBlock();
      
      playRandomSound();
      
      // Clear timeout for this block
      if (blockTimeoutRef.current) {
        clearTimeout(blockTimeoutRef.current);
        blockTimeoutRef.current = null;
      }
      
      // Schedule next block spawn
      setTimeout(() => {
        spawnBlock();
      }, 500);
    } else {
      console.log('❌ Wrong block clicked! Expected:', currentBlock.x, currentBlock.y, 'Got:', x, y);
      endGameAndCleanup();
    }
  }, [currentBlock, gameActive, gameStarted, score, playRandomSound, spawnBlock, endGameAndCleanup, isConnected, gamePassStatus, effectiveForceDemoMode, consumeGameCredit, refreshGamePass, storeClickBlock, storeClearBlock]);

  // Game loop for updating time
  const gameLoop = useCallback(() => {
    // SSR Safety: Check if we're in browser environment
    if (typeof window === 'undefined') return;
    
    if (gameActive && gameStarted) {
      const now = performance.now();
      if (gameStartTimeRef.current === 0) {
        gameStartTimeRef.current = now;
        console.log('⏰ Game loop: Starting timer at', now);
      }
      
      const newTime = now - gameStartTimeRef.current;
      // Store time directly in centiseconds (actually 10x larger than real centiseconds)
      const timeInCentiseconds = Math.floor(newTime / 10);
      currentTimeRef.current = timeInCentiseconds;
      
      // Only update store every 50ms for smoother timer updates
      const shouldUpdateStore = Math.floor(newTime / 50) !== Math.floor(timeElapsed / 50);
      if (shouldUpdateStore) {
        storeUpdateTime(timeInCentiseconds);
        console.log('⏰ Game loop: Updated store time to', timeInCentiseconds, 'units (', newTime, 'ms)');
      }
      
      // Use worker for level calculations if available
      if (isWorkerReady) {
        // Send time in centiseconds to worker
        workerPostMessage('UPDATE_TIME', { timeElapsed: timeInCentiseconds });
      } else {
        // Fallback to local calculation
        // No endurance level tracking needed
      }
    }
    
    if (gameActive && typeof window !== 'undefined') {
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    }
  }, [gameActive, gameStarted, storeUpdateTime, isWorkerReady, workerPostMessage]); // Removed timeElapsed dependency

  // Start game loop when game becomes active
  useEffect(() => {
    if (gameActive) {
      gameLoop();
    }
    
    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameActive, gameLoop]);



  // Handle start game
  const handleStartGame = useCallback(() => {
    console.log('🚀 handleStartGame called, current gameActive:', gameActive);
    
    // Prevent multiple calls
    if (gameActive) {
      console.log('⚠️ Game already active, ignoring start request');
      return;
    }
    
    // Clear any existing timeouts
    if (blockTimeoutRef.current) {
      clearTimeout(blockTimeoutRef.current);
      blockTimeoutRef.current = null;
    }
    
    // Clear any existing game loop
    if (gameLoopRef.current) {
      cancelAnimationFrame(gameLoopRef.current);
      gameLoopRef.current = null;
    }
    
    // Reset timer references BEFORE starting new game
    gameStartTimeRef.current = 0; // Reset game start time
    currentTimeRef.current = 0; // Reset current time
    
    // Use store to start game
    storeStartGame();
    setShowGameOverModal(false); // Hide the modal
    
    // Only call blockchain startGame if user is connected and has premium
    // AND is not in forced demo mode
    if (isConnected && gamePassStatus && gamePassStatus.isActive && !effectiveForceDemoMode) {
      // Note: We'll need to implement this or use the existing one
      console.log('🎮 Starting blockchain game session...');
    }
    
    // Start spawning blocks - will be handled by useEffect when gameActive becomes true
    console.log('🚀 Game start initiated, spawnBlock will be called when gameActive becomes true');
  }, [gameActive, isConnected, gamePassStatus, effectiveForceDemoMode, storeStartGame]);

  // Memoized computed values for better performance
  const gameControlsProps = useMemo(() => ({
    gameActive,
    onStartGame: handleStartGame,
    onEndGame: handleEndGame,
    connected: isConnected || isFreeTier
  }), [gameActive, handleStartGame, handleEndGame, isConnected, isFreeTier]);

  return (
    <div className="game-container flex flex-col items-center justify-center bg-transparent text-white p-4 min-h-screen">

      {/* Free Demo Mode Indicator */}
      {(isFreeTier || effectiveForceDemoMode) && (
        <div className="w-full max-w-md mb-4 p-3 bg-[var(--color-accent1)]/20 border border-[var(--color-accent1)]/30 rounded-lg text-center">
          <p className="text-[var(--color-accent1)] text-sm font-medium">
            {effectiveForceDemoMode && isConnected ? '🆓 Playing in Demo Mode (Premium Available)' : '🆓 Playing in Free Demo Mode'}
          </p>
          <p className="text-[var(--color-text-secondary)] text-xs mt-1">
            {effectiveForceDemoMode && isConnected 
              ? 'Scores are not saved. Click "Premium" in header to use your game pass!'
              : 'Scores are not saved. Connect wallet for premium features!'
            }
          </p>
        </div>
      )}

      {/* Game Stats */}
      <div className="mb-6">
        <GameStats 
          score={score} 
          timeElapsed={timeElapsed} 
          gameActive={gameActive}
        />
      </div>

      {/* Game Grid */}
      <div className="mb-6">
        <GameGrid 
          size={5}
          currentBlock={currentBlock}
          gameActive={gameActive}
          onBlockClick={handleBlockClick}
        />
      </div>
      
      {/* Game Controls */}
      <div className="mb-6">
        <GameControls {...gameControlsProps} />
      </div>

      {/* Game Over Modal */}
      <GameOverModal
        isOpen={showGameOverModal}
        score={score}
        timeElapsed={timeElapsed}

        forceDemoMode={effectiveForceDemoMode}
        gamePassStatus={gamePassStatus}
        onPlayAgain={() => {
          setShowGameOverModal(false);
          storeResetGame();
        }}
        onClose={() => {
          setShowGameOverModal(false);
          storeResetGame();
        }}
      />

            {/* Game Pass Purchase Modal - Handled in Header */}
    </div>
  );
};
