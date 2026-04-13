// ==========================================
// Admin Page - Reusable Credit Management Component
// Used in GamePassManagementTab
// ==========================================

'use client';

import { useState } from 'react';
import { AdminStyles } from '../types';
import { getApiUrl } from '../utils/get-api-url';
import { useWalletDiscovery } from '../hooks/useWalletDiscovery';
import { WalletDiscoveryUI } from './WalletDiscoveryUI';
import { CopyableAddress } from './CopyableAddress';

interface CreditManagementProps {
  isAdminWalletConnected: boolean;
  connectedAddress: string | null;
  adminAddress: string | null;
  styles: AdminStyles;
  title?: string; // Optional custom title
  onAddressSelect?: (address: string) => void; // Callback when address is selected
}

interface PlayerInfo {
  address: string;
  gamesRemaining: number;
  isActive: boolean;
  packType?: number;
}

export function CreditManagement({
  isAdminWalletConnected,
  connectedAddress,
  adminAddress,
  styles,
  title = 'Game Credit Management',
  onAddressSelect,
}: CreditManagementProps) {
  // Player list state
  const [playersList, setPlayersList] = useState<PlayerInfo[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);

  // Player management state
  const [creditPlayerAddress, setCreditPlayerAddress] = useState('');
  const [viewingCredits, setViewingCredits] = useState(false);
  const [creditStatus, setCreditStatus] = useState<{
    address: string;
    gamesRemaining: number;
    isActive: boolean;
    packType?: number;
  } | null>(null);

  // Add credits state
  const [addCreditAmount, setAddCreditAmount] = useState<number>(1);
  const [addingCredits, setAddingCredits] = useState(false);
  const [addCreditResult, setAddCreditResult] = useState<{ success: boolean; digest?: string; error?: string; gamesRemaining?: number } | null>(null);

  // Set credits state
  const [setCreditAmount, setSetCreditAmount] = useState<number>(0);
  const [settingCredits, setSettingCredits] = useState(false);
  const [setCreditResult, setSetCreditResult] = useState<{ success: boolean; digest?: string; error?: string; gamesRemaining?: number } | null>(null);

  // Remove credits state
  const [removeCreditAmount, setRemoveCreditAmount] = useState<number>(1);
  const [removingCredits, setRemovingCredits] = useState(false);
  const [removeCreditResult, setRemoveCreditResult] = useState<{ success: boolean; digest?: string; error?: string; gamesRemaining?: number } | null>(null);

  // Check if wallet has a game pass
  const checkWalletExists = async (address: string): Promise<boolean> => {
    try {
      const response = await fetch(getApiUrl(`api/game-pass/${address}`));
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
  });

  // Load players list
  const handleLoadPlayers = async () => {
    setLoadingPlayers(true);
    try {
      // Call game backend proxy (verifies game admin, then calls platform with API key)
      const response = await fetch(getApiUrl('api/admin/game-pass/list-players'), {
        headers: { 'X-Admin-Wallet': connectedAddress || '' },
      });
      const data = await response.json();
      if (data.success) {
        setPlayersList(data.players || []);
      } else {
        alert(data.error || 'Failed to load players');
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoadingPlayers(false);
    }
  };

  // View credits for a player
  const handleViewCredits = async () => {
    if (!creditPlayerAddress.trim()) {
      alert('Please enter a player address');
      return;
    }

    setViewingCredits(true);
    setCreditStatus(null);

    try {
      const response = await fetch(getApiUrl(`api/game-pass/${creditPlayerAddress.trim()}`));
      const data = await response.json();

      if (response.ok && data.success) {
        setCreditStatus({
          address: creditPlayerAddress.trim(),
          gamesRemaining: data.gamesRemaining || 0,
          isActive: data.isActive || false,
          packType: data.packType,
        });
      } else {
        alert(data.error || 'Failed to load credit status');
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setViewingCredits(false);
    }
  };

  // Add credits
  const handleAddCredits = async () => {
    if (!creditPlayerAddress.trim()) {
      alert('Please enter a player address');
      return;
    }
    if (addCreditAmount <= 0) {
      alert('Amount must be greater than 0');
      return;
    }

    setAddingCredits(true);
    setAddCreditResult(null);

    try {
      // Call platform backend directly for credit management
      const response = await fetch(getApiUrl('api/admin/game-pass/credits/add'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerAddress: creditPlayerAddress.trim(),
          amount: addCreditAmount,
          adminWalletAddress: adminAddress, // Include for authentication
        }),
      });

      const data = await response.json();
      setAddCreditResult(data.success ? { success: true, digest: data.digest, gamesRemaining: data.gamesRemaining } : { success: false, error: data.error || 'Failed to add credits' });
      
      if (data.success) {
        // Refresh player list and credit status
        await handleLoadPlayers();
        await handleViewCredits();
      }
    } catch (error) {
      setAddCreditResult({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setAddingCredits(false);
    }
  };

  // Set credits
  const handleSetCredits = async () => {
    if (!creditPlayerAddress.trim()) {
      alert('Please enter a player address');
      return;
    }
    if (setCreditAmount < 0) {
      alert('Amount cannot be negative');
      return;
    }

    if (!confirm(`Set credits to ${setCreditAmount} for ${creditPlayerAddress.substring(0, 10)}...?`)) {
      return;
    }

    setSettingCredits(true);
    setSetCreditResult(null);

    try {
      // Call platform backend directly for credit management
      const response = await fetch(getApiUrl('api/admin/game-pass/credits/set'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerAddress: creditPlayerAddress.trim(),
          amount: setCreditAmount, // Platform API uses 'amount' not 'targetAmount'
          adminWalletAddress: adminAddress, // Include for authentication
        }),
      });

      const data = await response.json();
      setSetCreditResult(data.success ? { success: true, digest: data.digest, gamesRemaining: data.gamesRemaining } : { success: false, error: data.error || 'Failed to set credits' });
      
      if (data.success) {
        // Refresh player list and credit status
        await handleLoadPlayers();
        await handleViewCredits();
      }
    } catch (error) {
      setSetCreditResult({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setSettingCredits(false);
    }
  };

  // Remove credits
  const handleRemoveCredits = async () => {
    if (!creditPlayerAddress.trim()) {
      alert('Please enter a player address');
      return;
    }
    if (removeCreditAmount <= 0) {
      alert('Amount must be greater than 0');
      return;
    }

    if (!confirm(`Remove ${removeCreditAmount} credit${removeCreditAmount !== 1 ? 's' : ''} from ${creditPlayerAddress.substring(0, 10)}...?`)) {
      return;
    }

    setRemovingCredits(true);
    setRemoveCreditResult(null);

    try {
      // Call platform backend directly for credit management
      const response = await fetch(getApiUrl('api/admin/game-pass/credits/remove'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerAddress: creditPlayerAddress.trim(),
          amount: removeCreditAmount,
          adminWalletAddress: adminAddress, // Include for authentication
        }),
      });

      const data = await response.json();
      setRemoveCreditResult(data.success ? { success: true, digest: data.digest, gamesRemaining: data.gamesRemaining } : { success: false, error: data.error || 'Failed to remove credits' });
      
      if (data.success) {
        // Refresh player list and credit status
        await handleLoadPlayers();
        await handleViewCredits();
      }
    } catch (error) {
      setRemoveCreditResult({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setRemovingCredits(false);
    }
  };

  // Handle address selection from discovered wallets
  const handleAddressClick = (address: string) => {
    navigator.clipboard.writeText(address);
    setCreditPlayerAddress(address);
    if (onAddressSelect) {
      onAddressSelect(address);
    }
    alert('Address copied and filled in!');
  };

  return (
    <div style={{ padding: '1.5rem', backgroundColor: styles.bgSecondary, borderRadius: '8px', border: `1px solid ${styles.border}` }}>
      <h2 style={{ marginBottom: '1.5rem', color: styles.text, fontSize: '1.5rem' }}>🎮 {title}</h2>
      
      {/* Wallet Discovery Section */}
      <div style={{ marginBottom: '2rem' }}>
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
        />
        
        {/* Display discovered wallets with click-to-copy functionality */}
        {walletDiscovery.discoveredWallets.length > 0 && (
          <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: styles.bgTertiary, borderRadius: '4px', border: `1px solid ${styles.border}` }}>
            <p style={{ marginBottom: '0.5rem', color: styles.textSecondary }}>
              Found {walletDiscovery.discoveredWallets.length} wallet(s) with game passes:
            </p>
            <div
              style={{
                maxHeight: '300px',
                overflowY: 'auto',
                padding: '1rem',
                backgroundColor: styles.bgSecondary,
                borderRadius: '4px',
                border: `1px solid ${styles.border}`,
              }}
            >
              {walletDiscovery.filteredWallets.map((address, index) => (
                <div
                  key={index}
                  style={{
                    padding: '0.5rem',
                    marginBottom: '0.25rem',
                    backgroundColor: styles.bgTertiary,
                    borderRadius: '4px',
                    fontSize: '0.9rem',
                    color: styles.text,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.5rem',
                  }}
                  onClick={() => handleAddressClick(address)}
                  title="Click row to copy and fill player address; use Copy button to only copy"
                >
                  <CopyableAddress value={address} styles={styles} compact />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Player List Section */}
      <div style={{ marginBottom: '2rem', padding: '1rem', backgroundColor: styles.bgTertiary, borderRadius: '4px', border: `1px solid ${styles.border}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ color: styles.text, fontSize: '1.2rem' }}>👥 Players with Credits</h3>
          <button
            type="button"
            onClick={handleLoadPlayers}
            disabled={loadingPlayers}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: loadingPlayers ? styles.buttonDisabled : styles.buttonPrimary,
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loadingPlayers ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
            }}
          >
            {loadingPlayers ? 'Loading...' : '🔄 Refresh List'}
          </button>
        </div>
        {playersList.length > 0 ? (
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${styles.border}` }}>
                  <th style={{ padding: '0.5rem', textAlign: 'left', color: styles.text }}>Address</th>
                  <th style={{ padding: '0.5rem', textAlign: 'center', color: styles.text }}>Credits</th>
                  <th style={{ padding: '0.5rem', textAlign: 'center', color: styles.text }}>Status</th>
                  <th style={{ padding: '0.5rem', textAlign: 'center', color: styles.text }}>Pack Type</th>
                  <th style={{ padding: '0.5rem', textAlign: 'center', color: styles.text }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {playersList.map((player) => (
                  <tr key={player.address} style={{ borderBottom: `1px solid ${styles.border}` }}>
                    <td style={{ padding: '0.5rem', fontSize: '0.85rem', color: styles.text }}>
                      <CopyableAddress value={player.address} styles={styles} compact />
                    </td>
                    <td style={{ padding: '0.5rem', textAlign: 'center', color: styles.text, fontWeight: 'bold' }}>
                      {player.gamesRemaining}
                    </td>
                    <td style={{ padding: '0.5rem', textAlign: 'center', color: player.isActive ? styles.textSuccess : styles.textSecondary }}>
                      {player.isActive ? '✅ Active' : '❌ Inactive'}
                    </td>
                    <td style={{ padding: '0.5rem', textAlign: 'center', color: styles.textSecondary }}>
                      {player.packType !== undefined ? player.packType : 'N/A'}
                    </td>
                    <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setCreditPlayerAddress(player.address);
                          if (onAddressSelect) {
                            onAddressSelect(player.address);
                          }
                          // Scroll to player management section
                          document.getElementById('credit-management')?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        style={{
                          padding: '0.25rem 0.5rem',
                          backgroundColor: styles.buttonPrimary,
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                        }}
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: '1rem', textAlign: 'center', color: styles.textSecondary }}>
            {loadingPlayers ? 'Loading players...' : 'No players with credits found. Click "Refresh List" to load.'}
          </div>
        )}
      </div>

      {/* Player Management Section */}
      <div id="credit-management" style={{ marginBottom: '2rem', padding: '1rem', backgroundColor: styles.bgTertiary, borderRadius: '4px', border: `1px solid ${styles.border}` }}>
        <h3 style={{ marginBottom: '1rem', color: styles.text, fontSize: '1.2rem' }}>👤 Player Credit Management</h3>
      
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: styles.text }}>
            Player Address:
          </label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              value={creditPlayerAddress}
              onChange={(e) => setCreditPlayerAddress(e.target.value)}
              placeholder="0x..."
              style={{
                flex: 1,
                padding: '0.75rem',
                fontSize: '1rem',
                border: `1px solid ${styles.border}`,
                borderRadius: '4px',
                backgroundColor: styles.inputBg,
                color: styles.text,
                fontFamily: 'monospace',
              }}
            />
            <button
              type="button"
              onClick={handleViewCredits}
              disabled={viewingCredits || !creditPlayerAddress.trim()}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: viewingCredits || !creditPlayerAddress.trim() ? styles.buttonDisabled : styles.buttonPrimary,
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: viewingCredits || !creditPlayerAddress.trim() ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
              }}
            >
              {viewingCredits ? 'Loading...' : 'View Credits'}
            </button>
          </div>
        </div>

        {/* Credit Status Display */}
        {creditStatus && (
          <div
            style={{
              padding: '1rem',
              borderRadius: '4px',
              backgroundColor: styles.bgSecondary,
              border: `1px solid ${styles.border}`,
              marginBottom: '1.5rem',
            }}
          >
            <h4 style={{ marginTop: 0, marginBottom: '0.5rem', color: styles.text }}>Current Credit Status</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
              <div>
                <div style={{ fontWeight: 'bold', color: styles.textSecondary, fontSize: '0.9rem' }}>Credits Remaining</div>
                <div style={{ fontSize: '1.5rem', color: styles.text, fontWeight: 'bold', marginTop: '0.25rem' }}>
                  {creditStatus.gamesRemaining}
                </div>
              </div>
              <div>
                <div style={{ fontWeight: 'bold', color: styles.textSecondary, fontSize: '0.9rem' }}>Status</div>
                <div style={{ fontSize: '1.2rem', color: creditStatus.isActive ? styles.textSuccess : styles.textSecondary, marginTop: '0.25rem' }}>
                  {creditStatus.isActive ? '✅ Active' : '❌ Inactive'}
                </div>
              </div>
              {creditStatus.packType !== undefined && (
                <div>
                  <div style={{ fontWeight: 'bold', color: styles.textSecondary, fontSize: '0.9rem' }}>Pack Type</div>
                  <div style={{ fontSize: '1.2rem', color: styles.text, marginTop: '0.25rem' }}>
                    {creditStatus.packType}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Add Credits Section */}
        <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: styles.bgSecondary, borderRadius: '4px', border: `1px solid ${styles.border}` }}>
          <h4 style={{ marginTop: 0, marginBottom: '1rem', color: styles.text }}>➕ Add Credits</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem', alignItems: 'end' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: styles.text }}>
                Amount to Add:
              </label>
              <input
                type="number"
                min="1"
                value={addCreditAmount}
                onChange={(e) => setAddCreditAmount(parseInt(e.target.value) || 1)}
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
              onClick={handleAddCredits}
              disabled={addingCredits || !creditPlayerAddress.trim() || addCreditAmount <= 0}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: addingCredits || !creditPlayerAddress.trim() || addCreditAmount <= 0 ? styles.buttonDisabled : '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: addingCredits || !creditPlayerAddress.trim() || addCreditAmount <= 0 ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
              }}
            >
              {addingCredits ? 'Adding...' : 'Add Credits'}
            </button>
          </div>
          {addCreditResult && (
            <div style={{ marginTop: '1rem', padding: '0.75rem', borderRadius: '4px', backgroundColor: addCreditResult.success ? styles.bgSuccess : styles.bgError, border: `1px solid ${addCreditResult.success ? styles.borderSuccess : styles.borderError}` }}>
              {addCreditResult.success ? (
                <div style={{ color: styles.text }}>
                  ✅ Credits added successfully! New total: {addCreditResult.gamesRemaining} {addCreditResult.digest && <> | Transaction: <CopyableAddress value={addCreditResult.digest} styles={styles} compact /></>}
                </div>
              ) : (
                <div style={{ color: styles.textError }}>❌ Error: {addCreditResult.error}</div>
              )}
            </div>
          )}
        </div>

        {/* Remove Credits Section */}
        <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: styles.bgSecondary, borderRadius: '4px', border: `1px solid ${styles.border}` }}>
          <h4 style={{ marginTop: 0, marginBottom: '1rem', color: styles.text }}>➖ Remove Credits</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem', alignItems: 'end' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: styles.text }}>
                Amount to Remove:
              </label>
              <input
                type="number"
                min="1"
                value={removeCreditAmount}
                onChange={(e) => setRemoveCreditAmount(parseInt(e.target.value) || 1)}
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
              onClick={handleRemoveCredits}
              disabled={removingCredits || !creditPlayerAddress.trim() || removeCreditAmount <= 0}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: removingCredits || !creditPlayerAddress.trim() || removeCreditAmount <= 0 ? styles.buttonDisabled : '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: removingCredits || !creditPlayerAddress.trim() || removeCreditAmount <= 0 ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
              }}
            >
              {removingCredits ? 'Removing...' : 'Remove Credits'}
            </button>
          </div>
          {removeCreditResult && (
            <div style={{ marginTop: '1rem', padding: '0.75rem', borderRadius: '4px', backgroundColor: removeCreditResult.success ? styles.bgSuccess : styles.bgError, border: `1px solid ${removeCreditResult.success ? styles.borderSuccess : styles.borderError}` }}>
              {removeCreditResult.success ? (
                <div style={{ color: styles.text }}>
                  ✅ Credits removed successfully! New total: {removeCreditResult.gamesRemaining} {removeCreditResult.digest && <> | Transaction: <CopyableAddress value={removeCreditResult.digest} styles={styles} compact /></>}
                </div>
              ) : (
                <div style={{ color: styles.textError }}>❌ Error: {removeCreditResult.error}</div>
              )}
            </div>
          )}
        </div>

        {/* Set Credits Section */}
        <div style={{ padding: '1rem', backgroundColor: styles.bgSecondary, borderRadius: '4px', border: `1px solid ${styles.border}` }}>
          <h4 style={{ marginTop: 0, marginBottom: '1rem', color: styles.text }}>⚙️ Set Credits to Specific Amount</h4>
          <p style={{ marginBottom: '1rem', fontSize: '0.9rem', color: styles.textSecondary }}>
            This will set credits to the exact amount specified. If lower than current, credits will be removed. If higher, credits will be added.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem', alignItems: 'end' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: styles.text }}>
                Target Amount:
              </label>
              <input
                type="number"
                min="0"
                value={setCreditAmount}
                onChange={(e) => setSetCreditAmount(parseInt(e.target.value) || 0)}
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
              onClick={handleSetCredits}
              disabled={settingCredits || !creditPlayerAddress.trim() || setCreditAmount < 0}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: settingCredits || !creditPlayerAddress.trim() || setCreditAmount < 0 ? styles.buttonDisabled : styles.buttonPrimary,
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: settingCredits || !creditPlayerAddress.trim() || setCreditAmount < 0 ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
              }}
            >
              {settingCredits ? 'Setting...' : 'Set Credits'}
            </button>
          </div>
          {setCreditResult && (
            <div style={{ marginTop: '1rem', padding: '0.75rem', borderRadius: '4px', backgroundColor: setCreditResult.success ? styles.bgSuccess : styles.bgError, border: `1px solid ${setCreditResult.success ? styles.borderSuccess : styles.borderError}` }}>
              {setCreditResult.success ? (
                <div style={{ color: styles.text }}>
                  ✅ Credits set successfully! New total: {setCreditResult.gamesRemaining} {setCreditResult.digest && <> | Transaction: <CopyableAddress value={setCreditResult.digest} styles={styles} compact /></>}
                </div>
              ) : (
                <div style={{ color: styles.textError }}>❌ Error: {setCreditResult.error}</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

