// ==========================================
// Tournament Migration Sub-Tab Component
// ==========================================

'use client';

import { useState } from 'react';
import { AdminStyles } from '../../types';
import { getApiUrl } from '../../utils/get-api-url';
import { ProgressBar } from '../../components/migration/ProgressBar';
import { MigrationResults, MigrationResult } from '../../components/migration/MigrationResults';

interface TournamentMigrationSubTabProps {
  isAdminWalletConnected: boolean;
  connectedAddress: string | null;
  adminAddress: string | null;
  styles: AdminStyles;
}

export function TournamentMigrationSubTab({ isAdminWalletConnected, connectedAddress, adminAddress, styles }: TournamentMigrationSubTabProps) {
  const [tournamentMigrationMode, setTournamentMigrationMode] = useState<'single' | 'batch' | 'auto'>('auto');
  const [tournamentMigrationId, setTournamentMigrationId] = useState('');
  const [tournamentMigrationIds, setTournamentMigrationIds] = useState('');
  const [oldTournamentRegistryId, setOldTournamentRegistryId] = useState('');
  const [oldTournamentAdminCapId, setOldTournamentAdminCapId] = useState('');
  const [tournamentMigrationLoading, setTournamentMigrationLoading] = useState(false);
  const [tournamentMigrationResults, setTournamentMigrationResults] = useState<MigrationResult[]>([]);
  const [tournamentMigrationProgress, setTournamentMigrationProgress] = useState<{ current: number; total: number } | null>(null);
  const [discoveredTournamentIds, setDiscoveredTournamentIds] = useState<number[]>([]);
  const [discoveringTournaments, setDiscoveringTournaments] = useState(false);
  const [selectedTournamentIds, setSelectedTournamentIds] = useState<Set<number>>(new Set());

  const handleDiscoverTournaments = async () => {
    setDiscoveringTournaments(true);
    setDiscoveredTournamentIds([]);

    try {
      if (!isAdminWalletConnected || connectedAddress !== adminAddress) {
        alert('Admin wallet not connected. Please connect the admin wallet.');
        setDiscoveringTournaments(false);
        return;
      }

      const oldRegistryId = oldTournamentRegistryId || undefined;
      const queryParams = new URLSearchParams();
      if (oldRegistryId) queryParams.append('oldTournamentRegistryId', oldRegistryId);
      const queryString = queryParams.toString();
      
      const response = await fetch(`${getApiUrl('api/tournaments/migrate')}${queryString ? `?${queryString}` : ''}`);
      const data = await response.json();

      if (response.ok && data.success && data.tournamentIds) {
        setDiscoveredTournamentIds(data.tournamentIds);
        // Auto-select all discovered tournaments
        setSelectedTournamentIds(new Set(data.tournamentIds));
        if (data.tournamentIds.length === 0) {
          alert('No tournaments found in the old registry.');
        }
      } else {
        alert(data.error || 'Failed to discover tournaments');
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Network error');
    } finally {
      setDiscoveringTournaments(false);
    }
  };

  const handleTournamentMigrationSubmit = async () => {
    setTournamentMigrationLoading(true);
    setTournamentMigrationResults([]);
    setTournamentMigrationProgress(null);

    try {
      if (!isAdminWalletConnected || connectedAddress !== adminAddress) {
        setTournamentMigrationResults([{
          address: 'N/A',
          success: false,
          error: 'Admin wallet not connected. Please connect the admin wallet.',
        }]);
        setTournamentMigrationLoading(false);
        return;
      }

      let tournamentIds: number[] = [];
      
      if (tournamentMigrationMode === 'auto') {
        // Use selected tournaments, or all if none selected
        tournamentIds = selectedTournamentIds.size > 0 
          ? Array.from(selectedTournamentIds)
          : discoveredTournamentIds;
      } else if (tournamentMigrationMode === 'single') {
        const id = parseInt(tournamentMigrationId.trim(), 10);
        if (isNaN(id)) {
          setTournamentMigrationResults([{
            address: 'N/A',
            success: false,
            error: 'Invalid tournament ID',
          }]);
          setTournamentMigrationLoading(false);
          return;
        }
        tournamentIds = [id];
      } else {
        tournamentIds = tournamentMigrationIds
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .map(line => parseInt(line, 10))
            .filter(id => !isNaN(id));
      }

      if (tournamentIds.length === 0) {
        setTournamentMigrationResults([{
          address: 'N/A',
          success: false,
          error: 'No valid tournament IDs provided',
        }]);
        setTournamentMigrationLoading(false);
        return;
      }

      setTournamentMigrationProgress({ current: 0, total: tournamentIds.length });
      const results: MigrationResult[] = [];

      for (let i = 0; i < tournamentIds.length; i++) {
        const tournamentId = tournamentIds[i];
        setTournamentMigrationProgress({ current: i, total: tournamentIds.length });

        try {
          const response = await fetch(getApiUrl('api/tournaments/migrate'), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              tournamentId,
              ...(oldTournamentRegistryId && { oldTournamentRegistryId }),
              ...(oldTournamentAdminCapId && { oldTournamentAdminCapId }),
            }),
          });

          const data = await response.json();

          if (response.ok && data.success) {
            results.push({
              address: `Tournament #${tournamentId}`,
              success: true,
              digest: data.digest,
            });
          } else {
            results.push({
              address: `Tournament #${tournamentId}`,
              success: false,
              error: data.error || 'Migration failed',
            });
          }
        } catch (error) {
          results.push({
            address: `Tournament #${tournamentId}`,
            success: false,
            error: error instanceof Error ? error.message : 'Network error',
          });
        }

        setTournamentMigrationResults([...results]);
      }

      setTournamentMigrationProgress({ current: tournamentIds.length, total: tournamentIds.length });
      setTournamentMigrationResults(results);

      if (tournamentMigrationMode === 'single') {
        setTournamentMigrationId('');
      } else {
        setTournamentMigrationIds('');
      }
    } catch (error) {
      setTournamentMigrationResults([{
        address: 'N/A',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }]);
    } finally {
      setTournamentMigrationLoading(false);
      setTournamentMigrationProgress(null);
    }
  };

  return (
    <>
      <div style={{ padding: '1rem', backgroundColor: styles.bgInfo, borderRadius: '4px', border: `1px solid ${styles.border}` }}>
        <strong style={{ color: styles.text }}>📋 Tournament Migration Instructions:</strong>
        <ul style={{ marginTop: '0.5rem', marginLeft: '1.5rem', fontSize: '0.9rem', color: styles.textSecondary }}>
          <li>Migrate tournament data from old TournamentRegistry to new TournamentRegistry</li>
          <li>Single mode: Migrate one tournament at a time by tournament ID</li>
          <li>Batch mode: Migrate multiple tournaments (one tournament ID per line)</li>
          <li>Auto mode: Discover all tournaments and migrate them</li>
          <li>Old registry IDs can be left empty to use environment defaults</li>
          <li><strong>Note:</strong> Tournament migration creates a new tournament with the same data. Participants and scores are not migrated automatically.</li>
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
              checked={tournamentMigrationMode === 'auto'}
              onChange={(e) => setTournamentMigrationMode(e.target.value as 'single' | 'batch' | 'auto')}
              style={{ marginRight: '0.5rem' }}
            />
            Auto (Discover All Tournaments)
          </label>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', color: styles.text }}>
            <input
              type="radio"
              value="single"
              checked={tournamentMigrationMode === 'single'}
              onChange={(e) => setTournamentMigrationMode(e.target.value as 'single' | 'batch' | 'auto')}
              style={{ marginRight: '0.5rem' }}
            />
            Single Tournament
          </label>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', color: styles.text }}>
            <input
              type="radio"
              value="batch"
              checked={tournamentMigrationMode === 'batch'}
              onChange={(e) => setTournamentMigrationMode(e.target.value as 'single' | 'batch' | 'auto')}
              style={{ marginRight: '0.5rem' }}
            />
            Batch (Manual List)
          </label>
        </div>
      </div>

      {/* Old Tournament Registry Configuration */}
      <div style={{ padding: '1rem', backgroundColor: styles.bgTertiary, borderRadius: '4px', marginBottom: '1rem', border: `1px solid ${styles.border}` }}>
        <strong style={{ color: styles.text }}>📋 Old Tournament Registry Configuration:</strong>
        <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: styles.textSecondary }}>
          These fields are optional. If left empty, the system will use environment variables (checks TESTNET versions first):
          <br />• <code style={{ backgroundColor: styles.bgSecondary, padding: '0.2rem 0.4rem', borderRadius: '3px' }}>OLD_TOURNAMENT_REGISTRY_OBJECT_ID_TESTNET</code> or <code style={{ backgroundColor: styles.bgSecondary, padding: '0.2rem 0.4rem', borderRadius: '3px' }}>OLD_TOURNAMENT_REGISTRY_OBJECT_ID</code> (for Registry Object ID)
          <br />• <code style={{ backgroundColor: styles.bgSecondary, padding: '0.2rem 0.4rem', borderRadius: '3px' }}>OLD_TOURNAMENT_ADMIN_CAP_ID_TESTNET</code> or <code style={{ backgroundColor: styles.bgSecondary, padding: '0.2rem 0.4rem', borderRadius: '3px' }}>OLD_TOURNAMENT_ADMIN_CAP_ID</code> (for Admin Capability ID)
        </p>
      </div>

      <div>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: styles.text }}>
          Old Tournament Registry Object ID (optional - uses <code style={{ backgroundColor: styles.bgSecondary, padding: '0.2rem 0.4rem', borderRadius: '3px' }}>OLD_TOURNAMENT_REGISTRY_OBJECT_ID_TESTNET</code> if empty):
        </label>
        <input
          type="text"
          value={oldTournamentRegistryId}
          onChange={(e) => setOldTournamentRegistryId(e.target.value)}
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
          Old Tournament Admin Capability ID (optional - uses <code style={{ backgroundColor: styles.bgSecondary, padding: '0.2rem 0.4rem', borderRadius: '3px' }}>OLD_TOURNAMENT_ADMIN_CAP_ID_TESTNET</code> if empty):
        </label>
        <input
          type="text"
          value={oldTournamentAdminCapId}
          onChange={(e) => setOldTournamentAdminCapId(e.target.value)}
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

      {/* Auto Mode - Discover Tournaments */}
      {tournamentMigrationMode === 'auto' && (
        <div>
          <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: styles.bgSuccess, borderRadius: '4px', border: `1px solid ${styles.border}` }}>
            <strong style={{ color: styles.text }}>🔍 Auto Discovery:</strong>
            <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: styles.textSecondary }}>
              This mode will automatically discover all tournaments in the old TournamentRegistry by querying the registry's tournaments table.
            </p>
          </div>
          
          {discoveredTournamentIds.length > 0 && (
            <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: styles.bgTertiary, borderRadius: '4px', border: `1px solid ${styles.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <strong style={{ color: styles.text }}>
                  ✅ Discovered {discoveredTournamentIds.length} tournament(s)
                  {selectedTournamentIds.size > 0 && (
                    <span style={{ color: styles.textSecondary, fontWeight: 'normal', marginLeft: '0.5rem' }}>
                      ({selectedTournamentIds.size} selected)
                    </span>
                  )}
                </strong>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedTournamentIds.size === discoveredTournamentIds.length) {
                        setSelectedTournamentIds(new Set());
                      } else {
                        setSelectedTournamentIds(new Set(discoveredTournamentIds));
                      }
                    }}
                    style={{
                      padding: '0.5rem 1rem',
                      fontSize: '0.85rem',
                      backgroundColor: selectedTournamentIds.size === discoveredTournamentIds.length 
                        ? styles.bgSecondary 
                        : styles.buttonPrimary,
                      color: styles.text,
                      border: `1px solid ${styles.border}`,
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                    }}
                  >
                    {selectedTournamentIds.size === discoveredTournamentIds.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
              </div>
              <div style={{ 
                marginTop: '0.5rem', 
                maxHeight: '300px', 
                overflowY: 'auto', 
                fontSize: '0.9rem', 
                fontFamily: 'monospace',
                border: `1px solid ${styles.border}`,
                borderRadius: '4px',
                padding: '0.5rem',
                backgroundColor: styles.bgSecondary,
              }}>
                {discoveredTournamentIds.map((id, index) => (
                  <label
                    key={index}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      padding: '0.5rem',
                      cursor: 'pointer',
                      borderRadius: '4px',
                      backgroundColor: selectedTournamentIds.has(id) ? styles.bgTertiary : 'transparent',
                      marginBottom: '0.25rem',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedTournamentIds.has(id)}
                      onChange={(e) => {
                        const newSelected = new Set(selectedTournamentIds);
                        if (e.target.checked) {
                          newSelected.add(id);
                        } else {
                          newSelected.delete(id);
                        }
                        setSelectedTournamentIds(newSelected);
                      }}
                      style={{ 
                        marginRight: '0.75rem',
                        cursor: 'pointer',
                        width: '18px',
                        height: '18px',
                      }}
                    />
                    <span style={{ color: styles.text, userSelect: 'none' }}>
                      Tournament #{id}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={handleDiscoverTournaments}
            disabled={discoveringTournaments || !isAdminWalletConnected}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: discoveringTournaments || !isAdminWalletConnected ? styles.buttonDisabled : styles.buttonSuccess,
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: discoveringTournaments || !isAdminWalletConnected ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              marginBottom: '1rem',
            }}
          >
            {discoveringTournaments ? 'Discovering...' : '🔍 Discover Tournaments'}
          </button>
        </div>
      )}

      {/* Single Mode */}
      {tournamentMigrationMode === 'single' && (
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: styles.text }}>
            Tournament ID:
          </label>
          <input
            type="number"
            value={tournamentMigrationId}
            onChange={(e) => setTournamentMigrationId(e.target.value)}
            placeholder="Enter tournament ID (e.g., 1)"
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
      {tournamentMigrationMode === 'batch' && (
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: styles.text }}>
            Tournament IDs (one per line):
          </label>
          <textarea
            value={tournamentMigrationIds}
            onChange={(e) => setTournamentMigrationIds(e.target.value)}
            placeholder="1&#10;2&#10;3"
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

      <ProgressBar progress={tournamentMigrationProgress} styles={styles} />
      <MigrationResults results={tournamentMigrationResults} styles={styles} />

      <button
        type="button"
        onClick={handleTournamentMigrationSubmit}
        disabled={
          tournamentMigrationLoading || 
          !isAdminWalletConnected || 
          (tournamentMigrationMode === 'auto' 
            ? (discoveredTournamentIds.length === 0 || selectedTournamentIds.size === 0)
            : tournamentMigrationMode === 'single' 
              ? !tournamentMigrationId 
              : !tournamentMigrationIds.trim())
        }
        style={{
          padding: '1rem',
          fontSize: '1.1rem',
          backgroundColor: tournamentMigrationLoading || !isAdminWalletConnected ? styles.buttonDisabled : styles.buttonPrimary,
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: tournamentMigrationLoading || !isAdminWalletConnected ? 'not-allowed' : 'pointer',
          fontWeight: 'bold',
        }}
      >
        {tournamentMigrationLoading 
          ? 'Migrating...' 
          : tournamentMigrationMode === 'auto' 
            ? selectedTournamentIds.size === discoveredTournamentIds.length
              ? `Migrate All ${discoveredTournamentIds.length} Tournament${discoveredTournamentIds.length !== 1 ? 's' : ''}`
              : `Migrate ${selectedTournamentIds.size} Selected Tournament${selectedTournamentIds.size !== 1 ? 's' : ''}`
            : tournamentMigrationMode === 'single' 
              ? 'Migrate Tournament' 
              : 'Migrate All Tournaments'}
      </button>
    </>
  );
}
