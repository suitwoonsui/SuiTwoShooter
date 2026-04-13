// ==========================================
// Admin Page - Game Pass Management Tab
// Extends the platform backend's GamePassTab with game-specific ticket management
// ==========================================

'use client';

import { useState, useEffect } from 'react';
import { AdminStyles } from '../types';
import { getApiUrl } from '../utils/get-api-url';
import { useWalletDiscovery } from '../hooks/useWalletDiscovery';
import { WalletDiscoveryUI } from '../components/WalletDiscoveryUI';
import { CopyableAddress } from '../components/CopyableAddress';

interface GamePassManagementTabProps {
  isAdminWalletConnected: boolean;
  connectedAddress: string | null;
  adminAddress: string | null;
  styles: AdminStyles;
}

interface GamePassStatus {
  address: string;
  hasPass: boolean;
  gamesRemaining: number;
  isActive: boolean;
  packType?: number;
  ticketCount: number;
  loading?: boolean;
  error?: string;
}

interface TicketInfo {
  ticketId: number;
  valuePaidUsdCents: number;
  purchasedAt: number;
}

/** Normalize API ticket array to { ticketId, valuePaidUsdCents, purchasedAt } (supports snake_case from API). */
function normalizeTicketInfo(raw: unknown): TicketInfo[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((t: any) => ({
    ticketId: Number(t?.ticketId ?? t?.ticket_id ?? 0),
    valuePaidUsdCents: Number(t?.valuePaidUsdCents ?? t?.value_paid_usd_cents ?? 0),
    purchasedAt: Number(t?.purchasedAt ?? t?.purchased_at ?? 0),
  })).filter(t => t.ticketId > 0);
}

/**
 * Game Pass Management Tab - Extended version with ticket management
 * 
 * This component extends the platform's GamePassTab functionality by adding
 * game-specific ticket management features integrated into the wallet discovery view.
 */
