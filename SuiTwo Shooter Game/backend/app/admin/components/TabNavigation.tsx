// ==========================================
// Admin Page - Tab Navigation Component
// ==========================================

'use client';

import { Tab, AdminStyles } from '../types';

interface TabNavigationProps {
  activeTab: Tab;
  styles: AdminStyles;
  onTabChange: (tab: Tab) => void;
}

export function TabNavigation({ activeTab, styles, onTabChange }: TabNavigationProps) {
  const tabs: Array<{ id: Tab; label: string; emoji: string }> = [
    { id: 'items', label: 'Inventory Management', emoji: '🎁' },
    { id: 'stockroom', label: 'Stockroom', emoji: '📦' },
    { id: 'stats', label: 'Stats Management', emoji: '📊' },
    { id: 'game-pass', label: 'Game Pass Management', emoji: '🎫' },
    { id: 'game-config', label: 'Game Config', emoji: '⚙️' },
    { id: 'badges', label: 'Badge Management', emoji: '🎖️' },
    { id: 'insignia', label: 'Insignia', emoji: '🧷' },
    { id: 'tournaments', label: 'Tournaments', emoji: '🏆' },
    { id: 'vaults', label: 'Vaults', emoji: '🔐' },
    { id: 'milestones', label: 'Milestones', emoji: '⭐' },
    { id: 'migration', label: 'Migration', emoji: '🔄' },
    { id: 'sound-test', label: 'Sound Test', emoji: '🔊' },
  ];

  return (
    <div style={{ marginBottom: '2rem', borderBottom: `2px solid ${styles.border}` }}>
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: activeTab === tab.id ? styles.buttonPrimary : 'transparent',
              color: activeTab === tab.id ? 'white' : styles.text,
              border: 'none',
              borderBottom: activeTab === tab.id ? `3px solid ${styles.buttonPrimary}` : '3px solid transparent',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '1rem',
            }}
          >
            {tab.emoji} {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}

