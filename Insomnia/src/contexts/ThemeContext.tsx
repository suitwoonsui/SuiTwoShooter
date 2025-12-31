'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Theme, themes, defaultTheme } from '@/lib/themes';

interface ThemeContextType {
  currentTheme: Theme;
  setTheme: (themeId: string) => void;
  themes: Theme[];
  isThemeChanging: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState<Theme>(defaultTheme);
  const [isThemeChanging, setIsThemeChanging] = useState(false);

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedThemeId = localStorage.getItem('insomnia-theme');
    if (savedThemeId) {
      const savedTheme = themes.find(theme => theme.id === savedThemeId);
      if (savedTheme) {
        setCurrentTheme(savedTheme);
      }
    }
  }, []);

  // Apply theme to CSS variables
  useEffect(() => {
    const root = document.documentElement;
    
    // Set CSS custom properties
    root.style.setProperty('--color-primary', currentTheme.colors.primary);
    root.style.setProperty('--color-secondary', currentTheme.colors.secondary);
    root.style.setProperty('--color-accent1', currentTheme.colors.accent1);
    root.style.setProperty('--color-accent2', currentTheme.colors.accent2);
    root.style.setProperty('--color-accent3', currentTheme.colors.accent3);
    root.style.setProperty('--color-text', currentTheme.colors.text);
    root.style.setProperty('--color-text-secondary', currentTheme.colors.textSecondary);
    root.style.setProperty('--color-background', currentTheme.colors.background);
    root.style.setProperty('--color-background-secondary', currentTheme.colors.backgroundSecondary);
    root.style.setProperty('--color-border', currentTheme.colors.border);
    root.style.setProperty('--color-border-hover', currentTheme.colors.borderHover);
    root.style.setProperty('--color-shadow', currentTheme.colors.shadow);
    root.style.setProperty('--color-glow', currentTheme.colors.glow);
    
    // Set effect properties
    root.style.setProperty('--glow-intensity', currentTheme.effects.glowIntensity.toString());
    root.style.setProperty('--animation-speed', currentTheme.effects.animationSpeed.toString());
    root.style.setProperty('--background-pattern', currentTheme.effects.backgroundPattern);
    
    // Add theme class to body for pattern-specific styling
    document.body.className = `theme-${currentTheme.id}`;
  }, [currentTheme]);

  const setTheme = (themeId: string) => {
    const newTheme = themes.find(theme => theme.id === themeId);
    if (newTheme && newTheme.id !== currentTheme.id) {
      setIsThemeChanging(true);
      
      // Create and show transition overlay
      const overlay = document.createElement('div');
      overlay.className = 'theme-transition-overlay';
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: ${newTheme.colors.primary};
        opacity: 0;
        pointer-events: none;
        z-index: 9999;
        transition: opacity 0.3s ease-in-out;
      `;
      document.body.appendChild(overlay);
      
      // Animate overlay in
      setTimeout(() => {
        overlay.style.opacity = '0.8';
      }, 10);
      
      // Change theme and animate overlay out
      setTimeout(() => {
        setCurrentTheme(newTheme);
        localStorage.setItem('insomnia-theme', newTheme.id);
        
        // Animate overlay out
        overlay.style.opacity = '0';
        
        setTimeout(() => {
          document.body.removeChild(overlay);
          setIsThemeChanging(false);
        }, 300);
      }, 300);
    }
  };

  const value: ThemeContextType = {
    currentTheme,
    setTheme,
    themes,
    isThemeChanging,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
