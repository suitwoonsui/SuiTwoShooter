'use client';

import { useState, useEffect } from 'react';

type Tab = 'items' | 'badges';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<Tab>('items');
  
  // Shared wallet state
  const [adminAddress, setAdminAddress] = useState<string | null>(null);
  const [connectedAddress, setConnectedAddress] = useState<string | null>(null);
  const [walletError, setWalletError] = useState<string | null>(null);

  // Items state
  const [playerAddress, setPlayerAddress] = useState('');
  const [items, setItems] = useState<Array<{ itemId: string; level: number; quantity: number }>>([
    { itemId: 'extraLives', level: 1, quantity: 1 }
  ]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [itemsResult, setItemsResult] = useState<{ success: boolean; message?: string; error?: string; digest?: string } | null>(null);

  // Badges state
  const [badgeAction, setBadgeAction] = useState<'mint' | 'burn'>('mint');
  const [badgePlayerAddress, setBadgePlayerAddress] = useState('');
  const [tier, setTier] = useState<number>(0);
  const [badgeId, setBadgeId] = useState('');
  const [badgesLoading, setBadgesLoading] = useState(false);
  const [badgesResult, setBadgesResult] = useState<{ success: boolean; message?: string; error?: string; digest?: string } | null>(null);

  const itemTypes = [
    { id: 'extraLives', name: 'Extra Lives', levels: [1, 2, 3] },
    { id: 'forceField', name: 'Force Field', levels: [1, 2, 3] },
    { id: 'orbLevel', name: 'Orb Level', levels: [1, 2, 3] },
    { id: 'slowTime', name: 'Slow Time', levels: [1, 2, 3] },
    { id: 'destroyAll', name: 'Destroy All Enemies', levels: [1] },
    { id: 'bossKillShot', name: 'Boss Kill Shot', levels: [1] },
    { id: 'coinTractorBeam', name: 'Coin Tractor Beam', levels: [1, 2, 3] },
  ];

  const tierNames = [
    'Starter (0)',
    'Common (1)',
    'Uncommon (2)',
    'Rare (3)',
    'Epic (4)',
    'Legendary (5)',
  ];

  // Load wallet API script and initialize
  useEffect(() => {
    let scriptLoaded = false;
    let checkInterval: NodeJS.Timeout | null = null;

    const loadWalletAPI = async () => {
      // Check if already loaded
      if (window.walletAPIInstance) {
        console.log('✅ Wallet API already loaded');
        return;
      }

      // Check if script is already in the DOM
      if (document.querySelector('script[src*="wallet-api"]')) {
        console.log('✅ Wallet script already in DOM, waiting for initialization...');
        // Wait for initialization
        checkInterval = setInterval(() => {
          if (window.walletAPIInstance) {
            clearInterval(checkInterval!);
            console.log('✅ Wallet API initialized after script load');
          }
        }, 500);
        return;
      }

      // Load the wallet script
      try {
        // Get network and wallet module URL from config
        const configResponse = await fetch('/api/config');
        const config = await configResponse.json();
        const network = config.network || 'testnet';
        const walletModuleUrl = config.walletModuleUrl || '/wallet-module/dist/wallet-api.umd.cjs';

        // Create and load script
        const script = document.createElement('script');
        script.src = walletModuleUrl;
        script.async = true;
        
        script.onload = async () => {
          console.log('✅ Wallet script loaded');
          
          // Initialize wallet API
          if (typeof window.WalletAPI !== 'undefined') {
            try {
              if (typeof window.WalletAPI.initialize === 'function') {
                const api = await window.WalletAPI.initialize({ network });
                window.walletAPIInstance = api;
                console.log('✅ Wallet API initialized:', api);
              } else {
                console.error('❌ WalletAPI.initialize is not a function');
              }
            } catch (error) {
              console.error('❌ Failed to initialize wallet API:', error);
            }
          } else {
            console.error('❌ WalletAPI not found after script load');
          }
        };

        script.onerror = () => {
          console.error('❌ Failed to load wallet script from:', walletModuleUrl);
          setWalletError('Failed to load wallet module. Please ensure the wallet module is accessible.');
        };

        document.head.appendChild(script);
        scriptLoaded = true;
      } catch (error) {
        console.error('❌ Error loading wallet API:', error);
        setWalletError('Failed to load wallet API. Please refresh the page.');
      }
    };

    // Load admin address
    fetch('/api/admin/verify-wallet')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setAdminAddress(data.adminAddress.toLowerCase());
        }
      })
      .catch(err => console.error('Failed to load admin address:', err));

    // Load wallet API
    loadWalletAPI();

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

    return () => {
      clearInterval(checkWallet);
      if (checkInterval) {
        clearInterval(checkInterval);
      }
    };
  }, []);

  const connectWallet = async () => {
    setWalletError(null);
    
    // Try to initialize if WalletAPI is available but not initialized
    if (!window.walletAPIInstance && window.WalletAPI && typeof window.WalletAPI.initialize === 'function') {
      try {
        const configResponse = await fetch('/api/config');
        const config = await configResponse.json();
        const network = config.network || 'testnet';
        const api = await window.WalletAPI.initialize({ network });
        window.walletAPIInstance = api;
        console.log('✅ Wallet API initialized on connect');
      } catch (error) {
        console.error('❌ Failed to initialize wallet API:', error);
        setWalletError('Failed to initialize wallet API. Please refresh the page.');
        return;
      }
    }
    
    if (!window.walletAPIInstance) {
      setWalletError('Wallet API not loaded. Please refresh the page and ensure the wallet module is accessible.');
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

  // Items functions
  const addItem = () => {
    setItems([...items, { itemId: 'extraLives', level: 1, quantity: 1 }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    const item = newItems[index];
    
    if (field === 'level' || field === 'quantity') {
      (item as any)[field] = parseInt(value) || 1;
    } else if (field === 'itemId') {
      item.itemId = value;
    } else {
      (item as any)[field] = value;
    }
    setItems(newItems);
  };

  const handleItemsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setItemsLoading(true);
    setItemsResult(null);

    try {
      if (!isAdminWalletConnected || connectedAddress !== adminAddress) {
        setItemsResult({
          success: false,
          error: 'Admin wallet not connected. Please connect the admin wallet.',
        });
        setItemsLoading(false);
        return;
      }

      const response = await fetch('/api/admin/add-items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerAddress,
          items,
          adminWalletAddress: connectedAddress,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setItemsResult({
          success: true,
          message: data.message,
          digest: data.digest,
        });
        setPlayerAddress('');
        setItems([{ itemId: 'extraLives', level: 1, quantity: 1 }]);
      } else {
        setItemsResult({
          success: false,
          error: data.error || 'Failed to add items',
        });
      }
    } catch (error) {
      setItemsResult({
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      });
    } finally {
      setItemsLoading(false);
    }
  };

  // Badges functions
  const handleBadgesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

      const response = await fetch('/api/admin/badges', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: badgeAction,
          ...(badgeAction === 'mint' ? { playerAddress: badgePlayerAddress, tier } : { badgeId }),
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
        if (badgeAction === 'mint') {
          setBadgePlayerAddress('');
          setTier(0);
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
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto', fontFamily: 'system-ui' }}>
      <h1 style={{ marginBottom: '2rem' }}>🔐 Admin Dashboard</h1>

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
          <strong>⚠️ Admin wallet required:</strong> Please connect the admin wallet to access admin functions.
        </div>
      )}

      {/* Tab Navigation */}
      <div style={{ marginBottom: '2rem', borderBottom: '2px solid #ddd' }}>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            type="button"
            onClick={() => setActiveTab('items')}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: activeTab === 'items' ? '#2196F3' : 'transparent',
              color: activeTab === 'items' ? 'white' : '#2196F3',
              border: 'none',
              borderBottom: activeTab === 'items' ? '3px solid #2196F3' : '3px solid transparent',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '1rem',
            }}
          >
            🎁 Add Items
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('badges')}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: activeTab === 'badges' ? '#2196F3' : 'transparent',
              color: activeTab === 'badges' ? 'white' : '#2196F3',
              border: 'none',
              borderBottom: activeTab === 'badges' ? '3px solid #2196F3' : '3px solid transparent',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '1rem',
            }}
          >
            🎖️ Badge Management
          </button>
        </div>
      </div>

      {/* Items Tab */}
      {activeTab === 'items' && (
        <form onSubmit={handleItemsSubmit} style={{ display: isAdminWalletConnected ? 'flex' : 'none', flexDirection: 'column', gap: '1.5rem' }}>
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
            disabled={itemsLoading || !playerAddress || items.length === 0 || !isAdminWalletConnected}
            style={{
              padding: '1rem',
              fontSize: '1.1rem',
              backgroundColor: itemsLoading || !isAdminWalletConnected ? '#ccc' : '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: itemsLoading || !isAdminWalletConnected ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
            }}
          >
            {itemsLoading ? 'Adding Items...' : 'Add Items to Inventory'}
          </button>
        </form>
      )}

      {/* Badges Tab */}
      {activeTab === 'badges' && (
        <form onSubmit={handleBadgesSubmit} style={{ display: isAdminWalletConnected ? 'flex' : 'none', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Action Selector */}
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Action:
            </label>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="radio"
                  value="mint"
                  checked={badgeAction === 'mint'}
                  onChange={(e) => setBadgeAction(e.target.value as 'mint' | 'burn')}
                  style={{ marginRight: '0.5rem' }}
                />
                Mint Badge
              </label>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="radio"
                  value="burn"
                  checked={badgeAction === 'burn'}
                  onChange={(e) => setBadgeAction(e.target.value as 'mint' | 'burn')}
                  style={{ marginRight: '0.5rem' }}
                />
                Burn Badge
              </label>
            </div>
          </div>

          {badgeAction === 'mint' ? (
            <>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
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
            disabled={badgesLoading || !isAdminWalletConnected || (badgeAction === 'mint' ? !badgePlayerAddress : !badgeId)}
            style={{
              padding: '1rem',
              fontSize: '1.1rem',
              backgroundColor: badgesLoading || !isAdminWalletConnected ? '#ccc' : (badgeAction === 'mint' ? '#2196F3' : '#f44336'),
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: badgesLoading || !isAdminWalletConnected ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
            }}
          >
            {badgesLoading ? (badgeAction === 'mint' ? 'Minting Badge...' : 'Burning Badge...') : (badgeAction === 'mint' ? 'Mint Badge' : 'Burn Badge')}
          </button>
        </form>
      )}

      {/* Results Display */}
      {(itemsResult || badgesResult) && (
        <div
          style={{
            marginTop: '2rem',
            padding: '1rem',
            borderRadius: '4px',
            backgroundColor: (activeTab === 'items' ? itemsResult : badgesResult)?.success ? '#d4edda' : '#f8d7da',
            color: (activeTab === 'items' ? itemsResult : badgesResult)?.success ? '#155724' : '#721c24',
            border: `1px solid ${(activeTab === 'items' ? itemsResult : badgesResult)?.success ? '#c3e6cb' : '#f5c6cb'}`,
          }}
        >
          {(activeTab === 'items' ? itemsResult : badgesResult)?.success ? (
            <div>
              <strong>✅ Success!</strong>
              <p>{(activeTab === 'items' ? itemsResult : badgesResult)?.message}</p>
              {(activeTab === 'items' ? itemsResult : badgesResult)?.digest && (
                <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
                  Transaction: <code style={{ backgroundColor: 'rgba(0,0,0,0.1)', padding: '0.2rem 0.4rem', borderRadius: '3px' }}>{(activeTab === 'items' ? itemsResult : badgesResult)?.digest}</code>
                </p>
              )}
            </div>
          ) : (
            <div>
              <strong>❌ Error:</strong>
              <p>{(activeTab === 'items' ? itemsResult : badgesResult)?.error}</p>
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
        {activeTab === 'badges' && (
          <p style={{ marginTop: '0.5rem' }}>
            <strong>⚠️ Testing Only:</strong> These functions are for testing purposes. In production, players mint their own badges.
          </p>
        )}
      </div>
    </div>
  );
}

