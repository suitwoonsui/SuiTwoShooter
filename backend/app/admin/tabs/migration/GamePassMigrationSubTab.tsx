// ==========================================
// Game Pass Migration Sub-Tab Component
// ==========================================

'use client';

import { useState } from 'react';
import { AdminStyles } from '../../types';
import { getApiUrl } from '../../utils/get-api-url';
import { ProgressBar } from '../../components/migration/ProgressBar';
import { MigrationResults, MigrationResult } from '../../components/migration/MigrationResults';

interface GamePassMigrationSubTabProps {
  isAdminWalletConnected: boolean;
  connectedAddress: string | null;
  adminAddress: string | null;
  styles: AdminStyles;
}

export function GamePassMigrationSubTab({ isAdminWalletConnected, connectedAddress, adminAddress, styles }: GamePassMigrationSubTabProps) {
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

  return (
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
              backgroundColor: discoveringGamePassWallets || !isAdminWalletConnected ? styles.buttonDisabled : styles.buttonSuccess,
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

      <ProgressBar progress={gamePassMigrationProgress} styles={styles} />
      <MigrationResults results={gamePassMigrationResults} styles={styles} />

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
  );
}

