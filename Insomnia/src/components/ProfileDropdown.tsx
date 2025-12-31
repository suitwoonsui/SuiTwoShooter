'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, User, BarChart3, Trophy, Settings } from 'lucide-react';
import { 
  ProfileModalWithSuspense as ProfileModal,
  StatisticsModalWithSuspense as StatisticsModal,
  LeaderboardModalWithSuspense as LeaderboardModal,
  SettingsModalWithSuspense as SettingsModal
} from './LazyComponents';

export const ProfileDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<'profile' | 'statistics' | 'leaderboard' | 'settings' | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdown when modal opens
  useEffect(() => {
    if (activeModal) {
      setIsOpen(false);
    }
  }, [activeModal]);

  const openModal = (modal: 'profile' | 'statistics' | 'leaderboard' | 'settings') => {
    setActiveModal(modal);
  };

  const closeModal = () => {
    setActiveModal(null);
  };

  const menuItems = [
    {
      id: 'profile' as const,
      label: 'Profile',
      icon: User,
      description: 'Wallet & account info',
      color: 'text-[var(--color-accent1)]'
    },
    {
      id: 'statistics' as const,
      label: 'Statistics',
      icon: BarChart3,
      description: 'Game performance',
      color: 'text-[var(--color-accent2)]'
    },
    {
      id: 'leaderboard' as const,
      label: 'Leaderboard',
      icon: Trophy,
      description: 'Global rankings',
      color: 'text-[var(--color-accent3)]'
    },
    {
      id: 'settings' as const,
      label: 'Settings',
      icon: Settings,
      description: 'Preferences & themes',
      color: 'text-[var(--color-accent1)]'
    }
  ];

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="
          flex items-center space-x-2 px-4 py-2
          text-[var(--color-text-secondary)] hover:text-[var(--color-accent1)]
          transition-all duration-200 font-medium
          bg-transparent
          hover:bg-[var(--color-accent1)] hover:bg-opacity-10
          rounded-lg
          hover:scale-105
          hover:shadow-[0_0_10px_var(--color-glow)]
          border border-[var(--color-border)] border-opacity-30
          hover:border-[var(--color-accent1)] hover:border-opacity-50
        "
        style={{ backgroundColor: 'transparent' }}
      >
        <span>Menu</span>
        <ChevronDown 
          className={`w-4 h-4 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`} 
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div 
          className="
            absolute left-0 top-full mt-2 w-64
            bg-[var(--color-background-secondary)] backdrop-blur-md
            border border-[var(--color-accent1)] border-opacity-30
            rounded-lg shadow-xl z-50
            animate-in fade-in-0 slide-in-from-top-2 duration-200
            shadow-[0_0_20px_var(--color-shadow)]
            ring-1 ring-[var(--color-accent1)] ring-opacity-20
          "
          style={{ 
            backgroundColor: 'var(--color-background-secondary)',
            color: 'var(--color-text-primary)'
          }}
        >
          <div 
            className="p-2"
            style={{ backgroundColor: 'transparent' }}
          >
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => openModal(item.id)}
                  className="
                    w-full flex items-start space-x-3 p-3
                    text-left rounded-md
                    bg-transparent
                    hover:bg-[var(--color-accent1)] hover:bg-opacity-10
                    transition-all duration-200
                    group
                    text-[var(--color-text-primary)]
                    hover:scale-105
                    hover:shadow-[0_0_10px_var(--color-glow)]
                  "
                  style={{ backgroundColor: 'transparent' }}
                >
                                                       <div className={`
                    w-8 h-8 rounded-lg flex items-center justify-center
                    bg-[var(--color-accent1)] bg-opacity-20
                    group-hover:bg-opacity-40 transition-all duration-200
                    group-hover:shadow-[0_0_10px_var(--color-glow)]
                  `}>
                     <Icon className={`w-4 h-4 ${item.color}`} />
                   </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-[var(--color-text-primary)] group-hover:text-[var(--color-accent1)] transition-colors">
                      {item.label}
                    </div>
                    <div className="text-sm text-[var(--color-text-secondary)] truncate">
                      {item.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Modals */}
      <ProfileModal 
        isOpen={activeModal === 'profile'} 
        onClose={closeModal} 
      />
      
      <StatisticsModal 
        isOpen={activeModal === 'statistics'} 
        onClose={closeModal} 
      />
      
      <LeaderboardModal 
        isOpen={activeModal === 'leaderboard'} 
        onClose={closeModal} 
      />
      
      <SettingsModal 
        isOpen={activeModal === 'settings'} 
        onClose={closeModal} 
      />
    </div>
  );
};
