// ==========================================
// Admin Page - Insignia Tab
// Fetches player Insignia state via GET /api/admin/insignia/[address]
// ==========================================

'use client';

import { useState } from 'react';
import { AdminStyles } from '../types';
import { getApiUrl } from '../utils/get-api-url';
import { useWalletDiscovery } from '../hooks/useWalletDiscovery';
import { WalletDiscoveryUI } from '../components/WalletDiscoveryUI';
import { CopyableAddress } from '../components/CopyableAddress';

interface InsigniaTabProps {
  isAdminWalletConnected: boolean;
  connectedAddress: string | null;
  adminAddress: string | null;
  styles: AdminStyles;
}

type InsigniaAdminGetResponse =
  | {
      success: true;
      address?: string;
      config?: Record<string, string>;
      decoded?: { tier: number | null };
      configSource?: string;
    }
  | { success: false; error?: string };

function decodeUtf8Base64(b64: string): string {
  try {
    return Buffer.from(b64, 'base64').toString('utf8');
  } catch {
    return '';
  }
}

export function InsigniaTab({ isAdminWalletConnected, connectedAddress, adminAddress, styles }: InsigniaTabProps) {
  const [playerAddress, setPlayerAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<InsigniaAdminGetResponse | null>(null);

  const canUse = isAdminWalletConnected && connectedAddress && adminAddress && connectedAddress === adminAddress;

  async function handleFetch() {
    setLoading(true);
    setResult(null);
    try {
      const addr = playerAddress.trim();
      if (!addr.startsWith('0x') || addr.length !== 66) {
        setResult({ success: false, error: 'Invalid player address. Must be a Sui address (0x + 64 hex).' });
        return;
      }
      if (!canUse) {
        setResult({ success: false, error: 'Admin wallet must be connected (and must match the configured admin).' });
        return;
      }

      const response = await fetch(getApiUrl(`api/admin/insignia/${addr}`), {
        method: 'GET',
        headers: {
          'X-Admin-Wallet': connectedAddress!,
        },
      });
      const data = (await response.json()) as InsigniaAdminGetResponse;
      if (!response.ok) {
        setResult({ success: false, error: (data as { error?: string })?.error ?? 'Request failed' });
        return;
      }
      setResult(data);
    } catch (e) {
      setResult({ success: false, error: e instanceof Error ? e.message : String(e) });
    } finally {
      setLoading(false);
    }
  }

  // Wallet discovery: Insignia does not support true "discover all" yet, but the UI module is useful for searching
  // and maintaining a working list during admin operations.
  const checkWalletExists = async (address: string): Promise<boolean> => {
    try {
      if (!canUse) return false;
      const response = await fetch(getApiUrl(`api/admin/insignia/${address}`), {
        method: 'GET',
        headers: {
          'X-Admin-Wallet': connectedAddress!,
        },
      });
      const data = (await response.json()) as InsigniaAdminGetResponse;
      return response.ok && data.success === true && (data.config ? Object.keys(data.config).length > 0 : false);
    } catch {
      return false;
    }
  };

  const walletDiscovery = useWalletDiscovery({
    isAdminWalletConnected,
    connectedAddress,
    adminAddress,
    discoveryType: 'insignia',
    checkWalletExists,
    onWalletExpanded: (addr) => {
      setPlayerAddress(addr);
      // fire-and-forget fetch when expanding
      void handleFetch();
    },
  });

  const cfg = result && result.success === true ? (result.config ?? {}) : null;
  const tierDecoded =
    result && result.success === true && result.decoded && Object.prototype.hasOwnProperty.call(result.decoded, 'tier')
      ? result.decoded.tier
      : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <WalletDiscoveryUI
        styles={styles}
        title="🔍 Wallet discovery (Insignia)"
        discoverButtonText="🔍 Discover wallets with Insignia (not available yet)"
        searchAddress={walletDiscovery.searchAddress}
        setSearchAddress={walletDiscovery.setSearchAddress}
        onSearch={walletDiscovery.handleSearchWallet}
        onDiscover={walletDiscovery.handleDiscoverWallets}
        searchingWallet={walletDiscovery.searchingWallet}
        discoveringWallets={walletDiscovery.discoveringWallets}
        discoveredWalletsCount={walletDiscovery.discoveredWallets.length}
        emptyListHint="Enter a wallet address and click Search to fetch its Insignia."
        discoveryError={walletDiscovery.discoveryError}
      />

      {walletDiscovery.filteredWallets.length > 0 && (
        <div
          style={{
            padding: '1rem',
            backgroundColor: styles.bgSecondary,
            borderRadius: '4px',
            border: `1px solid ${styles.border}`,
          }}
        >
          <p style={{ marginTop: 0, marginBottom: '0.75rem', color: styles.textSecondary }}>
            Click a wallet to load its Insignia.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {walletDiscovery.filteredWallets.map((addr) => {
              const expanded = walletDiscovery.expandedWallets.has(addr);
              return (
                <button
                  key={addr}
                  type="button"
                  onClick={() => walletDiscovery.toggleWalletExpansion(addr)}
                  style={{
                    textAlign: 'left',
                    padding: '0.75rem',
                    backgroundColor: expanded ? styles.bgTertiary : 'transparent',
                    border: `1px solid ${styles.border}`,
                    borderRadius: '6px',
                    cursor: 'pointer',
                  }}
                >
                  <CopyableAddress value={addr} styles={styles} />
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ padding: '1rem', backgroundColor: styles.bgSecondary, borderRadius: '4px', border: `1px solid ${styles.border}` }}>
        <h2 style={{ marginTop: 0, marginBottom: '0.5rem' }}>🧷 Insignia (per-wallet progression)</h2>
        <p style={{ marginTop: 0, color: styles.textSecondary }}>
          Fetches player Insignia KV from the platform via the game admin proxy. Values are stored as base64 (opaque); tier is also decoded for convenience.
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'end' }}>
          <div style={{ flex: 1, minWidth: '320px' }}>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>Player address</label>
            <input
              value={playerAddress}
              onChange={(e) => setPlayerAddress(e.target.value)}
              placeholder="0x..."
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '4px',
                border: `1px solid ${styles.border}`,
                backgroundColor: styles.inputBg,
                color: styles.text,
                fontFamily: 'monospace',
              }}
            />
          </div>

          <button
            type="button"
            onClick={handleFetch}
            disabled={loading}
            style={{
              padding: '0.75rem 1rem',
              backgroundColor: loading ? styles.buttonDisabled : styles.buttonPrimary,
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              minWidth: '180px',
            }}
          >
            {loading ? 'Fetching…' : 'Fetch Insignia'}
          </button>
        </div>

        {!canUse && (
          <div style={{ marginTop: '0.75rem', padding: '0.75rem', backgroundColor: styles.bgWarning, borderRadius: '4px', border: `1px solid ${styles.border}` }}>
            <strong>Admin wallet required:</strong> connect the configured admin wallet to use this tab.
          </div>
        )}
      </div>

      {result && result.success === false && (
        <div style={{ padding: '1rem', backgroundColor: styles.bgError, borderRadius: '4px', border: `1px solid ${styles.borderError}` }}>
          <strong style={{ color: styles.textError }}>Error:</strong> {result.error ?? 'Unknown error'}
        </div>
      )}

      {result && result.success === true && (
        <div style={{ padding: '1rem', backgroundColor: styles.bgSecondary, borderRadius: '4px', border: `1px solid ${styles.border}` }}>
          <h3 style={{ marginTop: 0 }}>Result</h3>
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            <div>
              <strong>Decoded tier:</strong> {tierDecoded === null ? '—' : tierDecoded}
            </div>
            <div>
              <strong>Config entries:</strong> {cfg ? Object.keys(cfg).length : 0}
            </div>
          </div>

          {cfg && Object.keys(cfg).length > 0 && (
            <div style={{ marginTop: '1rem' }}>
              <p style={{ marginBottom: '0.5rem', color: styles.textSecondary }}>
                Raw base64 values (and a best-effort UTF-8 decode preview).
              </p>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: `1px solid ${styles.border}` }}>Key</th>
                      <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: `1px solid ${styles.border}` }}>Base64</th>
                      <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: `1px solid ${styles.border}` }}>UTF-8 preview</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(cfg).map(([k, v]) => (
                      <tr key={k}>
                        <td style={{ padding: '0.5rem', borderBottom: `1px solid ${styles.border}`, fontFamily: 'monospace' }}>{k}</td>
                        <td style={{ padding: '0.5rem', borderBottom: `1px solid ${styles.border}`, fontFamily: 'monospace', wordBreak: 'break-all' }}>
                          {v}
                        </td>
                        <td style={{ padding: '0.5rem', borderBottom: `1px solid ${styles.border}`, fontFamily: 'monospace' }}>
                          {decodeUtf8Base64(v)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

