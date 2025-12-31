'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Palette, ChevronDown } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

export const ThemeToggle: React.FC = () => {
  const { currentTheme, setTheme, themes, isThemeChanging } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleThemeChange = (themeId: string) => {
    setTheme(themeId);
    setIsOpen(false);
  };

  // Handle clicking outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Theme Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isThemeChanging}
        className="
          theme-toggle flex items-center gap-2 px-3 py-2 
          bg-[var(--color-background-secondary)]/80 backdrop-blur-sm
          border border-[var(--color-border)] rounded-lg
          text-[var(--color-text)] hover:text-[var(--color-accent1)]
          hover:border-[var(--color-accent1)] transition-all duration-200
          disabled:opacity-50 disabled:cursor-not-allowed
          min-h-[40px]
        "
        aria-label="Toggle theme"
      >
        <Palette className="w-4 h-4" />
        <span className="hidden sm:block text-sm font-medium">
          {currentTheme.name}
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Theme Dropdown */}
      {isOpen && (
        <div className="
          absolute right-0 top-full mt-2 w-48
          bg-[var(--color-background-secondary)]/95 backdrop-blur-md
          border border-[var(--color-border)] rounded-lg shadow-xl
          z-50 overflow-hidden
        ">
          {themes.map((theme) => (
            <button
              key={theme.id}
              onClick={() => handleThemeChange(theme.id)}
              className={`
                w-full px-4 py-3 text-left transition-all duration-200
                ${theme.id === currentTheme.id 
                  ? 'border-l-4' 
                  : ''
                }
              `}
              style={{
                backgroundColor: theme.id === currentTheme.id ? `${theme.colors.accent3}20` : 'transparent',
                borderLeftColor: theme.id === currentTheme.id ? theme.colors.accent3 : 'transparent',
                color: theme.id === currentTheme.id ? theme.colors.accent1 : theme.colors.text
              }}
              onMouseEnter={(e) => {
                if (theme.id !== currentTheme.id) {
                  e.currentTarget.style.backgroundColor = `${theme.colors.accent1}10`;
                  e.currentTarget.style.color = theme.colors.accent1;
                }
              }}
              onMouseLeave={(e) => {
                if (theme.id !== currentTheme.id) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = theme.colors.text;
                }
              }}
            >
              <div className="flex items-center gap-3">
                {/* Theme Color Preview */}
                <div className="flex gap-1">
                  <div 
                    className="w-4 h-4 rounded-full border border-[var(--color-border)]" 
                    style={{ backgroundColor: theme.colors.accent1 }}
                  />
                  <div 
                    className="w-4 h-4 rounded-full border border-[var(--color-border)]" 
                    style={{ backgroundColor: theme.colors.accent2 }}
                  />
                  <div 
                    className="w-4 h-4 rounded-full border border-[var(--color-border)]" 
                    style={{ backgroundColor: theme.colors.accent3 }}
                  />
                </div>
                
                {/* Theme Info */}
                <div className="flex-1">
                  <div 
                    className="font-medium text-sm"
                    style={{ color: theme.colors.accent1 }}
                  >
                    {theme.name}
                  </div>
                  <div 
                    className="text-xs opacity-75"
                    style={{ color: theme.colors.accent2 }}
                  >
                    {theme.description}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
