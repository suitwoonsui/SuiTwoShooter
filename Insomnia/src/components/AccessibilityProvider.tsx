'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface AccessibilityContextType {
  reducedMotion: boolean;
  highContrast: boolean;
  screenReaderMode: boolean;
  keyboardNavigation: boolean;
  toggleReducedMotion: () => void;
  toggleHighContrast: () => void;
  toggleScreenReaderMode: () => void;
  announceToScreenReader: (message: string) => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within AccessibilityProvider');
  }
  return context;
};

interface AccessibilityProviderProps {
  children: React.ReactNode;
}

export const AccessibilityProvider: React.FC<AccessibilityProviderProps> = ({ children }) => {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [screenReaderMode, setScreenReaderMode] = useState(false);
  const [keyboardNavigation, setKeyboardNavigation] = useState(false);

  // Detect user preferences
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Check for reduced motion preference
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setReducedMotion(mediaQuery.matches);
      
      const handleChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
      mediaQuery.addEventListener('change', handleChange);
      
      // Check for high contrast preference
      const contrastQuery = window.matchMedia('(prefers-contrast: high)');
      setHighContrast(contrastQuery.matches);
      
      const handleContrastChange = (e: MediaQueryListEvent) => setHighContrast(e.matches);
      contrastQuery.addEventListener('change', handleContrastChange);

      // Detect keyboard navigation
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Tab') {
          setKeyboardNavigation(true);
        }
      };

      const handleMouseDown = () => {
        setKeyboardNavigation(false);
      };

      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('mousedown', handleMouseDown);

      return () => {
        mediaQuery.removeEventListener('change', handleChange);
        contrastQuery.removeEventListener('change', handleContrastChange);
        document.removeEventListener('keydown', handleKeyDown);
        document.removeEventListener('mousedown', handleMouseDown);
      };
    }
  }, []);

  // Apply accessibility classes to body
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const body = document.body;
      
      body.classList.toggle('reduced-motion', reducedMotion);
      body.classList.toggle('high-contrast', highContrast);
      body.classList.toggle('screen-reader-mode', screenReaderMode);
      body.classList.toggle('keyboard-navigation', keyboardNavigation);
    }
  }, [reducedMotion, highContrast, screenReaderMode, keyboardNavigation]);

  const toggleReducedMotion = () => setReducedMotion(prev => !prev);
  const toggleHighContrast = () => setHighContrast(prev => !prev);
  const toggleScreenReaderMode = () => setScreenReaderMode(prev => !prev);

  // Screen reader announcements
  const announceToScreenReader = (message: string) => {
    if (typeof document !== 'undefined') {
      const announcement = document.createElement('div');
      announcement.setAttribute('aria-live', 'polite');
      announcement.setAttribute('aria-atomic', 'true');
      announcement.className = 'sr-only';
      announcement.textContent = message;
      
      document.body.appendChild(announcement);
      
      setTimeout(() => {
        document.body.removeChild(announcement);
      }, 1000);
    }
  };

  return (
    <AccessibilityContext.Provider
      value={{
        reducedMotion,
        highContrast,
        screenReaderMode,
        keyboardNavigation,
        toggleReducedMotion,
        toggleHighContrast,
        toggleScreenReaderMode,
        announceToScreenReader,
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
};
