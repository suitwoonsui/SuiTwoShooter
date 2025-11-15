'use client';

import { useState, useEffect } from 'react';

export default function AdminAddItemsPage() {
  const [playerAddress, setPlayerAddress] = useState('');
  const [items, setItems] = useState<Array<{ itemId: string; level: number; quantity: number }>>([
    { itemId: 'extraLives', level: 1, quantity: 1 }
  ]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message?: string; error?: string; digest?: string } | null>(null);
  const [adminAddress, setAdminAddress] = useState<string | null>(null);
  const [connectedAddress, setConnectedAddress] = useState<string | null>(null);
  const [walletError, setWalletError] = useState<string | null>(null);

  const itemTypes = [
    { id: 'extraLives', name: 'Extra Lives', levels: [1, 2, 3] },
    { id: 'forceField', name: 'Force Field', levels: [1, 2, 3] },
    { id: 'orbLevel', name: 'Orb Level', levels: [1, 2, 3] },
    { id: 'slowTime', name: 'Slow Time', levels: [1, 2, 3] },
    { id: 'destroyAll', name: 'Destroy All Enemies', levels: [1] },
    { id: 'bossKillShot', name: 'Boss Kill Shot', levels: [1] },
    { id: 'coinTractorBeam', name: 'Coin Tractor Beam', levels: [1, 2, 3] },
  ];

  // Load admin address on mount
  useEffect(() => {
    fetch('/api/admin/verify-wallet')
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
      
      if (result.success) {
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

  const addItem = () => {
    setItems([...items, { itemId: 'extraLives', level: 1, quantity: 1 }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    if (field === 'level' || field === 'quantity') {
      newItems[index][field] = parseInt(value) || 1;
    } else {
      newItems[index][field] = value;
    }
    setItems(newItems);
  };

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
      const response = await fetch('/api/admin/add-items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerAddress,
          items,
          adminWalletAddress: connectedAddress, // Send for server verification
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
        setPlayerAddress('');
        setItems([{ itemId: 'extraLives', level: 1, quantity: 1 }]);
      } else {
        setResult({
          success: false,
          error: data.error || 'Failed to add items',
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

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', fontFamily: 'system-ui' }}>
        <h1 style={{ marginBottom: '2rem' }}>🎁 Admin: Add Items to Inventory</h1>

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
            <strong>⚠️ Admin wallet required:</strong> Please connect the admin wallet to add items to player inventories.
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', display: isAdminWalletConnected ? 'flex' : 'none' }}>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <label style={{ fontWeight: 'bold' }}>Items to Add:</label>
            <button
              type="button"
              onClick={addItem}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              + Add Item
            </button>
          </div>

          {items.map((item, index) => (
            <div
              key={index}
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 1fr auto',
                gap: '0.5rem',
                marginBottom: '0.5rem',
                padding: '1rem',
                backgroundColor: '#f5f5f5',
                borderRadius: '4px',
              }}
            >
              <select
                value={item.itemId}
                onChange={(e) => updateItem(index, 'itemId', e.target.value)}
                style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}
              >
                {itemTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>

              <select
                value={item.level}
                onChange={(e) => updateItem(index, 'level', e.target.value)}
                style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}
              >
                {itemTypes.find((t) => t.id === item.itemId)?.levels.map((level) => (
                  <option key={level} value={level}>
                    Level {level}
                  </option>
                ))}
              </select>

              <input
                type="number"
                value={item.quantity}
                onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                min="1"
                style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}
              />

              {items.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  style={{
                    padding: '0.5rem',
                    backgroundColor: '#f44336',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>

        <button
          type="submit"
          disabled={loading || !playerAddress || items.length === 0 || !isAdminWalletConnected}
          style={{
            padding: '1rem',
            fontSize: '1.1rem',
            backgroundColor: loading || !isAdminWalletConnected ? '#ccc' : '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading || !isAdminWalletConnected ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
          }}
        >
          {loading ? 'Adding Items...' : 'Add Items to Inventory'}
        </button>
      </form>

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
      </div>
    </div>
  );
}

