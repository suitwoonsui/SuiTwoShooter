'use client';

import React, { memo } from 'react';

interface GameStatsProps {
  score: number;
  timeElapsed: number;
  gameActive: boolean;
}

const GameStatsComponent: React.FC<GameStatsProps> = ({
  score,
  timeElapsed,
  gameActive,
}) => {
  const formatTime = (centiseconds: number): string => {
    // Convert centiseconds to seconds (1 centisecond = 0.01 seconds)
    const totalSeconds = centiseconds / 100;
    const seconds = Math.floor(totalSeconds);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getGameStatus = (): string => {
    if (!gameActive) return 'Ready';
    if (score === 0) return 'Playing';
    return 'Active';
  };

  return (
    <div className="grid grid-cols-3 gap-4 mb-6">
      {/* Score */}
      <div className="text-center">
        <div className="text-2xl font-bold text-[var(--color-accent1)] mb-1">
          {score}
        </div>
        <div className="text-xs text-[var(--color-text-secondary)] font-medium">Score</div>
      </div>
      
      {/* Time */}
      <div className="text-center">
        <div className="text-2xl font-bold text-[var(--color-accent2)] mb-1">
          {formatTime(timeElapsed)}
        </div>
        <div className="text-xs text-[var(--color-text-secondary)] font-medium">Time</div>
      </div>
      
      {/* Status */}
      <div className="text-center">
        <div className="text-2xl font-bold text-[var(--color-accent3)] mb-1">
          {getGameStatus()}
        </div>
        <div className="text-xs text-[var(--color-text-secondary)] font-medium">Status</div>
      </div>
    </div>
  );
};

export const GameStats = memo(GameStatsComponent);
