'use client';

import React, { useState } from 'react';
import { Zap, Crown, Infinity, X } from 'lucide-react';

interface GamePassOption {
  id: 'basic' | 'premium' | 'unlimited';
  name: string;
  price: string;
  priceInSui: number;
  games: string;
  icon: React.ReactNode;
  features: string[];
  popular?: boolean;
}

interface GamePassPurchaseProps {
  onPurchase: (passType: string, priceInSui: number) => Promise<boolean>;
  onClose: () => void;
  isLoading: boolean;
  existingGamePass?: {
    passType: string;
    gamesRemaining: number;
    isActive: boolean;
  } | null;
}

export const GamePassPurchase: React.FC<GamePassPurchaseProps> = ({
  onPurchase,
  onClose,
  isLoading,
  existingGamePass,
}) => {
  const [selectedPass, setSelectedPass] = useState<string | null>(null);

  const gamePassOptions: GamePassOption[] = [
    {
      id: 'basic',
      name: 'Basic Pack',
      price: '0.1 SUI',
      priceInSui: 0.1,
      games: '10 Games',
      icon: <Zap className="w-6 h-6" />,
      features: [],
    },
    {
      id: 'premium',
      name: 'Value Pack',
      price: '0.4 SUI',
      priceInSui: 0.4,
      games: '50 Games',
      icon: <Crown className="w-6 h-6" />,
      features: [],
      popular: true,
    },
    {
      id: 'unlimited',
      name: 'Unlimited Pack',
      price: '1.0 SUI',
      priceInSui: 1.0,
      games: 'Unlimited',
      icon: <Infinity className="w-6 h-6" />,
      features: [],
    },
  ];

  const handlePurchase = async (option: GamePassOption) => {
    setSelectedPass(option.id);
    const success = await onPurchase(option.id, option.priceInSui);
    if (success) {
      onClose();
    }
    setSelectedPass(null);
  };

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
          maxWidth: '768px',
          maxHeight: '90vh',
          overflowY: 'auto',
          backgroundColor: 'var(--color-background)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="
            absolute top-3 right-3 sm:top-4 sm:right-4 p-2 rounded-full
            bg-[var(--color-background)] bg-opacity-50
            text-[var(--color-text-secondary)] hover:text-[var(--color-accent1)]
            hover:bg-[var(--color-background)] transition-all duration-200
            border border-[var(--color-border)] hover:border-[var(--color-accent1)]
            min-w-[44px] min-h-[44px]
            flex items-center justify-center
          "
        >
          <X className="w-4 h-4" />
        </button>

        {/* Content */}
        <div className="p-4 sm:p-6">
          {/* Header */}
          <div className="text-center mb-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-[var(--color-accent1)] mb-2">
              {existingGamePass ? '➕ Add More Games' : '🎮 Choose Your Game Pass'}
            </h2>
            <p className="text-[var(--color-text-secondary)] text-sm sm:text-base">
              {existingGamePass 
                ? `You have ${existingGamePass.gamesRemaining} games remaining. Add more to continue playing!`
                : 'Unlock blockchain features, global leaderboards, and rewards!'
              }
            </p>
            <div className="w-16 h-1 bg-gradient-to-r from-[var(--color-accent1)] to-[var(--color-accent2)] mx-auto mt-3 rounded-full"></div>
          </div>



          {/* Benefits Section */}
          <div className="mb-6 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
            <h4 className="text-blue-300 font-semibold mb-3 text-center">
              🔒 Premium Features (All Game Passes Include):
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-blue-200 text-sm">
              <div>• Blockchain score verification</div>
              <div>• Global leaderboard access</div>
              <div>• Game statistics tracking</div>
              <div>• Score persistence</div>
              <div>• Premium game experience</div>
              <div>• Blockchain-backed gameplay</div>
            </div>
          </div>

          {/* Game Pass Options */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
            {gamePassOptions.map((option) => (
              <div
                key={option.id}
                className={`
                  relative border-2 rounded-xl p-4 transition-all duration-300 cursor-pointer
                  ${option.popular 
                    ? 'border-[var(--color-accent1)] bg-gradient-to-br from-[var(--color-accent1)]/10 to-[var(--color-accent2)]/10' 
                    : 'border-[var(--color-border)] hover:border-[var(--color-accent2)]'
                  }
                  hover:shadow-lg hover:scale-105 transform
                  ${selectedPass === option.id ? 'opacity-50 pointer-events-none' : ''}
                `}
                onClick={() => handlePurchase(option)}
              >
                {/* Popular Badge */}
                {option.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-[var(--color-accent1)] text-[var(--color-background)] text-xs font-bold px-3 py-1 rounded-full">
                      MOST POPULAR
                    </span>
                  </div>
                )}

                {/* Icon */}
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center mb-3 mx-auto
                  ${option.popular 
                    ? 'bg-[var(--color-accent1)] text-[var(--color-background)]' 
                    : 'bg-[var(--color-background)] text-[var(--color-accent2)]'
                  }
                `}>
                  {option.icon}
                </div>

                {/* Title and Price */}
                <div className="text-center mb-3">
                  <h3 className="text-lg font-bold text-[var(--color-text)] mb-1">
                    {option.name}
                  </h3>
                  <div className="text-2xl font-bold text-[var(--color-accent1)] mb-1">
                    {option.price}
                  </div>
                  <div className="text-sm text-[var(--color-text-secondary)]">
                    {option.games}
                  </div>
                </div>



                {/* Purchase Button */}
                <button
                  disabled={isLoading || selectedPass === option.id}
                  className={`
                    w-full py-3 px-4 rounded-lg font-medium transition-all duration-200
                    ${option.popular
                      ? 'bg-[var(--color-accent1)] hover:bg-[var(--color-accent2)] text-[var(--color-background)]'
                      : 'bg-[var(--color-background)] hover:bg-[var(--color-accent2)] text-[var(--color-text)] hover:text-white'
                    }
                    border border-[var(--color-border)] hover:border-[var(--color-accent2)]
                    disabled:opacity-50 disabled:cursor-not-allowed
                    hover:shadow-md active:scale-95
                  `}
                >
                  {selectedPass === option.id ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 12">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {existingGamePass ? 'Adding Games...' : 'Purchasing...'}
                    </span>
                  ) : (
                    existingGamePass ? `Add ${option.games} to Pass` : `Purchase ${option.name}`
                  )}
                </button>
              </div>
            ))}
          </div>

          {/* Footer Info */}
          <div className="mt-6 p-3 bg-gray-900/20 border border-gray-500/30 rounded-lg">
            <p className="text-gray-300 text-xs text-center">
              💡 Your game pass is stored as an NFT on the Sui blockchain and can be used immediately after purchase
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
