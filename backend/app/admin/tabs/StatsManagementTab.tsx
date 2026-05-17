// ==========================================
// Admin Page - Stats Management Tab
// View and manage user statistics
// ==========================================

'use client';

import { useState, useEffect } from 'react';
import { AdminStyles } from '../types';
import { getApiUrl } from '../utils/get-api-url';
import { useWalletDiscovery } from '../hooks/useWalletDiscovery';
import { WalletDiscoveryUI } from '../components/WalletDiscoveryUI';
import { WalletList } from '../components/WalletList';
import { CopyableAddress } from '../components/CopyableAddress';

interface StatsManagementTabProps {
  isAdminWalletConnected: boolean;
  connectedAddress: string | null;
  adminAddress: string | null;
  styles: AdminStyles;
}

interface PlayerStats {
  address: string;
  totalGames: number;
  bestScore: number;
  bestDistance: number;
  bestCoins: number;
  bestBossesDefeated: number;
  bestEnemiesDefeated: number;
  bestCoinStreak: number;
  totalScore: number;
  totalDistance: number;
  totalCoins: number;
  totalBossesDefeated: number;
  totalEnemiesDefeated: number;
  totalCoinStreak: number;
  firstGameDate: number;
  lastGameDate: number;
  averageScore: number;
  averageDistance: number;
  averageCoins: number;
  averageBossesDefeated: number;
  averageEnemiesDefeated: number;
  averageCoinStreak: number;
  loading?: boolean;
  error?: string;
}

