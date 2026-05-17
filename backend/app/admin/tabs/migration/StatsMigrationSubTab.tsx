// ==========================================
// Stats Migration Sub-Tab Component
// ==========================================

'use client';

import { useState } from 'react';
import { AdminStyles } from '../../types';
import { getApiUrl } from '../../utils/get-api-url';
import { ProgressBar } from '../../components/migration/ProgressBar';
import { MigrationResults, MigrationResult } from '../../components/migration/MigrationResults';
import { WalletDiscoveryUI } from '../../components/WalletDiscoveryUI';
import { CopyableAddress } from '../../components/CopyableAddress';

interface StatsMigrationSubTabProps {
  isAdminWalletConnected: boolean;
  connectedAddress: string | null;
  adminAddress: string | null;
  styles: AdminStyles;
}

export function StatsMigrationSubTab({ isAdminWalletConnected, connectedAddress, adminAddress, styles }: StatsMigrationSubTabProps) {
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
  const [searchAddress, setSearchAddress] = useState('');

  // Clear Stats state
  const [clearStatsAddress, setClearStatsAddress] = useState('');
  const [clearStatsLoading, setClearStatsLoading] = useState(false);
  const [clearStatsResult, setClearStatsResult] = useState<{ success: boolean; digest?: string; error?: string } | null>(null);

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

  return (
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
          
          <WalletDiscoveryUI
            styles={styles}
            title="🔍 Discover Wallets with Statistics (Old Contract)"
            discoverButtonText="🔍 Discover Wallets with Statistics"
            searchAddress={searchAddress}
            setSearchAddress={setSearchAddress}
            onSearch={() => {
              // Filter discovered wallets if any are found
              if (discoveredScoreWallets.length > 0 && searchAddress.trim()) {
                const found = discoveredScoreWallets.find(w => w.toLowerCase().includes(searchAddress.trim().toLowerCase()));
                if (!found) {
                  alert('Wallet not found in discovered wallets. Please discover wallets first.');
                }
              } else {
                alert('Please discover wallets first.');
              }
            }}
            onDiscover={handleDiscoverScoreWallets}
            searchingWallet={false}
            discoveringWallets={discoveringScoreWallets}
            discoveredWalletsCount={discoveredScoreWallets.length}
          />
          
          {discoveredScoreWallets.length > 0 && (
            <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: styles.bgTertiary, borderRadius: '4px', border: `1px solid ${styles.border}` }}>
              <strong style={{ color: styles.text }}>✅ Discovered {discoveredScoreWallets.length} wallet(s) with statistics:</strong>
              <div style={{ marginTop: '0.5rem', maxHeight: '200px', overflowY: 'auto', fontSize: '0.9rem', color: styles.textSecondary }}>
                {(searchAddress.trim() 
                  ? discoveredScoreWallets.filter(w => w.toLowerCase().includes(searchAddress.trim().toLowerCase()))
                  : discoveredScoreWallets
                ).map((wallet, index) => (
                  <div key={index} style={{ padding: '0.25rem 0' }}>
                    <CopyableAddress value={wallet} styles={styles} compact />
                  </div>
                ))}
              </div>
            </div>
          )}
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

      <ProgressBar progress={scoreMigrationProgress} styles={styles} />
      <MigrationResults results={scoreMigrationResults} styles={styles} />

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
              backgroundColor: clearStatsLoading || !isAdminWalletConnected || !clearStatsAddress.trim() ? styles.buttonDisabled : styles.buttonDanger,
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
              backgroundColor: clearStatsLoading || !isAdminWalletConnected ? styles.buttonDisabled : styles.buttonDanger,
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
  );
}

