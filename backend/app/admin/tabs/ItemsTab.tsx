// ==========================================
// Admin Page - Inventory Management Tab
// Full control over Items for individual users and all users
// ==========================================

'use client';

import { useState } from 'react';
import { AdminStyles } from '../types';
import { getApiUrl } from '../utils/get-api-url';
import { useWalletDiscovery } from '../hooks/useWalletDiscovery';
import { WalletDiscoveryUI } from '../components/WalletDiscoveryUI';
import { WalletList } from '../components/WalletList';

interface ItemsTabProps {
  isAdminWalletConnected: boolean;
  connectedAddress: string | null;
  adminAddress: string | null;
  styles: AdminStyles;
}

interface Item {
  itemId: string;
  level: number;
  quantity: number;
}

interface UserInventory {
  address: string;
  inventory: Record<string, number>;
  loading?: boolean;
  error?: string;
}

type ItemType = {
  id: string;
  name: string;
  levels: number[];
};

const itemTypes: ItemType[] = [
  { id: 'extraLives', name: 'Extra Lives', levels: [1, 2, 3] },
  { id: 'forceField', name: 'Force Field', levels: [1, 2, 3] },
  { id: 'orbLevel', name: 'Orb Level', levels: [1, 2, 3] },
  { id: 'slowTime', name: 'Slow Time', levels: [1, 2, 3] },
  { id: 'destroyAll', name: 'Destroy All Enemies', levels: [1] },
  { id: 'bossKillShot', name: 'Boss Kill Shot', levels: [1] },
  { id: 'coinTractorBeam', name: 'Coin Tractor Beam', levels: [1, 2, 3] },
];

// Add New Item Card Component (Category-specific)
function CategoryAddItemCard({ 
  address, 
  categoryId,
  onAdd, 
  styles, 
  itemTypes 
}: { 
  address: string; 
  categoryId: string;
  onAdd: (address: string, itemId: string, level: number, quantity: number) => void; 
  styles: AdminStyles;
  itemTypes: ItemType[];
}) {
  const [showForm, setShowForm] = useState(false);
  const categoryType = itemTypes.find(t => t.id === categoryId);
  const [newItem, setNewItem] = useState({ 
    itemId: categoryId, 
    level: categoryType?.levels[0] || 1, 
    quantity: 1 
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd(address, newItem.itemId, newItem.level, newItem.quantity);
    setShowForm(false);
    setNewItem({ 
      itemId: categoryId, 
      level: categoryType?.levels[0] || 1, 
      quantity: 1 
    });
  };

  if (!showForm) {
    return (
      <div
        className="admin-add-card"
        onClick={() => setShowForm(true)}
        title="Click to add new item"
      >
        <div className="admin-add-icon">+</div>
        <div className="admin-add-text">Add</div>
      </div>
    );
  }

  return (
    <div className="admin-card-compact" style={{ height: '100%' }}>
      <form onSubmit={handleSubmit} className="admin-form">
        <select
          value={newItem.itemId}
          onChange={(e) => {
            const selectedType = itemTypes.find(t => t.id === e.target.value);
            setNewItem({ ...newItem, itemId: e.target.value, level: selectedType?.levels[0] || 1 });
          }}
          autoFocus
          className="admin-input-compact"
        >
          {itemTypes.map((type) => (
            <option key={type.id} value={type.id}>
              {type.name}
            </option>
          ))}
        </select>

        <select
          value={newItem.level}
          onChange={(e) => setNewItem({ ...newItem, level: parseInt(e.target.value) })}
          className="admin-input-compact"
        >
          {itemTypes.find((t) => t.id === newItem.itemId)?.levels.map((level) => (
            <option key={level} value={level}>
              L{level}
            </option>
          ))}
        </select>

        <input
          type="number"
          value={newItem.quantity}
          onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 1 })}
          min="1"
          placeholder="Qty"
          className="admin-input-compact"
        />

        <div className="admin-form-buttons">
          <button
            type="submit"
            className="admin-form-button admin-form-button-submit"
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => {
              setShowForm(false);
              setNewItem({ 
                itemId: categoryId, 
                level: categoryType?.levels[0] || 1, 
                quantity: 1 
              });
            }}
            className="admin-form-button admin-form-button-cancel"
          >
            ✕
          </button>
        </div>
      </form>
    </div>
  );
}

