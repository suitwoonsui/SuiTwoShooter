'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { GamePass } from '@/lib/types';
import { useBlockchain } from './BlockchainContext';
import { useWallet } from './WalletContext';

interface GamePassContextType {
  // State
  gamePass: GamePass | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  refreshGamePass: () => Promise<void>;
  purchaseGamePass: (passType: 'basic' | 'premium' | 'unlimited') => Promise<boolean>;
  addGamesToPass: (passType: 'basic' | 'premium' | 'unlimited', additionalGames: number) => Promise<boolean>;
  consumeGameCredit: (gamePassId: string) => Promise<boolean>;
  
  // Computed properties
  hasActivePass: boolean;
  gamesRemaining: number;
  passTypeDisplay: string;
}

const GamePassContext = createContext<GamePassContextType | undefined>(undefined);

export const useGamePass = () => {
  const context = useContext(GamePassContext);
  if (context === undefined) {
    throw new Error('useGamePass must be used within a GamePassProvider');
  }
  return context;
};

interface GamePassProviderProps {
  children: ReactNode;
}

export const GamePassProvider: React.FC<GamePassProviderProps> = ({ children }) => {
  const { gamePassService, isReadyForReads } = useBlockchain(); // Changed from isReady to isReadyForReads
  const { isConnected, accountAddress } = useWallet();
  
  // State
  const [gamePass, setGamePass] = useState<GamePass | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refresh game pass status
  const refreshGamePass = useCallback(async () => {
    if (!isReadyForReads || !accountAddress) { // Changed from isReady to isReadyForReads
      console.log('⚠️ Cannot refresh game pass:', { isConnected, accountAddress, isReadyForReads });
      setGamePass(null);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      console.log('🎫 Refreshing game pass for:', accountAddress);
      console.log('🔧 GamePass service ready:', gamePassService.isReady());
      console.log('🔧 GamePass service has signAndExecute:', !!gamePassService['signAndExecute']);
      
      const pass = await gamePassService.getGamePassStatus(accountAddress);
      setGamePass(pass);
      console.log('✅ Game pass loaded:', pass);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load game pass';
      console.error('❌ Failed to load game pass:', err);
      setError(errorMessage);
      setGamePass(null);
    } finally {
      setIsLoading(false);
    }
  }, [isReadyForReads, accountAddress, gamePassService]); // Changed from isReady to isReadyForReads

  // Auto-refresh when conditions change
  useEffect(() => {
    refreshGamePass();
  }, [refreshGamePass]);

  // Purchase a new game pass
  const purchaseGamePass = useCallback(async (
    passType: 'basic' | 'premium' | 'unlimited'
  ): Promise<boolean> => {
    if (!isReadyForReads) { // Changed from isReady to isReadyForReads
      const errorMsg = 'Blockchain services not ready';
      console.error('❌ Purchase failed:', errorMsg);
      setError(errorMsg);
      return false;
    }

    if (!gamePassService) {
      const errorMsg = 'GamePass service not available';
      console.error('❌ Purchase failed:', errorMsg);
      setError(errorMsg);
      return false;
    }

    if (!gamePassService['signAndExecute']) {
      const errorMsg = 'Transaction signing not available';
      console.error('❌ Purchase failed:', errorMsg);
      setError(errorMsg);
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('💰 Purchasing game pass:', passType);
      console.log('🔧 Service ready:', gamePassService.isReady());
      console.log('🔧 Has signAndExecute:', !!gamePassService['signAndExecute']);
      
      const result = await gamePassService.purchaseGamePass(passType);
      
      if (result.success) {
        console.log('✅ Game pass purchased successfully');
        // Refresh the game pass status
        await refreshGamePass();
        return true;
      } else {
        const errorMessage = result.error || 'Purchase failed';
        console.error('❌ Purchase failed:', errorMessage);
        setError(errorMessage);
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Purchase failed';
      console.error('❌ Purchase error:', err);
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isReadyForReads, gamePassService, refreshGamePass]); // Changed from isReady to isReadyForReads

  // Add games to existing pass
  const addGamesToPass = useCallback(async (
    passType: 'basic' | 'premium' | 'unlimited',
    additionalGames: number
  ): Promise<boolean> => {
    if (!isReadyForReads || !gamePass?.id) { // Changed from isReady to isReadyForReads
      setError('No active game pass or services not ready');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('➕ Adding games to pass:', { passType, additionalGames });
      const result = await gamePassService.addGamesToExistingPass(
        gamePass.id, 
        passType, 
        additionalGames
      );
      
      if (result.success) {
        console.log('✅ Games added successfully');
        // Refresh the game pass status
        await refreshGamePass();
        return true;
      } else {
        const errorMessage = result.error || 'Failed to add games';
        console.error('❌ Add games failed:', errorMessage);
        setError(errorMessage);
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add games';
      console.error('❌ Add games error:', err);
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isReadyForReads, gamePass?.id, gamePassService, refreshGamePass]); // Changed from isReady to isReadyForReads

  // Consume a game credit
  const consumeGameCredit = useCallback(async (gamePassId: string): Promise<boolean> => {
    if (!isReadyForReads || !accountAddress) { // Changed from isReady to isReadyForReads
      setError('Services not ready or wallet not connected');
      return false;
    }

    try {
      console.log('🎮 Consuming game credit for pass:', gamePassId);
      const success = await gamePassService.consumeGameCredit(gamePassId, accountAddress);
      
      if (success) {
        console.log('✅ Game credit consumed');
        // Refresh the game pass status to reflect the change
        await refreshGamePass();
        return true;
      } else {
        console.error('❌ Failed to consume game credit');
        setError('Failed to consume game credit');
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to consume game credit';
      console.error('❌ Consume credit error:', err);
      setError(errorMessage);
      return false;
    }
  }, [isReadyForReads, accountAddress, gamePassService, refreshGamePass]); // Changed from isReady to isReadyForReads

  // Computed properties
  const hasActivePass = Boolean(gamePass?.isActive);
  const gamesRemaining = gamePass?.gamesRemaining || 0;
  const passTypeDisplay = gamePass?.passType === 'unlimited' ? 'Unlimited' : 
                         gamePass?.passType === 'premium' ? 'Premium' : 
                         gamePass?.passType === 'basic' ? 'Basic' : 'None';

  const value: GamePassContextType = {
    // State
    gamePass,
    isLoading,
    error,
    
    // Actions
    refreshGamePass,
    purchaseGamePass,
    addGamesToPass,
    consumeGameCredit,
    
    // Computed properties
    hasActivePass,
    gamesRemaining,
    passTypeDisplay,
  };

  return (
    <GamePassContext.Provider value={value}>
      {children}
    </GamePassContext.Provider>
  );
};
