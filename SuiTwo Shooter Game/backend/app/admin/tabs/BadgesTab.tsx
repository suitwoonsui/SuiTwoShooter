// ==========================================
// Admin Page - Badges Tab Component
// ==========================================

'use client';

import { useState } from 'react';
import { AdminStyles } from '../types';
import { getApiUrl } from '../utils/get-api-url';
import { useWalletDiscovery } from '../hooks/useWalletDiscovery';
import { WalletDiscoveryUI } from '../components/WalletDiscoveryUI';
import { CopyableAddress } from '../components/CopyableAddress';

interface BadgesTabProps {
  isAdminWalletConnected: boolean;
  connectedAddress: string | null;
  adminAddress: string | null;
  styles: AdminStyles;
}

const tierNames = [
  'Starter (0)',
  'Common (1)',
  'Uncommon (2)',
  'Rare (3)',
  'Epic (4)',
  'Legendary (5)',
];

export function BadgesTab({ isAdminWalletConnected, connectedAddress, adminAddress, styles }: BadgesTabProps) {
  const [badgeAction, setBadgeAction] = useState<'mint' | 'burn' | 'cleanup' | 'update-image'>('mint');
  const [badgeContract, setBadgeContract] = useState<'new' | 'old'>('new');
  const [badgePlayerAddress, setBadgePlayerAddress] = useState('');
  const [tier, setTier] = useState<number>(0);
  const [badgeId, setBadgeId] = useState('');
  const [badgesLoading, setBadgesLoading] = useState(false);
  const [badgesResult, setBadgesResult] = useState<{ success: boolean; message?: string; error?: string; digest?: string } | null>(null);
  const [lookupAddress, setLookupAddress] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupResult, setLookupResult] = useState<{ badgeId?: string; error?: string } | null>(null);
  const [updateImageAddress, setUpdateImageAddress] = useState('');
  const [updateImageLoading, setUpdateImageLoading] = useState(false);
  const [updateImageResult, setUpdateImageResult] = useState<{
    success: boolean;
    message?: string;
    error?: string;
    requiresPlayerSignature?: boolean;
  } | null>(null);
  
  // Contract selection for wallet discovery (separate from badgeContract which is for badge operations)
  const [discoveryContractSelection, setDiscoveryContractSelection] = useState<'new' | 'old'>('new');
  
  // Check if wallet has badges
  const checkWalletExists = async (address: string): Promise<boolean> => {
    try {
      const response = await fetch(getApiUrl(`api/badges/${address}?contract=${discoveryContractSelection}`));
      const data = await response.json();
      return response.ok && data.success && data.hasBadge;
    } catch {
      return false;
    }
  };

  // Wallet discovery hook
  const walletDiscovery = useWalletDiscovery({
    isAdminWalletConnected,
    connectedAddress,
    adminAddress,
    discoveryType: 'badges',
    checkWalletExists,
    contract: discoveryContractSelection,
  });

  const handleBadgeLookup = async () => {
    setLookupLoading(true);
    setLookupResult(null);

    try {
      if (!lookupAddress || !lookupAddress.startsWith('0x') || lookupAddress.length !== 66) {
        setLookupResult({
          error: 'Invalid address format. Must be a valid Sui address (0x followed by 64 hex characters)',
        });
        setLookupLoading(false);
        return;
      }

      const response = await fetch(getApiUrl(`api/badges/${lookupAddress}?contract=${badgeContract}`));
      const data = await response.json();

      if (response.ok && data.success && data.hasBadge && data.badge) {
        setLookupResult({
          badgeId: data.badge.badgeId,
        });
        
        // Auto-fill the badge ID if in burn mode
        if (badgeAction === 'burn') {
          setBadgeId(data.badge.badgeId);
        }
      } else {
        const errorMsg = data.error || (data.hasBadge === false ? 'Player does not have a badge' : 'Failed to lookup badge');
        setLookupResult({
          error: errorMsg,
        });
      }
    } catch (error) {
      setLookupResult({
        error: error instanceof Error ? error.message : 'Network error',
      });
    } finally {
      setLookupLoading(false);
    }
  };

  const handleUpdateImageUrl = async () => {
    if (!isAdminWalletConnected || connectedAddress !== adminAddress) {
      setUpdateImageResult({
        success: false,
        error: 'Admin wallet must be connected.',
      });
      return;
    }
    if (!updateImageAddress || !updateImageAddress.startsWith('0x') || updateImageAddress.length !== 66) {
      setUpdateImageResult({
        success: false,
        error: 'Invalid player address format',
      });
      return;
    }

    setUpdateImageLoading(true);
    setUpdateImageResult(null);

    try {
      const response = await fetch(getApiUrl('api/admin/badges/update-image-url'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerAddress: updateImageAddress,
          adminWalletAddress: connectedAddress,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setUpdateImageResult({
          success: true,
          message: data.message || 'Badge image URL updated successfully',
          requiresPlayerSignature: Boolean(data.requiresPlayerSignature),
        });
        if (!data.requiresPlayerSignature) {
          setUpdateImageAddress('');
        }
      } else {
        setUpdateImageResult({
          success: false,
          error: data.error || 'Failed to update badge image URL',
        });
      }
    } catch (error) {
      setUpdateImageResult({
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      });
    } finally {
      setUpdateImageLoading(false);
    }
  };

  const handleBadgesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (badgeAction === 'update-image') {
      return;
    }
    setBadgesLoading(true);
    setBadgesResult(null);

    try {
      if (!isAdminWalletConnected || connectedAddress !== adminAddress) {
        setBadgesResult({
          success: false,
          error: 'Admin wallet not connected. Please connect the admin wallet.',
        });
        setBadgesLoading(false);
        return;
      }

      const response = await fetch(getApiUrl('api/admin/badges'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: badgeAction,
          contract: badgeContract,
          ...(badgeAction === 'mint' || badgeAction === 'cleanup' ? { playerAddress: badgePlayerAddress } : {}),
          ...(badgeAction === 'mint' ? { tier } : {}),
          ...(badgeAction === 'burn' ? { badgeId } : {}),
          adminWalletAddress: connectedAddress,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setBadgesResult({
          success: true,
          message: data.message,
          digest: data.digest,
        });
        if (badgeAction === 'mint' || badgeAction === 'cleanup') {
          setBadgePlayerAddress('');
          if (badgeAction === 'mint') {
            setTier(0);
          }
        } else {
          setBadgeId('');
        }
      } else {
        setBadgesResult({
          success: false,
          error: data.error || 'Operation failed',
        });
      }
    } catch (error) {
      setBadgesResult({
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      });
    } finally {
      setBadgesLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Wallet Discovery Section */}
      <WalletDiscoveryUI
        styles={styles}
        title="🔍 Discover Wallets with Badges"
        discoverButtonText="🔍 Discover All Wallets with Badges"
        searchAddress={walletDiscovery.searchAddress}
        setSearchAddress={walletDiscovery.setSearchAddress}
        onSearch={walletDiscovery.handleSearchWallet}
        onDiscover={walletDiscovery.handleDiscoverWallets}
        searchingWallet={walletDiscovery.searchingWallet}
        discoveringWallets={walletDiscovery.discoveringWallets}
        discoveredWalletsCount={walletDiscovery.discoveredWallets.length}
        contractSelection={discoveryContractSelection}
        setContractSelection={setDiscoveryContractSelection}
        contractSelectionEnvVar="OLD_BADGE_REGISTRY_OBJECT_ID_TESTNET"
      />
      
      {/* Display discovered wallets with click-to-copy functionality */}
      {walletDiscovery.discoveredWallets.length > 0 && (
        <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: styles.bgSecondary, borderRadius: '4px', border: `1px solid ${styles.border}` }}>
          <p style={{ marginBottom: '0.5rem', color: styles.textSecondary }}>
            Found {walletDiscovery.discoveredWallets.length} wallet(s) with badges:
          </p>
          <div
            style={{
              maxHeight: '300px',
              overflowY: 'auto',
              padding: '1rem',
              backgroundColor: styles.bgTertiary,
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
                  backgroundColor: styles.bgSecondary,
                  borderRadius: '4px',
                  fontSize: '0.9rem',
                  color: styles.text,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.5rem',
                }}
                onClick={() => {
                  navigator.clipboard.writeText(address);
                  setBadgePlayerAddress(address);
                  alert('Address copied and filled in!');
                }}
                title="Click row to copy and fill player address; use Copy button to only copy"
              >
                <CopyableAddress value={address} styles={styles} compact />
              </div>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleBadgesSubmit} style={{ display: isAdminWalletConnected ? 'flex' : 'none', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Action Selector */}
      <div>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: styles.text }}>
          Action:
        </label>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', color: styles.text }}>
            <input
              type="radio"
              value="mint"
              checked={badgeAction === 'mint'}
              onChange={(e) => setBadgeAction(e.target.value as 'mint' | 'burn' | 'cleanup' | 'update-image')}
              style={{ marginRight: '0.5rem' }}
            />
            Mint Badge
          </label>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', color: styles.text }}>
            <input
              type="radio"
              value="burn"
              checked={badgeAction === 'burn'}
              onChange={(e) => setBadgeAction(e.target.value as 'mint' | 'burn' | 'cleanup' | 'update-image')}
              style={{ marginRight: '0.5rem' }}
            />
            Burn Badge
          </label>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', color: styles.text }}>
            <input
              type="radio"
              value="cleanup"
              checked={badgeAction === 'cleanup'}
              onChange={(e) => setBadgeAction(e.target.value as 'mint' | 'burn' | 'cleanup' | 'update-image')}
              style={{ marginRight: '0.5rem' }}
            />
            Cleanup Orphaned Entry
          </label>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', color: styles.text }}>
            <input
              type="radio"
              value="update-image"
              checked={badgeAction === 'update-image'}
              onChange={(e) => setBadgeAction(e.target.value as 'mint' | 'burn' | 'cleanup' | 'update-image')}
              style={{ marginRight: '0.5rem' }}
            />
            Update Image URL
          </label>
        </div>
      </div>

      <div>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: styles.text }}>
          Contract:
        </label>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', color: styles.text }}>
            <input
              type="radio"
              value="new"
              checked={badgeContract === 'new'}
              onChange={(e) => {
                setBadgeContract(e.target.value as 'new' | 'old');
                setLookupResult(null);
                setBadgeId('');
              }}
              style={{ marginRight: '0.5rem' }}
            />
            New Contract
          </label>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', color: styles.text }}>
            <input
              type="radio"
              value="old"
              checked={badgeContract === 'old'}
              onChange={(e) => {
                setBadgeContract(e.target.value as 'new' | 'old');
                setLookupResult(null);
                setBadgeId('');
              }}
              style={{ marginRight: '0.5rem' }}
            />
            Old Contract
          </label>
        </div>
        {badgeContract === 'old' && (
          <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: styles.textSecondary, fontStyle: 'italic' }}>
            ⚠️ Make sure OLD_GAME_SCORE_CONTRACT_TESTNET and OLD_BADGE_REGISTRY_OBJECT_ID_TESTNET are configured in environment variables.
          </p>
        )}
      </div>

      {badgeAction === 'update-image' ? (
        <div style={{ padding: '1.5rem', background: styles.bgInfo, borderRadius: '8px', border: `1px solid ${styles.border}` }}>
          <h3 style={{ marginTop: 0, marginBottom: '1rem', color: styles.text }}>🖼️ Update Badge Image URL</h3>
          <p style={{ marginBottom: '1rem', color: styles.textSecondary, fontSize: '0.9rem' }}>
            Update a badge's image URL to point to the correct static file. This is useful for fixing badges that were minted with localhost URLs.
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: styles.text }}>
                Player Address:
              </label>
              <input
                type="text"
                value={updateImageAddress}
                onChange={(e) => setUpdateImageAddress(e.target.value)}
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
            
            <button
              type="button"
              onClick={handleUpdateImageUrl}
              disabled={updateImageLoading || !updateImageAddress}
              style={{
                padding: '0.75rem 1.5rem',
                fontSize: '1rem',
                backgroundColor: updateImageLoading || !updateImageAddress ? styles.buttonDisabled : '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: updateImageLoading || !updateImageAddress ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
              }}
            >
              {updateImageLoading ? 'Updating...' : 'Update Image URL'}
            </button>
          </div>

          {updateImageResult && (
            <div
              style={{
                marginTop: '1rem',
                padding: '1rem',
                borderRadius: '4px',
                backgroundColor: updateImageResult.success ? styles.bgSuccess : styles.bgError,
                color: updateImageResult.success ? styles.text : styles.textError,
                border: `1px solid ${updateImageResult.success ? styles.borderSuccess : styles.borderError}`,
              }}
            >
              {updateImageResult.success ? (
                <div>
                  <strong>✅ Success!</strong>
                  <p>{updateImageResult.message}</p>
                  {updateImageResult.requiresPlayerSignature && (
                    <p style={{ marginTop: '0.75rem', fontSize: '0.9rem' }}>
                      The player must sign the returned transaction in the game client (wallet connected as that
                      address), or submit the serialized bytes via your usual Channel / execute path. The admin wallet
                      cannot complete this step because the NFT owner is the player.
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <strong>❌ Error:</strong>
                  <p>{updateImageResult.error}</p>
                </div>
              )}
            </div>
          )}
        </div>
      ) : badgeAction === 'cleanup' ? (
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: styles.text }}>
            Player Address:
          </label>
          <input
            type="text"
            value={badgePlayerAddress}
            onChange={(e) => setBadgePlayerAddress(e.target.value)}
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
          <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: styles.textSecondary }}>
            Removes orphaned registry entry if badge object doesn't exist. Useful for cleaning up after badge deletion.
          </p>
        </div>
      ) : badgeAction === 'mint' ? (
        <>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: styles.text }}>
              Player address (metadata only):
            </label>
            <p style={{ marginBottom: '0.5rem', fontSize: '0.85rem', color: styles.textSecondary }}>
              Soulbound badge is minted to your <strong>game admin wallet</strong>. This field is optional context for
              metadata (<code>grant_target_player</code>) when different from admin; it does not receive the NFT.
            </p>
            <input
              type="text"
              value={badgePlayerAddress}
              onChange={(e) => setBadgePlayerAddress(e.target.value)}
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

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: styles.text }}>
              Badge Tier:
            </label>
            <select
              value={tier}
              onChange={(e) => setTier(parseInt(e.target.value))}
              style={{
                width: '100%',
                padding: '0.75rem',
                fontSize: '1rem',
                border: `1px solid ${styles.border}`,
                borderRadius: '4px',
                backgroundColor: styles.inputBg,
                color: styles.text,
              }}
            >
              {tierNames.map((name, index) => (
                <option key={index} value={index}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        </>
      ) : (
        <div>
          <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: styles.bgInfo, borderRadius: '4px', border: `1px solid ${styles.border}` }}>
            <strong style={{ color: styles.text }}>🔍 Lookup Badge ID by Player Address:</strong>
            <p style={{ marginTop: '0.5rem', marginBottom: '0.5rem', fontSize: '0.9rem', color: styles.textSecondary, fontStyle: 'italic' }}>
              Querying: <strong>{badgeContract === 'old' ? 'OLD' : 'NEW'} Contract</strong>
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <input
                type="text"
                value={lookupAddress}
                onChange={(e) => setLookupAddress(e.target.value)}
                placeholder="Enter player address (0x...)"
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  fontSize: '0.9rem',
                  border: `1px solid ${styles.border}`,
                  borderRadius: '4px',
                  backgroundColor: styles.inputBg,
                  color: styles.text,
                }}
              />
              <button
                type="button"
                onClick={handleBadgeLookup}
                disabled={lookupLoading || !lookupAddress}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: lookupLoading || !lookupAddress ? styles.buttonDisabled : '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: lookupLoading || !lookupAddress ? 'not-allowed' : 'pointer',
                  fontSize: '0.9rem',
                }}
              >
                {lookupLoading ? 'Looking up...' : 'Lookup'}
              </button>
            </div>
            {lookupResult && (
              <div style={{ marginTop: '0.5rem', padding: '0.5rem', backgroundColor: lookupResult.badgeId ? styles.bgSuccess : styles.bgError, borderRadius: '4px', fontSize: '0.9rem', border: `1px solid ${lookupResult.badgeId ? styles.borderSuccess : styles.borderError}` }}>
                {lookupResult.badgeId ? (
                  <div style={{ color: styles.text }}>
                    <strong>✅ Badge ID:</strong> <code style={{ backgroundColor: styles.bgTertiary, padding: '0.2rem 0.4rem', borderRadius: '3px' }}>{lookupResult.badgeId}</code>
                  </div>
                ) : (
                  <div style={{ color: styles.textError }}>
                    <strong>❌ Error:</strong> {lookupResult.error}
                  </div>
                )}
              </div>
            )}
          </div>

          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: styles.text }}>
            Badge ID:
          </label>
          <input
            type="text"
            value={badgeId}
            onChange={(e) => setBadgeId(e.target.value)}
            placeholder="0x... (or use lookup above)"
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
          <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: styles.textSecondary }}>
            ⚠️ Note: Badge must be in admin wallet to burn (badges are soulbound and cannot be transferred). Use the lookup above to find the badge ID for a player address.
          </p>
        </div>
      )}

      {badgesResult && (
        <div
          style={{
            padding: '1rem',
            borderRadius: '4px',
            backgroundColor: badgesResult.success ? styles.bgSuccess : styles.bgError,
            border: `1px solid ${badgesResult.success ? styles.borderSuccess : styles.borderError}`,
            color: badgesResult.success ? styles.text : styles.textError,
          }}
        >
          {badgesResult.success ? (
            <div>
              <strong>✅ Success!</strong>
              <p>{badgesResult.message}</p>
              {badgesResult.digest && (
                <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
                  Transaction: <code style={{ backgroundColor: styles.bgTertiary, padding: '0.2rem 0.4rem', borderRadius: '3px' }}>{badgesResult.digest}</code>
                </p>
              )}
            </div>
          ) : (
            <div>
              <strong>❌ Error:</strong>
              <p>{badgesResult.error}</p>
            </div>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={badgesLoading || !isAdminWalletConnected || (badgeAction === 'mint' || badgeAction === 'cleanup' ? !badgePlayerAddress : badgeAction === 'burn' ? !badgeId : false)}
        style={{
          padding: '1rem',
          fontSize: '1.1rem',
          backgroundColor: badgesLoading || !isAdminWalletConnected ? styles.buttonDisabled : (badgeAction === 'mint' ? '#2196F3' : badgeAction === 'burn' ? '#f44336' : '#FF9800'),
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: badgesLoading || !isAdminWalletConnected ? 'not-allowed' : 'pointer',
          fontWeight: 'bold',
          display: badgeAction === 'update-image' ? 'none' : 'block',
        }}
      >
        {badgesLoading 
          ? (badgeAction === 'mint' ? 'Minting Badge...' : badgeAction === 'burn' ? 'Burning Badge...' : 'Cleaning up...')
          : (badgeAction === 'mint' ? 'Mint Badge' : badgeAction === 'burn' ? 'Burn Badge' : 'Cleanup Orphaned Entry')}
      </button>
    </form>
    </div>
  );
}

