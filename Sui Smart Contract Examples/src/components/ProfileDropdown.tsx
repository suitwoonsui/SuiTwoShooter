'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, User, Wallet } from 'lucide-react';

interface ProfileDropdownProps {
  accountAddress: string;
  balance: string;
  onDisconnect: () => void;
}

export const ProfileDropdown: React.FC<ProfileDropdownProps> = ({ 
  accountAddress, 
  balance, 
  onDisconnect 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatBalance = (balance: string) => {
    const suiBalance = parseInt(balance) / 1_000_000_000;
    return suiBalance.toFixed(4);
  };

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

  const menuItems = [
    {
      id: 'wallet',
      label: 'Wallet Info',
      icon: Wallet,
      description: 'Account & balance details',
      color: 'text-[var(--color-accent1)]'
    },
    {
      id: 'disconnect',
      label: 'Disconnect',
      icon: User,
      description: 'Disconnect wallet',
      color: 'text-red-500'
    }
  ];

  const handleMenuClick = (itemId: string) => {
    if (itemId === 'disconnect') {
      onDisconnect();
    }
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Profile Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 bg-[var(--color-background)] rounded-lg hover:bg-[var(--color-background)]/80 transition-colors"
      >
        <User className="w-4 h-4 text-[var(--color-text-secondary)]" />
        <span className="text-sm font-medium text-[var(--color-text)]">
          {formatAddress(accountAddress)}
        </span>
        <ChevronDown className={`w-4 h-4 text-[var(--color-text-secondary)] transition-transform ${
          isOpen ? 'rotate-180' : ''
        }`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-lg z-50">
          {/* Wallet Info Header */}
          <div className="p-4 border-b border-[var(--color-border)]">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-[var(--color-accent1)] to-[var(--color-accent2)] rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--color-text)]">
                  {formatAddress(accountAddress)}
                </p>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  {formatBalance(balance)} SUI
                </p>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-2">
            {menuItems.map((item) => {
              const IconComponent = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => handleMenuClick(item.id)}
                  className="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-[var(--color-background)] transition-colors"
                >
                  <IconComponent className={`w-4 h-4 ${item.color}`} />
                  <div>
                    <p className={`text-sm font-medium ${item.color}`}>
                      {item.label}
                    </p>
                    <p className="text-xs text-[var(--color-text-secondary)]">
                      {item.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};