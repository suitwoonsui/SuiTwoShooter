'use client';

import { useState, useEffect } from 'react';
import { getApiBaseUrl } from '@/lib/api-base-url';

// Helper function to get full API URL
const getApiUrl = (path: string): string => {
  const baseUrl = getApiBaseUrl();
  // Remove leading slash from path if baseUrl is provided (to avoid double slashes)
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return baseUrl ? `${baseUrl}/${cleanPath}` : `/${cleanPath}`;
};

export default function AdminBadgesPage() {
  const [action, setAction] = useState<'mint' | 'burn' | 'update-image'>('mint');
  const [playerAddress, setPlayerAddress] = useState('');
  const [tier, setTier] = useState<number>(0);
  const [badgeId, setBadgeId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message?: string; error?: string; digest?: string } | null>(null);
  const [adminAddress, setAdminAddress] = useState<string | null>(null);
  const [connectedAddress, setConnectedAddress] = useState<string | null>(null);
  const [walletError, setWalletError] = useState<string | null>(null);
  
  // Update image URL state
  const [updateImageAddress, setUpdateImageAddress] = useState('');
  const [updateImageLoading, setUpdateImageLoading] = useState(false);
  const [updateImageResult, setUpdateImageResult] = useState<{ success: boolean; message?: string; error?: string } | null>(null);

  const tierNames = [
    'Starter (0)',
    'Common (1)',
    'Uncommon (2)',
    'Rare (3)',
    'Epic (4)',
    'Legendary (5)',
  ];

  // Load admin address on mount
  useEffect(() => {
    fetch(getApiUrl('api/admin/verify-wallet'))
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setAdminAddress(data.adminAddress.toLowerCase());
        }
      })
      .catch(err => console.error('Failed to load admin address:', err));

    // Check if wallet is already connected
    const checkWallet = setInterval(() => {
      if (window.walletAPIInstance) {
        clearInterval(checkWallet);
        if (window.walletAPIInstance.isConnected()) {
          const address = window.walletAPIInstance.getAddress();
          if (address) {
            setConnectedAddress(address.toLowerCase());
          }
        }
      }
    }, 500);

    return () => clearInterval(checkWallet);
  }, []);

  const connectWallet = async () => {
    setWalletError(null);
    
    if (!window.walletAPIInstance) {
      setWalletError('Wallet API not loaded. Please refresh the page.');
      return;
    }

    try {
      const result = await window.walletAPIInstance.connect();
      
      if (result.success && result.address) {
        const address = result.address.toLowerCase();
        setConnectedAddress(address);
        
        if (address === adminAddress) {
          setWalletError(null);
        } else {
          setWalletError(`Wrong wallet! Please connect the admin wallet.`);
          await window.walletAPIInstance.disconnect();
          setConnectedAddress(null);
        }
      } else {
        setWalletError(result.error || 'Failed to connect wallet');
      }
    } catch (error) {
      setWalletError(error instanceof Error ? error.message : 'Error connecting wallet');
    }
  };

  const disconnectWallet = async () => {
    if (window.walletAPIInstance && window.walletAPIInstance.isConnected()) {
      await window.walletAPIInstance.disconnect();
    }
    setConnectedAddress(null);
    setWalletError(null);
  };

  const isAdminWalletConnected = connectedAddress === adminAddress;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      // Verify wallet is still connected and is admin
      if (!isAdminWalletConnected || connectedAddress !== adminAddress) {
        setResult({
          success: false,
          error: 'Admin wallet not connected. Please connect the admin wallet.',
        });
        setLoading(false);
        return;
      }

      // Use server-side proxy that automatically handles API key
      const response = await fetch(getApiUrl('api/admin/badges'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          ...(action === 'mint' ? { playerAddress, tier } : { badgeId }),
          adminWalletAddress: connectedAddress,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setResult({
          success: true,
          message: data.message,
          digest: data.digest,
        });
        // Reset form on success
        if (action === 'mint') {
          setPlayerAddress('');
          setTier(0);
        } else {
          setBadgeId('');
        }
      } else {
        setResult({
          success: false,
          error: data.error || 'Operation failed',
        });
      }
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateImageUrl = async () => {
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
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setUpdateImageResult({
          success: true,
          message: data.message || 'Badge image URL updated successfully',
        });
        setUpdateImageAddress('');
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

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', fontFamily: 'system-ui' }}>
      <h1 style={{ marginBottom: '2rem' }}>🎖️ Admin: Badge Management</h1>

      {/* Wallet Connection Section */}
      <div style={{ marginBottom: '2rem', padding: '1rem', background: '#f9f9f9', borderRadius: '8px' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
          Admin Wallet:
        </label>
        
        {!isAdminWalletConnected ? (
          <div>
            <p style={{ marginBottom: '0.5rem' }}>🔒 Connect your admin wallet to continue</p>
            <button
              type="button"
              onClick={connectWallet}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#2196F3',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              Connect Wallet
            </button>
            {walletError && (
              <div style={{ marginTop: '0.5rem', color: '#721c24' }}>
                <strong>❌ Error:</strong> {walletError}
              </div>
            )}
          </div>
        ) : (
          <div>
            <p style={{ marginBottom: '0.5rem' }}>
              <strong>✅ Wallet Connected:</strong> {connectedAddress?.substring(0, 10)}...{connectedAddress?.substring(connectedAddress.length - 8)}
            </p>
            <button
              type="button"
              onClick={disconnectWallet}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.9rem',
              }}
            >
              Disconnect
            </button>
          </div>
        )}
      </div>

      {!isAdminWalletConnected && (
        <div style={{ padding: '1rem', background: '#fff3cd', borderRadius: '4px', marginBottom: '2rem' }}>
          <strong>⚠️ Admin wallet required:</strong> Please connect the admin wallet to manage badges.
        </div>
      )}

      {/* Action Selector */}
      <div style={{ marginBottom: '2rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
          Action:
        </label>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="radio"
              value="mint"
              checked={action === 'mint'}
              onChange={(e) => setAction(e.target.value as 'mint' | 'burn' | 'update-image')}
              style={{ marginRight: '0.5rem' }}
            />
            Mint Badge
          </label>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="radio"
              value="burn"
              checked={action === 'burn'}
              onChange={(e) => setAction(e.target.value as 'mint' | 'burn' | 'update-image')}
              style={{ marginRight: '0.5rem' }}
            />
            Burn Badge
          </label>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="radio"
              value="update-image"
              checked={action === 'update-image'}
              onChange={(e) => setAction(e.target.value as 'mint' | 'burn' | 'update-image')}
              style={{ marginRight: '0.5rem' }}
            />
            Update Image URL
          </label>
        </div>
      </div>

      {action === 'update-image' ? (
        /* Update Image URL Section */
        <div style={{ display: isAdminWalletConnected ? 'block' : 'none', padding: '1.5rem', background: '#f0f7ff', borderRadius: '8px', border: '1px solid #b3d9ff' }}>
          <h2 style={{ marginTop: 0, marginBottom: '1rem' }}>🖼️ Update Badge Image URL</h2>
          <p style={{ marginBottom: '1rem', color: '#666', fontSize: '0.9rem' }}>
            Update a badge's image URL to point to the correct static file. This is useful for fixing badges that were minted with localhost URLs.
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
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
                  border: '1px solid #ccc',
                  borderRadius: '4px',
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
                backgroundColor: updateImageLoading || !updateImageAddress ? '#ccc' : '#4CAF50',
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
                backgroundColor: updateImageResult.success ? '#d4edda' : '#f8d7da',
                color: updateImageResult.success ? '#155724' : '#721c24',
                border: `1px solid ${updateImageResult.success ? '#c3e6cb' : '#f5c6cb'}`,
              }}
            >
              {updateImageResult.success ? (
                <div>
                  <strong>✅ Success!</strong>
                  <p>{updateImageResult.message}</p>
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
      ) : (
      <form onSubmit={handleSubmit} style={{ display: isAdminWalletConnected ? 'flex' : 'none', flexDirection: 'column', gap: '1.5rem' }}>
        {action === 'mint' ? (
          <>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Player Address:
              </label>
              <input
                type="text"
                value={playerAddress}
                onChange={(e) => setPlayerAddress(e.target.value)}
                placeholder="0x..."
                required
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  fontSize: '1rem',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Badge Tier:
              </label>
              <select
                value={tier}
                onChange={(e) => setTier(parseInt(e.target.value))}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  fontSize: '1rem',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
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
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Badge ID:
            </label>
            <input
              type="text"
              value={badgeId}
              onChange={(e) => setBadgeId(e.target.value)}
              placeholder="0x..."
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                fontSize: '1rem',
                border: '1px solid #ccc',
                borderRadius: '4px',
              }}
            />
            <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#666' }}>
              ⚠️ Note: Badge must be in admin wallet to burn (badges are soulbound and cannot be transferred)
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !isAdminWalletConnected || (action === 'mint' ? !playerAddress : !badgeId)}
          style={{
            padding: '1rem',
            fontSize: '1.1rem',
            backgroundColor: loading || !isAdminWalletConnected ? '#ccc' : (action === 'mint' ? '#2196F3' : '#f44336'),
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading || !isAdminWalletConnected ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
          }}
        >
          {loading ? (action === 'mint' ? 'Minting Badge...' : 'Burning Badge...') : (action === 'mint' ? 'Mint Badge' : 'Burn Badge')}
        </button>
      </form>
      )}

      {result && (
        <div
          style={{
            marginTop: '2rem',
            padding: '1rem',
            borderRadius: '4px',
            backgroundColor: result.success ? '#d4edda' : '#f8d7da',
            color: result.success ? '#155724' : '#721c24',
            border: `1px solid ${result.success ? '#c3e6cb' : '#f5c6cb'}`,
          }}
        >
          {result.success ? (
            <div>
              <strong>✅ Success!</strong>
              <p>{result.message}</p>
              {result.digest && (
                <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
                  Transaction: <code style={{ backgroundColor: 'rgba(0,0,0,0.1)', padding: '0.2rem 0.4rem', borderRadius: '3px' }}>{result.digest}</code>
                </p>
              )}
            </div>
          ) : (
            <div>
              <strong>❌ Error:</strong>
              <p>{result.error}</p>
            </div>
          )}
        </div>
      )}

      <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#fff3cd', borderRadius: '4px', fontSize: '0.9rem' }}>
        <strong>🔒 Security:</strong> This page requires:
        <ul style={{ marginTop: '0.5rem', marginLeft: '1.5rem' }}>
          <li>Admin wallet connection (verified on frontend and backend)</li>
          <li>Server-side API key authentication</li>
          <li>Wallet address verification before allowing operations</li>
        </ul>
        <p style={{ marginTop: '0.5rem' }}>
          <strong>⚠️ Testing Only:</strong> These functions are for testing purposes. In production, players mint their own badges.
        </p>
      </div>
    </div>
  );
}

