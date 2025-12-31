'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useMemo } from 'react';
import { useSuiClient, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { 
  createBlockchainServices,
  BaseBlockchainService,
  GamePassService,
  ScoreSystemService,
  GameCoreService
} from '@/lib/services/blockchain';
import { NetworkType, PlayerStats } from '@/lib/types';
import { useWallet } from './WalletContext';

// Interface for transaction result
interface TransactionResult {
  events?: Array<{ type: string; parsedJson?: Record<string, unknown> }>;
  effects?: string;
  digest?: string;
}

interface BlockchainContextType {
  // Services
  baseService: BaseBlockchainService;
  gamePassService: GamePassService;
  scoreSystemService: ScoreSystemService;
  gameCoreService: GameCoreService;
  
  // State
  isReady: boolean;
  isReadyForReads: boolean; // New: for read-only operations
  isReadyForWrites: boolean; // New: for write operations
  playerStats: PlayerStats | null;
  isLoadingStats: boolean;
  network: NetworkType;
  
  // Actions
  refreshPlayerStats: () => Promise<void>;
  switchNetwork: (network: NetworkType) => Promise<void>;
  
  // Service helpers (for backward compatibility)
  getBalance: (address: string) => Promise<bigint>;
  submitScore: (playerAddress: string, finalScore: number, enduranceLevel: number, clicks?: number, timeElapsed?: number) => Promise<boolean>;

  // Contract management
  getActiveContracts: () => {
    scoreSystemId: string;
    gamePassSystemId: string;
    adminSystemId: string;
  };
  getOldContracts: () => {
    scoreSystemId?: string;
    gamePassSystemId?: string;
    adminSystemId?: string;
  };
  needsMigration: () => boolean;
}

const BlockchainContext = createContext<BlockchainContextType | undefined>(undefined);

export const useBlockchain = () => {
  const context = useContext(BlockchainContext);
  if (context === undefined) {
    throw new Error('useBlockchain must be used within a BlockchainProvider');
  }
  return context;
};

interface BlockchainProviderProps {
  children: ReactNode;
  defaultNetwork?: NetworkType;
}

export const BlockchainProvider: React.FC<BlockchainProviderProps> = ({ 
  children, 
  defaultNetwork = 'testnet' 
}) => {
  const _suiClient = useSuiClient();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();
  const { isConnected, accountAddress } = useWallet();
  
  // State
  const [network, setNetwork] = useState<NetworkType>(defaultNetwork);
  const [playerStats, setPlayerStats] = useState<PlayerStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  // Contract IDs - support both old and new
  const contracts = {
    // New contracts (active use)
    scoreSystemId: process.env.NEXT_PUBLIC_SCORE_SYSTEM_ID!,
    gamePassSystemId: process.env.NEXT_PUBLIC_GAME_PASS_SYSTEM_ID!,
    adminSystemId: process.env.NEXT_PUBLIC_ADMIN_SYSTEM_ID!,
    
    // Old contracts (for migration)
    oldScoreSystemId: process.env.NEXT_PUBLIC_OLD_SCORE_SYSTEM_ID,
    oldGamePassSystemId: process.env.NEXT_PUBLIC_OLD_GAME_PASS_SYSTEM_ID,
    oldAdminSystemId: process.env.NEXT_PUBLIC_OLD_ADMIN_SYSTEM_ID
  };

  // Validate contract IDs
  useEffect(() => {
    const requiredContracts = [
      'scoreSystemId',
      'gamePassSystemId', 
      'adminSystemId'
    ];

    for (const contract of requiredContracts) {
      if (!contracts[contract as keyof typeof contracts]) {
        console.error(`❌ Missing required contract ID: ${contract.toUpperCase()}`);
      }
    }

    // Log contract status
    console.log('🔧 Contract Configuration:');
    console.log(`   🏆 Score System: ${contracts.scoreSystemId}`);
    console.log(`   🎫 Game Pass System: ${contracts.gamePassSystemId}`);
    console.log(`   👑 Admin System: ${contracts.adminSystemId}`);
    
    if (contracts.oldScoreSystemId) {
      console.log(`   📤 Old Score System: ${contracts.oldScoreSystemId}`);
    }
    if (contracts.oldGamePassSystemId) {
      console.log(`   📤 Old Game Pass System: ${contracts.oldGamePassSystemId}`);
    }
    
    if (contracts.oldScoreSystemId || contracts.oldGamePassSystemId) {
      console.log('🔄 Migration mode detected - old contracts found');
    }
  }, []);

  // Create services using the factory
  const services = useMemo(() => {
    return createBlockchainServices(network);
  }, [network]);

  // Set up sign and execute function when available
  useEffect(() => {
    if (signAndExecute && services) {
      // Create an adapter to match our expected SignAndExecute type
      const signAndExecuteAdapter = async (input: { 
        transaction: unknown; 
        chain?: `${string}:${string}`; 
        options?: { showEvents?: boolean; showEffects?: boolean }; 
      }) => {
        try {
          console.log('🔧 Executing transaction with dapp-kit...');
          const result = await signAndExecute({
            transaction: input.transaction as string | import('@mysten/sui/transactions').Transaction,
            chain: input.chain
          });
          
          console.log('✅ Transaction executed successfully:', result);
          
          return {
            events: (result as TransactionResult).events || [],
            effects: (result as TransactionResult).effects || '',
            digest: (result as TransactionResult).digest || ''
          };
        } catch (error) {
          console.error('❌ Transaction execution failed:', error);
          throw error;
        }
      };

      // Set the adapter on all services
      services.base.setSignAndExecute(signAndExecuteAdapter);
      services.gamePass.setSignAndExecute(signAndExecuteAdapter);
      services.scoreSystem.setSignAndExecute(signAndExecuteAdapter);
      services.gameCore.setSignAndExecute(signAndExecuteAdapter);
      
      console.log('✅ Sign and execute function set on all services');
    }
  }, [signAndExecute, network]); // Only depend on network, not services

  // Check if services are ready for different operation types
  const { isReady, isReadyForReads, isReadyForWrites } = useMemo(() => {
    const servicesReady = services.base.isReady() && 
                         services.gamePass.isReady() && 
                         services.scoreSystem.isReady() &&
                         services.gameCore.isReady();
    
    // Read operations only need services to be ready (no wallet required)
    const readyForReads = servicesReady;
    
    // Write operations need both services AND wallet connection
    const readyForWrites = servicesReady && isConnected && !!signAndExecute;
    
    // Overall ready state (for backward compatibility) - requires wallet for full functionality
    const overallReady = servicesReady && isConnected && !!signAndExecute;
    
    console.log('🔧 Services ready check:', {
      base: services.base.isReady(),
      gamePass: services.gamePass.isReady(),
      scoreSystem: services.scoreSystem.isReady(),
      walletConnected: isConnected,
      hasSignAndExecute: !!signAndExecute,
      readyForReads,
      readyForWrites,
      overallReady
    });
    
    return {
      isReady: overallReady,
      isReadyForReads: readyForReads,
      isReadyForWrites: readyForWrites
    };
  }, [services, isConnected, signAndExecute]);

  // Load player stats when services are ready (read operation - no wallet needed)
  const refreshPlayerStats = useCallback(async () => {
    if (!isReadyForReads || !accountAddress) {
      setPlayerStats(null);
      return;
    }

    setIsLoadingStats(true);
    try {
      console.log('🎯 Refreshing player stats for:', accountAddress);
      const stats = await services.base.getPlayerStats(accountAddress);
      setPlayerStats(stats);
      console.log('✅ Player stats loaded:', stats);
    } catch (error) {
      console.error('❌ Failed to load player stats:', error);
      setPlayerStats(null);
    } finally {
      setIsLoadingStats(false);
    }
  }, [isReadyForReads, accountAddress, services.base]);

  const forceRefreshPlayerStats = useCallback(async () => {
    if (!isReadyForReads || !accountAddress) {
      setPlayerStats(null);
      return;
    }

    console.log('🔄 Force refreshing player stats (clearing cache)...');
    setIsLoadingStats(true);
    
    // Clear any cached data first
    setPlayerStats(null);
    
    try {
      const stats = await services.base.getPlayerStats(accountAddress);
      setPlayerStats(stats);
      console.log('✅ Force refreshed player stats loaded:', stats);
    } catch (error) {
      console.error('❌ Failed to force refresh player stats:', error);
      setPlayerStats(null);
    } finally {
      setIsLoadingStats(false);
    }
  }, [isReadyForReads, accountAddress, services.base]);

  // Auto-refresh stats when conditions change
  useEffect(() => {
    refreshPlayerStats();
  }, [refreshPlayerStats]);

  // Handle wallet connection changes
  useEffect(() => {
    if (isConnected && signAndExecute) {
      console.log('🔗 Wallet connected, ensuring services are properly initialized...');
      
      // Ensure all services have the signAndExecute function
      if (services.base && services.gamePass && services.scoreSystem && services.gameCore) {
        const signAndExecuteAdapter = async (input: { 
          transaction: unknown; 
          chain?: `${string}:${string}`; 
          options?: { showEvents?: boolean; showEffects?: boolean }; 
        }) => {
          try {
            console.log('🔧 Executing transaction with dapp-kit...');
            const result = await signAndExecute({
              transaction: input.transaction as string | import('@mysten/sui/transactions').Transaction,
              chain: input.chain
            });
            
            console.log('✅ Transaction executed successfully:', result);
            
            return {
              events: (result as TransactionResult).events || [],
              effects: (result as TransactionResult).effects || '',
              digest: (result as TransactionResult).digest || ''
            };
          } catch (error) {
            console.error('❌ Transaction execution failed:', error);
            throw error;
          }
        };

        services.base.setSignAndExecute(signAndExecuteAdapter);
        services.gamePass.setSignAndExecute(signAndExecuteAdapter);
        services.scoreSystem.setSignAndExecute(signAndExecuteAdapter);
        services.gameCore.setSignAndExecute(signAndExecuteAdapter);
        
        console.log('✅ Services initialized with signAndExecute after wallet connection');
      }
    }
  }, [isConnected, signAndExecute, services]);

  // Switch network
  const switchNetwork = useCallback(async (newNetwork: NetworkType) => {
    console.log('🔄 Switching network to:', newNetwork);
    setNetwork(newNetwork);
    
    // Services will be recreated with new network via useMemo
    // Clear current stats since they're network-specific
    setPlayerStats(null);
  }, []);

  // Helper functions for backward compatibility
  const getBalance = useCallback(async (address: string): Promise<bigint> => {
    // Balance check is a read operation - no wallet connection needed
    if (!isReadyForReads) {
      throw new Error('Blockchain services not ready');
    }
    return services.base.getBalance(address);
  }, [services.base, isReadyForReads]);

  const submitScore = useCallback(async (
    playerAddress: string, 
    finalScore: number, 
    clicks: number = 0,
    timeElapsed: number = 0
  ): Promise<boolean> => {
    // Score submission is a write operation - needs wallet connection
    if (!isReadyForWrites) {
      console.error('❌ Cannot submit score: wallet not connected or services not ready');
      return false;
    }
    
    const result = await services.scoreSystem.submitScore(playerAddress, finalScore, clicks, timeElapsed);
    
    // If score submission was successful, refresh player stats to get updated data
    if (result.success) {
      console.log('✅ Score submitted successfully, refreshing player stats...');
      // Refresh immediately, then again after a delay to ensure blockchain state is updated
      refreshPlayerStats();
      setTimeout(() => {
        refreshPlayerStats();
      }, 3000); // 3 second delay to ensure blockchain state is updated
    }
    
    return result.success;
  }, [services.scoreSystem, refreshPlayerStats, isReadyForWrites]);

  const getActiveContracts = () => ({
    scoreSystemId: contracts.scoreSystemId,
    gamePassSystemId: contracts.gamePassSystemId,
    adminSystemId: contracts.adminSystemId
  });

  const getOldContracts = () => ({
    scoreSystemId: contracts.oldScoreSystemId,
    gamePassSystemId: contracts.oldGamePassSystemId,
    adminSystemId: contracts.oldAdminSystemId
  });

  const needsMigration = () => !!(contracts.oldScoreSystemId || contracts.oldGamePassSystemId);

  const contextValue: BlockchainContextType = {
    // Services
    baseService: services.base,
    gamePassService: services.gamePass,
    scoreSystemService: services.scoreSystem,
    gameCoreService: services.gameCore,
    
    // State
    isReady,
    isReadyForReads,
    isReadyForWrites,
    playerStats,
    isLoadingStats,
    network,
    
    // Actions
    refreshPlayerStats,
    switchNetwork,
    
    // Service helpers
    getBalance,
    submitScore,

    // Contract management
    getActiveContracts,
    getOldContracts,
    needsMigration
  };

  return (
    <BlockchainContext.Provider value={contextValue}>
      {children}
    </BlockchainContext.Provider>
  );
};