export function ItemsTab({ isAdminWalletConnected, connectedAddress, adminAddress, styles }: ItemsTabProps) {
  const [manageOperation, setManageOperation] = useState<'add' | 'remove'>('add');
  
  // Add items state
  const [playerAddress, setPlayerAddress] = useState('');
  const [items, setItems] = useState<Item[]>([
    { itemId: 'extraLives', level: 1, quantity: 1 }
  ]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [itemsResult, setItemsResult] = useState<{ success: boolean; message?: string; error?: string; digest?: string } | null>(null);

  // Remove items state
  const [removePlayerAddress, setRemovePlayerAddress] = useState('');
  const [removeItems, setRemoveItems] = useState<Item[]>([
    { itemId: 'extraLives', level: 1, quantity: 1 }
  ]);
  const [removeItemsLoading, setRemoveItemsLoading] = useState(false);
  const [removeItemsResult, setRemoveItemsResult] = useState<{ success: boolean; message?: string; error?: string; digest?: string } | null>(null);

  // View inventory state
  const [viewAddress, setViewAddress] = useState('');
  const [viewInventory, setViewInventory] = useState<Record<string, number> | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewError, setViewError] = useState<string | null>(null);
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);
  const [walletInventories, setWalletInventories] = useState<Record<string, { inventory: Record<string, number> | null; loading: boolean; error: string | null }>>({});
  
  // Pending changes queue - global across all wallets
  interface PendingChange {
    address: string;
    itemId: string;
    level: number;
    currentQuantity: number;
    targetQuantity: number;
  }
  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>([]);
  const [applyResult, setApplyResult] = useState<{ success: boolean; message?: string; error?: string } | null>(null);
  const [allInventories, setAllInventories] = useState<UserInventory[]>([]);
  const [loadingAllInventories, setLoadingAllInventories] = useState(false);
  const [bulkOperation, setBulkOperation] = useState<'add' | 'remove'>('add');
  const [bulkItems, setBulkItems] = useState<Item[]>([
    { itemId: 'extraLives', level: 1, quantity: 1 }
  ]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResult, setBulkResult] = useState<{ success: boolean; processed?: number; successful?: number; failed?: number; errors?: string[] } | null>(null);

  // Check if wallet has inventory
  const checkWalletExists = async (address: string): Promise<boolean> => {
    try {
      const response = await fetch(getApiUrl(`api/store/inventory/${address}`));
      const data = await response.json();
      return response.ok && data.success;
    } catch {
      return false;
    }
  };

  // Refresh inventory for a specific wallet
  const refreshWalletInventory = async (address: string) => {
    setWalletInventories(prev => ({
      ...prev,
      [address]: { ...prev[address], loading: true, error: null }
    }));
    
    try {
      const response = await fetch(getApiUrl(`api/store/inventory/${address}`));
      const data = await response.json();

      if (response.ok && data.success) {
        setWalletInventories(prev => ({
          ...prev,
          [address]: { inventory: data.inventory || {}, loading: false, error: null }
        }));
      } else {
        setWalletInventories(prev => ({
          ...prev,
          [address]: { inventory: null, loading: false, error: data.error || 'Failed to load inventory' }
        }));
      }
    } catch (error) {
      setWalletInventories(prev => ({
        ...prev,
        [address]: { inventory: null, loading: false, error: error instanceof Error ? error.message : 'Network error' }
      }));
    }
  };

  // Wallet discovery hook
  const walletDiscovery = useWalletDiscovery({
    isAdminWalletConnected,
    connectedAddress,
    adminAddress,
    discoveryType: 'inventory',
    checkWalletExists,
    onWalletsDiscovered: () => {
      setWalletInventories({});
    },
    onWalletExpanded: (address) => {
      // Load inventory if not already loaded
      if (!walletInventories[address] || walletInventories[address].inventory === null) {
        refreshWalletInventory(address);
      }
    },
  });

  // Helper functions
  const addItem = (itemList: Item[], setItemList: (items: Item[]) => void) => {
    setItemList([...itemList, { itemId: 'extraLives', level: 1, quantity: 1 }]);
  };

  const removeItemFromList = (index: number, itemList: Item[], setItemList: (items: Item[]) => void) => {
    setItemList(itemList.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: any, itemList: Item[], setItemList: (items: Item[]) => void) => {
    const newItems = [...itemList];
    const item = newItems[index];
    
    if (field === 'level' || field === 'quantity') {
      (item as any)[field] = parseInt(value) || 1;
    } else {
      (item as any)[field] = value;
      if (field === 'itemId') {
        item.level = 1;
      }
    }
    
    setItemList(newItems);
  };

  // Toggle wallet expansion with data loading
  const toggleWalletExpansion = (address: string) => {
    walletDiscovery.toggleWalletExpansion(address);
    // Load inventory if not already loaded
    if (!walletInventories[address] || walletInventories[address].inventory === null) {
      refreshWalletInventory(address);
    }
  };

  // Load all inventories
  const handleLoadAllInventories = async () => {
    if (walletDiscovery.discoveredWallets.length === 0) {
      alert('Please discover wallets first.');
      return;
    }

    setLoadingAllInventories(true);
    setAllInventories([]);

    const inventories: UserInventory[] = [];
    
    for (const address of walletDiscovery.discoveredWallets) {
      try {
        const response = await fetch(getApiUrl(`api/store/inventory/${address}`));
        const data = await response.json();
        
        if (response.ok && data.success) {
          inventories.push({
            address,
            inventory: data.inventory || {},
          });
        } else {
          inventories.push({
            address,
            inventory: {},
            error: data.error || 'Failed to load',
          });
        }
      } catch (error) {
        inventories.push({
          address,
          inventory: {},
          error: error instanceof Error ? error.message : 'Network error',
        });
      }
    }

    setAllInventories(inventories);
    setLoadingAllInventories(false);
  };

  // Add items handler
  const handleAddItems = async (e: React.FormEvent, targetAddress?: string) => {
    e.preventDefault();
    const address = targetAddress || playerAddress;
    
    setItemsLoading(true);
    setItemsResult(null);

    try {
      const response = await fetch(getApiUrl('api/admin/add-items'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerAddress: address,
          items: items.map(item => ({
            itemId: item.itemId,
            level: item.level,
            quantity: item.quantity,
          })),
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
        if (!targetAddress) {
        setPlayerAddress('');
        setItems([{ itemId: 'extraLives', level: 1, quantity: 1 }]);
        }
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

  // Remove items handler
  const handleRemoveItems = async (e: React.FormEvent, targetAddress?: string) => {
    e.preventDefault();
    const address = targetAddress || removePlayerAddress;
    
    setRemoveItemsLoading(true);
    setRemoveItemsResult(null);

    try {
      const response = await fetch(getApiUrl('api/admin/inventory/remove-items'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerAddress: address,
          items: removeItems.map(item => ({
            itemId: item.itemId,
            level: item.level,
            quantity: item.quantity,
          })),
          adminWalletAddress: connectedAddress,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setRemoveItemsResult({
          success: true,
          message: data.message,
          digest: data.digest,
        });
        if (!targetAddress) {
          setRemovePlayerAddress('');
          setRemoveItems([{ itemId: 'extraLives', level: 1, quantity: 1 }]);
        }
      } else {
        setRemoveItemsResult({
          success: false,
          error: data.error || 'Failed to remove items',
        });
      }
    } catch (error) {
      setRemoveItemsResult({
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      });
    } finally {
      setRemoveItemsLoading(false);
    }
  };

  // View inventory handler
  const handleViewInventory = async (address?: string) => {
    const targetAddress = address || viewAddress;
    if (!targetAddress) {
      setViewError('Please enter a wallet address');
      return;
    }

    setViewLoading(true);
    setViewError(null);
    setViewInventory(null);
    setSelectedWallet(targetAddress);
    setViewAddress(targetAddress);
    // Set the address for management operations
    setPlayerAddress(targetAddress);
    setRemovePlayerAddress(targetAddress);

    try {
      const response = await fetch(getApiUrl(`api/store/inventory/${targetAddress}`));
      const data = await response.json();

      if (response.ok && data.success) {
        setViewInventory(data.inventory || {});
      } else {
        setViewError(data.error || 'Failed to load inventory');
      }
    } catch (error) {
      setViewError(error instanceof Error ? error.message : 'Network error');
    } finally {
      setViewLoading(false);
    }
  };

  // Bulk operation handler
  const handleBulkOperation = async () => {
    if (walletDiscovery.discoveredWallets.length === 0) {
      alert('Please discover wallets first.');
      return;
    }

    setBulkLoading(true);
    setBulkResult(null);

    let processed = 0;
    let successful = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const address of walletDiscovery.discoveredWallets) {
      try {
        const endpoint = bulkOperation === 'add' 
          ? 'api/admin/add-items'
          : 'api/admin/inventory/remove-items';
        
        const response = await fetch(getApiUrl(endpoint), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            playerAddress: address,
            items: bulkItems.map(item => ({
              itemId: item.itemId,
              level: item.level,
              quantity: item.quantity,
            })),
            adminWalletAddress: connectedAddress,
          }),
        });

        const data = await response.json();
        processed++;

        if (response.ok && data.success) {
          successful++;
        } else {
          failed++;
          errors.push(`${address}: ${data.error || 'Failed'}`);
        }
      } catch (error) {
        failed++;
        errors.push(`${address}: ${error instanceof Error ? error.message : 'Network error'}`);
      }
    }

    setBulkResult({
      success: failed === 0,
      processed,
      successful,
      failed,
      errors: errors.length > 0 ? errors : undefined,
    });
    setBulkLoading(false);
  };

  // Format inventory for display
  const formatInventory = (inventory: Record<string, number>): Array<{ itemId: string; level: number; quantity: number }> => {
    const formatted: Array<{ itemId: string; level: number; quantity: number }> = [];
    
    for (const [key, quantity] of Object.entries(inventory)) {
      if (quantity > 0) {
        const parts = key.split('_');
        if (parts.length >= 2) {
          const itemId = parts.slice(0, -1).join('_');
          const level = parseInt(parts[parts.length - 1]);
          formatted.push({ itemId, level, quantity });
        }
      }
    }
    
    return formatted.sort((a, b) => {
      if (a.itemId !== b.itemId) return a.itemId.localeCompare(b.itemId);
      return a.level - b.level;
    });
  };

  if (!isAdminWalletConnected) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: styles.text }}>
        Please connect the admin wallet to access inventory management.
      </div>
    );
  }

  // Pending changes management - global across all wallets
  const updatePendingChange = (address: string, itemId: string, level: number, targetQuantity: number) => {
    const walletData = walletInventories[address];
    if (!walletData || !walletData.inventory) return;

    const key = `${itemId}_${level}`;
    const currentQuantity = walletData.inventory[key] || 0;

    setPendingChanges(prev => {
      const existingIndex = prev.findIndex(
        change => change.address === address && change.itemId === itemId && change.level === level
      );

      if (targetQuantity === currentQuantity) {
        // No change - remove from queue
        return prev.filter(
          change => !(change.address === address && change.itemId === itemId && change.level === level)
        );
      } else {
        const newChange: PendingChange = {
          address,
          itemId,
          level,
          currentQuantity,
          targetQuantity,
        };
        if (existingIndex >= 0) {
          const newChanges = [...prev];
          newChanges[existingIndex] = newChange;
          return newChanges;
        } else {
          return [...prev, newChange];
        }
      }
    });
  };

  const removeOneFromPendingChange = (address: string, itemId: string, level: number) => {
    setPendingChanges(prev => {
      const existingIndex = prev.findIndex(
        change => change.address === address && change.itemId === itemId && change.level === level
      );

      if (existingIndex < 0) return prev;

      const change = prev[existingIndex];
      const newTargetQuantity = change.targetQuantity > change.currentQuantity
        ? change.targetQuantity - 1
        : change.targetQuantity + 1;

      if (newTargetQuantity === change.currentQuantity) {
        // Remove from queue if back to current
        return prev.filter((_, i) => i !== existingIndex);
      } else {
        const newChanges = [...prev];
        newChanges[existingIndex] = { ...change, targetQuantity: newTargetQuantity };
        return newChanges;
      }
    });
  };

  const clearPendingChanges = () => {
    setPendingChanges([]);
    setApplyResult(null);
  };

  const applyPendingChanges = async () => {
    if (pendingChanges.length === 0) return;

    setItemsLoading(true);
    setRemoveItemsLoading(true);

    try {
      // Group changes by wallet address
      const changesByAddress: Record<string, PendingChange[]> = {};
      for (const change of pendingChanges) {
        if (!changesByAddress[change.address]) {
          changesByAddress[change.address] = [];
        }
        changesByAddress[change.address].push(change);
      }

      // Execute operations for each wallet
      const promises: Promise<any>[] = [];

      for (const [walletAddress, walletChanges] of Object.entries(changesByAddress)) {
        const itemsToAdd: Item[] = [];
        const itemsToRemove: Item[] = [];

        for (const change of walletChanges) {
          const difference = change.targetQuantity - change.currentQuantity;
          if (difference > 0) {
            itemsToAdd.push({
              itemId: change.itemId,
              level: change.level,
              quantity: difference,
            });
          } else if (difference < 0) {
            itemsToRemove.push({
              itemId: change.itemId,
              level: change.level,
              quantity: Math.abs(difference),
            });
          }
        }

        if (itemsToAdd.length > 0) {
          promises.push(
            fetch(getApiUrl('api/admin/inventory/add-items'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                playerAddress: walletAddress,
                items: itemsToAdd,
                adminWalletAddress: connectedAddress,
              }),
            })
          );
        }

        if (itemsToRemove.length > 0) {
          promises.push(
            fetch(getApiUrl('api/admin/inventory/remove-items'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                playerAddress: walletAddress,
                items: itemsToRemove,
                adminWalletAddress: connectedAddress,
              }),
            })
          );
        }
      }

      const results = await Promise.all(promises);
      const responses = await Promise.all(results.map(async (response) => {
        const data = await response.json();
        return { ok: response.ok, data };
      }));

      const allSuccess = responses.every(r => r.ok && r.data.success);
      const errors = responses.filter(r => !r.ok || !r.data.success).map(r => r.data.error || 'Unknown error');

      if (allSuccess) {
        const changeCount = pendingChanges.length;
        const walletCount = Object.keys(changesByAddress).length;
        setApplyResult({
          success: true,
          message: `Successfully applied ${changeCount} change${changeCount !== 1 ? 's' : ''} across ${walletCount} wallet${walletCount !== 1 ? 's' : ''}!`,
        });
        clearPendingChanges();
        
        // Refresh all affected wallets
        for (const walletAddress of Object.keys(changesByAddress)) {
          await refreshWalletInventory(walletAddress);
        }
        
        // Clear success message after 5 seconds
        setTimeout(() => {
          setApplyResult(null);
        }, 5000);
      } else {
        setApplyResult({
          success: false,
          error: errors.length > 0 ? errors.join(', ') : 'Some changes failed to apply',
        });
      }
    } catch (error) {
      setApplyResult({
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      });
    } finally {
      setItemsLoading(false);
      setRemoveItemsLoading(false);
    }
  };

  const getPendingChange = (address: string, itemId: string, level: number): PendingChange | null => {
    return pendingChanges.find(c => c.address === address && c.itemId === itemId && c.level === level) || null;
  };

  const getPendingChangesCount = (address?: string): number => {
    if (address) {
      return pendingChanges.filter(c => c.address === address).length;
    }
    return pendingChanges.length;
  };

  return (
    <>
      {/* Inventory-specific styles - using shared classes from AdminStylesProvider */}
      <style>{`
        /* Inventory-specific overrides and additions */
        .inventory-item-card {
          /* Extends admin-card-compact */
        }
        
        .inventory-item-card.has-change-positive {
          /* Extends admin-card-positive */
        }
        
        .inventory-item-card.has-change-negative {
          /* Extends admin-card-negative */
        }
        
        .inventory-item-content {
          /* Extends admin-content */
        }
        
        .inventory-quantity-section {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
          flex: 1;
        }
        
        .inventory-quantity-row {
          /* Extends admin-content-row */
        }
        
        .inventory-quantity-value {
          /* Extends admin-value */
        }
        
        .inventory-target-input {
          /* Extends admin-input-number */
        }
        
        .inventory-button-row {
          display: flex;
          gap: 0.35rem;
          margin-top: 0.15rem;
        }
        
        .inventory-button {
          width: 50%;
          /* Extends admin-button-small */
        }
      `}</style>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Discover Wallets Section */}
      <div className="admin-section">
        <div className="admin-section-header">
          <h2 className="admin-section-title">🔍 Discover Wallets with Inventory</h2>
          {pendingChanges.length > 0 && (
            <span className="admin-badge admin-badge-primary">
              {pendingChanges.length} change{pendingChanges.length !== 1 ? 's' : ''} pending
            </span>
          )}
        </div>
        
        <WalletDiscoveryUI
          styles={styles}
          title="🔍 Discover Wallets with Inventory"
          discoverButtonText="🔍 Discover All Wallets with Inventory"
          searchAddress={walletDiscovery.searchAddress}
          setSearchAddress={walletDiscovery.setSearchAddress}
          onSearch={walletDiscovery.handleSearchWallet}
          onDiscover={walletDiscovery.handleDiscoverWallets}
          searchingWallet={walletDiscovery.searchingWallet}
          discoveringWallets={walletDiscovery.discoveringWallets}
          discoveredWalletsCount={walletDiscovery.discoveredWallets.length}
          badgeContent={pendingChanges.length > 0 ? (
            <span className="admin-badge admin-badge-primary">
              {pendingChanges.length} change{pendingChanges.length !== 1 ? 's' : ''} pending
            </span>
          ) : undefined}
        />

        <WalletList
          styles={styles}
          wallets={walletDiscovery.discoveredWallets}
          filteredWallets={walletDiscovery.filteredWallets}
          searchAddress={walletDiscovery.searchAddress}
          expandedWallets={walletDiscovery.expandedWallets}
          onToggleExpansion={toggleWalletExpansion}
          getWalletData={(address) => walletInventories[address] || { inventory: null, loading: false, error: null }}
          renderWalletContent={(address, isExpanded, walletData) => {
            if (walletData.loading) {
              return (
                <div style={{ padding: '2rem', textAlign: 'center', color: styles.textSecondary }}>
                  Loading inventory...
                </div>
              );
            }

            if (walletData.error) {
              return (
                <div
                  style={{
                    padding: '1rem',
                    borderRadius: '4px',
                    backgroundColor: styles.bgError,
                    border: `1px solid ${styles.borderError}`,
                    color: styles.textError,
                    marginBottom: '1.5rem',
                  }}
                >
                  <strong>❌ Error:</strong> {walletData.error}
                </div>
              );
            }

            if (walletData.inventory === null) {
              return null;
            }

            return (
              <div>
                {/* Wallet Header with pending badge - custom for inventory */}
                <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <h4 style={{ margin: 0, color: styles.text }}>
                    Inventory for {address.slice(0, 10)}...{address.slice(-8)}
                  </h4>
                  {getPendingChangesCount(address) > 0 && (
                    <span className="admin-badge admin-badge-primary">
                      {getPendingChangesCount(address)} pending
                    </span>
                  )}
                </div>

                {/* Inventory Display */}
                {walletData.error && (
                  <div
                    style={{
                      padding: '1rem',
                      borderRadius: '4px',
                      backgroundColor: styles.bgError,
                      border: `1px solid ${styles.borderError}`,
                      color: styles.textError,
                      marginBottom: '1.5rem',
                    }}
                  >
                    <strong>❌ Error:</strong> {walletData.error}
                  </div>
                )}

                {walletData.inventory !== null && !walletData.loading && (
                  (() => {
                          // Get all items from inventory
                          const inventoryItems = formatInventory(walletData.inventory);
                          
                          // Get all pending changes for this wallet
                          const walletPendingChanges = pendingChanges.filter(c => c.address === address);
                          
                          // Create a map of existing items for quick lookup
                          const existingItemsMap = new Map<string, { itemId: string; level: number; quantity: number }>();
                          inventoryItems.forEach(item => {
                            const key = `${item.itemId}_${item.level}`;
                            existingItemsMap.set(key, item);
                          });
                          
                          // Add pending changes that don't exist in inventory yet
                          walletPendingChanges.forEach(change => {
                            const key = `${change.itemId}_${change.level}`;
                            if (!existingItemsMap.has(key) && change.targetQuantity > 0) {
                              existingItemsMap.set(key, {
                                itemId: change.itemId,
                                level: change.level,
                                quantity: 0, // New item, not in inventory yet
                              });
                            }
                          });
                          
                          // Convert back to array
                          const allItems = Array.from(existingItemsMap.values());
                          
                          // Group items by category (itemId)
                          const itemsByCategory = new Map<string, Array<{ itemId: string; level: number; quantity: number }>>();
                          allItems.forEach(item => {
                            if (!itemsByCategory.has(item.itemId)) {
                              itemsByCategory.set(item.itemId, []);
                            }
                            itemsByCategory.get(item.itemId)!.push(item);
                          });
                          
                          // Sort items within each category by level (1, 2, 3)
                          itemsByCategory.forEach((items, itemId) => {
                            items.sort((a, b) => a.level - b.level);
                          });
                          
                          // Get categories in proper order (matching store-inventory-tab.js)
                          const properItemOrder = ['extraLives', 'forceField', 'orbLevel', 'coinTractorBeam', 'slowTime', 'destroyAll', 'bossKillShot'];
                          const orderedCategories = properItemOrder.filter(id => itemsByCategory.has(id));
                          
                          return (
                            <div style={{ marginBottom: '1.5rem' }}>
                              <h4 style={{ marginTop: 0, marginBottom: '1rem', color: styles.text, fontSize: '1.1rem' }}>Current Inventory</h4>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {orderedCategories.map((categoryId, categoryIndex) => {
                                  const categoryItems = itemsByCategory.get(categoryId)!;
                                  const categoryType = itemTypes.find(t => t.id === categoryId);
                                  
                                  return (
                                    <div 
                                      key={categoryId} 
                                      style={{ 
                                        display: 'flex', 
                                        flexDirection: 'column', 
                                        gap: '0.5rem',
                                        padding: '0.75rem',
                                        backgroundColor: styles.bgSecondary,
                                        borderRadius: '8px',
                                        border: `1px solid ${styles.border}`,
                                        boxShadow: '0 1px 4px rgba(0, 0, 0, 0.08)',
                                      }}
                                    >
                                      <div style={{ 
                                        paddingBottom: '0.5rem',
                                        borderBottom: `1px solid ${styles.border}`,
                                        marginBottom: '0.25rem',
                                      }}>
                                        <h5 style={{ 
                                          margin: 0, 
                                          color: styles.text, 
                                          fontSize: '0.95rem', 
                                          fontWeight: 'bold' 
                                        }}>
                                          {categoryType?.name || categoryId}
                                        </h5>
                                      </div>
                                      <div style={{ 
                                        display: 'grid', 
                                        gridTemplateColumns: 'repeat(4, 1fr)', 
                                        gap: '0.75rem' 
                                      }}>
                                        {[1, 2, 3].map((level) => {
                                          const item = categoryItems.find(i => i.level === level);
                                          if (!item) return null;
                                          
                                          const itemType = itemTypes.find(t => t.id === item.itemId);
                                          const pendingChange = getPendingChange(address, item.itemId, item.level);
                                          const currentQuantity = item.quantity;
                                          const targetQuantity = pendingChange ? pendingChange.targetQuantity : currentQuantity;
                                          const difference = targetQuantity - currentQuantity;
                                          const hasChange = difference !== 0;
                                          
                                          return (
                                            <div
                                              key={`${item.itemId}_${item.level}`}
                                              className={`admin-card-compact inventory-item-card ${hasChange ? (difference > 0 ? 'admin-card-positive has-change-positive' : 'admin-card-negative has-change-negative') : ''}`}
                                              style={{
                                                backgroundColor: !hasChange ? styles.bgTertiary : undefined,
                                                borderColor: !hasChange ? styles.border : undefined,
                                              }}
                                            >
                                              <div className="admin-content inventory-item-content">
                                                <div className="admin-level-badge">
                                                  <span className="admin-level-text">
                                                    L{item.level}
                                                  </span>
                                                </div>
                                                <div className="inventory-quantity-section">
                                                  <div className="admin-content-row inventory-quantity-row">
                                                    <span className="admin-label-small">Cur:</span>
                                                    <span className="admin-value inventory-quantity-value">{currentQuantity}</span>
                                                  </div>
                                                  <div className="admin-content-row inventory-quantity-row" style={{ flexWrap: 'wrap' }}>
                                                    <span className="admin-label-bold">Tgt:</span>
                                                    <input
                                                      type="number"
                                                      value={targetQuantity}
                                                      onChange={(e) => {
                                                        const newValue = parseInt(e.target.value) || 0;
                                                        updatePendingChange(address, item.itemId, item.level, newValue);
                                                      }}
                                                      min="0"
                                                      className="admin-input-number inventory-target-input"
                                                      style={{
                                                        borderColor: hasChange ? (difference > 0 ? '#4CAF50' : '#f44336') : styles.border,
                                                        borderWidth: '1.5px',
                                                        borderStyle: 'solid',
                                                      }}
                                                      onWheel={(e) => e.currentTarget.blur()}
                                                    />
                                                    {hasChange && (
                                                      <span
                                                        className={`admin-badge-${difference > 0 ? 'positive' : 'negative'}`}
                                                      >
                                                        {difference > 0 ? '+' : ''}{difference}
                                                      </span>
                                                    )}
                                                  </div>
                                                </div>
                                              </div>
                                              
                                              <div className="inventory-button-row">
                                                <button
                                                  type="button"
                                                  onClick={() => updatePendingChange(address, item.itemId, item.level, targetQuantity + 1)}
                                                  disabled={itemsLoading || removeItemsLoading}
                                                  className="admin-button-small admin-button-add inventory-button"
                                                  onMouseEnter={(e) => {
                                                    if (!itemsLoading && !removeItemsLoading) e.currentTarget.style.opacity = '0.8';
                                                  }}
                                                  onMouseLeave={(e) => {
                                                    e.currentTarget.style.opacity = '1';
                                                  }}
                                                  title="Add 1"
                                                >
                                                  +
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => updatePendingChange(address, item.itemId, item.level, Math.max(0, targetQuantity - 1))}
                                                  disabled={(itemsLoading || removeItemsLoading) || targetQuantity <= 0}
                                                  className="admin-button-small admin-button-remove inventory-button"
                                                  style={{
                                                    backgroundColor: ((itemsLoading || removeItemsLoading) || targetQuantity <= 0) ? styles.buttonDisabled : undefined,
                                                    cursor: ((itemsLoading || removeItemsLoading) || targetQuantity <= 0) ? 'not-allowed' : 'pointer',
                                                  }}
                                                  onMouseEnter={(e) => {
                                                    if (!itemsLoading && !removeItemsLoading && targetQuantity > 0) e.currentTarget.style.opacity = '0.8';
                                                  }}
                                                  onMouseLeave={(e) => {
                                                    e.currentTarget.style.opacity = '1';
                                                  }}
                                                  title="Remove 1"
                                                >
                                                  −
                                                </button>
                                              </div>
                                            </div>
                                          );
                                        })}
                                        
                                        {/* Add Item Card - 4th Column */}
                                        <CategoryAddItemCard
                                          address={address}
                                          categoryId={categoryId}
                                          onAdd={(addr, itemId, level, quantity) => {
                                            const walletData = walletInventories[addr];
                                            if (walletData && walletData.inventory) {
                                              const key = `${itemId}_${level}`;
                                              const currentQuantity = walletData.inventory[key] || 0;
                                              updatePendingChange(addr, itemId, level, currentQuantity + quantity);
                                            } else {
                                              // If inventory hasn't been loaded yet, still add to pending changes
                                              // The item will show up with quantity 0 in the display
                                              updatePendingChange(addr, itemId, level, quantity);
                                            }
                                          }}
                                          styles={styles}
                                          itemTypes={itemTypes}
                                        />
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })()
                )}
              </div>
            );
          }}
        />
      </div>

      {/* Global Pending Changes Sticky Bar */}
      {pendingChanges.length > 0 && (
        <div
          style={{
            position: 'sticky',
            bottom: 0,
            padding: '1.5rem',
            backgroundColor: styles.bgSecondary,
            borderTop: `3px solid ${styles.border}`,
            borderRadius: '8px 8px 0 0',
            boxShadow: '0 -4px 12px rgba(0,0,0,0.15)',
            zIndex: 100,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ fontWeight: 'bold', color: styles.text, fontSize: '1.1rem' }}>
              Pending Changes ({pendingChanges.length}):
            </div>
            
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.75rem',
                maxHeight: '200px',
                overflowY: 'auto',
                padding: '0.5rem',
                backgroundColor: styles.bgTertiary,
                borderRadius: '4px',
              }}
            >
              {pendingChanges.map((change, idx) => {
                const itemType = itemTypes.find(t => t.id === change.itemId);
                const difference = change.targetQuantity - change.currentQuantity;
                return (
                  <div
                    key={idx}
                    onClick={() => removeOneFromPendingChange(change.address, change.itemId, change.level)}
                    style={{
                      padding: '0.75rem',
                      backgroundColor: difference > 0 ? 'rgba(76, 175, 80, 0.2)' : 'rgba(244, 67, 54, 0.2)',
                      border: `2px solid ${difference > 0 ? '#4CAF50' : '#f44336'}`,
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                      minWidth: '200px',
                    }}
                    title="Click to remove 1 from this change"
                  >
                    <div style={{ fontSize: '0.85rem', color: styles.textSecondary, fontFamily: 'monospace' }}>
                      {change.address.slice(0, 8)}...{change.address.slice(-6)}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ color: styles.text, fontWeight: '500' }}>
                        {itemType?.name || change.itemId} L{change.level}:
                      </span>
                      <input
                        type="number"
                        value={change.targetQuantity}
                        onChange={(e) => {
                          const newValue = parseInt(e.target.value) || 0;
                          updatePendingChange(change.address, change.itemId, change.level, newValue);
                        }}
                        min="0"
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          width: '50px',
                          padding: '0.25rem',
                          border: `1px solid ${styles.border}`,
                          borderRadius: '4px',
                          backgroundColor: styles.inputBg,
                          color: styles.text,
                          fontSize: '0.9rem',
                          textAlign: 'center',
                        }}
                      />
                      <span
                        style={{
                          color: difference > 0 ? '#4CAF50' : '#f44336',
                          fontWeight: 'bold',
                          fontSize: '0.9rem',
                        }}
                      >
                        {difference > 0 ? '+' : ''}{difference}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {applyResult && (
              <div
                style={{
                  padding: '0.75rem',
                  borderRadius: '4px',
                  backgroundColor: applyResult.success ? styles.bgSuccess : styles.bgError,
                  border: `1px solid ${applyResult.success ? styles.borderSuccess : styles.borderError}`,
                  color: applyResult.success ? styles.text : styles.textError,
                }}
              >
                {applyResult.success ? (
                  <div>
                    <strong>✅ {applyResult.message}</strong>
                  </div>
                ) : (
                  <div>
                    <strong>❌ Error:</strong> {applyResult.error}
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => applyPendingChanges()}
                disabled={itemsLoading || removeItemsLoading}
                style={{
                  flex: 1,
                  padding: '1rem',
                  fontSize: '1.1rem',
                  backgroundColor: (itemsLoading || removeItemsLoading) ? styles.buttonDisabled : styles.buttonPrimary,
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: (itemsLoading || removeItemsLoading) ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                }}
              >
                {(itemsLoading || removeItemsLoading) ? 'Applying...' : 'Apply All Changes'}
              </button>
              <button
                type="button"
                onClick={() => clearPendingChanges()}
                disabled={itemsLoading || removeItemsLoading}
                style={{
                  flex: 1,
                  padding: '1rem',
                  fontSize: '1.1rem',
                  backgroundColor: styles.bgTertiary,
                  color: styles.text,
                  border: `1px solid ${styles.border}`,
                  borderRadius: '4px',
                  cursor: (itemsLoading || removeItemsLoading) ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                }}
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Operations Section */}
      {walletDiscovery.discoveredWallets.length > 0 && (
        <div style={{ padding: '1.5rem', backgroundColor: styles.bgSecondary, borderRadius: '8px', border: `1px solid ${styles.border}` }}>
          <h2 style={{ marginTop: 0, marginBottom: '1.5rem', color: styles.text, fontSize: '1.5rem' }}>📦 Bulk Operations</h2>
          
          <div>
            <button
              type="button"
              onClick={handleLoadAllInventories}
              disabled={loadingAllInventories}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: loadingAllInventories ? styles.buttonDisabled : styles.buttonPrimary,
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: loadingAllInventories ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
                marginBottom: '1.5rem',
              }}
            >
              {loadingAllInventories ? 'Loading...' : '📋 Load All Inventories'}
            </button>
          </div>

          {allInventories.length > 0 && (
            <div
              style={{
                maxHeight: '400px',
                overflowY: 'auto',
                padding: '1rem',
                backgroundColor: styles.bgTertiary,
                borderRadius: '4px',
                border: `1px solid ${styles.border}`,
                marginBottom: '1.5rem',
              }}
            >
              <h4 style={{ color: styles.text, marginTop: 0 }}>All Inventories</h4>
              {allInventories.map((userInv, index) => (
                <div
                  key={index}
                  style={{
                    marginBottom: '1rem',
                    padding: '1rem',
                    backgroundColor: styles.bgSecondary,
                    borderRadius: '4px',
                    border: `1px solid ${styles.border}`,
                    cursor: 'pointer',
                  }}
                  onClick={() => handleViewInventory(userInv.address)}
                  title="Click to view and manage this inventory"
                >
                  <div style={{ fontWeight: 'bold', color: styles.text, marginBottom: '0.5rem' }}>
                    {userInv.address.slice(0, 10)}...{userInv.address.slice(-8)}
                  </div>
                  {userInv.error ? (
                    <div style={{ color: styles.textError }}>Error: {userInv.error}</div>
                  ) : (
                    <div style={{ color: styles.textSecondary, fontSize: '0.9rem' }}>
                      {Object.keys(userInv.inventory).length === 0
                        ? 'No items'
                        : `${Object.keys(userInv.inventory).length} item type(s)`}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div>
                <h3 style={{ color: styles.text, marginBottom: '1rem' }}>Bulk Operation</h3>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: styles.text }}>
                    Operation Type:
                  </label>
                  <select
                    value={bulkOperation}
                    onChange={(e) => setBulkOperation(e.target.value as 'add' | 'remove')}
                    style={{
                      padding: '0.5rem',
                      border: `1px solid ${styles.border}`,
                      borderRadius: '4px',
                      backgroundColor: styles.inputBg,
                      color: styles.text,
                    }}
                  >
                    <option value="add">Add Items</option>
                    <option value="remove">Remove Items</option>
                  </select>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <label style={{ fontWeight: 'bold', color: styles.text }}>Items:</label>
                    <button
                      type="button"
                      onClick={() => addItem(bulkItems, setBulkItems)}
                      style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: bulkOperation === 'add' ? '#4CAF50' : '#f44336',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                      }}
                    >
                      + Add Item
                    </button>
                  </div>

                  {bulkItems.map((item, index) => (
                    <div
                      key={index}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '2fr 1fr 1fr auto',
                        gap: '0.5rem',
                        marginBottom: '0.5rem',
                        padding: '1rem',
                        backgroundColor: styles.bgSecondary,
                        borderRadius: '4px',
                        border: `1px solid ${styles.border}`,
                      }}
                    >
                      <select
                        value={item.itemId}
                        onChange={(e) => updateItem(index, 'itemId', e.target.value, bulkItems, setBulkItems)}
                        style={{
                          padding: '0.5rem',
                          border: `1px solid ${styles.border}`,
                          borderRadius: '4px',
                          backgroundColor: styles.inputBg,
                          color: styles.text,
                        }}
                      >
                        {itemTypes.map((type) => (
                          <option key={type.id} value={type.id}>
                            {type.name}
                          </option>
                        ))}
                      </select>

                      <select
                        value={item.level}
                        onChange={(e) => updateItem(index, 'level', e.target.value, bulkItems, setBulkItems)}
                        style={{
                          padding: '0.5rem',
                          border: `1px solid ${styles.border}`,
                          borderRadius: '4px',
                          backgroundColor: styles.inputBg,
                          color: styles.text,
                        }}
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
                        onChange={(e) => updateItem(index, 'quantity', e.target.value, bulkItems, setBulkItems)}
                        min="1"
                        style={{
                          padding: '0.5rem',
                          border: `1px solid ${styles.border}`,
                          borderRadius: '4px',
                          backgroundColor: styles.inputBg,
                          color: styles.text,
                        }}
                      />

                      {bulkItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItemFromList(index, bulkItems, setBulkItems)}
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

                {bulkResult && (
                  <div
                    style={{
                      padding: '1rem',
                      borderRadius: '4px',
                      backgroundColor: bulkResult.success ? styles.bgSuccess : styles.bgWarning,
                      border: `1px solid ${bulkResult.success ? styles.borderSuccess : styles.border}`,
                      color: styles.text,
                    }}
                  >
                    <strong>{bulkResult.success ? '✅ Success!' : '⚠️ Completed with errors'}</strong>
                    <p>Processed: {bulkResult.processed}, Successful: {bulkResult.successful}, Failed: {bulkResult.failed}</p>
                    {bulkResult.errors && bulkResult.errors.length > 0 && (
                      <div style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
                        <strong>Errors:</strong>
                        <ul style={{ marginTop: '0.25rem', paddingLeft: '1.5rem' }}>
                          {bulkResult.errors.slice(0, 10).map((error, idx) => (
                            <li key={idx}>{error}</li>
                          ))}
                          {bulkResult.errors.length > 10 && (
                            <li>... and {bulkResult.errors.length - 10} more</li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleBulkOperation}
                  disabled={bulkLoading || bulkItems.length === 0}
                  style={{
                    padding: '1rem',
                    fontSize: '1.1rem',
                    backgroundColor: bulkLoading ? styles.buttonDisabled : (bulkOperation === 'add' ? styles.buttonPrimary : styles.buttonDanger),
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: bulkLoading ? 'not-allowed' : 'pointer',
                    fontWeight: 'bold',
                    marginTop: '1rem',
                  }}
                >
                  {bulkLoading
                    ? `${bulkOperation === 'add' ? 'Adding' : 'Removing'} Items...`
                    : `${bulkOperation === 'add' ? 'Add' : 'Remove'} Items to/from All ${walletDiscovery.discoveredWallets.length} Wallets`}
                </button>
              </div>
        </div>
      )}
      </div>
    </>
  );
}
