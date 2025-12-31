// ==========================================
// Admin Page - Reusable Wallet Discovery UI Component
// Provides the search bar and discover button UI
// ==========================================

'use client';

import { ReactNode } from 'react';
import { AdminStyles } from '../types';

interface WalletDiscoveryUIProps {
  styles: AdminStyles;
  title: string;
  discoverButtonText: string;
  searchAddress: string;
  setSearchAddress: (address: string) => void;
  onSearch: () => void;
  onDiscover: () => void;
  searchingWallet: boolean;
  discoveringWallets: boolean;
  discoveredWalletsCount: number;
  badgeContent?: ReactNode;
}

export function WalletDiscoveryUI({
  styles,
  title,
  discoverButtonText,
  searchAddress,
  setSearchAddress,
  onSearch,
  onDiscover,
  searchingWallet,
  discoveringWallets,
  discoveredWalletsCount,
  badgeContent,
}: WalletDiscoveryUIProps) {
  return (
    <div className="admin-section">
      <div className="admin-section-header">
        <h2 className="admin-section-title">{title}</h2>
        {badgeContent}
      </div>
      
      {/* Search Bar */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label className="admin-label" style={{ marginBottom: '0.5rem', display: 'block' }}>
          Search Wallet Address:
        </label>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            value={searchAddress}
            onChange={(e) => setSearchAddress(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onSearch();
              }
            }}
            placeholder="0x..."
            className="admin-input"
            style={{ flex: 1 }}
          />
          <button
            type="button"
            onClick={onSearch}
            disabled={searchingWallet || !searchAddress.trim()}
            className="admin-button admin-button-primary"
          >
            {searchingWallet ? 'Searching...' : '🔍 Search'}
          </button>
        </div>
        {discoveredWalletsCount > 0 && (
          <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: styles.textSecondary }}>
            {discoveredWalletsCount} wallet(s) discovered. Search will filter and focus on matching wallet.
          </p>
        )}
      </div>

      <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <div style={{ flex: 1, height: '1px', backgroundColor: styles.border }}></div>
        <span style={{ color: styles.textSecondary, fontSize: '0.9rem', padding: '0 0.5rem' }}>OR</span>
        <div style={{ flex: 1, height: '1px', backgroundColor: styles.border }}></div>
      </div>
      
      <div style={{ marginBottom: '1.5rem' }}>
        <button
          type="button"
          onClick={onDiscover}
          disabled={discoveringWallets}
          className="admin-button admin-button-primary"
        >
          {discoveringWallets ? 'Discovering...' : discoverButtonText}
        </button>
      </div>
    </div>
  );
}

