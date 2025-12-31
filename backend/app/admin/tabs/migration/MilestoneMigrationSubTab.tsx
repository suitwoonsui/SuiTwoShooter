// ==========================================
// Milestone Migration Sub-Tab Component
// ==========================================

'use client';

import { useState } from 'react';
import { AdminStyles } from '../../types';
import { getApiUrl } from '../../utils/get-api-url';
import { ProgressBar } from '../../components/migration/ProgressBar';
import { MigrationResults, MigrationResult } from '../../components/migration/MigrationResults';

interface MilestoneMigrationSubTabProps {
  isAdminWalletConnected: boolean;
  connectedAddress: string | null;
  adminAddress: string | null;
  styles: AdminStyles;
}

export function MilestoneMigrationSubTab({ isAdminWalletConnected, connectedAddress, adminAddress, styles }: MilestoneMigrationSubTabProps) {
  // Old system configuration
  const [oldPackageId, setOldPackageId] = useState('');
  const [oldRegistryId, setOldRegistryId] = useState('');
  const [oldAdminCapId, setOldAdminCapId] = useState('');

  // Definitions migration
  const [migratingDefinitions, setMigratingDefinitions] = useState(false);
  const [definitionsResult, setDefinitionsResult] = useState<{ success: boolean; message: string; details?: any } | null>(null);

  // Player claims migration
  const [claimsMigrationMode, setClaimsMigrationMode] = useState<'single' | 'batch' | 'auto'>('auto');
  const [claimsMigrationAddress, setClaimsMigrationAddress] = useState('');
  const [claimsMigrationAddresses, setClaimsMigrationAddresses] = useState('');
  const [claimsMigrationLoading, setClaimsMigrationLoading] = useState(false);
  const [claimsMigrationResults, setClaimsMigrationResults] = useState<MigrationResult[]>([]);
  const [claimsMigrationProgress, setClaimsMigrationProgress] = useState<{ current: number; total: number } | null>(null);
  const [discoveredMilestoneWallets, setDiscoveredMilestoneWallets] = useState<string[]>([]);
  const [discoveringMilestoneWallets, setDiscoveringMilestoneWallets] = useState(false);

  const handleMigrateDefinitions = async () => {
    if (!isAdminWalletConnected || connectedAddress !== adminAddress) {
      alert('Admin wallet not connected. Please connect the admin wallet.');
      return;
    }

    // Note: oldPackageId and oldRegistryId are optional - API will use environment variables if not provided

    if (!confirm('This will migrate all milestone definitions from the old contract to the new contract. Continue?')) {
      return;
    }

    try {
      setMigratingDefinitions(true);
      setDefinitionsResult(null);

      const response = await fetch(getApiUrl('/api/admin/milestones/migrate'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          adminWalletAddress: connectedAddress,
          oldPackageId: oldPackageId,
          oldRegistryId: oldRegistryId,
          oldAdminCapId: oldAdminCapId || undefined,
          migrateDefinitions: true,
          migratePlayerClaims: false,
          force: false,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Migration failed');
      }

      const data = await response.json();

      if (data.success) {
        const defMigrated = data.results?.definitions?.migrated || 0;
        const defSkipped = data.results?.definitions?.skipped || 0;
        
        setDefinitionsResult({
          success: true,
          message: `Definitions migration completed! ${defMigrated} migrated, ${defSkipped} skipped.`,
          details: data.results,
        });
      } else {
        setDefinitionsResult({
          success: false,
          message: 'Definitions migration completed with errors. Check results for details.',
          details: data.results,
        });
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setDefinitionsResult({
        success: false,
        message: `Definitions migration failed: ${errorMsg}`,
      });
    } finally {
      setMigratingDefinitions(false);
    }
  };

  const handleDiscoverMilestoneWallets = async () => {
    setDiscoveringMilestoneWallets(true);
    setDiscoveredMilestoneWallets([]);

    try {
      if (!isAdminWalletConnected || connectedAddress !== adminAddress) {
        alert('Admin wallet not connected. Please connect the admin wallet.');
        setDiscoveringMilestoneWallets(false);
        return;
      }

      // Note: oldPackageId and oldRegistryId are optional - API will use environment variables if not provided

      const queryParams = new URLSearchParams();
      if (oldPackageId) queryParams.append('oldPackageId', oldPackageId);
      if (oldRegistryId) queryParams.append('oldRegistryId', oldRegistryId);
      const queryString = queryParams.toString();
      
      const response = await fetch(`${getApiUrl('/api/admin/milestones/migrate')}${queryString ? `?${queryString}` : ''}`);
      const data = await response.json();

      if (response.ok && data.success && data.wallets) {
        setDiscoveredMilestoneWallets(data.wallets);
        if (data.wallets.length === 0) {
          alert('No wallets with milestone claims found in the old registry.');
        }
      } else {
        alert(data.error || 'Failed to discover wallets');
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Network error');
    } finally {
      setDiscoveringMilestoneWallets(false);
    }
  };

  const handleClaimsMigrationSubmit = async () => {
    setClaimsMigrationLoading(true);
    setClaimsMigrationResults([]);
    setClaimsMigrationProgress(null);

    try {
      if (!isAdminWalletConnected || connectedAddress !== adminAddress) {
        setClaimsMigrationResults([{
          address: 'N/A',
          success: false,
          error: 'Admin wallet not connected. Please connect the admin wallet.',
        }]);
        setClaimsMigrationLoading(false);
        return;
      }

      // Note: oldPackageId and oldRegistryId are optional - API will use environment variables if not provided

      let addresses: string[] = [];
      
      if (claimsMigrationMode === 'auto') {
        addresses = discoveredMilestoneWallets;
      } else if (claimsMigrationMode === 'single') {
        addresses = [claimsMigrationAddress.trim()];
      } else {
        addresses = claimsMigrationAddresses
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0 && line.startsWith('0x'));
      }

      if (addresses.length === 0) {
        setClaimsMigrationResults([{
          address: 'N/A',
          success: false,
          error: 'No valid addresses provided',
        }]);
        setClaimsMigrationLoading(false);
        return;
      }

      setClaimsMigrationProgress({ current: 0, total: addresses.length });
      const results: MigrationResult[] = [];

      for (let i = 0; i < addresses.length; i++) {
        const address = addresses[i];
        setClaimsMigrationProgress({ current: i, total: addresses.length });

        try {
          const response = await fetch(getApiUrl('/api/admin/milestones/migrate'), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              adminWalletAddress: connectedAddress,
              oldPackageId: oldPackageId,
              oldRegistryId: oldRegistryId,
              oldAdminCapId: oldAdminCapId || undefined,
              migrateDefinitions: false,
              migratePlayerClaims: true,
              playerAddress: address,
              force: false,
            }),
          });

          const data = await response.json();

          if (response.ok && data.success) {
            const claimsMigrated = data.results?.playerClaims?.migrated || 0;
            results.push({
              address,
              success: true,
              digest: data.results?.playerClaims?.digest,
            });
          } else {
            results.push({
              address,
              success: false,
              error: data.error || 'Migration failed',
            });
          }
        } catch (error) {
          results.push({
            address,
            success: false,
            error: error instanceof Error ? error.message : 'Network error',
          });
        }

        setClaimsMigrationResults([...results]);
      }

      setClaimsMigrationProgress({ current: addresses.length, total: addresses.length });
      setClaimsMigrationResults(results);

      if (claimsMigrationMode === 'single') {
        setClaimsMigrationAddress('');
      } else {
        setClaimsMigrationAddresses('');
      }
    } catch (error) {
      setClaimsMigrationResults([{
        address: 'N/A',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }]);
    } finally {
      setClaimsMigrationLoading(false);
      setClaimsMigrationProgress(null);
    }
  };

  return (
    <>
      <div style={{ padding: '1rem', backgroundColor: styles.bgInfo, borderRadius: '4px', border: `1px solid ${styles.border}` }}>
        <strong style={{ color: styles.heading }}>📋 Milestone Migration Instructions:</strong>
        <ul style={{ marginTop: '0.5rem', marginLeft: '1.5rem', fontSize: '0.9rem', color: styles.textSecondary }}>
          <li>Migrate milestone definitions and player claimed milestones from the old AchievementRegistry to the new AchievementRegistry</li>
          <li><strong>Step 1:</strong> Migrate milestone definitions (one-time action, migrates all definitions)</li>
          <li><strong>Step 2:</strong> Migrate player claims (auto, single, or batch mode)</li>
          <li>Auto mode: Discover all wallets with milestone claims and migrate them</li>
          <li>Single mode: Migrate one wallet at a time</li>
          <li>Batch mode: Migrate multiple wallets (one address per line)</li>
          <li>Old system IDs can be left empty to use environment defaults</li>
          <li><strong>Note:</strong> Definitions are migrated once, player claims can be migrated per player</li>
        </ul>
      </div>

      {/* Old System Configuration */}
      <div style={{ padding: '1rem', backgroundColor: styles.bgTertiary, borderRadius: '4px', marginBottom: '1rem', border: `1px solid ${styles.border}` }}>
        <strong style={{ color: styles.heading }}>📋 Old Achievement Registry Configuration:</strong>
        <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: styles.textSecondary }}>
          These fields are optional. If left empty, the system will use environment variables:
          <br />• <code style={{ backgroundColor: styles.bgSecondary, padding: '0.2rem 0.4rem', borderRadius: '3px' }}>OLD_ACHIEVEMENT_PACKAGE_ID</code> (for Package ID)
          <br />• <code style={{ backgroundColor: styles.bgSecondary, padding: '0.2rem 0.4rem', borderRadius: '3px' }}>OLD_ACHIEVEMENT_REGISTRY_ID</code> (for Registry Object ID)
          <br />• <code style={{ backgroundColor: styles.bgSecondary, padding: '0.2rem 0.4rem', borderRadius: '3px' }}>OLD_ACHIEVEMENT_ADMIN_CAP_ID</code> (for Admin Cap ID)
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: styles.heading }}>
            Old Package ID (optional):
          </label>
          <input
            type="text"
            value={oldPackageId}
            onChange={(e) => setOldPackageId(e.target.value)}
            placeholder="Leave empty to use environment variable"
            style={{
              width: '100%',
              padding: '0.75rem',
              fontSize: '1rem',
              border: `1px solid ${styles.border}`,
              borderRadius: '4px',
              backgroundColor: styles.inputBg,
              color: styles.heading,
            }}
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: styles.heading }}>
            Old Registry ID (optional):
          </label>
          <input
            type="text"
            value={oldRegistryId}
            onChange={(e) => setOldRegistryId(e.target.value)}
            placeholder="Leave empty to use environment variable"
            style={{
              width: '100%',
              padding: '0.75rem',
              fontSize: '1rem',
              border: `1px solid ${styles.border}`,
              borderRadius: '4px',
              backgroundColor: styles.inputBg,
              color: styles.heading,
            }}
          />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: styles.heading }}>
            Old Admin Cap ID (optional):
          </label>
          <input
            type="text"
            value={oldAdminCapId}
            onChange={(e) => setOldAdminCapId(e.target.value)}
            placeholder="Leave empty to use environment variable"
            style={{
              width: '100%',
              padding: '0.75rem',
              fontSize: '1rem',
              border: `1px solid ${styles.border}`,
              borderRadius: '4px',
              backgroundColor: styles.inputBg,
              color: styles.heading,
            }}
          />
        </div>
      </div>

      {/* Migrate Definitions Section */}
      <div style={{ padding: '1.5rem', backgroundColor: styles.bgSecondary, border: `1px solid ${styles.border}`, borderRadius: '8px', marginBottom: '1.5rem' }}>
        <h3 style={{ color: styles.heading, fontSize: '1.1em', margin: '0 0 0.5rem 0' }}>
          📚 Step 1: Migrate Milestone Definitions
        </h3>
        <p style={{ 
          margin: '0 0 1rem 0', 
          fontSize: '0.9em', 
          color: styles.textSecondary,
          lineHeight: '1.5'
        }}>
          Migrate all milestone definitions from the old contract to the new contract. This is a one-time action that migrates all definitions at once.
        </p>

        <button
          onClick={handleMigrateDefinitions}
          disabled={!isAdminWalletConnected || migratingDefinitions || connectedAddress !== adminAddress}
          style={{
            ...styles.button,
            backgroundColor: migratingDefinitions ? '#9e9e9e' : styles.buttonPrimary,
            color: 'white',
            padding: '10px 20px',
            fontSize: '0.95em',
            cursor: (!isAdminWalletConnected || migratingDefinitions || connectedAddress !== adminAddress) ? 'not-allowed' : 'pointer',
            opacity: (!isAdminWalletConnected || migratingDefinitions || connectedAddress !== adminAddress) ? 0.6 : 1,
          }}
        >
          {migratingDefinitions ? '🔄 Migrating Definitions...' : '🚀 Migrate Milestone Definitions'}
        </button>

        {definitionsResult && (
          <div style={{
            marginTop: '12px',
            padding: '12px',
            backgroundColor: definitionsResult.success ? '#e8f5e9' : '#ffebee',
            borderRadius: '4px',
            fontSize: '0.9em',
            color: definitionsResult.success ? '#2e7d32' : '#c62828',
            border: `1px solid ${definitionsResult.success ? '#4caf50' : '#f44336'}`,
          }}>
            <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>
              {definitionsResult.success ? '✓ Success' : '✕ Error'}
            </div>
            <div>{definitionsResult.message}</div>
            {definitionsResult.details && (
              <details style={{ marginTop: '0.5rem', cursor: 'pointer' }}>
                <summary style={{ fontSize: '0.85em', color: styles.textSecondary }}>
                  View Details
                </summary>
                <pre style={{
                  marginTop: '0.5rem',
                  padding: '8px',
                  backgroundColor: styles.bgPrimary,
                  borderRadius: '4px',
                  fontSize: '0.8em',
                  overflow: 'auto',
                  maxHeight: '200px',
                }}>
                  {JSON.stringify(definitionsResult.details, null, 2)}
                </pre>
              </details>
            )}
          </div>
        )}
      </div>

      {/* Migrate Player Claims Section */}
      <div style={{ padding: '1.5rem', backgroundColor: styles.bgSecondary, border: `1px solid ${styles.border}`, borderRadius: '8px' }}>
        <h3 style={{ color: styles.heading, fontSize: '1.1em', margin: '0 0 0.5rem 0' }}>
          👥 Step 2: Migrate Player Claims
        </h3>
        <p style={{ 
          margin: '0 0 1rem 0', 
          fontSize: '0.9em', 
          color: styles.textSecondary,
          lineHeight: '1.5'
        }}>
          Migrate claimed milestones for players. You can migrate one player at a time or multiple players in batch mode.
        </p>

        {/* Migration Mode Selector */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: styles.heading }}>
            Migration Mode:
          </label>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', color: styles.heading }}>
              <input
                type="radio"
                value="auto"
                checked={claimsMigrationMode === 'auto'}
                onChange={(e) => setClaimsMigrationMode(e.target.value as 'single' | 'batch' | 'auto')}
                style={{ marginRight: '0.5rem' }}
              />
              Auto (Discover All Wallets)
            </label>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', color: styles.heading }}>
              <input
                type="radio"
                value="single"
                checked={claimsMigrationMode === 'single'}
                onChange={(e) => setClaimsMigrationMode(e.target.value as 'single' | 'batch' | 'auto')}
                style={{ marginRight: '0.5rem' }}
              />
              Single Player
            </label>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', color: styles.heading }}>
              <input
                type="radio"
                value="batch"
                checked={claimsMigrationMode === 'batch'}
                onChange={(e) => setClaimsMigrationMode(e.target.value as 'single' | 'batch' | 'auto')}
                style={{ marginRight: '0.5rem' }}
              />
              Batch (Manual List)
            </label>
          </div>
        </div>

        {/* Auto Mode - Discover Wallets */}
        {claimsMigrationMode === 'auto' && (
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: styles.bgSuccess, borderRadius: '4px', border: `1px solid ${styles.border}` }}>
              <strong style={{ color: styles.heading }}>🔍 Auto Discovery:</strong>
              <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: styles.textSecondary }}>
                This mode will automatically discover all wallets that have claimed milestones in the old AchievementRegistry by querying AchievementClaimed events.
              </p>
            </div>
            
            {discoveredMilestoneWallets.length > 0 && (
              <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: styles.bgTertiary, borderRadius: '4px', border: `1px solid ${styles.border}` }}>
                <strong style={{ color: styles.heading }}>✅ Discovered {discoveredMilestoneWallets.length} wallet(s) with milestone claims:</strong>
                <div style={{ marginTop: '0.5rem', maxHeight: '200px', overflowY: 'auto', fontSize: '0.9rem', fontFamily: 'monospace', color: styles.textSecondary }}>
                  {discoveredMilestoneWallets.map((wallet, index) => (
                    <div key={index} style={{ padding: '0.25rem 0' }}>
                      {wallet}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={handleDiscoverMilestoneWallets}
              disabled={discoveringMilestoneWallets || !isAdminWalletConnected}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: discoveringMilestoneWallets || !isAdminWalletConnected ? styles.buttonDisabled : styles.buttonSuccess,
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: discoveringMilestoneWallets || !isAdminWalletConnected ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
                marginBottom: '1rem',
              }}
            >
              {discoveringMilestoneWallets ? 'Discovering...' : '🔍 Discover Wallets with Milestone Claims'}
            </button>
          </div>
        )}

        {/* Single Mode */}
        {claimsMigrationMode === 'single' && (
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: styles.heading }}>
              Player Address:
            </label>
            <input
              type="text"
              value={claimsMigrationAddress}
              onChange={(e) => setClaimsMigrationAddress(e.target.value)}
              placeholder="0x..."
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                fontSize: '1rem',
                border: `1px solid ${styles.border}`,
                borderRadius: '4px',
                backgroundColor: styles.inputBg,
                color: styles.heading,
              }}
            />
          </div>
        )}

        {/* Batch Mode */}
        {claimsMigrationMode === 'batch' && (
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: styles.heading }}>
              Player Addresses (one per line):
            </label>
            <textarea
              value={claimsMigrationAddresses}
              onChange={(e) => setClaimsMigrationAddresses(e.target.value)}
              placeholder="0x...&#10;0x...&#10;0x..."
              rows={10}
              style={{
                width: '100%',
                padding: '0.75rem',
                fontSize: '1rem',
                border: `1px solid ${styles.border}`,
                borderRadius: '4px',
                fontFamily: 'monospace',
                backgroundColor: styles.inputBg,
                color: styles.heading,
              }}
            />
          </div>
        )}

        <ProgressBar progress={claimsMigrationProgress} styles={styles} />
        <MigrationResults results={claimsMigrationResults} styles={styles} />

        <button
          type="button"
          onClick={handleClaimsMigrationSubmit}
          disabled={claimsMigrationLoading || !isAdminWalletConnected || (claimsMigrationMode === 'auto' ? discoveredMilestoneWallets.length === 0 : claimsMigrationMode === 'single' ? !claimsMigrationAddress : !claimsMigrationAddresses.trim()) || connectedAddress !== adminAddress}
          style={{
            padding: '1rem',
            fontSize: '1.1rem',
            backgroundColor: claimsMigrationLoading || !isAdminWalletConnected || (claimsMigrationMode === 'auto' ? discoveredMilestoneWallets.length === 0 : claimsMigrationMode === 'single' ? !claimsMigrationAddress : !claimsMigrationAddresses.trim()) || connectedAddress !== adminAddress ? styles.buttonDisabled : styles.buttonPrimary,
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: claimsMigrationLoading || !isAdminWalletConnected || (claimsMigrationMode === 'auto' ? discoveredMilestoneWallets.length === 0 : claimsMigrationMode === 'single' ? !claimsMigrationAddress : !claimsMigrationAddresses.trim()) || connectedAddress !== adminAddress ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
            marginTop: '1rem',
          }}
        >
          {claimsMigrationLoading 
            ? 'Migrating...' 
            : claimsMigrationMode === 'auto' 
              ? `Migrate ${discoveredMilestoneWallets.length} Player Claims` 
              : claimsMigrationMode === 'single' 
                ? 'Migrate Player Claims' 
                : 'Migrate All Player Claims'}
        </button>
      </div>
    </>
  );
}