export function GamePassManagementTab({ isAdminWalletConnected, connectedAddress, adminAddress, styles }: GamePassManagementTabProps) {
  // Contract selection (new or old)
  const [contractSelection, setContractSelection] = useState<'new' | 'old'>('new');
  
  // Expanded wallets (Set of addresses)
  const [expandedWallets, setExpandedWallets] = useState<Set<string>>(new Set());
  
  // Wallet game pass cache (address -> game pass data)
  const [walletGamePasses, setWalletGamePasses] = useState<Record<string, { gamePass: GamePassStatus | null; loading: boolean; error: string | null }>>({});
  
  // Credit management state
  const [creditAmounts, setCreditAmounts] = useState<Record<string, { add: number; set: number; remove: number }>>({});
  const [creditOperations, setCreditOperations] = useState<Record<string, { type: 'add' | 'set' | 'remove'; loading: boolean; result: { success: boolean; digest?: string; error?: string } | null }>>({});

  // Ticket management state (game-specific extension)
  const [walletTicketData, setWalletTicketData] = useState<Record<string, {
    ticketInfo: TicketInfo[] | null;
    loading: boolean;
    error: string | null;
  }>>({});
  const [ticketOperations, setTicketOperations] = useState<Record<string, {
    addQuantity: number;
    addValue: number;
    removingTicketId: number | null;
    adding: boolean;
    removing: boolean;
    addResult: { success: boolean; digest?: string; ticketCountAfter?: number; error?: string } | null;
    removeResult: { success: boolean; digest?: string; error?: string } | null;
  }>>({});

  // Check if wallet has a game pass
  const checkWalletExists = async (address: string): Promise<boolean> => {
    try {
      const contractParam = contractSelection;
      const response = await fetch(getApiUrl(`api/game-pass/${address}?contract=${contractParam}`));
      const data = await response.json();
      return response.ok && data.success && data.hasPass;
    } catch {
      return false;
    }
  };

  // Wallet discovery hook
  const walletDiscovery = useWalletDiscovery({
    isAdminWalletConnected,
    connectedAddress,
    adminAddress,
    discoveryType: 'game-pass',
    checkWalletExists,
    contract: contractSelection,
    onWalletsDiscovered: () => {
      setWalletGamePasses({});
      setExpandedWallets(new Set());
    },
    onWalletExpanded: (address) => {
      // Load game pass if not already loaded
      if (!walletGamePasses[address] || walletGamePasses[address].gamePass === null) {
        refreshWalletGamePass(address);
      }
      // Load ticket data if not already loaded (game-specific)
      if (!walletTicketData[address] || walletTicketData[address].ticketInfo === null) {
        refreshWalletTicketData(address);
      }
      // Initialize ticket operations
      initializeTicketOperations(address);
    },
  });

  // Refresh all game passes and ticket data when contract selection changes
  useEffect(() => {
    if (walletDiscovery.discoveredWallets.length > 0) {
      // Refresh game pass and ticket data for all discovered wallets when contract selection changes
      // refreshWalletGamePass and refreshWalletTicketData already use the current contractSelection value from closure
      walletDiscovery.discoveredWallets.forEach(address => {
        refreshWalletGamePass(address);
        // Also refresh ticket data if wallet is expanded
        if (expandedWallets.has(address)) {
          refreshWalletTicketData(address);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractSelection]); // Only depend on contractSelection - refresh functions use it from closure

  // Toggle wallet expansion (uses hook's toggle - onWalletExpanded callback handles data loading)
  const toggleWalletExpansion = (address: string) => {
    walletDiscovery.toggleWalletExpansion(address);
  };

  // Load game pass for a specific wallet
  const refreshWalletGamePass = async (address: string) => {
    setWalletGamePasses(prev => ({
      ...prev,
      [address]: { gamePass: null, loading: true, error: null }
    }));

    try {
      // Include contract selection in the API call
      const contractParam = contractSelection;
      const response = await fetch(getApiUrl(`api/game-pass/${address}?contract=${contractParam}`));
      const data = await response.json();

      if (response.ok && data.success) {
        const gamePass: GamePassStatus = {
          address,
          hasPass: data.hasPass || false,
          gamesRemaining: data.gamesRemaining || 0,
          isActive: data.isActive || false,
          packType: data.packType,
          ticketCount: data.ticketCount || 0,
        };
        setWalletGamePasses(prev => ({
          ...prev,
          [address]: { gamePass, loading: false, error: null }
        }));
      } else {
        setWalletGamePasses(prev => ({
          ...prev,
          [address]: { gamePass: null, loading: false, error: data.error || 'Failed to load game pass' }
        }));
      }
    } catch (error) {
      setWalletGamePasses(prev => ({
        ...prev,
        [address]: { gamePass: null, loading: false, error: error instanceof Error ? error.message : 'Network error' }
      }));
    }
  };

  // Credit management functions (from platform)
  const handleAddCredits = async (address: string) => {
    const amount = creditAmounts[address]?.add || 1;
    setCreditOperations(prev => ({ ...prev, [address]: { type: 'add', loading: true, result: null } }));

    try {
      const response = await fetch(getApiUrl('api/admin/game-pass/credits/add'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerAddress: address,
          amount,
          adminWalletAddress: adminAddress,
        }),
      });
      const data = await response.json();

      if (response.ok && data.success) {
        setCreditOperations(prev => ({ ...prev, [address]: { type: 'add', loading: false, result: { success: true, digest: data.digest } } }));
        setCreditAmounts(prev => ({
          ...prev,
          [address]: {
            add: 1,
            set: prev[address]?.set || 0,
            remove: prev[address]?.remove || 1,
          },
        }));
        await refreshWalletGamePass(address);
      } else {
        setCreditOperations(prev => ({ ...prev, [address]: { type: 'add', loading: false, result: { success: false, error: data.error || 'Failed to add credits' } } }));
      }
    } catch (error) {
      setCreditOperations(prev => ({ ...prev, [address]: { type: 'add', loading: false, result: { success: false, error: error instanceof Error ? error.message : 'Network error' } } }));
    }
  };

  const handleSetCredits = async (address: string) => {
    const amount = creditAmounts[address]?.set || 0;
    setCreditOperations(prev => ({ ...prev, [address]: { type: 'set', loading: true, result: null } }));

    try {
      const response = await fetch(getApiUrl('api/admin/game-pass/credits/set'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerAddress: address,
          amount,
        }),
      });
      const data = await response.json();

      if (response.ok && data.success) {
        setCreditOperations(prev => ({ ...prev, [address]: { type: 'set', loading: false, result: { success: true, digest: data.digest } } }));
        setCreditAmounts(prev => ({
          ...prev,
          [address]: {
            add: prev[address]?.add || 1,
            set: 0,
            remove: prev[address]?.remove || 1,
          },
        }));
        await refreshWalletGamePass(address);
      } else {
        setCreditOperations(prev => ({ ...prev, [address]: { type: 'set', loading: false, result: { success: false, error: data.error || 'Failed to set credits' } } }));
      }
    } catch (error) {
      setCreditOperations(prev => ({ ...prev, [address]: { type: 'set', loading: false, result: { success: false, error: error instanceof Error ? error.message : 'Network error' } } }));
    }
  };

  const handleRemoveCredits = async (address: string) => {
    const amount = creditAmounts[address]?.remove || 1;
    setCreditOperations(prev => ({ ...prev, [address]: { type: 'remove', loading: true, result: null } }));

    try {
      const response = await fetch(getApiUrl('api/admin/game-pass/credits/remove'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerAddress: address,
          amount,
        }),
      });
      const data = await response.json();

      if (response.ok && data.success) {
        setCreditOperations(prev => ({ ...prev, [address]: { type: 'remove', loading: false, result: { success: true, digest: data.digest } } }));
        setCreditAmounts(prev => ({
          ...prev,
          [address]: {
            add: prev[address]?.add || 1,
            set: prev[address]?.set || 0,
            remove: 1,
          },
        }));
        await refreshWalletGamePass(address);
      } else {
        setCreditOperations(prev => ({ ...prev, [address]: { type: 'remove', loading: false, result: { success: false, error: data.error || 'Failed to remove credits' } } }));
      }
    } catch (error) {
      setCreditOperations(prev => ({ ...prev, [address]: { type: 'remove', loading: false, result: { success: false, error: error instanceof Error ? error.message : 'Network error' } } }));
    }
  };

  // Ticket management functions (game-specific)
  const getTicketOperations = (address: string) => {
    return ticketOperations[address] || {
      addQuantity: 1,
      addValue: 0,
      removingTicketId: null,
      adding: false,
      removing: false,
      addResult: null,
      removeResult: null,
    };
  };

  const initializeTicketOperations = (address: string) => {
    if (!ticketOperations[address]) {
      setTicketOperations(prev => ({
        ...prev,
        [address]: {
          addQuantity: 1,
          addValue: 0,
          removingTicketId: null,
          adding: false,
          removing: false,
          addResult: null,
          removeResult: null,
        }
      }));
    }
  };

  const refreshWalletTicketData = async (address: string) => {
    setWalletTicketData(prev => ({
      ...prev,
      [address]: { 
        ticketInfo: prev[address]?.ticketInfo || null,
        loading: true, 
        error: null 
      }
    }));

    try {
      const contractParam = contractSelection;
      const infoResponse = await fetch(getApiUrl('api/admin/tournaments/ticket-info'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerAddress: address, contract: contractParam }),
      });
      if (!infoResponse.ok) {
        throw new Error(`Ticket info failed: ${infoResponse.status} ${infoResponse.statusText}`);
      }
      const infoData = await infoResponse.json();
      const rawTickets = infoData.tickets ?? infoData.ticketInfo ?? infoData.data?.tickets ?? [];
      const tickets = normalizeTicketInfo(Array.isArray(rawTickets) ? rawTickets : []);

      setWalletTicketData(prev => ({
        ...prev,
        [address]: {
          ticketInfo: tickets,
          loading: false,
          error: infoData.error || null,
        }
      }));
    } catch (error) {
      console.error('Error refreshing ticket data:', error);
      setWalletTicketData(prev => ({
        ...prev,
        [address]: {
          ...prev[address],
          loading: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }));
    }
  };

  const handleAddTickets = async (address: string) => {
    const ops = getTicketOperations(address);
    if (ops.addQuantity <= 0) {
      alert('Quantity must be greater than 0');
      return;
    }

    setTicketOperations(prev => ({
      ...prev,
      [address]: { ...prev[address], adding: true, addResult: null }
    }));

    try {
      // Call platform backend for ticket management (tickets are stored in platform game pass system)
      const response = await fetch(getApiUrl('api/admin/game-pass/tickets/add'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerAddress: address,
          quantity: ops.addQuantity,
          valuePerTicketUsdCents: ops.addValue,
          adminWalletAddress: adminAddress, // Include for authentication
        }),
      });

      const data = await response.json();
      setTicketOperations(prev => ({
        ...prev,
        [address]: {
          ...prev[address],
          adding: false,
          addResult: data.success ? { success: true, digest: data.digest, ticketCountAfter: data.ticketCountAfter } : { success: false, error: data.error || 'Failed to add tickets' }
        }
      }));
      
      if (data.success) {
        await refreshWalletTicketData(address);
        await refreshWalletGamePass(address);
        setTicketOperations(prev => ({
          ...prev,
          [address]: { ...prev[address], addQuantity: 1, addValue: 0 }
        }));
      }
    } catch (error) {
      setTicketOperations(prev => ({
        ...prev,
        [address]: {
          ...prev[address],
          adding: false,
          addResult: { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
        }
      }));
    }
  };

  const handleRemoveTicket = async (address: string, ticketId: number) => {
    if (!confirm(`Remove ticket ${ticketId} from ${address.substring(0, 10)}...?`)) {
      return;
    }
    
    setTicketOperations(prev => ({
      ...prev,
      [address]: { ...getTicketOperations(address), removing: true, removingTicketId: ticketId, removeResult: null }
    }));

    try {
      // Call platform backend for ticket management (tickets are stored in platform game pass system)
      const response = await fetch(getApiUrl('api/admin/game-pass/tickets/remove'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerAddress: address,
          ticketId: ticketId,
          adminWalletAddress: adminAddress, // Include for authentication
        }),
      });

      const responseData = await response.json();
      setTicketOperations(prev => ({
        ...prev,
        [address]: {
          ...getTicketOperations(address),
          removing: false,
          removeResult: responseData.success ? { success: true, digest: responseData.digest } : { success: false, error: responseData.error || 'Failed to remove ticket' }
        }
      }));
      
      if (responseData.success) {
        await refreshWalletTicketData(address);
        await refreshWalletGamePass(address);
      }
    } catch (error) {
      setTicketOperations(prev => ({
        ...prev,
        [address]: {
          ...getTicketOperations(address),
          removing: false,
          removeResult: { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
        }
      }));
    }
  };

  // Search for a specific wallet

  if (!isAdminWalletConnected) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: styles.text }}>
        Please connect the admin wallet to access game pass management.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Discover Wallets Section */}
      <div style={{ marginBottom: '0.5rem', color: styles.textSecondary, fontSize: '0.9rem' }}>
        Tip: Search by wallet address to add credits to an account that doesn&apos;t have a game pass yet (a pass will be created when you add credits).
      </div>
      <WalletDiscoveryUI
        styles={styles}
        title="🔍 Discover Wallets with Game Passes"
        discoverButtonText="🔍 Discover All Wallets with Game Passes"
        searchAddress={walletDiscovery.searchAddress}
        setSearchAddress={walletDiscovery.setSearchAddress}
        onSearch={walletDiscovery.handleSearchWallet}
        onDiscover={walletDiscovery.handleDiscoverWallets}
        searchingWallet={walletDiscovery.searchingWallet}
        discoveringWallets={walletDiscovery.discoveringWallets}
        discoveredWalletsCount={walletDiscovery.discoveredWallets.length}
        contractSelection={contractSelection}
        setContractSelection={setContractSelection}
        contractSelectionEnvVar="OLD_GAME_PASS_SYSTEM_OBJECT_ID_TESTNET"
      />

      {/* Wallet List with Game Pass Details */}
      {walletDiscovery.discoveredWallets.length > 0 && (() => {
        // Use hook's filtered wallets
        const filteredWallets = walletDiscovery.filteredWallets;
            
            return (
              <div>
                <p style={{ marginBottom: '0.5rem', color: styles.textSecondary }}>
                  {walletDiscovery.searchAddress.trim() 
                    ? `Found ${filteredWallets.length} wallet(s) matching "${walletDiscovery.searchAddress}" (${walletDiscovery.discoveredWallets.length} total):`
                    : `Found ${walletDiscovery.discoveredWallets.length} wallet(s) with game passes:`
                  }
                </p>
                {filteredWallets.length === 0 && walletDiscovery.searchAddress.trim() && (
                  <div style={{ 
                    padding: '1rem', 
                    backgroundColor: styles.bgWarning, 
                    borderRadius: '4px', 
                    border: `1px solid ${styles.border}`,
                    marginBottom: '0.5rem',
                    color: styles.text
                  }}>
                    No wallets found matching "{walletDiscovery.searchAddress}". Try a different search term or discover all wallets.
                  </div>
                )}
                <div>
                  {filteredWallets.map((address, index) => {
                  const isExpanded = walletDiscovery.expandedWallets.has(address);
                  const walletData = walletGamePasses[address] || { gamePass: null, loading: false, error: null };
                  const ticketData = walletTicketData[address] || { ticketInfo: null, loading: false, error: null };
                  const ops = getTicketOperations(address);
                  
                  return (
                    <div
                      key={index}
                      style={{
                        marginBottom: '0.75rem',
                        backgroundColor: styles.bgSecondary,
                        borderRadius: '4px',
                        border: `1px solid ${styles.border}`,
                        overflow: 'hidden',
                      }}
                    >
                      {/* Wallet Header - Clickable to expand/collapse */}
                      <div
                        className={`admin-wallet-header ${isExpanded ? 'active' : ''}`}
                        onClick={() => toggleWalletExpansion(address)}
                        title="Click to expand/collapse game pass info"
                      >
                        <span>{address}</span>
                        <span style={{ fontSize: '1.2rem', marginLeft: '1rem' }}>
                          {isExpanded ? '▼' : '▶'}
                        </span>
                      </div>

                      {/* Expanded Content - Game Pass Display */}
                      {isExpanded && (
                        <div 
                          className="admin-scrollable"
                          style={{ 
                            padding: '1.5rem', 
                            backgroundColor: styles.bgTertiary,
                            maxHeight: '600px',
                            overflowY: 'auto',
                          }}
                        >
                          {walletData.loading && (
                            <div style={{ padding: '2rem', textAlign: 'center', color: styles.textSecondary }}>
                              Loading game pass...
                            </div>
                          )}

                          {walletData.error && (
                            <div className="admin-message admin-message-error">
                              <strong>❌ Error:</strong> {walletData.error}
                            </div>
                          )}

                          {!walletData.loading && (
                            <div>
                              {walletData.gamePass ? (
                                <>
                                  <h4 style={{ marginTop: 0, marginBottom: '1rem', color: styles.text, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    Game Pass for <CopyableAddress value={walletData.gamePass.address} styles={styles} compact />
                                  </h4>
                                  {/* Game Pass Info */}
                                  <div style={{ marginBottom: '1.5rem' }}>
                                    <h5 style={{ color: styles.text, marginBottom: '0.75rem', fontSize: '1rem' }}>📋 Game Pass Information</h5>
                                    <div className="admin-grid">
                                      <div className="admin-card">
                                        <div style={{ fontWeight: 'bold', color: styles.text }}>Has Pass</div>
                                        <div className="admin-value-large">
                                          {walletData.gamePass.hasPass ? '✅ Yes' : '❌ No'}
                                        </div>
                                      </div>
                                      <div className="admin-card">
                                        <div style={{ fontWeight: 'bold', color: styles.text }}>Games Remaining</div>
                                        <div className="admin-value-large">{walletData.gamePass.gamesRemaining}</div>
                                      </div>
                                      <div className="admin-card">
                                        <div style={{ fontWeight: 'bold', color: styles.text }}>Is Active</div>
                                        <div className="admin-value-large">
                                          {walletData.gamePass.isActive ? '✅ Active' : '❌ Inactive'}
                                        </div>
                                      </div>
                                      <div className="admin-card">
                                        <div style={{ fontWeight: 'bold', color: styles.text }}>Tournament Tickets</div>
                                        <div className="admin-value-large">{walletData.gamePass.ticketCount}</div>
                                      </div>
                                      {walletData.gamePass.packType !== undefined && (
                                        <div className="admin-card">
                                          <div style={{ fontWeight: 'bold', color: styles.text }}>Pack Type</div>
                                          <div className="admin-value-large">{walletData.gamePass.packType}</div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </>
                              ) : (
                                <div className="admin-message" style={{ marginBottom: '1.5rem', padding: '0.75rem', backgroundColor: styles.bgSecondary, borderRadius: '4px', border: `1px solid ${styles.border}`, color: styles.textSecondary }}>
                                  {walletData.error ? (
                                    <><strong>Note:</strong> {walletData.error}</>
                                  ) : (
                                    <>No game pass yet for this wallet.</>
                                  )}
                                  <div style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
                                    Add credits or tournament tickets below; a game pass will be created when you do.
                                  </div>
                                </div>
                              )}

                              {/* Credit Management */}
                              <div style={{ marginBottom: '1.5rem' }}>
                                <h5 style={{ color: styles.text, marginBottom: '0.75rem', fontSize: '1rem' }}>🎮 Credit Management</h5>
                                <div className="admin-grid">
                                  {/* Add Credits */}
                                  <div className="admin-card">
                                    <div style={{ fontWeight: 'bold', color: styles.text, marginBottom: '0.5rem' }}>Add Credits</div>
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                                      <input
                                        type="number"
                                        min="1"
                                        value={creditAmounts[address]?.add || 1}
                                        onChange={(e) => setCreditAmounts(prev => ({
                                          ...prev,
                                          [address]: { ...prev[address], add: parseInt(e.target.value) || 1, set: prev[address]?.set || 0, remove: prev[address]?.remove || 1 }
                                        }))}
                                        className="admin-input"
                                        style={{ width: '100px' }}
                                      />
                                      <button
                                        type="button"
                                        onClick={() => handleAddCredits(address)}
                                        disabled={creditOperations[address]?.loading}
                                        className="admin-button admin-button-success"
                                        style={{ flex: 1 }}
                                      >
                                        {creditOperations[address]?.type === 'add' && creditOperations[address]?.loading ? 'Adding...' : 'Add'}
                                      </button>
                                    </div>
                                    {creditOperations[address]?.type === 'add' && creditOperations[address]?.result && (
                                      <div style={{ fontSize: '0.8rem', color: creditOperations[address]?.result.success ? '#4CAF50' : '#f44336' }}>
                                        {creditOperations[address]?.result.success ? '✅ Success' : `❌ ${creditOperations[address]?.result.error}`}
                                      </div>
                                    )}
                                  </div>

                                  {/* Set Credits */}
                                  <div className="admin-card">
                                    <div style={{ fontWeight: 'bold', color: styles.text, marginBottom: '0.5rem' }}>Set Credits</div>
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                                      <input
                                        type="number"
                                        min="0"
                                        value={creditAmounts[address]?.set || 0}
                                        onChange={(e) => setCreditAmounts(prev => ({
                                          ...prev,
                                          [address]: { ...prev[address], add: prev[address]?.add || 1, set: parseInt(e.target.value) || 0, remove: prev[address]?.remove || 1 }
                                        }))}
                                        className="admin-input"
                                        style={{ width: '100px' }}
                                      />
                                      <button
                                        type="button"
                                        onClick={() => handleSetCredits(address)}
                                        disabled={creditOperations[address]?.loading}
                                        className="admin-button admin-button-primary"
                                        style={{ flex: 1 }}
                                      >
                                        {creditOperations[address]?.type === 'set' && creditOperations[address]?.loading ? 'Setting...' : 'Set'}
                                      </button>
                                    </div>
                                    {creditOperations[address]?.type === 'set' && creditOperations[address]?.result && (
                                      <div style={{ fontSize: '0.8rem', color: creditOperations[address]?.result.success ? '#4CAF50' : '#f44336' }}>
                                        {creditOperations[address]?.result.success ? '✅ Success' : `❌ ${creditOperations[address]?.result.error}`}
                                      </div>
                                    )}
                                  </div>

                                  {/* Remove Credits */}
                                  <div className="admin-card">
                                    <div style={{ fontWeight: 'bold', color: styles.text, marginBottom: '0.5rem' }}>Remove Credits</div>
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                                      <input
                                        type="number"
                                        min="1"
                                        value={creditAmounts[address]?.remove || 1}
                                        onChange={(e) => setCreditAmounts(prev => ({
                                          ...prev,
                                          [address]: { ...prev[address], add: prev[address]?.add || 1, set: prev[address]?.set || 0, remove: parseInt(e.target.value) || 1 }
                                        }))}
                                        className="admin-input"
                                        style={{ width: '100px' }}
                                      />
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveCredits(address)}
                                        disabled={creditOperations[address]?.loading}
                                        className="admin-button admin-button-danger"
                                        style={{ flex: 1 }}
                                      >
                                        {creditOperations[address]?.type === 'remove' && creditOperations[address]?.loading ? 'Removing...' : 'Remove'}
                                      </button>
                                    </div>
                                    {creditOperations[address]?.type === 'remove' && creditOperations[address]?.result && (
                                      <div style={{ fontSize: '0.8rem', color: creditOperations[address]?.result.success ? '#4CAF50' : '#f44336' }}>
                                        {creditOperations[address]?.result.success ? '✅ Success' : `❌ ${creditOperations[address]?.result.error}`}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Ticket Management - Game-Specific Extension */}
                              <div style={{ marginBottom: '1.5rem' }}>
                                <h5 style={{ color: styles.text, marginBottom: '0.75rem', fontSize: '1rem' }}>🎫 Tournament Ticket Management</h5>
                                
                                {ticketData.loading && (
                                  <div style={{ padding: '1rem', textAlign: 'center', color: styles.textSecondary }}>
                                    Loading ticket data...
                                  </div>
                                )}

                                {!ticketData.loading && ticketData.error && (
                                  <div className="admin-message" style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: styles.bgSecondary, borderRadius: '4px', border: `1px solid ${styles.border}`, color: styles.textSecondary }}>
                                    {ticketData.error.toLowerCase().includes('no game pass') || ticketData.error.toLowerCase().includes('not found') ? (
                                      <>Player has no game pass yet. You can add tickets below; this will create a game pass for them.</>
                                    ) : (
                                      <><strong>Note:</strong> {ticketData.error}</>
                                    )}
                                  </div>
                                )}

                                {!ticketData.loading && !ticketData.error && (
                                  <>
                                    {/* Ticket Info Table */}
                                    {ticketData.ticketInfo && ticketData.ticketInfo.length > 0 ? (
                                      <div style={{ marginBottom: '1rem' }}>
                                        <h6 style={{ marginBottom: '0.5rem', color: styles.text, fontSize: '0.9rem' }}>
                                          Ticket Details ({ticketData.ticketInfo.length} tickets)
                                        </h6>
                                        <div style={{ maxHeight: '200px', overflowY: 'auto', border: `1px solid ${styles.border}`, borderRadius: '4px' }}>
                                          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                            <thead>
                                              <tr style={{ borderBottom: `2px solid ${styles.border}`, backgroundColor: styles.bgSecondary }}>
                                                <th style={{ position: 'sticky', top: 0, zIndex: 1, padding: '0.5rem', textAlign: 'left', color: styles.text, fontSize: '0.85rem', backgroundColor: styles.bgSecondary }}>Ticket #</th>
                                                <th style={{ position: 'sticky', top: 0, zIndex: 1, padding: '0.5rem', textAlign: 'center', color: styles.text, fontSize: '0.85rem', backgroundColor: styles.bgSecondary }}>Value ($)</th>
                                                <th style={{ position: 'sticky', top: 0, zIndex: 1, padding: '0.5rem', textAlign: 'center', color: styles.text, fontSize: '0.85rem', backgroundColor: styles.bgSecondary }}>Purchased</th>
                                                <th style={{ position: 'sticky', top: 0, zIndex: 1, padding: '0.5rem', textAlign: 'center', color: styles.text, fontSize: '0.85rem', backgroundColor: styles.bgSecondary }}>Actions</th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {[...ticketData.ticketInfo].sort((a, b) => a.ticketId - b.ticketId).map((ticket) => {
                                                const isRemoving = ops.removing && ops.removingTicketId === ticket.ticketId;
                                                return (
                                                  <tr key={ticket.ticketId} style={{ borderBottom: `1px solid ${styles.border}` }}>
                                                    <td style={{ padding: '0.5rem', color: styles.text, fontWeight: 'bold', fontSize: '0.85rem' }}>{ticket.ticketId}</td>
                                                    <td style={{ padding: '0.5rem', textAlign: 'center', color: styles.text, fontSize: '0.85rem' }}>
                                                      ${(ticket.valuePaidUsdCents / 100).toFixed(2)}
                                                    </td>
                                                    <td style={{ padding: '0.5rem', textAlign: 'center', color: styles.textSecondary, fontSize: '0.85rem' }}>
                                                      {new Date(ticket.purchasedAt).toLocaleString()}
                                                    </td>
                                                    <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                                                      <button
                                                        type="button"
                                                        onClick={() => handleRemoveTicket(address, ticket.ticketId)}
                                                        disabled={ops.removing}
                                                        className="admin-button-small admin-button-danger"
                                                        style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                                                      >
                                                        {isRemoving ? 'Removing...' : '➖ Remove'}
                                                      </button>
                                                    </td>
                                                  </tr>
                                                );
                                              })}
                                            </tbody>
                                          </table>
                                        </div>
                                      </div>
                                    ) : (
                                      <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: styles.bgSecondary, borderRadius: '4px', border: `1px solid ${styles.border}`, fontSize: '0.9rem', color: styles.textSecondary }}>
                                        No ticket details loaded. Click &quot;Refresh Ticket Data&quot; below to try again.
                                      </div>
                                    )}

                                    {ops.removeResult && (
                                      <div style={{ marginBottom: '1rem', padding: '0.5rem', borderRadius: '4px', fontSize: '0.85rem', backgroundColor: ops.removeResult.success ? styles.bgSuccess : styles.bgError, border: `1px solid ${ops.removeResult.success ? styles.borderSuccess : styles.borderError}` }}>
                                        {ops.removeResult.success ? (
                                          <span style={{ color: styles.text }}>✅ Removed successfully</span>
                                        ) : (
                                          <span style={{ color: styles.textError }}>❌ {ops.removeResult.error}</span>
                                        )}
                                      </div>
                                    )}
                                  </>
                                )}

                                {/* Add Tickets form: show when not loading (even if no pass / error) so admin can add tickets and create pass */}
                                {!ticketData.loading && (
                                  <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: styles.bgSecondary, borderRadius: '4px', border: `1px solid ${styles.border}` }}>
                                    <h6 style={{ marginTop: 0, marginBottom: '0.75rem', color: styles.text, fontSize: '0.9rem' }}>Add Tickets</h6>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '0.5rem', alignItems: 'end', marginBottom: '0.5rem' }}>
                                      <div>
                                        <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem', color: styles.textSecondary }}>Quantity:</label>
                                        <input
                                          type="number"
                                          min="1"
                                          value={ops.addQuantity}
                                          onChange={(e) => setTicketOperations(prev => ({
                                            ...prev,
                                            [address]: { ...ops, addQuantity: parseInt(e.target.value) || 1 }
                                          }))}
                                          className="admin-input-compact"
                                          style={{ width: '100%' }}
                                        />
                                      </div>
                                      <div>
                                        <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem', color: styles.textSecondary }}>Value (USD cents):</label>
                                        <input
                                          type="number"
                                          min="0"
                                          value={ops.addValue}
                                          onChange={(e) => setTicketOperations(prev => ({
                                            ...prev,
                                            [address]: { ...ops, addValue: parseInt(e.target.value) || 0 }
                                          }))}
                                          placeholder="0 for free"
                                          className="admin-input-compact"
                                          style={{ width: '100%' }}
                                        />
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => handleAddTickets(address)}
                                        disabled={ops.adding || ops.addQuantity <= 0}
                                        className="admin-button-small admin-button-success"
                                      >
                                        {ops.adding ? 'Adding...' : '➕ Add'}
                                      </button>
                                    </div>
                                    {ops.addResult && (
                                      <div style={{ marginTop: '0.5rem', padding: '0.5rem', borderRadius: '4px', fontSize: '0.85rem', backgroundColor: ops.addResult.success ? styles.bgSuccess : styles.bgError, border: `1px solid ${ops.addResult.success ? styles.borderSuccess : styles.borderError}` }}>
                                        {ops.addResult.success ? (
                                          <span style={{ color: styles.text }}>
                                            ✅ Added successfully
                                            {ops.addResult.digest && <><br />Tx: <CopyableAddress value={ops.addResult.digest} styles={styles} compact /></>}
                                            {ops.addResult.ticketCountAfter !== undefined && (
                                              <><br />Ticket count after add: <strong>{ops.addResult.ticketCountAfter}</strong>{ops.addResult.ticketCountAfter === 0 ? ' (display may not be updating)' : ''}</>
                                            )}
                                          </span>
                                        ) : (
                                          <span style={{ color: styles.textError }}>❌ {ops.addResult.error}</span>
                                        )}
                                      </div>
                                    )}
                                    {ops.removeResult && (
                                      <div style={{ marginTop: '0.5rem', padding: '0.5rem', borderRadius: '4px', fontSize: '0.85rem', backgroundColor: ops.removeResult.success ? styles.bgSuccess : styles.bgError, border: `1px solid ${ops.removeResult.success ? styles.borderSuccess : styles.borderError}` }}>
                                        {ops.removeResult.success ? (
                                          <span style={{ color: styles.text }}>✅ Removed successfully</span>
                                        ) : (
                                          <span style={{ color: styles.textError }}>❌ {ops.removeResult.error}</span>
                                        )}
                                      </div>
                                    )}
                                    <div style={{ marginTop: '0.75rem' }}>
                                      <button
                                        type="button"
                                        onClick={() => refreshWalletTicketData(address)}
                                        className="admin-button-small"
                                        style={{ fontSize: '0.85rem' }}
                                      >
                                        🔄 Refresh Ticket Data
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                  })}
                </div>
              </div>
            );
          })()}
        </div>
  );
}
