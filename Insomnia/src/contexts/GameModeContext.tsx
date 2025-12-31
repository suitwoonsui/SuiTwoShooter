'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface GameModeContextType {
  forceDemoMode: boolean;
  setForceDemoMode: (mode: boolean) => void;
  toggleGameMode: () => void;
}

const GameModeContext = createContext<GameModeContextType | undefined>(undefined);

export const useGameMode = () => {
  const context = useContext(GameModeContext);
  if (context === undefined) {
    throw new Error('useGameMode must be used within a GameModeProvider');
  }
  return context;
};

interface GameModeProviderProps {
  children: ReactNode;
}

export const GameModeProvider: React.FC<GameModeProviderProps> = ({ children }) => {
  const [forceDemoMode, setForceDemoMode] = useState(false);

  const toggleGameMode = () => {
    setForceDemoMode(!forceDemoMode);
  };

  return (
    <GameModeContext.Provider value={{ forceDemoMode, setForceDemoMode, toggleGameMode }}>
      {children}
    </GameModeContext.Provider>
  );
};
