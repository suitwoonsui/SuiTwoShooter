// ==========================================
// Admin Page - Migration Tab Component
// ==========================================

'use client';

import { useState } from 'react';
import { MigrationSubType, AdminStyles } from '../types';
import { getApiUrl } from '../utils/get-api-url';

interface MigrationTabProps {
  isAdminWalletConnected: boolean;
  connectedAddress: string | null;
  adminAddress: string | null;
  styles: AdminStyles;
}

interface MigrationResult {
  address: string;
  success: boolean;
  digest?: string;
  error?: string;
}

export function MigrationTab({ isAdminWalletConnected, connectedAddress, adminAddress, styles }: MigrationTabProps) {
  const [migrationSubType, setMigrationSubType] = useState<MigrationSubType>('inventory');

  // Inventory Migration state
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

  // Score Migration state
  const [scoreMigrationMode, setScoreMigrationMode] = useState<'single' | 'batch' | 'auto'>('auto');
  const [scoreMigrationAddress, setScoreMigrationAddress] = useState('');
  const [scoreMigrationAddresses, setScoreMigrationAddresses] = useState('');
  const [oldScorePackageId, setOldScorePackageId] = useState('');
  const [oldStatsRegistryId, setOldStatsRegistryId] = useState('');
  const [scoreMigrationLoading, setScoreMigrationLoading] = useState(false);
  const [scoreMigrationResults, setScoreMigrationResults] = useState<MigrationResult[]>([]);
  const [scoreMigrationProgress, setScoreMigrationProgress] = useState<{ current: number; total: number } | null>(null);
  const [discoveredScoreWallets, setDiscoveredScoreWallets] = useState<string[]>([]);
  const [discoveringScoreWallets, setDiscoveringScoreWallets] = useState(false);

  // Game Pass Migration state
  const [gamePassMigrationMode, setGamePassMigrationMode] = useState<'single' | 'batch' | 'auto'>('auto');
  const [gamePassMigrationAddress, setGamePassMigrationAddress] = useState('');
  const [gamePassMigrationAddresses, setGamePassMigrationAddresses] = useState('');
  const [oldGamePassPackageId, setOldGamePassPackageId] = useState('');
  const [oldGamePassSystemId, setOldGamePassSystemId] = useState('');
  const [gamePassMigrationLoading, setGamePassMigrationLoading] = useState(false);
  const [gamePassMigrationResults, setGamePassMigrationResults] = useState<MigrationResult[]>([]);
  const [gamePassMigrationProgress, setGamePassMigrationProgress] = useState<{ current: number; total: number } | null>(null);
  const [discoveredGamePassWallets, setDiscoveredGamePassWallets] = useState<string[]>([]);
  const [discoveringGamePassWallets, setDiscoveringGamePassWallets] = useState(false);

  // Clear Stats state
  const [clearStatsAddress, setClearStatsAddress] = useState('');
  const [clearStatsLoading, setClearStatsLoading] = useState(false);
  const [clearStatsResult, setClearStatsResult] = useState<{ success: boolean; digest?: string; error?: string } | null>(null);

  // Inventory Migration handlers
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

  // Score Migration handlers
  const handleDiscoverScoreWallets = async () => {
    setDiscoveringScoreWallets(true);
    setDiscoveredScoreWallets([]);

    try {
      if (!isAdminWalletConnected || connectedAddress !== adminAddress) {
        alert('Admin wallet not connected. Please connect the admin wallet.');
        setDiscoveringScoreWallets(false);
        return;
      }

      const oldStatsId = oldStatsRegistryId || undefined;
      const oldPkgId = oldScorePackageId || undefined;
      const queryParams = new URLSearchParams();
      if (oldStatsId) queryParams.append('oldStatsRegistryId', oldStatsId);
      if (oldPkgId) queryParams.append('oldPackageId', oldPkgId);
      const queryString = queryParams.toString();
      
      const response = await fetch(`${getApiUrl('api/scores/migrate')}${queryString ? `?${queryString}` : ''}`);
      const data = await response.json();

      if (response.ok && data.success && data.wallets) {
        setDiscoveredScoreWallets(data.wallets);
        if (data.wallets.length === 0) {
          alert('No wallets with statistics found in the old registry.');
        }
      } else {
        alert(data.error || 'Failed to discover wallets');
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Network error');
    } finally {
      setDiscoveringScoreWallets(false);
    }
  };

  const handleScoreMigrationSubmit = async () => {
    setScoreMigrationLoading(true);
    setScoreMigrationResults([]);
    setScoreMigrationProgress(null);

    try {
      if (!isAdminWalletConnected || connectedAddress !== adminAddress) {
        setScoreMigrationResults([{
          address: 'N/A',
          success: false,
          error: 'Admin wallet not connected. Please connect the admin wallet.',
        }]);
        setScoreMigrationLoading(false);
        return;
      }

      let addresses: string[] = [];
      
      if (scoreMigrationMode === 'auto') {
        addresses = discoveredScoreWallets;
      } else if (scoreMigrationMode === 'single') {
        addresses = [scoreMigrationAddress.trim()];
      } else {
        addresses = scoreMigrationAddresses
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0 && line.startsWith('0x'));
      }

      if (addresses.length === 0) {
        setScoreMigrationResults([{
          address: 'N/A',
          success: false,
          error: 'No valid addresses provided',
        }]);
        setScoreMigrationLoading(false);
        return;
      }

      setScoreMigrationProgress({ current: 0, total: addresses.length });
      const results: MigrationResult[] = [];

      for (let i = 0; i < addresses.length; i++) {
        const address = addresses[i];
        setScoreMigrationProgress({ current: i, total: addresses.length });

        try {
          const response = await fetch(getApiUrl('api/scores/migrate'), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              playerAddress: address,
              ...(oldScorePackageId && { oldPackageId: oldScorePackageId }),
              ...(oldStatsRegistryId && { oldStatsRegistryId }),
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

        setScoreMigrationResults([...results]);
      }

      setScoreMigrationProgress({ current: addresses.length, total: addresses.length });
      setScoreMigrationResults(results);

      if (scoreMigrationMode === 'single') {
        setScoreMigrationAddress('');
      } else {
        setScoreMigrationAddresses('');
      }
    } catch (error) {
      setScoreMigrationResults([{
        address: 'N/A',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }]);
    } finally {
      setScoreMigrationLoading(false);
      setScoreMigrationProgress(null);
    }
  };

  // Game Pass Migration handlers
  const handleDiscoverGamePassWallets = async () => {
    setDiscoveringGamePassWallets(true);
    setDiscoveredGamePassWallets([]);

    try {
      if (!isAdminWalletConnected || connectedAddress !== adminAddress) {
        alert('Admin wallet not connected. Please connect the admin wallet.');
        setDiscoveringGamePassWallets(false);
        return;
      }

      const oldSystemId = oldGamePassSystemId || undefined;
      const oldPkgId = oldGamePassPackageId || undefined;
      const queryParams = new URLSearchParams();
      if (oldSystemId) queryParams.append('oldGamePassSystemId', oldSystemId);
      if (oldPkgId) queryParams.append('oldPackageId', oldPkgId);
      const queryString = queryParams.toString();
      
      const response = await fetch(`${getApiUrl('api/game-pass/migrate')}${queryString ? `?${queryString}` : ''}`);
      const data = await response.json();

      if (response.ok && data.success && data.wallets) {
        setDiscoveredGamePassWallets(data.wallets);
        if (data.wallets.length === 0) {
          alert('No wallets with game passes found in the old system.');
        }
      } else {
        alert(data.error || 'Failed to discover wallets');
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Network error');
    } finally {
      setDiscoveringGamePassWallets(false);
    }
  };

  const handleGamePassMigrationSubmit = async () => {
    setGamePassMigrationLoading(true);
    setGamePassMigrationResults([]);
    setGamePassMigrationProgress(null);

    try {
      if (!isAdminWalletConnected || connectedAddress !== adminAddress) {
        setGamePassMigrationResults([{
          address: 'N/A',
          success: false,
          error: 'Admin wallet not connected. Please connect the admin wallet.',
        }]);
        setGamePassMigrationLoading(false);
        return;
      }

      let addresses: string[] = [];
      
      if (gamePassMigrationMode === 'auto') {
        addresses = discoveredGamePassWallets;
      } else if (gamePassMigrationMode === 'single') {
        addresses = [gamePassMigrationAddress.trim()];
      } else {
        addresses = gamePassMigrationAddresses
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0 && line.startsWith('0x'));
      }

      if (addresses.length === 0) {
        setGamePassMigrationResults([{
          address: 'N/A',
          success: false,
          error: 'No valid addresses provided',
        }]);
        setGamePassMigrationLoading(false);
        return;
      }

      setGamePassMigrationProgress({ current: 0, total: addresses.length });
      const results: MigrationResult[] = [];

      for (let i = 0; i < addresses.length; i++) {
        const address = addresses[i];
        setGamePassMigrationProgress({ current: i, total: addresses.length });

        try {
          const response = await fetch(getApiUrl('api/game-pass/migrate'), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              playerAddress: address,
              ...(oldGamePassPackageId && { oldPackageId: oldGamePassPackageId }),
              ...(oldGamePassSystemId && { oldGamePassSystemId }),
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

        setGamePassMigrationResults([...results]);
      }

      setGamePassMigrationProgress({ current: addresses.length, total: addresses.length });
      setGamePassMigrationResults(results);

      if (gamePassMigrationMode === 'single') {
        setGamePassMigrationAddress('');
      } else {
        setGamePassMigrationAddresses('');
      }
    } catch (error) {
      setGamePassMigrationResults([{
        address: 'N/A',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }]);
    } finally {
      setGamePassMigrationLoading(false);
      setGamePassMigrationProgress(null);
    }
  };

  // Clear Stats handler
  const handleClearStats = async (clearAll: boolean = false) => {
    if (!clearAll && !clearStatsAddress.trim()) {
      alert('Please enter a player address');
      return;
    }

    if (!isAdminWalletConnected || connectedAddress !== adminAddress) {
      alert('Admin wallet not connected. Please connect the admin wallet.');
      return;
    }

    const confirmMessage = clearAll
      ? `⚠️ WARNING: This will permanently delete ALL statistics for ALL players in the registry!\n\nThis action cannot be undone. Are you absolutely sure you want to continue?`
      : `⚠️ WARNING: This will permanently delete all statistics for ${clearStatsAddress.trim()}\n\nThis action cannot be undone. Are you sure you want to continue?`;

    if (!confirm(confirmMessage)) {
      return;
    }

    setClearStatsLoading(true);
    setClearStatsResult(null);

    try {
      const url = clearAll
        ? `${getApiUrl('api/scores/migrate')}?clearAll=true`
        : `${getApiUrl('api/scores/migrate')}?playerAddress=${encodeURIComponent(clearStatsAddress.trim())}`;

      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        if (clearAll) {
          setClearStatsResult({
            success: true,
            digest: data.digests?.[0],
          });
        } else {
          setClearStatsResult({
            success: true,
            digest: data.digest,
          });
          setClearStatsAddress('');
        }
      } else {
        setClearStatsResult({
          success: false,
          error: data.error || 'Failed to clear stats',
        });
      }
    } catch (error) {
      setClearStatsResult({
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      });
    } finally {
      setClearStatsLoading(false);
    }
  };

  // Helper component for rendering migration results
  const MigrationResults = ({ results }: { results: MigrationResult[] }) => (
    <div style={{ marginTop: '1rem' }}>
      <strong style={{ color: styles.text }}>📊 Migration Results:</strong>
      <div style={{ marginTop: '0.5rem', maxHeight: '400px', overflowY: 'auto', border: `1px solid ${styles.border}`, borderRadius: '4px', padding: '1rem', backgroundColor: styles.bgSecondary }}>
        {results.map((result, index) => (
          <div
            key={index}
            style={{
              padding: '0.75rem',
              marginBottom: '0.5rem',
              backgroundColor: result.success ? styles.bgSuccess : styles.bgError,
              borderRadius: '4px',
              fontSize: '0.9rem',
              border: `1px solid ${result.success ? styles.borderSuccess : styles.borderError}`,
            }}
          >
            <div style={{ fontWeight: 'bold', marginBottom: '0.25rem', color: styles.text }}>
              {result.success ? '✅' : '❌'} {result.address.substring(0, 10)}...{result.address.substring(result.address.length - 8)}
            </div>
            {result.success && result.digest && (
              <div style={{ fontSize: '0.85rem', color: styles.textSecondary, marginTop: '0.25rem' }}>
                Digest: <code style={{ backgroundColor: styles.bgTertiary, padding: '0.2rem 0.4rem', borderRadius: '3px' }}>{result.digest}</code>
              </div>
            )}
            {!result.success && result.error && (
              <div style={{ fontSize: '0.85rem', color: styles.textError, marginTop: '0.25rem' }}>
                Error: {result.error}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  // Helper component for progress bar
  const ProgressBar = ({ progress }: { progress: { current: number; total: number } | null }) => {
    if (!progress) return null;
    return (
      <div style={{ padding: '1rem', backgroundColor: styles.bgWarning, borderRadius: '4px', border: `1px solid ${styles.border}` }}>
        <strong style={{ color: styles.text }}>⏳ Migration Progress:</strong>
        <p style={{ color: styles.text }}>
          Processing {progress.current} of {progress.total} wallets...
        </p>
        <div style={{ width: '100%', backgroundColor: styles.bgTertiary, borderRadius: '4px', height: '20px', marginTop: '0.5rem' }}>
          <div
            style={{
              width: `${(progress.current / progress.total) * 100}%`,
              backgroundColor: styles.buttonPrimary,
              height: '100%',
              borderRadius: '4px',
              transition: 'width 0.3s',
            }}
          />
        </div>
      </div>
    );
  };

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
        </div>
      </div>

      {/* Inventory Migration Section */}
      {migrationSubType === 'inventory' && (
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
                  backgroundColor: discoveringWallets || !isAdminWalletConnected ? styles.buttonDisabled : '#4CAF50',
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

          <ProgressBar progress={migrationProgress} />
          {migrationResults.length > 0 && <MigrationResults results={migrationResults} />}

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
      )}

      {/* Stats Migration Section */}
      {migrationSubType === 'stats' && (
        <>
          <div style={{ padding: '1rem', backgroundColor: styles.bgInfo, borderRadius: '4px', border: `1px solid ${styles.border}` }}>
            <strong style={{ color: styles.text }}>📋 Stats Migration Instructions:</strong>
            <ul style={{ marginTop: '0.5rem', marginLeft: '1.5rem', fontSize: '0.9rem', color: styles.textSecondary }}>
              <li>Migrate player statistics from the old StatisticsRegistry to the new StatisticsRegistry</li>
              <li>Single mode: Migrate one wallet at a time</li>
              <li>Batch mode: Migrate multiple wallets (one address per line)</li>
              <li>Auto mode: Discover all wallets with stats and migrate them</li>
              <li>Old registry IDs can be left empty to use environment defaults</li>
              <li><strong>Note:</strong> Stats are merged (bests take maximum, totals are summed)</li>
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
                  checked={scoreMigrationMode === 'auto'}
                  onChange={(e) => setScoreMigrationMode(e.target.value as 'single' | 'batch' | 'auto')}
                  style={{ marginRight: '0.5rem' }}
                />
                Auto (Discover All Wallets)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', color: styles.text }}>
                <input
                  type="radio"
                  value="single"
                  checked={scoreMigrationMode === 'single'}
                  onChange={(e) => setScoreMigrationMode(e.target.value as 'single' | 'batch' | 'auto')}
                  style={{ marginRight: '0.5rem' }}
                />
                Single Wallet
              </label>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', color: styles.text }}>
                <input
                  type="radio"
                  value="batch"
                  checked={scoreMigrationMode === 'batch'}
                  onChange={(e) => setScoreMigrationMode(e.target.value as 'single' | 'batch' | 'auto')}
                  style={{ marginRight: '0.5rem' }}
                />
                Batch (Manual List)
              </label>
            </div>
          </div>

          {/* Old Stats Registry Configuration */}
          <div style={{ padding: '1rem', backgroundColor: styles.bgTertiary, borderRadius: '4px', marginBottom: '1rem', border: `1px solid ${styles.border}` }}>
            <strong style={{ color: styles.text }}>📋 Old Statistics Registry Configuration:</strong>
            <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: styles.textSecondary }}>
              These fields are optional. If left empty, the system will use environment variables (checks TESTNET versions first):
              <br />• <code style={{ backgroundColor: styles.bgSecondary, padding: '0.2rem 0.4rem', borderRadius: '3px' }}>OLD_GAME_SCORE_CONTRACT_TESTNET</code> or <code style={{ backgroundColor: styles.bgSecondary, padding: '0.2rem 0.4rem', borderRadius: '3px' }}>OLD_GAME_SCORE_PACKAGE_ID</code> (for Package ID)
              <br />• <code style={{ backgroundColor: styles.bgSecondary, padding: '0.2rem 0.4rem', borderRadius: '3px' }}>OLD_STATISTICS_REGISTRY_OBJECT_ID_TESTNET</code> or <code style={{ backgroundColor: styles.bgSecondary, padding: '0.2rem 0.4rem', borderRadius: '3px' }}>OLD_STATISTICS_REGISTRY_OBJECT_ID</code> (for Registry Object ID)
            </p>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: styles.text }}>
              Old Package ID (optional - uses <code style={{ backgroundColor: styles.bgSecondary, padding: '0.2rem 0.4rem', borderRadius: '3px' }}>OLD_GAME_SCORE_CONTRACT_TESTNET</code> if empty):
            </label>
            <input
              type="text"
              value={oldScorePackageId}
              onChange={(e) => setOldScorePackageId(e.target.value)}
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
              Old Statistics Registry Object ID (optional - uses <code style={{ backgroundColor: styles.bgSecondary, padding: '0.2rem 0.4rem', borderRadius: '3px' }}>OLD_STATISTICS_REGISTRY_OBJECT_ID_TESTNET</code> if empty):
            </label>
            <input
              type="text"
              value={oldStatsRegistryId}
              onChange={(e) => setOldStatsRegistryId(e.target.value)}
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
          {scoreMigrationMode === 'auto' && (
            <div>
              <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: styles.bgSuccess, borderRadius: '4px', border: `1px solid ${styles.border}` }}>
                <strong style={{ color: styles.text }}>🔍 Auto Discovery:</strong>
                <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: styles.textSecondary }}>
                  This mode will automatically discover all wallets that have statistics in the old StatisticsRegistry by querying the registry's dynamic fields.
                </p>
              </div>
              
              {discoveredScoreWallets.length > 0 && (
                <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: styles.bgTertiary, borderRadius: '4px', border: `1px solid ${styles.border}` }}>
                  <strong style={{ color: styles.text }}>✅ Discovered {discoveredScoreWallets.length} wallet(s) with statistics:</strong>
                  <div style={{ marginTop: '0.5rem', maxHeight: '200px', overflowY: 'auto', fontSize: '0.9rem', fontFamily: 'monospace', color: styles.textSecondary }}>
                    {discoveredScoreWallets.map((wallet, index) => (
                      <div key={index} style={{ padding: '0.25rem 0' }}>
                        {wallet}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleDiscoverScoreWallets}
                disabled={discoveringScoreWallets || !isAdminWalletConnected}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: discoveringScoreWallets || !isAdminWalletConnected ? styles.buttonDisabled : '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: discoveringScoreWallets || !isAdminWalletConnected ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                  marginBottom: '1rem',
                }}
              >
                {discoveringScoreWallets ? 'Discovering...' : '🔍 Discover Wallets with Statistics'}
              </button>
            </div>
          )}

          {/* Single Mode */}
          {scoreMigrationMode === 'single' && (
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: styles.text }}>
                Player Address:
              </label>
              <input
                type="text"
                value={scoreMigrationAddress}
                onChange={(e) => setScoreMigrationAddress(e.target.value)}
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
          {scoreMigrationMode === 'batch' && (
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: styles.text }}>
                Player Addresses (one per line):
              </label>
              <textarea
                value={scoreMigrationAddresses}
                onChange={(e) => setScoreMigrationAddresses(e.target.value)}
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

          <ProgressBar progress={scoreMigrationProgress} />
          {scoreMigrationResults.length > 0 && <MigrationResults results={scoreMigrationResults} />}

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '1rem' }}>
            <button
              type="button"
              onClick={handleScoreMigrationSubmit}
              disabled={scoreMigrationLoading || !isAdminWalletConnected || (scoreMigrationMode === 'auto' ? discoveredScoreWallets.length === 0 : scoreMigrationMode === 'single' ? !scoreMigrationAddress : !scoreMigrationAddresses.trim())}
              style={{
                padding: '1rem',
                fontSize: '1.1rem',
                backgroundColor: scoreMigrationLoading || !isAdminWalletConnected ? styles.buttonDisabled : styles.buttonPrimary,
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: scoreMigrationLoading || !isAdminWalletConnected ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
                flex: '1',
                minWidth: '200px',
              }}
            >
              {scoreMigrationLoading 
                ? 'Migrating...' 
                : scoreMigrationMode === 'auto' 
                  ? `Migrate ${discoveredScoreWallets.length} Statistics` 
                  : scoreMigrationMode === 'single' 
                    ? 'Migrate Statistics' 
                    : 'Migrate All Statistics'}
            </button>
          </div>

          {/* Clear Stats Section */}
          <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: styles.bgWarning, borderRadius: '4px', border: `2px solid ${styles.borderError}` }}>
            <strong style={{ color: styles.textError }}>⚠️ Clear Player Statistics</strong>
            <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: styles.textSecondary }}>
              This will permanently delete all statistics for a player. Use this to reset stats before re-migrating.
              <br /><strong style={{ color: styles.textError }}>WARNING: This action cannot be undone!</strong>
            </p>

            <div style={{ marginTop: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: styles.text }}>
                Player Address to Clear:
              </label>
              <input
                type="text"
                value={clearStatsAddress}
                onChange={(e) => setClearStatsAddress(e.target.value)}
                placeholder="0x..."
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

            {clearStatsResult && (
              <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: clearStatsResult.success ? styles.bgSuccess : styles.bgError, borderRadius: '4px', border: `1px solid ${clearStatsResult.success ? styles.borderSuccess : styles.borderError}` }}>
                <div style={{ fontWeight: 'bold', marginBottom: '0.25rem', color: styles.text }}>
                  {clearStatsResult.success ? '✅ Stats Cleared Successfully' : '❌ Failed to Clear Stats'}
                </div>
                {clearStatsResult.success && clearStatsResult.digest && (
                  <div style={{ fontSize: '0.85rem', color: styles.textSecondary, marginTop: '0.25rem' }}>
                    Digest: <code style={{ backgroundColor: styles.bgTertiary, padding: '0.2rem 0.4rem', borderRadius: '3px' }}>{clearStatsResult.digest}</code>
                  </div>
                )}
                {!clearStatsResult.success && clearStatsResult.error && (
                  <div style={{ fontSize: '0.85rem', color: styles.textError, marginTop: '0.25rem' }}>
                    Error: {clearStatsResult.error}
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '1rem' }}>
              <button
                type="button"
                onClick={() => handleClearStats(false)}
                disabled={clearStatsLoading || !isAdminWalletConnected || !clearStatsAddress.trim()}
                style={{
                  padding: '0.75rem 1.5rem',
                  fontSize: '1rem',
                  backgroundColor: clearStatsLoading || !isAdminWalletConnected || !clearStatsAddress.trim() ? styles.buttonDisabled : '#f44336',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: clearStatsLoading || !isAdminWalletConnected || !clearStatsAddress.trim() ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                  flex: '1',
                  minWidth: '200px',
                }}
              >
                {clearStatsLoading ? 'Clearing...' : '🗑️ Clear Player Statistics'}
              </button>
              <button
                type="button"
                onClick={() => handleClearStats(true)}
                disabled={clearStatsLoading || !isAdminWalletConnected}
                style={{
                  padding: '0.75rem 1.5rem',
                  fontSize: '1rem',
                  backgroundColor: clearStatsLoading || !isAdminWalletConnected ? styles.buttonDisabled : '#f44336',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: clearStatsLoading || !isAdminWalletConnected ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                  flex: '1',
                  minWidth: '200px',
                }}
              >
                {clearStatsLoading ? 'Clearing All...' : '🗑️ Clear ALL Player Statistics'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Game Pass Migration Section */}
      {migrationSubType === 'game-pass' && (
        <>
          <div style={{ padding: '1rem', backgroundColor: styles.bgInfo, borderRadius: '4px', border: `1px solid ${styles.border}` }}>
            <strong style={{ color: styles.text }}>📋 Game Pass Migration Instructions:</strong>
            <ul style={{ marginTop: '0.5rem', marginLeft: '1.5rem', fontSize: '0.9rem', color: styles.textSecondary }}>
              <li>Migrate player game passes from the old GamePassSystem to the new GamePassSystem</li>
              <li>Single mode: Migrate one wallet at a time</li>
              <li>Batch mode: Migrate multiple wallets (one address per line)</li>
              <li>Auto mode: Discover all wallets with game passes and migrate them</li>
              <li>Old system IDs can be left empty to use environment defaults</li>
              <li><strong>Note:</strong> Game passes are merged (games are added, tickets are preserved)</li>
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
                  checked={gamePassMigrationMode === 'auto'}
                  onChange={(e) => setGamePassMigrationMode(e.target.value as 'single' | 'batch' | 'auto')}
                  style={{ marginRight: '0.5rem' }}
                />
                Auto (Discover All Wallets)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', color: styles.text }}>
                <input
                  type="radio"
                  value="single"
                  checked={gamePassMigrationMode === 'single'}
                  onChange={(e) => setGamePassMigrationMode(e.target.value as 'single' | 'batch' | 'auto')}
                  style={{ marginRight: '0.5rem' }}
                />
                Single Wallet
              </label>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', color: styles.text }}>
                <input
                  type="radio"
                  value="batch"
                  checked={gamePassMigrationMode === 'batch'}
                  onChange={(e) => setGamePassMigrationMode(e.target.value as 'single' | 'batch' | 'auto')}
                  style={{ marginRight: '0.5rem' }}
                />
                Batch (Manual List)
              </label>
            </div>
          </div>

          {/* Old Game Pass System Configuration */}
          <div style={{ padding: '1rem', backgroundColor: styles.bgTertiary, borderRadius: '4px', marginBottom: '1rem', border: `1px solid ${styles.border}` }}>
            <strong style={{ color: styles.text }}>📋 Old Game Pass System Configuration:</strong>
            <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: styles.textSecondary }}>
              These fields are optional. If left empty, the system will use environment variables (checks TESTNET versions first):
              <br />• <code style={{ backgroundColor: styles.bgSecondary, padding: '0.2rem 0.4rem', borderRadius: '3px' }}>OLD_GAME_SCORE_CONTRACT_TESTNET</code> or <code style={{ backgroundColor: styles.bgSecondary, padding: '0.2rem 0.4rem', borderRadius: '3px' }}>OLD_GAME_SCORE_PACKAGE_ID</code> (for Package ID)
              <br />• <code style={{ backgroundColor: styles.bgSecondary, padding: '0.2rem 0.4rem', borderRadius: '3px' }}>OLD_GAME_PASS_SYSTEM_OBJECT_ID_TESTNET</code> or <code style={{ backgroundColor: styles.bgSecondary, padding: '0.2rem 0.4rem', borderRadius: '3px' }}>OLD_GAME_PASS_SYSTEM_OBJECT_ID</code> (for System Object ID)
            </p>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: styles.text }}>
              Old Package ID (optional - uses <code style={{ backgroundColor: styles.bgSecondary, padding: '0.2rem 0.4rem', borderRadius: '3px' }}>OLD_GAME_SCORE_CONTRACT_TESTNET</code> if empty):
            </label>
            <input
              type="text"
              value={oldGamePassPackageId}
              onChange={(e) => setOldGamePassPackageId(e.target.value)}
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
              Old Game Pass System Object ID (optional - uses <code style={{ backgroundColor: styles.bgSecondary, padding: '0.2rem 0.4rem', borderRadius: '3px' }}>OLD_GAME_PASS_SYSTEM_OBJECT_ID_TESTNET</code> if empty):
            </label>
            <input
              type="text"
              value={oldGamePassSystemId}
              onChange={(e) => setOldGamePassSystemId(e.target.value)}
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
          {gamePassMigrationMode === 'auto' && (
            <div>
              <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: styles.bgSuccess, borderRadius: '4px', border: `1px solid ${styles.border}` }}>
                <strong style={{ color: styles.text }}>🔍 Auto Discovery:</strong>
                <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: styles.textSecondary }}>
                  This mode will automatically discover all wallets that have game passes in the old GamePassSystem by querying the system's dynamic fields.
                </p>
              </div>
              
              {discoveredGamePassWallets.length > 0 && (
                <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: styles.bgTertiary, borderRadius: '4px', border: `1px solid ${styles.border}` }}>
                  <strong style={{ color: styles.text }}>✅ Discovered {discoveredGamePassWallets.length} wallet(s) with game passes:</strong>
                  <div style={{ marginTop: '0.5rem', maxHeight: '200px', overflowY: 'auto', fontSize: '0.9rem', fontFamily: 'monospace', color: styles.textSecondary }}>
                    {discoveredGamePassWallets.map((wallet, index) => (
                      <div key={index} style={{ padding: '0.25rem 0' }}>
                        {wallet}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleDiscoverGamePassWallets}
                disabled={discoveringGamePassWallets || !isAdminWalletConnected}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: discoveringGamePassWallets || !isAdminWalletConnected ? styles.buttonDisabled : '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: discoveringGamePassWallets || !isAdminWalletConnected ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                  marginBottom: '1rem',
                }}
              >
                {discoveringGamePassWallets ? 'Discovering...' : '🔍 Discover Wallets with Game Passes'}
              </button>
            </div>
          )}

          {/* Single Mode */}
          {gamePassMigrationMode === 'single' && (
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: styles.text }}>
                Player Address:
              </label>
              <input
                type="text"
                value={gamePassMigrationAddress}
                onChange={(e) => setGamePassMigrationAddress(e.target.value)}
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
          {gamePassMigrationMode === 'batch' && (
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: styles.text }}>
                Player Addresses (one per line):
              </label>
              <textarea
                value={gamePassMigrationAddresses}
                onChange={(e) => setGamePassMigrationAddresses(e.target.value)}
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

          <ProgressBar progress={gamePassMigrationProgress} />
          {gamePassMigrationResults.length > 0 && <MigrationResults results={gamePassMigrationResults} />}

          <button
            type="button"
            onClick={handleGamePassMigrationSubmit}
            disabled={gamePassMigrationLoading || !isAdminWalletConnected || (gamePassMigrationMode === 'auto' ? discoveredGamePassWallets.length === 0 : gamePassMigrationMode === 'single' ? !gamePassMigrationAddress : !gamePassMigrationAddresses.trim())}
            style={{
              padding: '1rem',
              fontSize: '1.1rem',
              backgroundColor: gamePassMigrationLoading || !isAdminWalletConnected ? styles.buttonDisabled : styles.buttonPrimary,
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: gamePassMigrationLoading || !isAdminWalletConnected ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
            }}
          >
            {gamePassMigrationLoading 
              ? 'Migrating...' 
              : gamePassMigrationMode === 'auto' 
                ? `Migrate ${discoveredGamePassWallets.length} Game Passes` 
                : gamePassMigrationMode === 'single' 
                  ? 'Migrate Game Pass' 
                  : 'Migrate All Game Passes'}
          </button>
        </>
      )}
    </div>
  );
}

