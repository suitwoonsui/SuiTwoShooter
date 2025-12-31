'use client';

import React, { useState, useEffect, memo, useCallback } from 'react';
import { GameBlock } from './Game';

interface GameGridProps {
  size: number;
  currentBlock: GameBlock | null;
  onBlockClick: (x: number, y: number) => void;
  gameActive: boolean;
}

const GameGridComponent: React.FC<GameGridProps> = ({
  size,
  currentBlock,
  onBlockClick,
  gameActive,
}) => {
  const [clickedBlocks, setClickedBlocks] = useState<Set<string>>(new Set());

  // Clear clicked blocks when game starts
  useEffect(() => {
    if (gameActive) {
      setClickedBlocks(new Set());
    }
  }, [gameActive]);

  const handleCellClick = useCallback((x: number, y: number) => {
    if (!gameActive) return;
    
    // Add visual feedback for click
    const key = `${x}-${y}`;
    setClickedBlocks(prev => new Set([...prev, key]));
    
    // Remove visual feedback after animation
    setTimeout(() => {
      setClickedBlocks(prev => {
        const newSet = new Set(prev);
        newSet.delete(key);
        return newSet;
      });
    }, 300);
    
    onBlockClick(x, y);
  }, [gameActive, onBlockClick]);

  const renderCell = (x: number, y: number) => {
    const isCurrentBlock = currentBlock && currentBlock.x === x && currentBlock.y === y;
    const wasClicked = clickedBlocks.has(`${x}-${y}`);
    
    // Enhanced CSS classes with theme variables
    const cellClasses = `
      w-16 h-16 border-2 rounded-lg cursor-pointer
      transition-all duration-300 ease-out
      ${isCurrentBlock 
        ? 'bg-gradient-to-br from-[var(--color-accent1)] to-[var(--color-accent2)] border-[var(--color-accent1)] shadow-lg scale-110 animate-pulse' 
        : wasClicked
        ? 'bg-gradient-to-br from-[var(--color-accent3)] to-[var(--color-accent1)] border-[var(--color-accent3)] shadow-lg scale-105'
        : 'bg-[var(--color-background-secondary)] border-[var(--color-border)] hover:bg-[var(--color-border)] hover:border-[var(--color-border-hover)]'
      }
      ${!gameActive ? 'opacity-50 cursor-not-allowed' : ''}
    `.trim();
    
    return (
      <button
        key={`${x}-${y}`}
        className={cellClasses}
        onClick={() => handleCellClick(x, y)}
        disabled={!gameActive}
        aria-label={
          isCurrentBlock 
            ? `Active game block at row ${y + 1}, column ${x + 1} - Click to score!`
            : `Game cell at row ${y + 1}, column ${x + 1}`
        }
        aria-pressed={wasClicked}
        tabIndex={gameActive ? 0 : -1}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleCellClick(x, y);
          }
        }}
        style={{
          minWidth: '4rem',
          minHeight: '4rem',
          position: 'relative',
          // Ensure current block appears on top, and clicked blocks maintain proper z-index during animation
          zIndex: isCurrentBlock ? 10 : wasClicked ? 5 : 1,
          // Ensure proper stacking context during animations
          transform: 'translateZ(0)',
          // Optimize animation performance
          willChange: wasClicked ? 'z-index, opacity, transform' : 'auto',
                    // Add opacity transition for smoother visual feedback
          opacity: wasClicked ? 0.9 : 1,
          // Enhanced glow effects using CSS variables
          ...(isCurrentBlock && {
            boxShadow: `0 0 20px var(--color-glow), 0 0 40px var(--color-shadow)`,
            filter: `drop-shadow(0 0 10px var(--color-accent1))`,
          }),
          ...(wasClicked && {
            boxShadow: `0 0 15px var(--color-accent3), 0 0 30px var(--color-shadow), 0 2px 8px rgba(0,0,0,0.3)`,
            filter: `drop-shadow(0 0 8px var(--color-accent3))`,
            borderColor: 'var(--color-accent3)',
            borderWidth: '3px',
          }),
        }}
      >
        {/* Center dot for active blocks */}
        {isCurrentBlock && (
          <div 
            className="w-2 h-2 bg-white rounded-full absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-ping"
            style={{ zIndex: 20 }}
            aria-hidden="true"
          />
        )}
        {/* Screen reader content */}
        <span className="sr-only">
          {isCurrentBlock ? 'Active target' : 'Empty cell'}
        </span>
      </button>
    );
  };

  return (
    <div className="game-grid-container w-full max-w-md mx-auto">
      <div 
        className="grid gap-2 p-4 bg-[var(--color-background)] bg-opacity-20 rounded-xl border border-[var(--color-border)] border-opacity-30 backdrop-blur-sm"
        style={{
          gridTemplateColumns: `repeat(${size}, 1fr)`,
          gridTemplateRows: `repeat(${size}, 1fr)`,
          position: 'relative',
        }}
        role="grid"
        aria-label={`Game grid: ${size} by ${size} cells. ${
          gameActive 
            ? 'Click the highlighted cell to score points!' 
            : 'Game is not active'
        }`}
        aria-live="polite"
        aria-atomic="false"
      >
        {Array.from({ length: size }, (_, y) =>
          Array.from({ length: size }, (_, x) => renderCell(x, y))
        )}
      </div>
    </div>
  );
};

export const GameGrid = memo(GameGridComponent);
