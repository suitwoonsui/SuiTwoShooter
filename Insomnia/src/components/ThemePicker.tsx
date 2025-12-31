'use client';

import React, { useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { Palette, ChevronDown } from 'lucide-react';

export const ThemePicker: React.FC = () => {
  const { currentTheme, setTheme, themes, isThemeChanging } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const handleThemeChange = (themeId: string) => {
    setTheme(themeId);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      {/* Main Theme Picker Button - Mobile-first sizing */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="
          flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2
          bg-gradient-to-r from-[var(--color-background-secondary)] to-[var(--color-background)]
          border border-[var(--color-accent1)] rounded-lg
          text-[var(--color-accent1)] hover:text-[var(--color-accent2)]
          hover:border-[var(--color-accent2)] hover:shadow-lg
          transition-all duration-200 ease-out
          transform hover:scale-105 active:scale-95
          shadow-[0_0_10px_var(--color-accent1)] hover:shadow-[0_0_20px_var(--color-accent2)]
          min-h-[44px] sm:min-h-[40px] /* Mobile touch target minimum */
        "
        disabled={isThemeChanging}
      >
        <Palette className="w-4 h-4 sm:w-4 sm:h-4" />
        <span className="text-sm font-medium hidden sm:block">{currentTheme.name}</span>
        <span className="text-xs font-medium sm:hidden">Theme</span>
        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="
          absolute top-full left-1/2 transform -translate-x-1/2 mt-2 
          w-[calc(100vw-2rem)] max-w-[320px] sm:w-72
          bg-[var(--color-background-secondary)] bg-opacity-95
          border border-[var(--color-accent1)] rounded-xl
          shadow-xl backdrop-blur-md
          z-50
          shadow-[0_0_30px_var(--color-accent1)]
        ">
          {/* Header - Mobile-optimized spacing */}
          <div className="p-3 sm:p-4 border-b border-[var(--color-accent1)] border-opacity-30">
            <h3 className="text-sm font-semibold text-[var(--color-accent1)]">Choose Atmosphere</h3>
            <p className="text-xs text-[var(--color-text-secondary)]">Select your gaming mood</p>
          </div>
          
          <div className="p-2 sm:p-3">
            {themes.map((theme) => {
              const isSelected = currentTheme.id === theme.id;
              return (
                <button
                  key={theme.id}
                  onClick={() => handleThemeChange(theme.id)}
                  className="
                    w-full p-3 sm:p-4 rounded-lg text-left transition-all duration-300
                    transform hover:scale-[1.02] active:scale-[0.98]
                    border-2
                    min-h-[60px] sm:min-h-[80px] /* Mobile touch target */
                  "
                  style={{
                    // Each theme option uses its own theme colors
                    backgroundColor: isSelected 
                      ? `${theme.colors.accent1}20` // 20% opacity of theme's accent1
                      : theme.colors.backgroundSecondary,
                    borderColor: isSelected 
                      ? theme.colors.accent1 
                      : theme.colors.border,
                    boxShadow: isSelected 
                      ? `0 0 20px ${theme.colors.accent1}40` 
                      : 'none',
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span 
                      className="font-semibold text-sm sm:text-base"
                      style={{ color: theme.colors.accent1 }}
                    >
                      {theme.name}
                    </span>
                    {isSelected && (
                      <div 
                        className="w-3 h-3 rounded-full animate-pulse"
                        style={{ 
                          backgroundColor: theme.colors.accent1,
                          boxShadow: `0 0 10px ${theme.colors.accent1}`
                        }}
                      ></div>
                    )}
                  </div>
                  <p 
                    className="text-xs mb-3 leading-relaxed"
                    style={{ color: theme.colors.accent2 }}
                  >
                    {theme.description}
                  </p>
                  
                  {/* Theme color preview - Mobile-optimized */}
                  <div className="flex gap-2 mb-2 sm:mb-3">
                    <div 
                      className="w-4 h-4 rounded-full border border-white border-opacity-30" 
                      style={{ 
                        backgroundColor: theme.colors.accent1,
                        boxShadow: `0 0 8px ${theme.colors.accent1}`
                      }}
                    ></div>
                    <div 
                      className="w-4 h-4 rounded-full border border-white border-opacity-30" 
                      style={{ 
                        backgroundColor: theme.colors.accent2,
                        boxShadow: `0 0 8px ${theme.colors.accent2}`
                      }}
                    ></div>
                    <div 
                      className="w-4 h-4 rounded-full border border-white border-opacity-30" 
                      style={{ 
                        backgroundColor: theme.colors.accent3,
                        boxShadow: `0 0 8px ${theme.colors.accent3}`
                      }}
                    ></div>
                  </div>
                  
                  {/* Theme-specific indicator */}
                  {isSelected && (
                    <div 
                      className="text-xs font-medium"
                      style={{ color: theme.colors.accent3 }}
                    >
                      ✓ Current Theme
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Backdrop to close dropdown when clicking outside */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};
