// ==========================================
// Admin Page - Game Pass Management Tab
// Full control over Game Passes for individual users and all users
// ==========================================

'use client';

import { useState } from 'react';
import { AdminStyles } from '../types';
import { getApiUrl } from '../utils/get-api-url';
import { discoverWallets } from '../utils/wallet-discovery';

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

export function GamePassManagementTab({ isAdminWalletConnected, connectedAddress, adminAddress, styles }: GamePassManagementTabProps) {
  // Discover wallets
  const [discoveredWallets, setDiscoveredWallets] = useState<string[]>([]);
  const [discoveringWallets, setDiscoveringWallets] = useState(false);
  
  // Search state
  const [searchAddress, setSearchAddress] = useState('');
  const [searchingWallet, setSearchingWallet] = useState(false);
  
  // Expanded wallets (Set of addresses)
  const [expandedWallets, setExpandedWallets] = useState<Set<string>>(new Set());
  
  // Wallet game pass cache (address -> game pass data)
  const [walletGamePasses, setWalletGamePasses] = useState<Record<string, { gamePass: GamePassStatus | null; loading: boolean; error: string | null }>>({});
  
  // Credit management state
  const [creditAmounts, setCreditAmounts] = useState<Record<string, { add: number; set: number; remove: number }>>({});
  const [creditOperations, setCreditOperations] = useState<Record<string, { type: 'add' | 'set' | 'remove'; loading: boolean; result: { success: boolean; digest?: string; error?: string } | null }>>({});

  // Ticket management state
  interface TicketInfo {
    ticketId: number;
    valuePaidUsdCents: number;
    purchasedAt: number;
  }
  const [walletTicketData, setWalletTicketData] = useState<Record<string, {
    verification: {
      ticketCountField?: number;
      actualTicketCount?: number;
      isAccurate?: boolean;
      discrepancy?: number;
    } | null;
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
    addResult: { success: boolean; digest?: string; error?: string } | null;
    removeResult: { success: boolean; digest?: string; error?: string } | null;
  }>>({});

  // Discover wallets
  const handleDiscoverWallets = async () => {
    setDiscoveringWallets(true);
    setDiscoveredWallets([]);
    setExpandedWallets(new Set());
    setWalletGamePasses({});

    const result = await discoverWallets({
      type: 'game-pass',
      isAdminWalletConnected,
      connectedAddress,
      adminAddress,
    });

    if (result.success && result.wallets) {
      setDiscoveredWallets(result.wallets);
      if (result.wallets.length === 0) {
        alert('No wallets with game passes found.');
      }
    } else {
      alert(result.error || 'Failed to discover wallets');
    }

    setDiscoveringWallets(false);
  };

  // Toggle wallet expansion
  const toggleWalletExpansion = (address: string) => {
    const newExpanded = new Set(expandedWallets);
    if (newExpanded.has(address)) {
      newExpanded.delete(address);
    } else {
      newExpanded.add(address);
      // Load game pass if not already loaded
      if (!walletGamePasses[address] || walletGamePasses[address].gamePass === null) {
        refreshWalletGamePass(address);
      }
      // Load ticket data if not already loaded
      if (!walletTicketData[address] || walletTicketData[address].ticketInfo === null) {
        refreshWalletTicketData(address);
      }
      // Initialize ticket operations
      initializeTicketOperations(address);
    }
    setExpandedWallets(newExpanded);
  };

  // Load game pass for a specific wallet
  const refreshWalletGamePass = async (address: string) => {
    setWalletGamePasses(prev => ({
      ...prev,
      [address]: { gamePass: null, loading: true, error: null }
    }));

    try {
      const response = await fetch(getApiUrl(`api/game-pass/${address}`));
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

  // Credit management functions
  const handleAddCredits = async (address: string) => {
    const amount = creditAmounts[address]?.add || 1;
    setCreditOperations(prev => ({ ...prev, [address]: { type: 'add', loading: true, result: null } }));

    try {
      const response = await fetch(getApiUrl('api/admin/credits/add'), {
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
      const response = await fetch(getApiUrl('api/admin/credits/set'), {
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
        setCreditOperations(prev => ({ ...prev, [address]: { type: 'set', loading: false, result: { success: true, digest: data.digest } } }));
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
      const response = await fetch(getApiUrl('api/admin/credits/remove'), {
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
        setCreditOperations(prev => ({ ...prev, [address]: { type: 'remove', loading: false, result: { success: true, digest: data.digest } } }));
        await refreshWalletGamePass(address);
      } else {
        setCreditOperations(prev => ({ ...prev, [address]: { type: 'remove', loading: false, result: { success: false, error: data.error || 'Failed to remove credits' } } }));
      }
    } catch (error) {
      setCreditOperations(prev => ({ ...prev, [address]: { type: 'remove', loading: false, result: { success: false, error: error instanceof Error ? error.message : 'Network error' } } }));
    }
  };

  // Ticket management functions
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
      [address]: { ...prev[address], loading: true, error: null }
    }));

    try {
      // Verify ticket count
      const verifyResponse = await fetch(getApiUrl('api/admin/tournaments/verify-tickets'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerAddress: address }),
      });
      const verifyData = await verifyResponse.json();

      // Load ticket info
      const infoResponse = await fetch(getApiUrl('api/admin/tournaments/ticket-info'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerAddress: address }),
      });
      const infoData = await infoResponse.json();

      setWalletTicketData(prev => ({
        ...prev,
        [address]: {
          verification: verifyData.success ? verifyData.verification : null,
          ticketInfo: infoData.success ? infoData.tickets : null,
          loading: false,
          error: verifyData.error || infoData.error || null,
        }
      }));
    } catch (error) {
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
      const response = await fetch(getApiUrl('api/admin/tournaments/add-tickets'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerAddress: address,
          quantity: ops.addQuantity,
          valuePerTicketUsdCents: ops.addValue,
        }),
      });

      const data = await response.json();
      setTicketOperations(prev => ({
        ...prev,
        [address]: {
          ...prev[address],
          adding: false,
          addResult: data.success ? { success: true, digest: data.digest } : { success: false, error: data.error || 'Failed to add tickets' }
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
      const response = await fetch(getApiUrl('api/admin/tournaments/remove-ticket'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerAddress: address,
          ticketId: ticketId,
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
  const handleSearchWallet = async () => {
    if (!searchAddress || !searchAddress.trim()) {
      return;
    }

    const address = searchAddress.trim().toLowerCase();

    // If wallets are already discovered, just filter and focus
    if (discoveredWallets.length > 0) {
      const found = discoveredWallets.find(w => w.toLowerCase() === address);
      if (found) {
        // Expand the wallet if found
        const newExpanded = new Set(expandedWallets);
        newExpanded.add(found);
        setExpandedWallets(newExpanded);
        
        // Load game pass if not already loaded
        if (!walletGamePasses[found] || walletGamePasses[found].gamePass === null) {
          refreshWalletGamePass(found);
        }
      } else {
        alert('Wallet not found in discovered wallets. Please discover wallets first or check the address.');
      }
      return;
    }

    // If no wallets discovered, search for this specific wallet
    setSearchingWallet(true);
    
    try {
      // Check if wallet has a game pass
      const response = await fetch(getApiUrl(`api/game-pass/${address}`));
      const data = await response.json();

      if (response.ok && data.success) {
        // Wallet has a game pass, add it to discovered wallets
        setDiscoveredWallets([address]);
        
        // Expand and load the wallet
        setExpandedWallets(new Set([address]));
        await refreshWalletGamePass(address);
      } else {
        alert(data.error || 'No game pass found for this wallet address.');
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Network error');
    } finally {
      setSearchingWallet(false);
    }
  };



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
      <div className="admin-section">
          <div className="admin-section-header">
            <h2 className="admin-section-title">🔍 Discover Wallets with Game Passes</h2>
          </div>
          
          {/* Search Bar */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label className="admin-label" style={{ marginBottom: '0.5rem', display: 'block' }}>
              Search Wallet Address:
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                value={searchAddress}
                onChange={(e) => setSearchAddress(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearchWallet();
                  }
                }}
                placeholder="0x..."
                className="admin-input"
                style={{ flex: 1 }}
              />
              <button
                type="button"
                onClick={handleSearchWallet}
                disabled={searchingWallet || !searchAddress.trim()}
                className="admin-button admin-button-primary"
              >
                {searchingWallet ? 'Searching...' : '🔍 Search'}
              </button>
            </div>
            {discoveredWallets.length > 0 && (
              <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: styles.textSecondary }}>
                {discoveredWallets.length} wallet(s) discovered. Search will filter and focus on matching wallet.
              </p>
            )}
          </div>

          <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <div style={{ flex: 1, height: '1px', backgroundColor: styles.border }}></div>
            <span style={{ color: styles.textSecondary, fontSize: '0.9rem', padding: '0 0.5rem' }}>OR</span>
            <div style={{ flex: 1, height: '1px', backgroundColor: styles.border }}></div>
          </div>
          
          <div style={{ marginBottom: '1.5rem' }}>
            <button
              type="button"
              onClick={handleDiscoverWallets}
              disabled={discoveringWallets}
              className="admin-button admin-button-primary"
            >
              {discoveringWallets ? 'Discovering...' : '🔍 Discover All Wallets with Game Passes'}
            </button>
          </div>

          {discoveredWallets.length > 0 && (() => {
            // Filter wallets based on search term
            const filteredWallets = searchAddress.trim()
              ? discoveredWallets.filter(w => w.toLowerCase().includes(searchAddress.trim().toLowerCase()))
              : discoveredWallets;
            
            return (
              <div>
                <p style={{ marginBottom: '0.5rem', color: styles.textSecondary }}>
                  {searchAddress.trim() 
                    ? `Found ${filteredWallets.length} wallet(s) matching "${searchAddress}" (${discoveredWallets.length} total):`
                    : `Found ${discoveredWallets.length} wallet(s) with game passes:`
                  }
                </p>
                {filteredWallets.length === 0 && searchAddress.trim() && (
                  <div style={{ 
                    padding: '1rem', 
                    backgroundColor: styles.bgWarning, 
                    borderRadius: '4px', 
                    border: `1px solid ${styles.border}`,
                    marginBottom: '0.5rem',
                    color: styles.text
                  }}>
                    No wallets found matching "{searchAddress}". Try a different search term or discover all wallets.
                  </div>
                )}
                <div>
                  {filteredWallets.map((address, index) => {
                  const isExpanded = expandedWallets.has(address);
                  const walletData = walletGamePasses[address] || { gamePass: null, loading: false, error: null };
                  
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

                          {walletData.gamePass && !walletData.loading && (
                            <div>
                              <h4 style={{ marginTop: 0, marginBottom: '1rem', color: styles.text }}>
                                Game Pass for {walletData.gamePass.address.slice(0, 10)}...{walletData.gamePass.address.slice(-8)}
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

                              {/* Credit Management */}
                              <div style={{ marginBottom: '1.5rem' }}>
                                <h5 style={{ color: styles.text, marginBottom: '0.75rem', fontSize: '1rem' }}>🎮 Credit Management</h5>
                                <div className="admin-grid-3">
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
                                        className="admin-input-compact"
                                        style={{ width: '80px' }}
                                      />
                                      <button
                                        type="button"
                                        onClick={() => handleAddCredits(address)}
                                        disabled={creditOperations[address]?.loading}
                                        className="admin-button-small admin-button-success"
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
                                        className="admin-input-compact"
                                        style={{ width: '80px' }}
                                      />
                                      <button
                                        type="button"
                                        onClick={() => handleSetCredits(address)}
                                        disabled={creditOperations[address]?.loading}
                                        className="admin-button-small admin-button-primary"
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
                                        className="admin-input-compact"
                                        style={{ width: '80px' }}
                                      />
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveCredits(address)}
                                        disabled={creditOperations[address]?.loading}
                                        className="admin-button-small admin-button-danger"
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

                              {/* Ticket Management */}
                              <div style={{ marginBottom: '1.5rem' }}>
                                <h5 style={{ color: styles.text, marginBottom: '0.75rem', fontSize: '1rem' }}>🎫 Ticket Management</h5>
                                
                                {(() => {
                                  const ticketData = walletTicketData[address] || { verification: null, ticketInfo: null, loading: false, error: null };
                                  const ops = getTicketOperations(address);
                                  
                                  return (
                                    <div>
                                      {/* Ticket Verification */}
                                      {ticketData.verification && (
                                        <div style={{ marginBottom: '1rem' }}>
                                          {ticketData.verification.isAccurate ? (
                                            <div style={{ padding: '0.75rem', backgroundColor: styles.bgSuccess, borderRadius: '4px', border: `1px solid ${styles.borderSuccess}` }}>
                                              <strong style={{ color: styles.text }}>✅ Ticket Count is Accurate</strong>
                                              <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: styles.textSecondary }}>
                                                <div>Field Count: {ticketData.verification.ticketCountField}</div>
                                                <div>Actual Count: {ticketData.verification.actualTicketCount}</div>
                                              </div>
                                            </div>
                                          ) : (
                                            <div style={{ padding: '0.75rem', backgroundColor: styles.bgError, borderRadius: '4px', border: `1px solid ${styles.borderError}` }}>
                                              <strong style={{ color: styles.text }}>⚠️ Ticket Count Discrepancy Detected</strong>
                                              <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: styles.textSecondary }}>
                                                <div>Field Count: {ticketData.verification.ticketCountField}</div>
                                                <div>Actual Count: {ticketData.verification.actualTicketCount}</div>
                                                <div style={{ marginTop: '0.5rem', fontWeight: 'bold', color: styles.textError }}>
                                                  Discrepancy: {ticketData.verification.discrepancy !== undefined && ticketData.verification.discrepancy > 0 ? '+' : ''}{ticketData.verification.discrepancy}
                                                </div>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      )}

                                      {/* Ticket Info Table */}
                                      {ticketData.ticketInfo && ticketData.ticketInfo.length > 0 && (
                                        <div style={{ marginBottom: '1rem' }}>
                                          <h6 style={{ marginBottom: '0.5rem', color: styles.text, fontSize: '0.9rem' }}>Ticket Details ({ticketData.ticketInfo.length} tickets)</h6>
                                          <div style={{ maxHeight: '200px', overflowY: 'auto', border: `1px solid ${styles.border}`, borderRadius: '4px' }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                              <thead>
                                                <tr style={{ borderBottom: `2px solid ${styles.border}`, backgroundColor: styles.bgSecondary }}>
                                                  <th style={{ padding: '0.5rem', textAlign: 'left', color: styles.text, fontSize: '0.85rem' }}>Ticket ID</th>
                                                  <th style={{ padding: '0.5rem', textAlign: 'center', color: styles.text, fontSize: '0.85rem' }}>Value (USD)</th>
                                                  <th style={{ padding: '0.5rem', textAlign: 'center', color: styles.text, fontSize: '0.85rem' }}>Purchased</th>
                                                  <th style={{ padding: '0.5rem', textAlign: 'center', color: styles.text, fontSize: '0.85rem' }}>Actions</th>
                                                </tr>
                                              </thead>
                                              <tbody>
                                                {ticketData.ticketInfo.map((ticket) => {
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
                                      )}

                                      {/* Ticket Operations */}
                                      <div style={{ padding: '1rem', backgroundColor: styles.bgSecondary, borderRadius: '4px', border: `1px solid ${styles.border}` }}>
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
                                              <span style={{ color: styles.text }}>✅ Added successfully</span>
                                            ) : (
                                              <span style={{ color: styles.textError }}>❌ {ops.addResult.error}</span>
                                            )}
                                          </div>
                                        )}
                                        
                                        {/* Quick Actions */}
                                        <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                          <button
                                            type="button"
                                            onClick={() => refreshWalletTicketData(address)}
                                            className="admin-button-small"
                                            style={{ fontSize: '0.85rem' }}
                                          >
                                            🔄 Refresh Ticket Data
                                          </button>
                                          {ticketData.verification && !ticketData.verification.isAccurate && ticketData.verification.actualTicketCount !== undefined && (
                                            <button
                                              type="button"
                                              onClick={async () => {
                                                if (!ticketData.verification || !confirm(`Fix ticket count to ${ticketData.verification.actualTicketCount}? This will update the ticket_count field to match the actual tickets in the table.`)) {
                                                  return;
                                                }
                                                try {
                                                  const response = await fetch(getApiUrl('api/admin/tournaments/fix-tickets'), {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({
                                                      playerAddress: address,
                                                      correctCount: ticketData.verification.actualTicketCount,
                                                    }),
                                                  });
                                                  const fixData = await response.json();
                                                  if (fixData.success) {
                                                    await refreshWalletTicketData(address);
                                                    await refreshWalletGamePass(address);
                                                    alert('Ticket count fixed successfully!');
                                                  } else {
                                                    alert(fixData.error || 'Failed to fix ticket count');
                                                  }
                                                } catch (error) {
                                                  alert(error instanceof Error ? error.message : 'Unknown error');
                                                }
                                              }}
                                              className="admin-button-small admin-button-success"
                                              style={{ fontSize: '0.85rem' }}
                                            >
                                              🔧 Fix Count
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })()}
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
    </div>
  );
}

