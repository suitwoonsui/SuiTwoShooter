'use client';

import React from 'react';
import { Play, Square, Wallet } from 'lucide-react';

interface GameControlsProps {
  gameActive: boolean;
  onStartGame: () => void;
  onEndGame: () => void;
  connected: boolean;
}

export const GameControls: React.FC<GameControlsProps> = ({
  gameActive,
  onStartGame,
  onEndGame,
  connected,
}) => {
  if (!connected) {
    return (
      <div className="text-center">
        <div className="
          flex items-center justify-center gap-2 text-[var(--color-accent3)] mb-2
          bg-[var(--color-background-secondary)] bg-opacity-60 
          px-3 py-2 sm:px-4 sm:py-2 rounded-lg border border-[var(--color-border)]
          backdrop-blur-sm
        ">
          <Wallet className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="font-medium text-sm">Connect wallet for premium features</span>
        </div>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Use the wallet connection in the header above to unlock blockchain features
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 sm:gap-6">
      {!gameActive ? (
        <button
          onClick={onStartGame}
          className="
            flex items-center gap-2 sm:gap-3 px-6 sm:px-10 py-4 sm:py-5 
            bg-gradient-to-r from-[var(--color-accent1)] to-[var(--color-accent2)]
            text-white font-bold text-lg sm:text-xl rounded-xl sm:rounded-2xl 
            transition-all duration-300 ease-out
            shadow-lg hover:shadow-2xl transform hover:scale-110 active:scale-95
            hover:from-[var(--color-accent2)] hover:to-[var(--color-accent1)]
            border-2 border-[var(--color-accent1)] hover:border-[var(--color-accent2)]
            relative overflow-hidden group
            min-h-[56px] sm:min-h-[64px] /* Mobile touch target minimum */
            w-full max-w-sm sm:max-w-none
          "
        >
          {/* Glow effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-accent1)] to-[var(--color-accent2)] opacity-0 group-hover:opacity-20 transition-opacity duration-300 rounded-xl sm:rounded-2xl blur-xl"></div>
          
          <Play className="w-5 h-5 sm:w-7 sm:h-7 group-hover:scale-110 transition-transform duration-300" />
          <span className="relative z-10">Start Game</span>
        </button>
      ) : (
        <button
          onClick={onEndGame}
          className="
            flex items-center gap-2 sm:gap-3 px-6 sm:px-10 py-4 sm:py-5 
            bg-gradient-to-r from-[var(--color-accent2)] to-[var(--color-accent3)]
            text-white font-bold text-lg sm:text-xl rounded-xl sm:rounded-2xl 
            transition-all duration-300 ease-out
            shadow-lg hover:shadow-2xl transform hover:scale-110 active:scale-95
            hover:from-[var(--color-accent3)] hover:to-[var(--color-accent2)]
            border-2 border-[var(--color-accent2)] hover:border-[var(--color-accent3)]
            relative overflow-hidden group
            min-h-[56px] sm:min-h-[64px] /* Mobile touch target minimum */
            w-full max-w-sm sm:max-w-none
          "
        >
          {/* Glow effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-accent2)] to-[var(--color-accent3)] opacity-0 group-hover:opacity-20 transition-opacity duration-300 rounded-xl sm:rounded-2xl blur-xl"></div>
          
          <Square className="w-5 h-5 sm:w-7 sm:h-7 group-hover:scale-110 transition-transform duration-300" />
          <span className="relative z-10">End Game</span>
        </button>
      )}
      
      <div className="
        text-center text-sm text-[var(--color-text-secondary)]
        bg-[var(--color-background-secondary)] bg-opacity-40 
        px-4 sm:px-6 py-3 sm:py-4 rounded-xl border border-[var(--color-border)] border-opacity-30
        backdrop-blur-sm max-w-md w-full
      ">
        <p className="mb-2 leading-relaxed">Click the <span className="text-[var(--color-accent1)] font-semibold">first block</span> to start the game!</p>
        <p className="mb-2 leading-relaxed">Then click blocks as fast as you can before they disappear</p>
        <p className="mb-3 leading-relaxed">Speed increases every 30 seconds</p>
        <p className="text-[var(--color-accent2)] font-medium leading-relaxed">⚠️ Clicking the wrong block ends the game!</p>
        <p className="text-[var(--color-accent3)] text-xs mt-2">💡 Tip: Ending before first click just resets the game</p>
      </div>
    </div>
  );
};
