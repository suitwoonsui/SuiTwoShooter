'use client';

import React from 'react';
import { Zap, Crown, Infinity, ShoppingCart } from 'lucide-react';

interface GamePass {
  id: string; // Object ID of the GamePass NFT
  passType: number;
  gamesRemaining: number;
  expiresAt: number;
  isActive: boolean;
}

interface GamePassStatusProps {
  gamePass: GamePass | null;
  isLoading: boolean;
  onPurchase: () => void;
  onRefresh?: () => void;
}

export const GamePassStatus: React.FC<GamePassStatusProps> = ({
  gamePass,
  isLoading,
  onPurchase,
  onRefresh,
}) => {
  const getPassInfo = (passType: number) => {
    switch (passType) {
      case 1:
        return {
          name: 'Basic Pass',
          icon: <Zap className="w-4 h-4" />,
          color: 'text-blue-400',
          bgColor: 'bg-blue-900/20',
          borderColor: 'border-blue-500/30',
        };
      case 2:
        return {
          name: 'Premium Pass',
          icon: <Crown className="w-4 h-4" />,
          color: 'text-purple-400',
          bgColor: 'bg-purple-900/20',
          borderColor: 'border-purple-500/30',
        };
      case 3:
        return {
          name: 'Monthly Unlimited',
          icon: <Infinity className="w-4 h-4" />,
          color: 'text-gold-400',
          bgColor: 'bg-yellow-900/20',
          borderColor: 'border-yellow-500/30',
        };
      default:
        return {
          name: 'Unknown Pass',
          icon: <Zap className="w-4 h-4" />,
          color: 'text-gray-400',
          bgColor: 'bg-gray-900/20',
          borderColor: 'border-gray-500/30',
        };
    }
  };

  const formatTimeRemaining = (expiresAt: number) => {
    if (expiresAt === 0) return null; // Game-based pass
    
    const now = Date.now();
    const timeLeft = expiresAt - now;
    
    if (timeLeft <= 0) return 'Expired';
    
    const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) {
      return `${days}d ${hours}h remaining`;
    } else {
      return `${hours}h remaining`;
    }
  };

  // Free tier display
  if (!gamePass || !gamePass.isActive) {
    return (
      <div className="w-full max-w-md p-4 bg-gray-900/20 border border-gray-500/30 rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gray-600 flex items-center justify-center">
              <span className="text-xs">🆓</span>
            </div>
            <h3 className="text-gray-300 font-semibold">Free Demo Mode</h3>
          </div>
          <span className="text-xs text-gray-400 bg-gray-700 px-2 py-1 rounded">
            LOCAL ONLY
          </span>
        </div>
        
        <p className="text-gray-400 text-sm mb-3">
          Playing in demo mode. Your scores are not saved - upgrade for blockchain storage!
        </p>
        
        <div className="space-y-2 text-xs text-gray-400 mb-4">
          <div>• Unlimited demo gameplay</div>
          <div>• Score display at game end only</div>
          <div>• No data persistence</div>
          <div className="text-gray-500">• No personal best tracking</div>
          <div className="text-gray-500">• No global leaderboards</div>
          <div className="text-gray-500">• No blockchain rewards</div>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={onPurchase}
            disabled={isLoading}
            className="
              flex-1 py-2 px-4 rounded-lg font-medium transition-all duration-200
              bg-gradient-to-r from-[var(--color-accent1)] to-[var(--color-accent2)]
              text-[var(--color-background)] hover:shadow-lg hover:scale-105 active:scale-95
              disabled:opacity-50 disabled:cursor-not-allowed
              flex items-center justify-center gap-2
            "
          >
            <ShoppingCart className="w-4 h-4" />
            {isLoading ? 'Loading...' : 'Upgrade to Premium'}
          </button>
          
          <button
            onClick={onRefresh || (() => window.location.reload())}
            className="
              py-2 px-3 rounded-lg font-medium transition-all duration-200
              bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white
              border border-gray-600 hover:border-gray-500
            "
            title={onRefresh ? "Refresh game pass status" : "Refresh to check for new game pass"}
          >
            🔄
          </button>
        </div>
        
        <div className="mt-3 p-2 bg-blue-900/20 border border-blue-500/30 rounded text-center">
          <p className="text-blue-300 text-xs font-medium">
            🔑 Connect your Sui wallet to purchase
          </p>
          <p className="text-blue-200 text-xs mt-1">
            Game passes require wallet connection for SUI payments
          </p>
        </div>
        
        <p className="text-center text-xs text-gray-500 mt-2">
          Unlock global features starting from 0.1 SUI
        </p>
      </div>
    );
  }

  // Premium tier display
  const passInfo = getPassInfo(gamePass.passType);
  const timeRemaining = formatTimeRemaining(gamePass.expiresAt);

  return (
    <div className={`w-full max-w-md p-4 ${passInfo.bgColor} border ${passInfo.borderColor} rounded-lg`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded-full ${passInfo.bgColor} ${passInfo.color} flex items-center justify-center border ${passInfo.borderColor}`}>
            {passInfo.icon}
          </div>
          <h3 className={`${passInfo.color} font-semibold`}>{passInfo.name}</h3>
        </div>
        <span className={`text-xs ${passInfo.color} bg-opacity-20 px-2 py-1 rounded ${passInfo.bgColor}`}>
          ACTIVE
        </span>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-3">
        <div>
          <div className="text-xs text-gray-400 mb-1">Games Remaining</div>
          <div className={`text-lg font-bold ${passInfo.color}`}>
            {gamePass.gamesRemaining === 999999 ? '∞' : gamePass.gamesRemaining}
          </div>
        </div>
        {timeRemaining && (
          <div>
            <div className="text-xs text-gray-400 mb-1">Time Left</div>
            <div className={`text-sm font-medium ${passInfo.color}`}>
              {timeRemaining}
            </div>
          </div>
        )}
      </div>
      
      <div className="space-y-1 text-xs text-gray-300 mb-4">
        <div>✅ Global leaderboard access</div>
        <div>✅ Blockchain score storage</div>
        <div>✅ Achievement NFTs</div>
        <div>✅ Token rewards</div>
        {gamePass.passType >= 2 && <div>✅ Tournament entry</div>}
        {gamePass.passType >= 3 && <div>✅ VIP features</div>}
      </div>
      
      {gamePass.gamesRemaining <= 5 && gamePass.gamesRemaining > 0 && (
        <div className="p-2 bg-orange-900/20 border border-orange-500/30 rounded text-center">
          <p className="text-orange-300 text-xs">
            ⚠️ Only {gamePass.gamesRemaining} games remaining
          </p>
        </div>
      )}
      
      {gamePass.gamesRemaining === 0 && (
        <div className="space-y-2">
          <div className="p-2 bg-red-900/20 border border-red-500/30 rounded text-center">
            <p className="text-red-300 text-xs">
              🚫 Pass expired - Playing in demo mode
            </p>
          </div>
          <button
            onClick={onPurchase}
            disabled={isLoading}
            className="
              w-full py-2 px-4 rounded-lg font-medium transition-all duration-200
              bg-gradient-to-r from-[var(--color-accent1)] to-[var(--color-accent2)]
              text-white hover:shadow-lg hover:scale-105 active:scale-95
              disabled:opacity-50 disabled:cursor-not-allowed
              flex items-center justify-center gap-2 text-sm
            "
          >
            <ShoppingCart className="w-4 h-4" />
            Renew Pass
          </button>
        </div>
      )}
    </div>
  );
};