export function StatsManagementTab({ isAdminWalletConnected, connectedAddress, adminAddress, styles }: StatsManagementTabProps) {
  
  // Contract selection (new or old)
  const [contractSelection, setContractSelection] = useState<'new' | 'old'>('new');
  
  // Wallet stats cache (address -> stats data)
  const [walletStats, setWalletStats] = useState<Record<string, { stats: PlayerStats | null; loading: boolean; error: string | null }>>({});

  // Check if wallet has stats
  const checkWalletExists = async (address: string): Promise<boolean> => {
    try {
      // Include contract selection in the API call
      const contractParam = contractSelection;
      const response = await fetch(getApiUrl(`api/stats/${address}?contract=${contractParam}`));
      const data = await response.json();
      return response.ok && data.success;
    } catch {
      return false;
    }
  };

  // Use wallet discovery hook
  const walletDiscovery = useWalletDiscovery({
    isAdminWalletConnected,
    connectedAddress,
    adminAddress,
    discoveryType: 'stats',
    checkWalletExists,
    contract: contractSelection,
    onWalletsDiscovered: () => {
      setWalletStats({});
    },
    onWalletExpanded: (address) => {
      // Load stats if not already loaded
      if (!walletStats[address] || walletStats[address].stats === null) {
        refreshWalletStats(address);
      }
    },
  });

  // Use hook's discovered wallets
  const effectiveDiscoveredWallets = walletDiscovery.discoveredWallets;
  
  // Filter wallets based on search term (use hook's filteredWallets)
  const effectiveFilteredWallets = walletDiscovery.filteredWallets;

  // Refresh all stats when contract selection changes
  useEffect(() => {
    if (effectiveDiscoveredWallets.length > 0) {
      // Refresh stats for all discovered wallets when contract selection changes
      effectiveDiscoveredWallets.forEach(address => {
        refreshWalletStats(address);
      });
    }
  }, [contractSelection]); // Only depend on contractSelection

  // Toggle wallet expansion with data loading
  const toggleWalletExpansion = (address: string) => {
    walletDiscovery.toggleWalletExpansion(address);
    // Load stats if not already loaded
    if (!walletStats[address] || walletStats[address].stats === null) {
      refreshWalletStats(address);
    }
  };

  // Load stats for a specific wallet
  const refreshWalletStats = async (address: string, opts?: { forceRefresh?: boolean }) => {
    setWalletStats(prev => ({
      ...prev,
      [address]: { stats: null, loading: true, error: null }
    }));

    try {
      // Include contract selection in the API call
      const contractParam = contractSelection;
      const forceRefresh = Boolean(opts && opts.forceRefresh);
      const q = new URLSearchParams();
      q.set('contract', contractParam);
      if (forceRefresh) {
        q.set('_refresh', '1');
        q.set('_t', String(Date.now()));
      }
      const response = await fetch(getApiUrl(`api/stats/${address}?${q.toString()}`));
      const data = await response.json();

      if (response.ok && data.success) {
        const stats: PlayerStats = {
          address,
          totalGames: data.totalGames || 0,
          bestScore: data.bestScore || 0,
          bestDistance: data.bestDistance || 0,
          bestCoins: data.bestCoins || 0,
          bestBossesDefeated: data.bestBossesDefeated || 0,
          bestEnemiesDefeated: data.bestEnemiesDefeated || 0,
          bestCoinStreak: data.bestCoinStreak || 0,
          totalScore: data.totalScore || 0,
          totalDistance: data.totalDistance || 0,
          totalCoins: data.totalCoins || 0,
          totalBossesDefeated: data.totalBossesDefeated || 0,
          totalEnemiesDefeated: data.totalEnemiesDefeated || 0,
          totalCoinStreak: data.totalCoinStreak || 0,
          firstGameDate: data.firstGameDate || 0,
          lastGameDate: data.lastGameDate || 0,
          averageScore: data.totalGames > 0 ? (data.totalScore || 0) / data.totalGames : 0,
          averageDistance: data.totalGames > 0 ? (data.totalDistance || 0) / data.totalGames : 0,
          averageCoins: data.totalGames > 0 ? (data.totalCoins || 0) / data.totalGames : 0,
          averageBossesDefeated: data.totalGames > 0 ? (data.totalBossesDefeated || 0) / data.totalGames : 0,
          averageEnemiesDefeated: data.totalGames > 0 ? (data.totalEnemiesDefeated || 0) / data.totalGames : 0,
          averageCoinStreak: data.totalGames > 0 ? (data.totalCoinStreak || 0) / data.totalGames : 0,
        };
        setWalletStats(prev => ({
          ...prev,
          [address]: { stats, loading: false, error: null }
        }));
      } else {
        setWalletStats(prev => ({
          ...prev,
          [address]: { stats: null, loading: false, error: data.error || 'Failed to load stats' }
        }));
      }
    } catch (error) {
      setWalletStats(prev => ({
        ...prev,
        [address]: { stats: null, loading: false, error: error instanceof Error ? error.message : 'Network error' }
      }));
    }
  };

  const formatDate = (timestamp: number): string => {
    if (!timestamp || timestamp === 0) return 'Never';
    return new Date(timestamp).toLocaleString();
  };

  if (!isAdminWalletConnected) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: styles.text }}>
        Please connect the admin wallet to access stats management.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Info Notice */}
      <div className="admin-message admin-message-success" style={{ backgroundColor: styles.bgInfo, borderColor: styles.border }}>
        <strong style={{ color: styles.text }}>ℹ️ Note:</strong>
        <p style={{ color: styles.textSecondary, marginTop: '0.5rem', marginBottom: 0 }}>
          Player statistics update when games are submitted. Admins can clear stats or rebuild them from on-chain game
          result events (Fix stats). Rebuild scans recent events up to a page cap; very long histories may be incomplete.
        </p>
      </div>

      {/* Discover Wallets Section */}
      <WalletDiscoveryUI
        styles={styles}
        title="🔍 Discover Wallets with Stats"
        discoverButtonText="🔍 Discover All Wallets with Stats"
        searchAddress={walletDiscovery.searchAddress}
        setSearchAddress={walletDiscovery.setSearchAddress}
        onSearch={walletDiscovery.handleSearchWallet}
        onDiscover={walletDiscovery.handleDiscoverWallets}
        searchingWallet={walletDiscovery.searchingWallet}
        discoveringWallets={walletDiscovery.discoveringWallets}
        discoveredWalletsCount={effectiveDiscoveredWallets.length}
        contractSelection={contractSelection}
        setContractSelection={setContractSelection}
        contractSelectionEnvVar="OLD_ACHIEVEMENT_REGISTRY_OBJECT_ID_TESTNET"
      />

      <WalletList
        styles={styles}
        wallets={effectiveDiscoveredWallets}
        filteredWallets={effectiveFilteredWallets}
        searchAddress={walletDiscovery.searchAddress}
        expandedWallets={walletDiscovery.expandedWallets}
        onToggleExpansion={toggleWalletExpansion}
        getWalletData={(address) => walletStats[address] || { stats: null, loading: false, error: null }}
        renderWalletContent={(address, isExpanded, walletData) => {
          if (walletData.loading) {
            return (
              <div style={{ padding: '2rem', textAlign: 'center', color: styles.textSecondary }}>
                Loading stats...
              </div>
            );
          }

          if (walletData.error) {
            return (
              <div className="admin-message admin-message-error">
                <strong>❌ Error:</strong> {walletData.error}
              </div>
            );
          }

          if (!walletData.stats) {
            return null;
          }

          return (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                <h4 style={{ marginTop: 0, marginBottom: '1rem', color: styles.text, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  Stats for <CopyableAddress value={walletData.stats.address} styles={styles} compact />
                </h4>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="menu-btn"
                    style={{ backgroundColor: '#1565c0', color: 'white', border: 'none' }}
                    onClick={async () => {
                      const ok = window.confirm(
                        'Rebuild this player’s aggregate stats from on-chain game result events? ' +
                          'This overwrites current totals and bests (same mechanism as Clear, but with recomputed values). ' +
                          'If the event scan hits the page cap, older games might be missing.'
                      );
                      if (!ok) return;
                      try {
                        const res = await fetch(getApiUrl('api/admin/stats/fix-player'), {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            'X-Admin-Wallet': connectedAddress || '',
                          },
                          body: JSON.stringify({ address }),
                        });
                        const data = await res.json().catch(() => null);
                        if (!res.ok || !data?.success) {
                          alert(data?.error || `Failed to fix stats (HTTP ${res.status})`);
                          return;
                        }
                        await refreshWalletStats(address, { forceRefresh: true });
                        if (data.reconcileTruncated) {
                          alert(
                            (data.message || 'Stats rebuilt.') +
                              ' Warning: event scan was truncated; totals may not include the full game history.'
                          );
                        } else {
                          alert(data.message || 'Stats rebuilt from game results.');
                        }
                      } catch (e) {
                        alert(e instanceof Error ? e.message : 'Failed to fix stats');
                      }
                    }}
                  >
                    Fix stats
                  </button>
                  <button
                    type="button"
                    className="menu-btn"
                    style={{ backgroundColor: '#b71c1c', color: 'white', border: 'none' }}
                    onClick={async () => {
                      const ok = window.confirm(
                        'Clear this player’s stats on-chain? This resets totals and bests to 0.'
                      );
                      if (!ok) return;
                      try {
                        const res = await fetch(getApiUrl('api/admin/stats/clear-player'), {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            'X-Admin-Wallet': connectedAddress || '',
                          },
                          body: JSON.stringify({ address }),
                        });
                        const data = await res.json().catch(() => null);
                        if (!res.ok || !data?.success) {
                          alert(data?.error || `Failed to clear stats (HTTP ${res.status})`);
                          return;
                        }
                        await refreshWalletStats(address, { forceRefresh: true });
                        alert('Stats cleared.');
                      } catch (e) {
                        alert(e instanceof Error ? e.message : 'Failed to clear stats');
                      }
                    }}
                  >
                    Clear stats
                  </button>
                </div>
              </div>
              
              {/* Best Stats Section */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h5 style={{ color: styles.text, marginBottom: '0.75rem', fontSize: '1rem' }}>🏆 Best Stats</h5>
                <div className="admin-grid">
                  <div className="admin-card">
                    <div style={{ fontWeight: 'bold', color: styles.text }}>Best Score</div>
                    <div className="admin-value-large">{walletData.stats.bestScore.toLocaleString()}</div>
                  </div>

                  <div className="admin-card">
                    <div style={{ fontWeight: 'bold', color: styles.text }}>Best Distance</div>
                    <div className="admin-value-large">{walletData.stats.bestDistance.toLocaleString()}</div>
                  </div>

                  <div className="admin-card">
                    <div style={{ fontWeight: 'bold', color: styles.text }}>Best Coins</div>
                    <div className="admin-value-large">{walletData.stats.bestCoins.toLocaleString()}</div>
                  </div>

                  <div className="admin-card">
                    <div style={{ fontWeight: 'bold', color: styles.text }}>Best Bosses Defeated</div>
                    <div className="admin-value-large">{walletData.stats.bestBossesDefeated}</div>
                  </div>

                  <div className="admin-card">
                    <div style={{ fontWeight: 'bold', color: styles.text }}>Best Enemies Defeated</div>
                    <div className="admin-value-large">{walletData.stats.bestEnemiesDefeated.toLocaleString()}</div>
                  </div>

                  <div className="admin-card">
                    <div style={{ fontWeight: 'bold', color: styles.text }}>Best Coin Streak</div>
                    <div className="admin-value-large">{walletData.stats.bestCoinStreak}</div>
                  </div>
                </div>
              </div>

              {/* Total Stats Section */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h5 style={{ color: styles.text, marginBottom: '0.75rem', fontSize: '1rem' }}>📊 Total Stats</h5>
                <div className="admin-grid">
                  <div className="admin-card">
                    <div style={{ fontWeight: 'bold', color: styles.text }}>Total Games</div>
                    <div className="admin-value-large">{walletData.stats.totalGames}</div>
                  </div>

                  <div className="admin-card">
                    <div style={{ fontWeight: 'bold', color: styles.text }}>Total Score</div>
                    <div className="admin-value-large">{walletData.stats.totalScore.toLocaleString()}</div>
                  </div>

                  <div className="admin-card">
                    <div style={{ fontWeight: 'bold', color: styles.text }}>Total Distance</div>
                    <div className="admin-value-large">{walletData.stats.totalDistance.toLocaleString()}</div>
                  </div>

                  <div className="admin-card">
                    <div style={{ fontWeight: 'bold', color: styles.text }}>Total Coins</div>
                    <div className="admin-value-large">{walletData.stats.totalCoins.toLocaleString()}</div>
                  </div>

                  <div className="admin-card">
                    <div style={{ fontWeight: 'bold', color: styles.text }}>Total Bosses Defeated</div>
                    <div className="admin-value-large">{walletData.stats.totalBossesDefeated}</div>
                  </div>

                  <div className="admin-card">
                    <div style={{ fontWeight: 'bold', color: styles.text }}>Total Enemies Defeated</div>
                    <div className="admin-value-large">{walletData.stats.totalEnemiesDefeated.toLocaleString()}</div>
                  </div>

                  <div className="admin-card">
                    <div style={{ fontWeight: 'bold', color: styles.text }}>Total Coin Streak</div>
                    <div className="admin-value-large">{walletData.stats.totalCoinStreak}</div>
                  </div>
                </div>
              </div>

              {/* Average Stats Section */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h5 style={{ color: styles.text, marginBottom: '0.75rem', fontSize: '1rem' }}>📈 Average Stats</h5>
                <div className="admin-grid">
                  <div className="admin-card">
                    <div style={{ fontWeight: 'bold', color: styles.text }}>Average Score</div>
                    <div className="admin-value-large">{Math.round(walletData.stats.averageScore).toLocaleString()}</div>
                  </div>

                  <div className="admin-card">
                    <div style={{ fontWeight: 'bold', color: styles.text }}>Average Distance</div>
                    <div className="admin-value-large">{Math.round(walletData.stats.averageDistance).toLocaleString()}</div>
                  </div>

                  <div className="admin-card">
                    <div style={{ fontWeight: 'bold', color: styles.text }}>Average Coins</div>
                    <div className="admin-value-large">{Math.round(walletData.stats.averageCoins).toLocaleString()}</div>
                  </div>

                  <div className="admin-card">
                    <div style={{ fontWeight: 'bold', color: styles.text }}>Average Bosses Defeated</div>
                    <div className="admin-value-large">{Math.round(walletData.stats.averageBossesDefeated * 10) / 10}</div>
                  </div>

                  <div className="admin-card">
                    <div style={{ fontWeight: 'bold', color: styles.text }}>Average Enemies Defeated</div>
                    <div className="admin-value-large">{Math.round(walletData.stats.averageEnemiesDefeated).toLocaleString()}</div>
                  </div>

                  <div className="admin-card">
                    <div style={{ fontWeight: 'bold', color: styles.text }}>Average Coin Streak</div>
                    <div className="admin-value-large">{Math.round(walletData.stats.averageCoinStreak * 10) / 10}</div>
                  </div>
                </div>
              </div>

              {/* Game Dates Section */}
              <div>
                <h5 style={{ color: styles.text, marginBottom: '0.75rem', fontSize: '1rem' }}>📅 Game Dates</h5>
                <div className="admin-grid">
                  <div className="admin-card">
                    <div style={{ fontWeight: 'bold', color: styles.text }}>First Game</div>
                    <div style={{ fontSize: '0.9rem', color: styles.textSecondary, marginTop: '0.5rem' }}>{formatDate(walletData.stats.firstGameDate)}</div>
                  </div>

                  <div className="admin-card">
                    <div style={{ fontWeight: 'bold', color: styles.text }}>Last Game</div>
                    <div style={{ fontSize: '0.9rem', color: styles.textSecondary, marginTop: '0.5rem' }}>{formatDate(walletData.stats.lastGameDate)}</div>
                  </div>
                </div>
              </div>
            </div>
          );
        }}
      />
    </div>
  );
}

