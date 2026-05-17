// ==========================================
// Admin Page - Reusable Ticket Management Component
// Used in both TournamentsTab and GamePassManagementTab
// ==========================================

'use client';

import { useState } from 'react';
import { AdminStyles } from '../types';
import { getApiUrl } from '../utils/get-api-url';
import { useWalletDiscovery } from '../hooks/useWalletDiscovery';
import { WalletDiscoveryUI } from './WalletDiscoveryUI';
import { WalletList } from './WalletList';

interface TicketManagementProps {
  isAdminWalletConnected: boolean;
  connectedAddress: string | null;
  adminAddress: string | null;
  styles: AdminStyles;
  title?: string; // Optional custom title
  onAddressSelect?: (address: string) => void; // Callback when address is selected
}

interface TicketInfo {
  ticketId: number;
  valuePaidUsdCents: number;
  purchasedAt: number;
}

export function TicketManagement({
  isAdminWalletConnected,
  connectedAddress,
  adminAddress,
  styles,
  title = 'Tournament Ticket Management',
  onAddressSelect,
}: TicketManagementProps) {
  // Wallet ticket data cache (address -> ticket data)
  const [walletTicketData, setWalletTicketData] = useState<Record<string, {
    ticketInfo: TicketInfo[] | null;
    loading: boolean;
    error: string | null;
  }>>({});

  // Ticket operations state (per wallet)
  const [ticketOperations, setTicketOperations] = useState<Record<string, {
    addQuantity: number;
    addValue: number;
    removingTicketId: number | null; // Track which ticket is being removed
    adding: boolean;
    removing: boolean;
    addResult: { success: boolean; digest?: string; error?: string } | null;
    removeResult: { success: boolean; digest?: string; error?: string } | null;
  }>>({});

  // Ticket lookup by ID (for manual lookup)
  const [lookupTicketId, setLookupTicketId] = useState<string>('');
  const [lookupTicketInfo, setLookupTicketInfo] = useState<TicketInfo[] | null>(null);
  const [loadingLookupTicketInfo, setLoadingLookupTicketInfo] = useState(false);

  // Check if wallet has game pass (tickets)
  const checkWalletExists = async (address: string): Promise<boolean> => {
    try {
      const response = await fetch(getApiUrl(`api/game-pass/${address}`));
      const data = await response.json();
      return response.ok && data.success && (data.ticketCount > 0 || data.hasPass);
    } catch {
      return false;
    }
  };

  // Refresh ticket data for a specific wallet
  const refreshWalletTicketData = async (address: string) => {
    setWalletTicketData(prev => ({
      ...prev,
      [address]: { ...prev[address], loading: true, error: null }
    }));

    try {
      const infoResponse = await fetch(getApiUrl('api/admin/tournaments/ticket-info'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerAddress: address }),
      });
      const infoData = await infoResponse.json();

      setWalletTicketData(prev => ({
        ...prev,
        [address]: {
          ticketInfo: infoData.success ? (infoData.tickets || []) : null,
          loading: false,
          error: null
        }
      }));
    } catch (error) {
      setWalletTicketData(prev => ({
        ...prev,
        [address]: {
          ...prev[address],
          loading: false,
          error: error instanceof Error ? error.message : 'Network error'
        }
      }));
    }
  };

  // Use wallet discovery hook
  const walletDiscovery = useWalletDiscovery({
    isAdminWalletConnected,
    connectedAddress,
    adminAddress,
    discoveryType: 'game-pass',
    checkWalletExists,
    onWalletsDiscovered: () => {
      setWalletTicketData({}); // Clear cached data on new discovery
    },
    onWalletExpanded: (address) => {
      // Initialize ticket operations when wallet is expanded
      initializeTicketOperations(address);
      // Load ticket data if not already loaded
      if (!walletTicketData[address]) {
        refreshWalletTicketData(address);
      }
    },
  });

  // Toggle wallet expansion with data loading
  const toggleWalletExpansion = (address: string) => {
    walletDiscovery.toggleWalletExpansion(address);
    // Initialize ticket operations when wallet is expanded
    initializeTicketOperations(address);
    // Load ticket data if not already loaded
    if (!walletTicketData[address]) {
      refreshWalletTicketData(address);
    }
  };

  // Get ticket operations for a wallet (returns default if not initialized)
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

  // Initialize ticket operations for a wallet (call this when wallet is expanded)
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


  // Add tickets for a specific wallet
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
        // Refresh wallet data
        await refreshWalletTicketData(address);
        // Reset form
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


  // Load ticket info by ticket ID (for manual lookup)
  const handleLookupTicketById = async () => {
    if (!lookupTicketId.trim()) {
      alert('Please enter a ticket ID');
      return;
    }

    setLoadingLookupTicketInfo(true);
    setLookupTicketInfo(null);

    try {
      const response = await fetch(getApiUrl('api/admin/tournaments/ticket-info'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId: parseInt(lookupTicketId) }),
      });

      const data = await response.json();
      if (data.success) {
        setLookupTicketInfo(data.tickets || []);
      } else {
        alert(data.error || 'Failed to load ticket info');
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoadingLookupTicketInfo(false);
    }
  };

  // Handle address selection from discovered wallets (for external use)
  const handleAddressClick = (address: string) => {
    navigator.clipboard.writeText(address);
    if (onAddressSelect) {
      onAddressSelect(address);
    }
  };

  return (
    <div style={{ padding: '1.5rem', backgroundColor: styles.bgSecondary, borderRadius: '8px', border: `1px solid ${styles.border}` }}>
      <h2 style={{ marginBottom: '1.5rem', color: styles.text, fontSize: '1.5rem' }}>🎫 {title}</h2>
      
      {/* Wallet Discovery Section */}
      <div style={{ padding: '1rem', backgroundColor: styles.bgTertiary, borderRadius: '4px', border: `1px solid ${styles.border}`, marginBottom: '2rem' }}>
        <WalletDiscoveryUI
          styles={styles}
          title="🔍 Discover Wallets with Game Passes (Tickets)"
          discoverButtonText="🔍 Discover All Wallets with Game Passes"
          searchAddress={walletDiscovery.searchAddress}
          setSearchAddress={walletDiscovery.setSearchAddress}
          onSearch={walletDiscovery.handleSearchWallet}
          onDiscover={walletDiscovery.handleDiscoverWallets}
          searchingWallet={walletDiscovery.searchingWallet}
          discoveringWallets={walletDiscovery.discoveringWallets}
          discoveredWalletsCount={walletDiscovery.discoveredWallets.length}
        />

        <WalletList
          styles={styles}
          wallets={walletDiscovery.discoveredWallets}
          filteredWallets={walletDiscovery.filteredWallets}
          searchAddress={walletDiscovery.searchAddress}
          expandedWallets={walletDiscovery.expandedWallets}
          onToggleExpansion={toggleWalletExpansion}
          getWalletData={(address) => walletTicketData[address] || { ticketInfo: null, loading: false, error: null }}
          renderWalletContent={(address, isExpanded, walletData) => {
            const data = walletData as { ticketInfo: TicketInfo[] | null; loading: boolean; error: string | null };

            if (data.loading) {
              return <div style={{ color: styles.textSecondary }}>Loading ticket data...</div>;
            }

            if (data.error) {
              return <div style={{ color: styles.textError }}>Error: {data.error}</div>;
            }

            return (
              <div>
                {/* Ticket Info */}
                {data.ticketInfo && data.ticketInfo.length > 0 && (
                  <div>
                    <h4 style={{ marginBottom: '0.5rem', color: styles.text }}>Ticket Details ({data.ticketInfo.length} tickets)</h4>
                    <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ borderBottom: `2px solid ${styles.border}`, backgroundColor: styles.bgSecondary }}>
                            <th style={{ position: 'sticky', top: 0, zIndex: 1, padding: '0.5rem', textAlign: 'left', color: styles.text, backgroundColor: styles.bgSecondary }}>Ticket ID</th>
                            <th style={{ position: 'sticky', top: 0, zIndex: 1, padding: '0.5rem', textAlign: 'center', color: styles.text, backgroundColor: styles.bgSecondary }}>Value Paid (USD cents)</th>
                            <th style={{ position: 'sticky', top: 0, zIndex: 1, padding: '0.5rem', textAlign: 'center', color: styles.text, backgroundColor: styles.bgSecondary }}>Purchased At</th>
                            <th style={{ position: 'sticky', top: 0, zIndex: 1, padding: '0.5rem', textAlign: 'center', color: styles.text, backgroundColor: styles.bgSecondary }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...data.ticketInfo].sort((a, b) => a.ticketId - b.ticketId).map((ticket) => {
                            const ops = getTicketOperations(address);
                            const isRemoving = ops.removing && ops.removingTicketId === ticket.ticketId;
                            
                            return (
                              <tr key={ticket.ticketId} style={{ borderBottom: `1px solid ${styles.border}` }}>
                                <td style={{ padding: '0.5rem', color: styles.text, fontWeight: 'bold' }}>{ticket.ticketId}</td>
                                <td style={{ padding: '0.5rem', textAlign: 'center', color: styles.text }}>
                                  ${(ticket.valuePaidUsdCents / 100).toFixed(2)}
                                </td>
                                <td style={{ padding: '0.5rem', textAlign: 'center', color: styles.textSecondary }}>
                                  {new Date(ticket.purchasedAt).toLocaleString()}
                                </td>
                                <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      if (!confirm(`Remove ticket ${ticket.ticketId} from ${address.substring(0, 10)}...?`)) {
                                        return;
                                      }
                                      
                                      setTicketOperations(prev => ({
                                        ...prev,
                                        [address]: { ...getTicketOperations(address), removing: true, removingTicketId: ticket.ticketId, removeResult: null }
                                      }));

                                      try {
                                        const response = await fetch(getApiUrl('api/admin/tournaments/remove-ticket'), {
                                          method: 'POST',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({
                                            playerAddress: address,
                                            ticketId: ticket.ticketId,
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
                                          // Refresh wallet data
                                          await refreshWalletTicketData(address);
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
                                    }}
                                    disabled={ops.removing}
                                    style={{
                                      padding: '0.25rem 0.75rem',
                                      backgroundColor: ops.removing ? styles.buttonDisabled : '#f44336',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '4px',
                                      cursor: ops.removing ? 'not-allowed' : 'pointer',
                                      fontWeight: 'bold',
                                      fontSize: '0.85rem',
                                    }}
                                    title={`Remove ticket ${ticket.ticketId}`}
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
                <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: styles.bgSecondary, borderRadius: '4px', border: `1px solid ${styles.border}` }}>
                  <h4 style={{ marginTop: 0, marginBottom: '1rem', color: styles.text }}>Ticket Operations</h4>
                  
                  {/* Add Tickets */}
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: styles.text, fontSize: '0.9rem' }}>
                      Add Tickets:
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '0.5rem', alignItems: 'end' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem', color: styles.textSecondary }}>Quantity:</label>
                        <input
                          type="number"
                          min="1"
                          value={getTicketOperations(address).addQuantity}
                          onChange={(e) => setTicketOperations(prev => ({
                            ...prev,
                            [address]: { ...getTicketOperations(address), addQuantity: parseInt(e.target.value) || 1 }
                          }))}
                          style={{
                            width: '100%',
                            padding: '0.5rem',
                            border: `1px solid ${styles.border}`,
                            borderRadius: '4px',
                            backgroundColor: styles.inputBg,
                            color: styles.text,
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem', color: styles.textSecondary }}>Value (USD cents):</label>
                        <input
                          type="number"
                          min="0"
                          value={getTicketOperations(address).addValue}
                          onChange={(e) => setTicketOperations(prev => ({
                            ...prev,
                            [address]: { ...getTicketOperations(address), addValue: parseInt(e.target.value) || 0 }
                          }))}
                          placeholder="0 for free"
                          style={{
                            width: '100%',
                            padding: '0.5rem',
                            border: `1px solid ${styles.border}`,
                            borderRadius: '4px',
                            backgroundColor: styles.inputBg,
                            color: styles.text,
                          }}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAddTickets(address)}
                        disabled={getTicketOperations(address).adding || getTicketOperations(address).addQuantity <= 0}
                        style={{
                          padding: '0.5rem 1rem',
                          backgroundColor: (getTicketOperations(address).adding || getTicketOperations(address).addQuantity <= 0) ? styles.buttonDisabled : '#4CAF50',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: (getTicketOperations(address).adding || getTicketOperations(address).addQuantity <= 0) ? 'not-allowed' : 'pointer',
                          fontWeight: 'bold',
                          fontSize: '0.85rem',
                        }}
                      >
                        {getTicketOperations(address).adding ? 'Adding...' : '➕ Add'}
                      </button>
                    </div>
                    {(() => {
                      const ops = getTicketOperations(address);
                      const addResult = ops.addResult;
                      return addResult && (
                        <div style={{ marginTop: '0.5rem', padding: '0.5rem', borderRadius: '4px', fontSize: '0.85rem', backgroundColor: addResult.success ? styles.bgSuccess : styles.bgError, border: `1px solid ${addResult.success ? styles.borderSuccess : styles.borderError}` }}>
                          {addResult.success ? (
                            <span style={{ color: styles.text }}>✅ Added successfully</span>
                          ) : (
                            <span style={{ color: styles.textError }}>❌ {addResult.error}</span>
                          )}
                        </div>
                      );
                    })()}
                  </div>


                  {/* Quick Actions */}
                  <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => refreshWalletTicketData(address)}
                      style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: styles.buttonPrimary,
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                      }}
                    >
                      🔄 Refresh
                    </button>
                  </div>
                </div>
              </div>
            );
          }}
        />
      </div>
      

      {/* Lookup Ticket by ID Section */}
      <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: styles.bgTertiary, borderRadius: '4px', border: `1px solid ${styles.border}` }}>
        <h3 style={{ marginBottom: '1rem', color: styles.text, fontSize: '1.2rem' }}>🔍 Lookup Ticket by ID</h3>
        <p style={{ marginBottom: '1rem', fontSize: '0.9rem', color: styles.textSecondary }}>
          Find ticket information by ticket ID (useful when you only have the ticket ID).
        </p>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem', alignItems: 'end', marginBottom: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: styles.text }}>
              Ticket ID:
            </label>
            <input
              type="text"
              value={lookupTicketId}
              onChange={(e) => setLookupTicketId(e.target.value)}
              placeholder="Enter ticket ID"
              style={{
                width: '100%',
                padding: '0.5rem',
                border: `1px solid ${styles.border}`,
                borderRadius: '4px',
                backgroundColor: styles.inputBg,
                color: styles.text,
              }}
            />
          </div>
          <button
            type="button"
            onClick={handleLookupTicketById}
            disabled={loadingLookupTicketInfo || !lookupTicketId.trim()}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: loadingLookupTicketInfo || !lookupTicketId.trim() ? styles.buttonDisabled : styles.buttonPrimary,
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loadingLookupTicketInfo || !lookupTicketId.trim() ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
            }}
          >
            {loadingLookupTicketInfo ? 'Loading...' : 'Lookup'}
          </button>
        </div>

        {lookupTicketInfo && (
          <div style={{ marginTop: '1rem' }}>
            {lookupTicketInfo.length > 0 ? (
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${styles.border}` }}>
                      <th style={{ padding: '0.5rem', textAlign: 'left', color: styles.text }}>Ticket ID</th>
                      <th style={{ padding: '0.5rem', textAlign: 'center', color: styles.text }}>Value Paid (USD cents)</th>
                      <th style={{ padding: '0.5rem', textAlign: 'center', color: styles.text }}>Purchased At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lookupTicketInfo.map((ticket) => (
                      <tr key={ticket.ticketId} style={{ borderBottom: `1px solid ${styles.border}` }}>
                        <td style={{ padding: '0.5rem', color: styles.text, fontWeight: 'bold' }}>{ticket.ticketId}</td>
                        <td style={{ padding: '0.5rem', textAlign: 'center', color: styles.text }}>
                          ${(ticket.valuePaidUsdCents / 100).toFixed(2)}
                        </td>
                        <td style={{ padding: '0.5rem', textAlign: 'center', color: styles.textSecondary }}>
                          {new Date(ticket.purchasedAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: '1rem', textAlign: 'center', color: styles.textSecondary }}>
                No tickets found with that ID.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

