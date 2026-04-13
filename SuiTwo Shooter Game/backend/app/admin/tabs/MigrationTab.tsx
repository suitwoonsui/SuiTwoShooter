// ==========================================
// Admin Page - Migration Tab Component (Refactored)
// ==========================================

'use client';

import { useState } from 'react';
import { MigrationSubType, AdminStyles } from '../types';
import { InventoryMigrationSubTab } from './migration/InventoryMigrationSubTab';
import { StatsMigrationSubTab } from './migration/StatsMigrationSubTab';
import { GamePassMigrationSubTab } from './migration/GamePassMigrationSubTab';
import { TournamentMigrationSubTab } from './migration/TournamentMigrationSubTab';
import { MilestoneMigrationSubTab } from './migration/MilestoneMigrationSubTab';

interface MigrationTabProps {
  isAdminWalletConnected: boolean;
  connectedAddress: string | null;
  adminAddress: string | null;
  styles: AdminStyles;
}

export function MigrationTab({ isAdminWalletConnected, connectedAddress, adminAddress, styles }: MigrationTabProps) {
  const [migrationSubType, setMigrationSubType] = useState<MigrationSubType>('inventory');

  return (
    <div style={{ display: isAdminWalletConnected ? 'flex' : 'none', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Migration Type Selector */}
      <div style={{ padding: '1rem', backgroundColor: styles.bgSecondary, borderRadius: '4px', border: `1px solid ${styles.border}` }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: styles.text }}>
          Migration Type:
        </label>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', color: styles.text }}>
            <input
              type="radio"
              value="inventory"
              checked={migrationSubType === 'inventory'}
              onChange={(e) => setMigrationSubType(e.target.value as MigrationSubType)}
              style={{ marginRight: '0.5rem' }}
            />
            🎁 Inventory Migration
          </label>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', color: styles.text }}>
            <input
              type="radio"
              value="stats"
              checked={migrationSubType === 'stats'}
              onChange={(e) => setMigrationSubType(e.target.value as MigrationSubType)}
              style={{ marginRight: '0.5rem' }}
            />
            📊 Stats Migration
          </label>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', color: styles.text }}>
            <input
              type="radio"
              value="game-pass"
              checked={migrationSubType === 'game-pass'}
              onChange={(e) => setMigrationSubType(e.target.value as MigrationSubType)}
              style={{ marginRight: '0.5rem' }}
            />
            🎫 Game Pass Migration
          </label>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', color: styles.text }}>
            <input
              type="radio"
              value="tournament"
              checked={migrationSubType === 'tournament'}
              onChange={(e) => setMigrationSubType(e.target.value as MigrationSubType)}
              style={{ marginRight: '0.5rem' }}
            />
            🏆 Tournament Migration
          </label>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', color: styles.text }}>
            <input
              type="radio"
              value="milestones"
              checked={migrationSubType === 'milestones'}
              onChange={(e) => setMigrationSubType(e.target.value as MigrationSubType)}
              style={{ marginRight: '0.5rem' }}
            />
            🎯 Milestone Migration
          </label>
        </div>
      </div>

      {/* Sub-tab Content */}
      {migrationSubType === 'inventory' && (
        <InventoryMigrationSubTab
          isAdminWalletConnected={isAdminWalletConnected}
          connectedAddress={connectedAddress}
          adminAddress={adminAddress}
          styles={styles}
        />
      )}

      {migrationSubType === 'stats' && (
        <StatsMigrationSubTab
          isAdminWalletConnected={isAdminWalletConnected}
          connectedAddress={connectedAddress}
          adminAddress={adminAddress}
          styles={styles}
        />
      )}

      {migrationSubType === 'game-pass' && (
        <GamePassMigrationSubTab
          isAdminWalletConnected={isAdminWalletConnected}
          connectedAddress={connectedAddress}
          adminAddress={adminAddress}
          styles={styles}
        />
      )}

      {migrationSubType === 'tournament' && (
        <TournamentMigrationSubTab
          isAdminWalletConnected={isAdminWalletConnected}
          connectedAddress={connectedAddress}
          adminAddress={adminAddress}
          styles={styles}
        />
      )}

      {migrationSubType === 'milestones' && (
        <MilestoneMigrationSubTab
          isAdminWalletConnected={isAdminWalletConnected}
          connectedAddress={connectedAddress}
          adminAddress={adminAddress}
          styles={styles}
        />
      )}
    </div>
  );
}

