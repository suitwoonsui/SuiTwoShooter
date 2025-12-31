// ==========================================
// Inventory Migration Sub-Tab Component
// ==========================================

'use client';

import { useState } from 'react';
import { AdminStyles } from '../../types';
import { getApiUrl } from '../../utils/get-api-url';
import { ProgressBar } from '../../components/migration/ProgressBar';
import { MigrationResults, MigrationResult } from '../../components/migration/MigrationResults';

interface InventoryMigrationSubTabProps {
  isAdminWalletConnected: boolean;
  connectedAddress: string | null;
  adminAddress: string | null;
  styles: AdminStyles;
}

export function InventoryMigrationSubTab({ isAdminWalletConnected, connectedAddress, adminAddress, styles }: InventoryMigrationSubTabProps) {
  const [migrationMode, setMigrationMode] = useState<'single' | 'batch' | 'auto'>('auto');
  const [migrationAddress, setMigrationAddress] = useState('');
  const [migrationAddresses, setMigrationAddresses] = useState('');
  const [oldPackageId, setOldPackageId] = useState('');
  const [oldStoreObjectId, setOldStoreObjectId] = useState('');
  const [migrationLoading, setMigrationLoading] = useState(false);
  const [migrationResults, setMigrationResults] = useState<MigrationResult[]>([]);
  const [migrationProgress, setMigrationProgress] = useState<{ current: number; total: number } | null>(null);
  const [discoveredWallets, setDiscoveredWallets] = useState<string[]>([]);
  const [discoveringWallets, setDiscoveringWallets] = useState(false);

  const handleDiscoverWallets = async () => {
    setDiscoveringWallets(true);
    setDiscoveredWallets([]);

    try {
      if (!isAdminWalletConnected || connectedAddress !== adminAddress) {
        alert('Admin wallet not connected. Please connect the admin wallet.');
        setDiscoveringWallets(false);
        return;
      }

      const oldStoreId = oldStoreObjectId || undefined;
      const queryParam = oldStoreId ? `?oldStoreObjectId=${encodeURIComponent(oldStoreId)}` : '';
      
      const response = await fetch(`${getApiUrl('api/store/migrate')}${queryParam}`);
      const data = await response.json();

      if (response.ok && data.success && data.wallets) {
        setDiscoveredWallets(data.wallets);
        if (data.wallets.length === 0) {
          alert('No wallets with inventory found in the old store.');
        }
      } else {
        alert(data.error || 'Failed to discover wallets');
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Network error');
    } finally {
      setDiscoveringWallets(false);
    }
  };

  const handleMigrationSubmit = async () => {
    setMigrationLoading(true);
    setMigrationResults([]);
    setMigrationProgress(null);

    try {
      if (!isAdminWalletConnected || connectedAddress !== adminAddress) {
        setMigrationResults([{
          address: 'N/A',
          success: false,
          error: 'Admin wallet not connected. Please connect the admin wallet.',
        }]);
        setMigrationLoading(false);
        return;
      }

      let addresses: string[] = [];
      
      if (migrationMode === 'auto') {
        addresses = discoveredWallets;
      } else if (migrationMode === 'single') {
        addresses = [migrationAddress.trim()];
      } else {
        addresses = migrationAddresses
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0 && line.startsWith('0x'));
      }

      if (addresses.length === 0) {
        setMigrationResults([{
          address: 'N/A',
          success: false,
          error: 'No valid addresses provided',
        }]);
        setMigrationLoading(false);
        return;
      }

      setMigrationProgress({ current: 0, total: addresses.length });
      const results: MigrationResult[] = [];

      for (let i = 0; i < addresses.length; i++) {
        const address = addresses[i];
        setMigrationProgress({ current: i, total: addresses.length });

        try {
          const response = await fetch(getApiUrl('api/store/migrate'), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              playerAddress: address,
              ...(oldPackageId && { oldPackageId }),
              ...(oldStoreObjectId && { oldStoreObjectId }),
            }),
          });

          const data = await response.json();

          if (response.ok && data.success) {
            results.push({
              address,
              success: true,
              digest: data.digest,
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

        setMigrationResults([...results]);
      }

      setMigrationProgress({ current: addresses.length, total: addresses.length });
      setMigrationResults(results);

      if (migrationMode === 'single') {
        setMigrationAddress('');
      } else {
        setMigrationAddresses('');
      }
    } catch (error) {
      setMigrationResults([{
        address: 'N/A',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }]);
    } finally {
      setMigrationLoading(false);
      setMigrationProgress(null);
    }
  };

  return (
    <>
      <div style={{ padding: '1rem', backgroundColor: styles.bgInfo, borderRadius: '4px', border: `1px solid ${styles.border}` }}>
        <strong style={{ color: styles.text }}>📋 Inventory Migration Instructions:</strong>
        <ul style={{ marginTop: '0.5rem', marginLeft: '1.5rem', fontSize: '0.9rem', color: styles.textSecondary }}>
          <li>Migrate player inventories from the old PremiumStore to the new PremiumStore</li>
          <li>Single mode: Migrate one wallet at a time</li>
          <li>Batch mode: Migrate multiple wallets (one address per line)</li>
          <li>Old store IDs can be left empty to use environment defaults</li>
        </ul>
      </div>

      {/* Migration Mode Selector */}
      <div>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: styles.text }}>
          Migration Mode:
        </label>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', color: styles.text }}>
            <input
              type="radio"
              value="auto"
              checked={migrationMode === 'auto'}
              onChange={(e) => setMigrationMode(e.target.value as 'single' | 'batch' | 'auto')}
              style={{ marginRight: '0.5rem' }}
            />
            Auto (Discover All Wallets)
          </label>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', color: styles.text }}>
            <input
              type="radio"
              value="single"
              checked={migrationMode === 'single'}
              onChange={(e) => setMigrationMode(e.target.value as 'single' | 'batch' | 'auto')}
              style={{ marginRight: '0.5rem' }}
            />
            Single Wallet
          </label>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', color: styles.text }}>
            <input
              type="radio"
              value="batch"
              checked={migrationMode === 'batch'}
              onChange={(e) => setMigrationMode(e.target.value as 'single' | 'batch' | 'auto')}
              style={{ marginRight: '0.5rem' }}
            />
            Batch (Manual List)
          </label>
        </div>
      </div>

      {/* Old Store Configuration */}
      <div style={{ padding: '1rem', backgroundColor: styles.bgTertiary, borderRadius: '4px', marginBottom: '1rem', border: `1px solid ${styles.border}` }}>
        <strong style={{ color: styles.text }}>📋 Old Store Configuration:</strong>
        <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: styles.textSecondary }}>
          These fields are optional. If left empty, the system will use environment variables:
          <br />• <code style={{ backgroundColor: styles.bgSecondary, padding: '0.2rem 0.4rem', borderRadius: '3px' }}>OLD_PREMIUM_STORE_PACKAGE_ID</code> (for Package ID)
          <br />• <code style={{ backgroundColor: styles.bgSecondary, padding: '0.2rem 0.4rem', borderRadius: '3px' }}>OLD_PREMIUM_STORE_OBJECT_ID</code> (for Object ID)
        </p>
      </div>

      <div>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: styles.text }}>
          Old Store Package ID (optional - uses <code style={{ backgroundColor: styles.bgSecondary, padding: '0.2rem 0.4rem', borderRadius: '3px' }}>OLD_PREMIUM_STORE_PACKAGE_ID</code> if empty):
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
            color: styles.text,
          }}
        />
      </div>

      <div>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: styles.text }}>
          Old Store Object ID (optional - uses <code style={{ backgroundColor: styles.bgSecondary, padding: '0.2rem 0.4rem', borderRadius: '3px' }}>OLD_PREMIUM_STORE_OBJECT_ID</code> if empty):
        </label>
        <input
          type="text"
          value={oldStoreObjectId}
          onChange={(e) => setOldStoreObjectId(e.target.value)}
          placeholder="Leave empty to use environment variable"
          style={{
            width: '100%',
            padding: '0.75rem',
            fontSize: '1rem',
            border: `1px solid ${styles.border}`,
            borderRadius: '4px',
            backgroundColor: styles.inputBg,
            color: styles.text,
          }}
        />
      </div>

      {/* Auto Mode - Discover Wallets */}
      {migrationMode === 'auto' && (
        <div>
          <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: styles.bgSuccess, borderRadius: '4px', border: `1px solid ${styles.border}` }}>
            <strong style={{ color: styles.text }}>🔍 Auto Discovery:</strong>
            <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: styles.textSecondary }}>
              This mode will automatically discover all wallets that have inventory in the old PremiumStore by querying the store's dynamic fields.
            </p>
          </div>
          
          {discoveredWallets.length > 0 && (
            <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: styles.bgTertiary, borderRadius: '4px', border: `1px solid ${styles.border}` }}>
              <strong style={{ color: styles.text }}>✅ Discovered {discoveredWallets.length} wallet(s) with inventory:</strong>
              <div style={{ marginTop: '0.5rem', maxHeight: '200px', overflowY: 'auto', fontSize: '0.9rem', fontFamily: 'monospace', color: styles.textSecondary }}>
                {discoveredWallets.map((wallet, index) => (
                  <div key={index} style={{ padding: '0.25rem 0' }}>
                    {wallet}
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={handleDiscoverWallets}
            disabled={discoveringWallets || !isAdminWalletConnected}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: discoveringWallets || !isAdminWalletConnected ? styles.buttonDisabled : styles.buttonSuccess,
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: discoveringWallets || !isAdminWalletConnected ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              marginBottom: '1rem',
            }}
          >
            {discoveringWallets ? 'Discovering...' : '🔍 Discover Wallets with Inventory'}
          </button>
        </div>
      )}

      {/* Single Mode */}
      {migrationMode === 'single' && (
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: styles.text }}>
            Player Address:
          </label>
          <input
            type="text"
            value={migrationAddress}
            onChange={(e) => setMigrationAddress(e.target.value)}
            placeholder="0x..."
            required
            style={{
              width: '100%',
              padding: '0.75rem',
              fontSize: '1rem',
              border: `1px solid ${styles.border}`,
              borderRadius: '4px',
              backgroundColor: styles.inputBg,
              color: styles.text,
            }}
          />
        </div>
      )}

      {/* Batch Mode */}
      {migrationMode === 'batch' && (
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: styles.text }}>
            Player Addresses (one per line):
          </label>
          <textarea
            value={migrationAddresses}
            onChange={(e) => setMigrationAddresses(e.target.value)}
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
              color: styles.text,
            }}
          />
        </div>
      )}

      <ProgressBar progress={migrationProgress} styles={styles} />
      <MigrationResults results={migrationResults} styles={styles} />

      <button
        type="button"
        onClick={handleMigrationSubmit}
        disabled={migrationLoading || !isAdminWalletConnected || (migrationMode === 'auto' ? discoveredWallets.length === 0 : migrationMode === 'single' ? !migrationAddress : !migrationAddresses.trim())}
        style={{
          padding: '1rem',
          fontSize: '1.1rem',
          backgroundColor: migrationLoading || !isAdminWalletConnected ? styles.buttonDisabled : styles.buttonPrimary,
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: migrationLoading || !isAdminWalletConnected ? 'not-allowed' : 'pointer',
          fontWeight: 'bold',
        }}
      >
        {migrationLoading 
          ? 'Migrating...' 
          : migrationMode === 'auto' 
            ? `Migrate ${discoveredWallets.length} Inventories` 
            : migrationMode === 'single' 
              ? 'Migrate Inventory' 
              : 'Migrate All Inventories'}
      </button>
    </>
  );
}

