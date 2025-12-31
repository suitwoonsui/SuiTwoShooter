'use client';

import React, { useState } from 'react';
import { Settings, Palette, Volume2, Gamepad2, Monitor, Smartphone } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { currentTheme, setTheme, themes } = useTheme();
  const [activeTab, setActiveTab] = useState<'appearance' | 'game' | 'accessibility'>('appearance');

  if (!isOpen) return null;

  type TabId = 'appearance' | 'game' | 'accessibility';
  
  const tabs: Array<{ id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'game', label: 'Game', icon: Gamepad2 },
    { id: 'accessibility', label: 'Accessibility', icon: Monitor }
  ];

  const TabIcon = tabs.find(tab => tab.id === activeTab)?.icon || Palette;

  return (
    <div 
      className="fixed inset-0 z-[10000] bg-black bg-opacity-50 backdrop-blur-sm"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
      onClick={onClose}
    >
      {/* Modal */}
      <div 
        className="absolute border border-[var(--color-border)] rounded-xl overflow-hidden shadow-2xl settings-modal"
        style={{ 
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '90%',
          maxWidth: '640px',
          maxHeight: '90vh',
          overflowY: 'auto',
          backgroundColor: 'var(--color-background)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="
          flex items-center justify-between p-6
          border-b border-[var(--color-border)] border-opacity-30
          sticky top-0 bg-[var(--color-background)] bg-opacity-95 backdrop-blur-md
        ">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[var(--color-accent1)] to-[var(--color-accent2)] rounded-full flex items-center justify-center">
              <Settings className="w-5 h-5 text-[var(--color-background)]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Settings</h2>
              <p className="text-sm text-[var(--color-text-secondary)]">Customize Your Experience</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="
              p-2 text-[var(--color-text-secondary)] hover:text-[var(--color-accent1)]
              transition-colors duration-200 rounded-lg hover:bg-[var(--color-background-secondary)]
            "
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Tab Navigation */}
          <div className="flex space-x-1 mb-6 bg-[var(--color-background-secondary)] bg-opacity-50 rounded-lg p-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium
                    transition-all duration-200 flex-1 justify-center
                    ${isActive 
                      ? 'bg-[var(--color-accent3)] shadow-md border-2 border-[var(--color-accent3)]' 
                      : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-background-secondary)] border-2 border-transparent'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  <span 
                    className={`hidden sm:inline ${isActive ? 'text-[var(--color-background)]' : ''}`}
                  >
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          <div className="space-y-6">
            {activeTab === 'appearance' && (
              <div className="space-y-6">
                {/* Theme Selection */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-[var(--color-text-primary)] flex items-center space-x-2">
                    <Palette className="w-5 h-5 theme-selection-icon" />
                    <span>Theme Selection</span>
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {themes.map((theme) => (
                                              <button
                          key={theme.id}
                          onClick={() => setTheme(theme.id)}
                          className="p-4 rounded-lg border-2 transition-all duration-200"
                          style={{
                            backgroundColor: currentTheme.id === theme.id 
                              ? `${theme.colors.accent1}20` 
                              : 'var(--color-background-secondary)',
                            borderColor: currentTheme.id === theme.id 
                              ? theme.colors.accent1 
                              : 'var(--color-border)'
                          }}
                          onMouseEnter={(e) => {
                            if (currentTheme.id !== theme.id) {
                              e.currentTarget.style.borderColor = theme.colors.accent2;
                              e.currentTarget.style.backgroundColor = 'var(--color-background-secondary)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (currentTheme.id !== theme.id) {
                              e.currentTarget.style.borderColor = 'var(--color-border)';
                              e.currentTarget.style.backgroundColor = 'var(--color-background-secondary)';
                            }
                          }}
                        >
                        <div className="text-center space-y-2">
                          <div className="
                            w-8 h-8 rounded-full mx-auto
                            bg-gradient-to-br from-[var(--color-accent1)] to-[var(--color-accent2)]
                          " />
                          <div 
                            className="text-sm font-medium"
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
                      </button>
                    ))}
                  </div>
                </div>

                {/* Display Settings */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-[var(--color-text-primary)] flex items-center space-x-2">
                    <Monitor className="w-5 h-5 display-settings-icon" />
                    <span>Display Settings</span>
                  </h3>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-[var(--color-background-secondary)] bg-opacity-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Smartphone className="w-4 h-4 text-[var(--color-accent2)]" />
                        <span className="text-sm text-[var(--color-text-primary)]">Mobile Optimization</span>
                      </div>
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-[var(--color-background-secondary)] bg-opacity-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Monitor className="w-4 h-4 text-[var(--color-accent2)]" />
                        <span className="text-sm text-[var(--color-text-primary)]">High DPI Support</span>
                      </div>
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'game' && (
              <div className="space-y-6">
                {/* Game Preferences */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-[var(--color-text-primary)] flex items-center space-x-2">
                    <Gamepad2 className="w-5 h-5 game-preferences-icon" />
                    <span>Game Preferences</span>
                  </h3>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-[var(--color-background-secondary)] bg-opacity-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Volume2 className="w-4 h-4 text-[var(--color-accent2)]" />
                        <span className="text-sm text-[var(--color-text-primary)]">Sound Effects</span>
                      </div>
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-[var(--color-background-secondary)] bg-opacity-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Gamepad2 className="w-4 h-4 text-[var(--color-accent2)]" />
                        <span className="text-sm text-[var(--color-text-primary)]">Haptic Feedback</span>
                      </div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-[var(--color-background-secondary)] bg-opacity-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Monitor className="w-4 h-4 text-[var(--color-accent2)]" />
                        <span className="text-sm text-[var(--color-text-primary)]">Performance Mode</span>
                      </div>
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    </div>
                  </div>
                </div>

                {/* Game Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-[var(--color-text-primary)]">Game Information</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-[var(--color-background-secondary)] bg-opacity-50 rounded-lg text-center">
                      <div className="text-2xl font-bold text-[var(--color-accent1)]">5x5</div>
                      <div className="text-xs text-[var(--color-text-secondary)]">Grid Size</div>
                    </div>
                    
                    <div className="p-3 bg-[var(--color-background-secondary)] bg-opacity-50 rounded-lg text-center">
                      <div className="text-2xl font-bold text-[var(--color-accent2)]">∞</div>
                      <div className="text-xs text-[var(--color-text-secondary)]">Difficulty Levels</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'accessibility' && (
              <div className="space-y-6">
                {/* Accessibility Features */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-[var(--color-text-primary)] flex items-center space-x-2">
                    <Monitor className="w-5 h-5 text-[var(--color-accent3)]" />
                    <span>Accessibility Features</span>
                  </h3>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-[var(--color-background-secondary)] bg-opacity-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Monitor className="w-4 h-4 text-[var(--color-accent2)]" />
                        <span className="text-sm text-[var(--color-text-primary)]">High Contrast Mode</span>
                      </div>
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-[var(--color-background-secondary)] bg-opacity-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Monitor className="w-4 h-4 text-[var(--color-accent2)]" />
                        <span className="text-sm text-[var(--color-text-primary)]">Keyboard Navigation</span>
                      </div>
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-[var(--color-background-secondary)] bg-opacity-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Monitor className="w-4 h-4 text-[var(--color-accent2)]" />
                        <span className="text-sm text-[var(--color-text-primary)]">Screen Reader Support</span>
                      </div>
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    </div>
                  </div>
                </div>

                {/* WCAG Compliance */}
                <div className="p-4 bg-gradient-to-r from-[var(--color-accent1)] to-[var(--color-accent2)] border border-[var(--color-accent1)] border-opacity-30 rounded-lg shadow-[0_0_15px_var(--color-glow)]">
                  <div className="flex items-start space-x-3">
                    <Monitor className="w-5 h-5 text-[var(--color-background)] mt-0.5" />
                    <div>
                      <h4 className="font-medium text-[var(--color-background)] mb-2">WCAG 2.1 AA Compliant</h4>
                      <p className="text-sm text-[var(--color-background)]">
                        Insomnia Game meets accessibility standards for color contrast, keyboard navigation, and screen reader compatibility.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
