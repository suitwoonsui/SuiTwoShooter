'use client';

import React from 'react';
import { Trophy, Clock, RotateCcw, X } from 'lucide-react';

interface GameOverModalProps {
  isOpen: boolean;
  score: number;
  timeElapsed: number;
  forceDemoMode?: boolean;
  gamePassStatus?: {
    isActive: boolean;
    gamesRemaining: number;
    passType: string;
  } | null;
  onPlayAgain: () => void;
  onClose: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  isOpen,
  score,
  timeElapsed,
  onPlayAgain,
  onClose,
  gamePassStatus = null,
  forceDemoMode = false,
}) => {
  if (!isOpen) return null;

  const formatTime = (centiseconds: number): string => {
    // Convert centiseconds to seconds (1 centisecond = 0.01 seconds)
    const totalSeconds = centiseconds / 100;
    const seconds = Math.floor(totalSeconds);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getEnduranceTier = (timeCentiseconds: number): string => {
    const seconds = Math.floor(timeCentiseconds / 100);
    if (seconds < 30) return 'Beginner';
    if (seconds < 60) return 'Intermediate';
    if (seconds < 90) return 'Advanced';
    if (seconds < 120) return 'Expert';
    return 'Master';
  };

  const getPerformanceMessage = (score: number, time: number): string => {
    // Convert centiseconds to seconds
    const timeInSeconds = time / 100;
    const clicksPerSecond = score / timeInSeconds;
    const tier = getEnduranceTier(time);
    
    if (timeInSeconds >= 120) return `Master level endurance! You survived ${tier} difficulty!`;
    if (timeInSeconds >= 90) return `Expert level! You're getting faster at ${tier} difficulty!`;
    if (timeInSeconds >= 60) return `Advanced level! Great job at ${tier} difficulty!`;
    if (timeInSeconds >= 30) return `Intermediate level! You're improving at ${tier} difficulty!`;
    if (clicksPerSecond > 2) return "Incredible speed! You're a clicking machine!";
    if (clicksPerSecond > 1.5) return "Amazing reflexes! You're getting faster!";
    if (clicksPerSecond > 1) return "Great job! Your endurance is impressive!";
    if (timeInSeconds > 60) return "Outstanding endurance! You're a night owl!";
    return "Good effort! Keep practicing to improve!";
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-80 backdrop-blur-sm z-50"
        onClick={onClose}
      />
      
      {/* Modal - Mobile-first responsive design */}
      <div className="
        fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 
        w-[calc(100vw-2rem)] max-w-md mx-4 z-50
        bg-gradient-to-br from-[var(--color-background-secondary)] to-[var(--color-background)]
        border-2 border-[var(--color-accent1)] rounded-2xl
        shadow-2xl backdrop-blur-md
        animate-in fade-in-0 zoom-in-95 duration-300
        max-h-[90vh] overflow-y-auto
      ">
        {/* Close button - Mobile touch target */}
        <button
          onClick={onClose}
          className="
            absolute top-3 right-3 sm:top-4 sm:right-4 p-2 rounded-full
            bg-[var(--color-background)] bg-opacity-50
            text-[var(--color-text-secondary)] hover:text-[var(--color-accent1)]
            hover:bg-[var(--color-background)] transition-all duration-200
            border border-[var(--color-border)] hover:border-[var(--color-accent1)]
            min-w-[44px] min-h-[44px] /* Mobile touch target minimum */
            flex items-center justify-center
          "
        >
          <X className="w-4 h-4" />
        </button>

        {/* Content - Mobile-optimized spacing */}
        <div className="p-6 sm:p-8 text-center">
          {/* Game Over Title */}
          <div className="mb-4 sm:mb-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-[var(--color-accent1)] mb-2">
              Game Over!
            </h2>
            <div className="w-12 sm:w-16 h-1 bg-gradient-to-r from-[var(--color-accent1)] to-[var(--color-accent2)] mx-auto rounded-full"></div>
          </div>

          {/* Performance Message */}
          <div className="mb-6 sm:mb-8">
            <p className="text-sm sm:text-base text-[var(--color-text)] leading-relaxed">
              {getPerformanceMessage(score, timeElapsed)}
            </p>
            
            {/* Free vs Premium Info */}
            {forceDemoMode ? (
              <div className="mt-3 p-3 bg-gray-900/20 border border-gray-500/30 rounded-lg">
                <p className="text-xs text-gray-300 text-center">
                  🆓 <strong>Demo Mode:</strong> Score shown only. Upgrade to save your progress!
                </p>
              </div>
            ) : gamePassStatus && gamePassStatus.isActive ? (
              <div className="mt-3 p-3 bg-green-900/20 border border-green-500/30 rounded-lg">
                <p className="text-xs text-green-300 text-center">
                  🚀 <strong>Premium Mode:</strong> Score automatically saved to blockchain!
                </p>
              </div>
            ) : (
              <div className="mt-3 p-3 bg-gray-900/20 border border-gray-500/30 rounded-lg">
                <p className="text-xs text-gray-300 text-center">
                  🆓 <strong>Demo Mode:</strong> Score shown only. Connect wallet for premium features!
                </p>
              </div>
            )}
          </div>



          {/* Stats Cards - Mobile-optimized grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
            {/* Score Card */}
            <div className="
              bg-[var(--color-background)] bg-opacity-50 p-3 sm:p-4 rounded-xl
              border border-[var(--color-border)] border-opacity-30
              backdrop-blur-sm
            ">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--color-accent1)]" />
                <span className="text-xs text-[var(--color-text-secondary)] font-medium">SCORE</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-[var(--color-accent1)]">
                {score}
              </div>
            </div>

            {/* Time Card */}
            <div className="
              bg-[var(--color-background)] bg-opacity-50 p-3 sm:p-4 rounded-xl
              border border-[var(--color-border)] border-opacity-30
              backdrop-blur-sm
            ">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--color-accent2)]" />
                <span className="text-xs text-[var(--color-text-secondary)] font-medium">TIME</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-[var(--color-accent2)]">
                {formatTime(timeElapsed)}
              </div>
            </div>

            {/* Endurance Level Card */}
            <div className="
              bg-[var(--color-background)] bg-opacity-50 p-3 sm:p-4 rounded-xl
              border border-[var(--color-border)] border-opacity-30
              backdrop-blur-sm
            ">
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--color-accent3)] text-center">⚡</div>
                <span className="text-xs text-[var(--color-text-secondary)] font-medium">ENDURANCE</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-[var(--color-accent3)]">
                {getEnduranceTier(timeElapsed)}
              </div>
              <div className="text-xs text-[var(--color-text-secondary)] text-center">
                {Math.floor(timeElapsed / 100)}s survived
              </div>
            </div>
          </div>

          {/* Action Buttons - Mobile touch targets */}
          <div className="flex flex-col gap-3">
            <button
              onClick={onPlayAgain}
              className="
                flex items-center justify-center gap-2 w-full py-4 px-6
                bg-gradient-to-r from-[var(--color-accent1)] to-[var(--color-accent2)]
                text-white font-bold text-base sm:text-lg rounded-xl
                transition-all duration-300 ease-out
                shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95
                hover:from-[var(--color-accent2)] hover:to-[var(--color-accent1)]
                border-2 border-[var(--color-accent1)] hover:border-[var(--color-accent2)]
                relative overflow-hidden group
                min-h-[56px] /* Mobile touch target minimum */
              "
            >
              {/* Glow effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-accent1)] to-[var(--color-accent2)] opacity-0 group-hover:opacity-20 transition-opacity duration-300 rounded-xl blur-xl"></div>
              
              <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5 relative z-10" />
              <span className="relative z-10">Play Again</span>
            </button>

            <button
              onClick={onClose}
              className="
                py-3 px-6 text-[var(--color-text-secondary)] 
                hover:text-[var(--color-accent3)] transition-colors duration-200
                font-medium
                min-h-[44px] /* Mobile touch target minimum */
                flex items-center justify-center
              "
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
