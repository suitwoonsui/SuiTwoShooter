// ==========================================
// Admin Page - Inventory Management Tab
// Full control over Items for individual users and all users
// ==========================================

'use client';

import React, { useState, useEffect } from 'react';
import { AdminStyles } from '../types';
import { getApiUrl } from '../utils/get-api-url';
import { useWalletDiscovery } from '../hooks/useWalletDiscovery';
import { WalletDiscoveryUI } from '../components/WalletDiscoveryUI';
import { WalletList } from '../components/WalletList';
import { CopyableAddress } from '../components/CopyableAddress';
import { MergeRecipeBuilder } from '../components/MergeRecipeBuilder';
import { StockroomTab } from './StockroomTab';
import { StoreItem, CATALOG_ITEM_ORDER } from '@/lib/services/store/catalog/item-catalog';
import { toDynamicProvisionKey } from '@/lib/services/store/catalog/item-id';

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
  { id: 'extra_lives', name: 'Extra Lives', levels: [1, 2, 3] },
  { id: 'force_field', name: 'Force Field', levels: [1, 2, 3] },
  { id: 'orb_level', name: 'Orb Level', levels: [1, 2, 3] },
  { id: 'slow_time', name: 'Slow Time', levels: [1, 2, 3] },
  // Non-leveled items (single key on-chain / in inventory)
  { id: 'destroy_all', name: 'Destroy All Enemies', levels: [] },
  { id: 'boss_kill_shot', name: 'Boss Kill Shot', levels: [] },
  { id: 'coin_tractor_beam', name: 'Coin Tractor Beam', levels: [1, 2, 3] },
];

// Add-one card: clicking "+" just increases the target for this category's first level (no form, no UI change).
function CategoryAddItemCard({
  onAddOne,
  disabled,
  styles,
}: {
  onAddOne: () => void;
  disabled?: boolean;
  styles: AdminStyles;
}) {
  return (
    <div
      className="admin-add-card"
      onClick={disabled ? undefined : onAddOne}
      title="Add 1 to target"
      style={{
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        height: '100%',
        minHeight: '80px',
      }}
    >
      <div className="admin-add-icon">+</div>
      <div className="admin-add-text">Add</div>
    </div>
  );
}

export function ItemsTab({ isAdminWalletConnected, connectedAddress, adminAddress, styles }: ItemsTabProps) {
  const [activeSection, setActiveSection] = useState<'inventory' | 'catalog' | 'stockroom' | 'merge-recipes'>('inventory');
  const [manageOperation, setManageOperation] = useState<'add' | 'remove'>('add');
  
  // Add items state
  const [playerAddress, setPlayerAddress] = useState('');
  const [items, setItems] = useState<Item[]>([
    { itemId: 'extra_lives', level: 1, quantity: 1 }
  ]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [itemsResult, setItemsResult] = useState<{ success: boolean; message?: string; error?: string; digest?: string } | null>(null);

  // Remove items state
  const [removePlayerAddress, setRemovePlayerAddress] = useState('');
  const [removeItems, setRemoveItems] = useState<Item[]>([
    { itemId: 'extra_lives', level: 1, quantity: 1 }
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
    { itemId: 'extra_lives', level: 1, quantity: 1 }
  ]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResult, setBulkResult] = useState<{ success: boolean; processed?: number; successful?: number; failed?: number; errors?: string[] } | null>(null);

  // Catalog management state
  const [catalog, setCatalog] = useState<Record<string, StoreItem> | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const getCatalogItem = (itemId: string): StoreItem | undefined => {
    if (!catalog) return undefined;
    return catalog[toDynamicProvisionKey(itemId)];
  };
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<StoreItem> | null>(null);

  // Check if wallet has inventory
  const checkWalletExists = async (address: string): Promise<boolean> => {
    try {
      // Include contract selection in the API call
      const contractParam = contractSelection;
      const response = await fetch(getApiUrl(`api/inventory/${address}?contract=${contractParam}&debug=1`));
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
      // Include contract selection in the API call
      const contractParam = contractSelection;
      const response = await fetch(getApiUrl(`api/inventory/${address}?contract=${contractParam}&debug=1`));
      const data = await response.json();

      if (response.ok && data.success) {
        setWalletInventories(prev => ({
          ...prev,
          [address]: { inventory: data.inventory || {}, loading: false, error: null }
        }));
      } else {
        // If inventory doesn't exist (404 or similar), treat it as empty inventory, not an error
        // This allows us to add items to wallets that don't have inventory yet
        if (response.status === 404 || (data.error && data.error.toLowerCase().includes('not found'))) {
          setWalletInventories(prev => ({
            ...prev,
            [address]: { inventory: null, loading: false, error: null } // null inventory, no error
          }));
        } else {
          setWalletInventories(prev => ({
            ...prev,
            [address]: { inventory: null, loading: false, error: data.error || 'Failed to load inventory' }
          }));
        }
      }
    } catch (error) {
      // On network error, still allow adding items (treat as no inventory)
      setWalletInventories(prev => ({
        ...prev,
        [address]: { inventory: null, loading: false, error: null } // null inventory, no error - allow adding items
      }));
    }
  };

  // Contract selection (new or old)
  const [contractSelection, setContractSelection] = useState<'new' | 'old'>('new');

  // Wallet discovery hook
  const walletDiscovery = useWalletDiscovery({
    isAdminWalletConnected,
    connectedAddress,
    adminAddress,
    discoveryType: 'inventory',
    checkWalletExists,
    contract: contractSelection,
    onWalletsDiscovered: (wallets) => {
      // Initialize all discovered wallets in state if not present
      setWalletInventories(prev => {
        const updated = { ...prev };
        wallets.forEach(address => {
          if (!updated[address]) {
            updated[address] = { inventory: null, loading: false, error: null };
          }
        });
        return updated;
      });
    },
    onWalletExpanded: (address) => {
      // Always initialize wallet in state if not present (ensures it's available for rendering)
      const currentData = walletInventories[address];
      if (!currentData) {
        // Initialize immediately
        setWalletInventories(prev => ({
          ...prev,
          [address]: { inventory: null, loading: false, error: null }
        }));
        // Then try to load inventory
        refreshWalletInventory(address);
      } else if (currentData.inventory === null || currentData.inventory === undefined) {
        // Wallet exists but has no inventory - try to load it
        refreshWalletInventory(address);
      }
      // If wallet has inventory, no need to reload
    },
  });

  // Use hook's discovered wallets
  const effectiveDiscoveredWallets = walletDiscovery.discoveredWallets;
  
  // Filter wallets based on search term (use hook's filteredWallets)
  const effectiveFilteredWallets = walletDiscovery.filteredWallets;

  // Refresh all inventories when contract selection changes
  useEffect(() => {
    if (effectiveDiscoveredWallets.length > 0) {
      // Refresh inventory for all discovered wallets when contract selection changes
      effectiveDiscoveredWallets.forEach(address => {
        refreshWalletInventory(address);
      });
    }
  }, [contractSelection]); // Only depend on contractSelection

  // Helper functions
  const addItem = (itemList: Item[], setItemList: (items: Item[]) => void) => {
    setItemList([...itemList, { itemId: 'extra_lives', level: 1, quantity: 1 }]);
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
    
    for (const address of effectiveDiscoveredWallets) {
      try {
        // Include contract selection in the API call
        const contractParam = contractSelection;
        const response = await fetch(getApiUrl(`api/inventory/${address}?contract=${contractParam}`));
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
        setItems([{ itemId: 'extra_lives', level: 1, quantity: 1 }]);
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
          setRemoveItems([{ itemId: 'extra_lives', level: 1, quantity: 1 }]);
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
      // Include contract selection in the API call
      const contractParam = contractSelection;
      const response = await fetch(getApiUrl(`api/inventory/${targetAddress}?contract=${contractParam}`));
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
    if (effectiveDiscoveredWallets.length === 0) {
      alert('Please discover wallets first.');
      return;
    }

    setBulkLoading(true);
    setBulkResult(null);

    let processed = 0;
    let successful = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const address of effectiveDiscoveredWallets) {
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
        const m = /^(.+)_([0-9]+)$/.exec(key);
        if (m) {
          formatted.push({ itemId: m[1], level: parseInt(m[2], 10), quantity });
        } else {
          // Non-leveled key (e.g. destroy_all, boss_kill_shot)
          formatted.push({ itemId: key, level: 0, quantity });
        }
      }
    }
    
    return formatted.sort((a, b) => {
      if (a.itemId !== b.itemId) return a.itemId.localeCompare(b.itemId);
      return a.level - b.level;
    });
  };

  // Load catalog on mount when section is active
  // MUST be before any early returns to maintain hook order
  React.useEffect(() => {
    if (activeSection === 'catalog' && !catalog && !catalogLoading) {
      loadCatalog();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection]);

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
    if (!walletData) return;

    const key = level > 0 ? `${itemId}_${level}` : itemId;
    const currentQuantity = (walletData.inventory && typeof walletData.inventory === 'object')
      ? (walletData.inventory[key] || 0)
      : 0;

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

    const adminWallet = connectedAddress || adminAddress;
    if (!adminWallet) {
      setApplyResult({
        success: false,
        error: 'Connect the admin wallet to apply changes.',
      });
      return;
    }

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
            fetch(getApiUrl('api/admin/add-items'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                playerAddress: walletAddress,
                items: itemsToAdd,
                adminWalletAddress: adminWallet,
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
                adminWalletAddress: adminWallet,
              }),
            })
          );
        }
      }

      const results = await Promise.all(promises);
      const responses = await Promise.all(results.map(async (response) => {
        let data: { success?: boolean; error?: string; message?: string } = {};
        try {
          const text = await response.text();
          if (text) {
            try {
              data = JSON.parse(text);
            } catch {
              data = { error: response.ok ? 'Invalid response' : text.slice(0, 200) };
            }
          }
        } catch {
          data = { error: 'Failed to read response' };
        }
        return { ok: response.ok, data };
      }));

      const allSuccess = responses.every(r => r.ok && r.data?.success);
      const errors = responses
        .filter(r => !r.ok || !r.data?.success)
        .map(r => r.data?.error || r.data?.message || (r.ok ? 'Unknown error' : 'Request failed'));

      if (allSuccess) {
        const changeCount = pendingChanges.length;
        const walletCount = Object.keys(changesByAddress).length;
        setApplyResult({
          success: true,
          message: `Successfully applied ${changeCount} change${changeCount !== 1 ? 's' : ''} across ${walletCount} wallet${walletCount !== 1 ? 's' : ''}!`,
        });
        clearPendingChanges();
        
        // Refresh all affected wallets (including wallets that didn't have inventory before)
        for (const walletAddress of Object.keys(changesByAddress)) {
          await refreshWalletInventory(walletAddress);
          // Also trigger wallet expansion to show the new inventory
          if (!walletDiscovery.expandedWallets.has(walletAddress)) {
            walletDiscovery.toggleWalletExpansion(walletAddress);
          }
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

  // Load catalog
  const loadCatalog = async () => {
    setCatalogLoading(true);
    setCatalogError(null);
    try {
      const response = await fetch(getApiUrl('api/store/admin/catalog'));
      const data = await response.json();
      if (response.ok && data.success) {
        setCatalog(data.catalog || {});
      } else {
        setCatalogError(data.error || 'Failed to load catalog');
        setCatalog({}); // Set empty catalog on error
      }
    } catch (error) {
      setCatalogError(error instanceof Error ? error.message : 'Network error');
      setCatalog({}); // Set empty catalog on error
    } finally {
      setCatalogLoading(false);
    }
  };

  // Initialize catalog from default fallback
  const initializeCatalog = async () => {
    if (!isAdminWalletConnected) {
      alert('Please connect admin wallet first.');
      return;
    }

    if (!confirm('This will initialize default item definitions and level metadata on-chain. Sell prices are set only in Stockroom. Continue?')) {
      return;
    }

    setCatalogLoading(true);
    setCatalogError(null);
    try {
      const response = await fetch(getApiUrl('api/store/admin/catalog/initialize'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          adminWalletAddress: connectedAddress || adminAddress,
          skipExisting: true, // Skip items that already exist
          includeLevels: true, // Keep level metadata
        }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        const digests = data.digests || [];
        const digestCount = digests.length;
        const totalItems = data.totalItems || 0;
        const successful = data.successful || 0;
        const skipped = data.skipped || 0;
        const errors = data.errors || 0;
        const errorDetails = data.errorDetails || [];
        const skippedItems = data.skippedItems || [];
        const isBatched = data.batched === true;
        const operationCount = data.operationCount || 0;
        
        // Build detailed message
        let message = `✅ Catalog initialization completed!\n\n`;
        message += `Total items: ${totalItems}\n`;
        message += `✅ Initialized: ${successful} item${successful > 1 ? 's' : ''}\n`;
        if (isBatched && operationCount > 0) {
          message += `📦 Batched: ${operationCount} operations in 1 transaction\n`;
        }
        if (skipped > 0) {
          message += `⏭️ Skipped (already exist): ${skipped}\n`;
          if (skippedItems.length > 0) {
            message += `   Items: ${skippedItems.join(', ')}\n`;
          }
        }
        if (errors > 0) {
          message += `❌ Failed: ${errors}\n`;
          if (errorDetails.length > 0) {
            message += `\nError details:\n`;
            errorDetails.forEach((err: { itemId: string; error: string }) => {
              message += `  • ${err.itemId}: ${err.error}\n`;
            });
          }
        }
        
        if (digestCount > 0) {
          message += `\nTransaction${digestCount > 1 ? 's' : ''}:\n`;
          digests.forEach((d: string, i: number) => {
            message += `${i + 1}. ${d}\n`;
          });
        }
        
        message += `\nRefreshing catalog...`;
        
        alert(message);
        
        // Wait for blockchain to process
        await new Promise(resolve => setTimeout(resolve, 2000));
        await loadCatalog();
      } else {
        setCatalogError(data.error || 'Failed to initialize catalog');
      }
    } catch (error) {
      setCatalogError(error instanceof Error ? error.message : 'Network error');
    } finally {
      setCatalogLoading(false);
    }
  };

  // Start editing an item (or creating new if itemId is null)
  const startEditing = (itemId: string | null = null) => {
    const existing = itemId ? getCatalogItem(itemId) : undefined;
    if (itemId && existing) {
      setEditingItem(existing.id);
      setEditForm({ ...existing });
    } else {
      // Creating new item
      setEditingItem(null);
      setEditForm({
        id: '',
        name: '',
        description: '',
        category: 'defensive',
        icon: '🆕',
        levels: [{ level: 1, effect: '', description: '' }],
      });
    }
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingItem(null);
    setEditForm(null);
  };

  // Save catalog changes (create or update)
  const saveCatalogChanges = async () => {
    if (!editForm) return;

    // Validate required fields
    if (!editForm.id || !editForm.name || !editForm.description || !editForm.category || !editForm.icon) {
      setCatalogError('All fields are required (ID, name, description, category, icon)');
      return;
    }

    if (!editForm.levels || editForm.levels.length === 0) {
      setCatalogError('At least one level is required');
      return;
    }

    const isNewItem = !editingItem || !getCatalogItem(editForm.id);
    const method = isNewItem ? 'POST' : 'PUT';

    setCatalogLoading(true);
    setCatalogError(null);
    try {
      const response = await fetch(getApiUrl('api/store/admin/catalog'), {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(
          isNewItem
            ? {
                itemId: editForm.id,
                name: editForm.name,
                description: editForm.description,
                category: editForm.category,
                icon: editForm.icon,
                levels: editForm.levels.map(level => ({
                  level: level.level,
                  effect: level.effect || '',
                  description: level.description || '',
                })),
                active: true,
                adminWalletAddress: connectedAddress || adminAddress,
              }
            : {
                itemId: editingItem,
                updates: editForm,
                adminWalletAddress: connectedAddress || adminAddress,
              }
        ),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setEditingItem(null);
        setEditForm(null);
        
        // Show success message with transaction digests
        const digests = data.digests || [];
        const digestCount = digests.length;
        const message = digestCount > 0
          ? `✅ Item ${isNewItem ? 'created' : 'updated'} on blockchain!\n\n${digestCount} transaction${digestCount > 1 ? 's' : ''} completed:\n${digests.map((d: string, i: number) => `${i + 1}. ${d}`).join('\n')}\n\nRefreshing catalog...`
          : `✅ Item ${isNewItem ? 'created' : 'updated'} on blockchain!\n\nRefreshing catalog...`;
        alert(message);
        
        // Wait for blockchain to process
        await new Promise(resolve => setTimeout(resolve, 1000));
        await loadCatalog();
      } else {
        setCatalogError(data.error || `Failed to ${isNewItem ? 'create' : 'update'} item`);
      }
    } catch (error) {
      setCatalogError(error instanceof Error ? error.message : 'Network error');
    } finally {
      setCatalogLoading(false);
    }
  };

  // Delete item (deactivate)
  const deleteItem = async (itemId: string) => {
    if (!confirm(`Are you sure you want to deactivate "${getCatalogItem(itemId)?.name || itemId}"? This will hide it from the store but not delete it permanently.`)) {
      return;
    }

    setCatalogLoading(true);
    setCatalogError(null);
    try {
      const response = await fetch(getApiUrl(`api/store/admin/catalog/${itemId}`), {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          adminWalletAddress: connectedAddress || adminAddress,
        }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        alert(`✅ Item deactivated successfully!\n\nTransaction: ${data.digest}\n\nRefreshing catalog...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        await loadCatalog();
      } else {
        setCatalogError(data.error || 'Failed to delete item');
      }
    } catch (error) {
      setCatalogError(error instanceof Error ? error.message : 'Network error');
    } finally {
      setCatalogLoading(false);
    }
  };

  // Delete level
  const deleteLevel = async (itemId: string, level: number) => {
    if (!confirm(`Are you sure you want to remove Level ${level} from "${getCatalogItem(itemId)?.name || itemId}"?`)) {
      return;
    }

    setCatalogLoading(true);
    setCatalogError(null);
    try {
      const response = await fetch(getApiUrl(`api/store/admin/catalog/${itemId}/levels/${level}`), {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Wallet': connectedAddress || adminAddress || '',
        },
      });
      const data = await response.json();
      if (response.ok && data.success) {
        alert(`✅ Level ${level} removed successfully!\n\nTransaction: ${data.digest}\n\nRefreshing catalog...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        await loadCatalog();
      } else {
        setCatalogError(data.error || 'Failed to delete level');
      }
    } catch (error) {
      setCatalogError(error instanceof Error ? error.message : 'Network error');
    } finally {
      setCatalogLoading(false);
    }
  };

  return (
    <>
      {/* Section Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', borderBottom: `2px solid ${styles.border}` }}>
        <button
          type="button"
          onClick={() => setActiveSection('inventory')}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: activeSection === 'inventory' ? styles.buttonPrimary : styles.bgSecondary,
            color: activeSection === 'inventory' ? 'white' : styles.text,
            border: 'none',
            borderBottom: activeSection === 'inventory' ? `3px solid ${styles.buttonPrimary}` : '3px solid transparent',
            borderRadius: '4px 4px 0 0',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '1rem',
          }}
        >
          📦 Inventory Management
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('catalog')}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: activeSection === 'catalog' ? styles.buttonPrimary : styles.bgSecondary,
            color: activeSection === 'catalog' ? 'white' : styles.text,
            border: 'none',
            borderBottom: activeSection === 'catalog' ? `3px solid ${styles.buttonPrimary}` : '3px solid transparent',
            borderRadius: '4px 4px 0 0',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '1rem',
          }}
        >
          🛍️ Catalog Management
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('stockroom')}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: activeSection === 'stockroom' ? styles.buttonPrimary : styles.bgSecondary,
            color: activeSection === 'stockroom' ? 'white' : styles.text,
            border: 'none',
            borderBottom: activeSection === 'stockroom' ? `3px solid ${styles.buttonPrimary}` : '3px solid transparent',
            borderRadius: '4px 4px 0 0',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '1rem',
          }}
        >
          📦 Stockroom
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('merge-recipes')}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: activeSection === 'merge-recipes' ? styles.buttonPrimary : styles.bgSecondary,
            color: activeSection === 'merge-recipes' ? 'white' : styles.text,
            border: 'none',
            borderBottom: activeSection === 'merge-recipes' ? `3px solid ${styles.buttonPrimary}` : '3px solid transparent',
            borderRadius: '4px 4px 0 0',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '1rem',
          }}
        >
          🔗 Merge Recipes
        </button>
      </div>

      {/* Catalog Management Section */}
      {activeSection === 'catalog' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="admin-section">
            <div className="admin-section-header">
              <h2 className="admin-section-title">🛍️ Item Catalog Management</h2>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    setEditingItem(null);
                    setEditForm({
                      id: '',
                      name: '',
                      description: '',
                      category: 'defensive',
                      icon: '🆕',
                      levels: [{ level: 1, effect: '', description: '' }],
                    });
                  }}
                  disabled={catalogLoading || !isAdminWalletConnected}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: isAdminWalletConnected && !catalogLoading ? styles.buttonSuccess : styles.buttonDisabled,
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: isAdminWalletConnected && !catalogLoading ? 'pointer' : 'not-allowed',
                    fontWeight: 'bold',
                  }}
                >
                  ➕ Add New Item
                </button>
                <button
                  type="button"
                  onClick={loadCatalog}
                  disabled={catalogLoading}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: catalogLoading ? styles.buttonDisabled : styles.buttonPrimary,
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: catalogLoading ? 'not-allowed' : 'pointer',
                    fontWeight: 'bold',
                  }}
                >
                  {catalogLoading ? 'Loading...' : '🔄 Refresh Catalog'}
                </button>
              </div>
            </div>

            {catalogError && (
              <div
                style={{
                  padding: '1rem',
                  borderRadius: '4px',
                  backgroundColor: styles.bgError,
                  border: `1px solid ${styles.borderError}`,
                  color: styles.textError,
                  marginBottom: '1rem',
                }}
              >
                <strong>❌ Error:</strong> {catalogError}
              </div>
            )}

            {catalogLoading && catalog === null && (
              <div style={{ padding: '2rem', textAlign: 'center', color: styles.textSecondary }}>
                Loading catalog...
              </div>
            )}

            {!catalogLoading && catalog && Object.keys(catalog).length === 0 && (
              <div
                style={{
                  padding: '2rem',
                  textAlign: 'center',
                  backgroundColor: styles.bgWarning,
                  borderRadius: '8px',
                  border: `2px solid ${styles.border}`,
                }}
              >
                <h3 style={{ margin: '0 0 1rem 0', color: styles.text }}>
                  📦 Item Catalog Not Initialized
                </h3>
                <p style={{ margin: '0 0 1.5rem 0', color: styles.textSecondary }}>
                  The item catalog has not been initialized on the blockchain yet.
                  <br />
                  Click the button below to initialize it with the default items.
                </p>
                <button
                  type="button"
                  onClick={initializeCatalog}
                  disabled={catalogLoading || !isAdminWalletConnected}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: isAdminWalletConnected && !catalogLoading ? styles.buttonSuccess : styles.buttonDisabled,
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: isAdminWalletConnected && !catalogLoading ? 'pointer' : 'not-allowed',
                    fontWeight: 'bold',
                    fontSize: '1rem',
                  }}
                >
                  {catalogLoading ? 'Initializing...' : '🚀 Initialize Catalog'}
                </button>
                {!isAdminWalletConnected && (
                  <p style={{ margin: '1rem 0 0 0', color: styles.textError, fontSize: '0.9rem' }}>
                    ⚠️ Admin wallet must be connected to initialize catalog
                  </p>
                )}
              </div>
            )}

            {/* Show form for creating new item */}
            {editingItem === null && editForm && !getCatalogItem(editForm.id || '') && (
              <div
                style={{
                  padding: '1.5rem',
                  backgroundColor: styles.bgSecondary,
                  borderRadius: '8px',
                  border: `2px solid ${styles.border}`,
                  marginBottom: '1.5rem',
                }}
              >
                <h3 style={{ margin: '0 0 1rem 0', color: styles.text }}>
                  ➕ Create New Item
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: styles.text }}>
                      Item ID: <span style={{ color: styles.textError }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={editForm.id || ''}
                      onChange={(e) => setEditForm({ ...editForm, id: e.target.value })}
                      placeholder="e.g., newItem"
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: `1px solid ${styles.border}`,
                        borderRadius: '4px',
                        backgroundColor: styles.inputBg,
                        color: styles.text,
                      }}
                    />
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: styles.textSecondary }}>
                      Must be unique. Used as the identifier for this item.
                    </p>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: styles.text }}>
                      Name: <span style={{ color: styles.textError }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={editForm.name || ''}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
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
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: styles.text }}>
                      Description: <span style={{ color: styles.textError }}>*</span>
                    </label>
                    <textarea
                      value={editForm.description || ''}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      rows={3}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: `1px solid ${styles.border}`,
                        borderRadius: '4px',
                        backgroundColor: styles.inputBg,
                        color: styles.text,
                        resize: 'vertical',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: styles.text }}>
                      Category: <span style={{ color: styles.textError }}>*</span>
                    </label>
                    <select
                      value={editForm.category || 'defensive'}
                      onChange={(e) => setEditForm({ ...editForm, category: e.target.value as StoreItem['category'] })}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: `1px solid ${styles.border}`,
                        borderRadius: '4px',
                        backgroundColor: styles.inputBg,
                        color: styles.text,
                      }}
                    >
                      <option value="defensive">Defensive</option>
                      <option value="offensive">Offensive</option>
                      <option value="tactical">Tactical</option>
                      <option value="utility">Utility</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: styles.text }}>
                      Icon: <span style={{ color: styles.textError }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={editForm.icon || ''}
                      onChange={(e) => setEditForm({ ...editForm, icon: e.target.value })}
                      placeholder="e.g., ❤️"
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <label style={{ fontWeight: 'bold', color: styles.text }}>
                        Levels: <span style={{ color: styles.textError }}>*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const currentLevels = editForm.levels || [];
                          const maxLevel = Math.max(...currentLevels.map(l => l.level), 0);
                          const newLevel = maxLevel < 3 ? maxLevel + 1 : 1;
                          setEditForm({
                            ...editForm,
                            levels: [...currentLevels, { level: newLevel, effect: '', description: '' }],
                          });
                        }}
                        disabled={catalogLoading || (editForm.levels?.length || 0) >= 3}
                        style={{
                          padding: '0.25rem 0.5rem',
                          backgroundColor: (editForm.levels?.length || 0) >= 3 ? styles.buttonDisabled : styles.buttonSuccess,
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: (editForm.levels?.length || 0) >= 3 ? 'not-allowed' : 'pointer',
                          fontSize: '0.85rem',
                        }}
                      >
                        ➕ Add Level
                      </button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {editForm.levels?.map((level, index) => (
                        <div
                          key={`${level.level}-${index}`}
                          style={{
                            padding: '1rem',
                            backgroundColor: styles.bgTertiary,
                            borderRadius: '4px',
                            border: `1px solid ${styles.border}`,
                            position: 'relative',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <h4 style={{ margin: 0, color: styles.text }}>Level {level.level}</h4>
                            {editForm.levels && editForm.levels.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const newLevels = editForm.levels?.filter((_, i) => i !== index) || [];
                                  setEditForm({ ...editForm, levels: newLevels });
                                }}
                                disabled={catalogLoading}
                                style={{
                                  padding: '0.25rem 0.5rem',
                                  backgroundColor: '#f44336',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: catalogLoading ? 'not-allowed' : 'pointer',
                                  fontSize: '0.85rem',
                                }}
                              >
                                🗑️ Remove
                              </button>
                            )}
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                            <div>
                              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem', color: styles.textSecondary }}>
                                Effect:
                              </label>
                              <input
                                type="text"
                                value={level.effect || ''}
                                onChange={(e) => {
                                  const newLevels = [...(editForm.levels || [])];
                                  newLevels[index] = { ...level, effect: e.target.value };
                                  setEditForm({ ...editForm, levels: newLevels });
                                }}
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
                          </div>
                          <div style={{ marginTop: '0.5rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem', color: styles.textSecondary }}>
                              Description:
                            </label>
                            <textarea
                              value={level.description || ''}
                              onChange={(e) => {
                                const newLevels = [...(editForm.levels || [])];
                                newLevels[index] = { ...level, description: e.target.value };
                                setEditForm({ ...editForm, levels: newLevels });
                              }}
                              rows={2}
                              style={{
                                width: '100%',
                                padding: '0.5rem',
                                border: `1px solid ${styles.border}`,
                                borderRadius: '4px',
                                backgroundColor: styles.inputBg,
                                color: styles.text,
                                resize: 'vertical',
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                    <button
                      type="button"
                      onClick={saveCatalogChanges}
                      disabled={catalogLoading || !isAdminWalletConnected}
                      style={{
                        flex: 1,
                        padding: '0.75rem',
                        backgroundColor: isAdminWalletConnected && !catalogLoading ? styles.buttonSuccess : styles.buttonDisabled,
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: isAdminWalletConnected && !catalogLoading ? 'pointer' : 'not-allowed',
                        fontWeight: 'bold',
                      }}
                    >
                      {catalogLoading ? 'Creating...' : '✅ Create Item'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingItem(null);
                        setEditForm(null);
                      }}
                      disabled={catalogLoading}
                      style={{
                        flex: 1,
                        padding: '0.75rem',
                        backgroundColor: styles.bgTertiary,
                        color: styles.text,
                        border: `1px solid ${styles.border}`,
                        borderRadius: '4px',
                        cursor: catalogLoading ? 'not-allowed' : 'pointer',
                        fontWeight: 'bold',
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {catalog && Object.keys(catalog).length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Show initialization button if catalog is incomplete */}
                {Object.keys(catalog).length < 7 && (
                  <div
                    style={{
                      padding: '1.5rem',
                      textAlign: 'center',
                      backgroundColor: styles.bgWarning,
                      borderRadius: '8px',
                      border: `2px solid ${styles.border}`,
                      marginBottom: '1rem',
                    }}
                  >
                    <h3 style={{ margin: '0 0 0.5rem 0', color: styles.text }}>
                      ⚠️ Catalog Incomplete
                    </h3>
                    <p style={{ margin: '0 0 1rem 0', color: styles.textSecondary }}>
                      Only {Object.keys(catalog).length} of 7 items are initialized on the blockchain.
                      <br />
                      Click below to initialize the remaining {7 - Object.keys(catalog).length} items.
                    </p>
                    <button
                      type="button"
                      onClick={initializeCatalog}
                      disabled={catalogLoading || !isAdminWalletConnected}
                      style={{
                        padding: '0.75rem 1.5rem',
                        backgroundColor: isAdminWalletConnected && !catalogLoading ? styles.buttonSuccess : styles.buttonDisabled,
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: isAdminWalletConnected && !catalogLoading ? 'pointer' : 'not-allowed',
                        fontWeight: 'bold',
                        fontSize: '1rem',
                      }}
                    >
                      {catalogLoading ? 'Initializing...' : `🚀 Initialize Missing Items (${7 - Object.keys(catalog).length} remaining)`}
                    </button>
                    {!isAdminWalletConnected && (
                      <p style={{ margin: '1rem 0 0 0', color: styles.textError, fontSize: '0.9rem' }}>
                        ⚠️ Admin wallet must be connected to initialize catalog
                      </p>
                    )}
                  </div>
                )}
                {/* Show initialize / restore button when catalog is already initialized (restore to default) */}
                {Object.keys(catalog).length >= 7 && (
                  <div
                    style={{
                      padding: '0.75rem 1rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '0.75rem',
                      backgroundColor: styles.bgTertiary,
                      borderRadius: '8px',
                      border: `1px solid ${styles.border}`,
                      marginBottom: '1rem',
                    }}
                  >
                    <span style={{ color: styles.textSecondary, fontSize: '0.9rem' }}>
                      Catalog initialized. Re-run to sync with default items (existing items are skipped).
                    </span>
                    <button
                      type="button"
                      onClick={initializeCatalog}
                      disabled={catalogLoading || !isAdminWalletConnected}
                      style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: isAdminWalletConnected && !catalogLoading ? styles.buttonPrimary : styles.buttonDisabled,
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: isAdminWalletConnected && !catalogLoading ? 'pointer' : 'not-allowed',
                        fontWeight: 'bold',
                        fontSize: '0.9rem',
                      }}
                    >
                      {catalogLoading ? 'Initializing...' : '🔄 Initialize / Restore to default'}
                    </button>
                    {!isAdminWalletConnected && (
                      <span style={{ color: styles.textError, fontSize: '0.85rem' }}>
                        Admin wallet must be connected
                      </span>
                    )}
                  </div>
                )}
                {(() => {
                  // Support both legacy camelCase IDs and new snake_case dynamic keys.
                  const toDynamicKey = (id: string) => id.replace(/([A-Z])/g, '_$1').toLowerCase();
                  const seen = new Set<string>();
                  const ordered: StoreItem[] = [];

                  for (const legacyId of CATALOG_ITEM_ORDER as readonly string[]) {
                    const item = catalog[legacyId] ?? catalog[toDynamicKey(legacyId)];
                    if (!item || seen.has(item.id)) continue;
                    ordered.push(item);
                    seen.add(item.id);
                  }

                  for (const item of Object.values(catalog)) {
                    if (seen.has(item.id)) continue;
                    ordered.push(item);
                    seen.add(item.id);
                  }

                  return ordered;
                })().map((item) => (
                  <div
                    key={item.id}
                    style={{
                      padding: '1.5rem',
                      backgroundColor: styles.bgSecondary,
                      borderRadius: '8px',
                      border: `1px solid ${styles.border}`,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <div>
                        <h3 style={{ margin: 0, color: styles.text, fontSize: '1.2rem' }}>
                          {item.icon} {item.name}
                        </h3>
                        <p style={{ margin: '0.5rem 0 0 0', color: styles.textSecondary, fontSize: '0.9rem' }}>
                          {item.description}
                        </p>
                        <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <span
                            style={{
                              padding: '0.25rem 0.5rem',
                              backgroundColor: styles.bgTertiary,
                              borderRadius: '4px',
                              fontSize: '0.85rem',
                              color: styles.textSecondary,
                            }}
                          >
                            Category: {item.category}
                          </span>
                          <span
                            style={{
                              padding: '0.25rem 0.5rem',
                              backgroundColor: styles.bgTertiary,
                              borderRadius: '4px',
                              fontSize: '0.85rem',
                              color: styles.textSecondary,
                            }}
                          >
                            ID: {item.id}
                          </span>
                        </div>
                      </div>
                      {editingItem !== item.id && (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            type="button"
                            onClick={() => startEditing(item.id)}
                            style={{
                              padding: '0.5rem 1rem',
                              backgroundColor: styles.buttonPrimary,
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontWeight: 'bold',
                            }}
                          >
                            ✏️ Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteItem(item.id)}
                            disabled={catalogLoading || !isAdminWalletConnected}
                            style={{
                              padding: '0.5rem 1rem',
                              backgroundColor: isAdminWalletConnected && !catalogLoading ? '#f44336' : styles.buttonDisabled,
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: isAdminWalletConnected && !catalogLoading ? 'pointer' : 'not-allowed',
                              fontWeight: 'bold',
                            }}
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      )}
                    </div>

                    {editingItem === item.id && editForm ? (
                      <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: styles.bgTertiary, borderRadius: '4px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                          <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: styles.text }}>
                              Item ID:
                            </label>
                            <input
                              type="text"
                              value={editForm.id || ''}
                              disabled={true}
                              style={{
                                width: '100%',
                                padding: '0.5rem',
                                border: `1px solid ${styles.border}`,
                                borderRadius: '4px',
                                backgroundColor: styles.bgSecondary,
                                color: styles.textSecondary,
                                cursor: 'not-allowed',
                              }}
                            />
                            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: styles.textSecondary }}>
                              Item ID cannot be changed after creation.
                            </p>
                          </div>
                          <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: styles.text }}>
                              Name:
                            </label>
                            <input
                              type="text"
                              value={editForm.name || ''}
                              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
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
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: styles.text }}>
                              Description:
                            </label>
                            <textarea
                              value={editForm.description || ''}
                              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                              rows={3}
                              style={{
                                width: '100%',
                                padding: '0.5rem',
                                border: `1px solid ${styles.border}`,
                                borderRadius: '4px',
                                backgroundColor: styles.inputBg,
                                color: styles.text,
                                resize: 'vertical',
                              }}
                            />
                          </div>

                          <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: styles.text }}>
                              Category:
                            </label>
                            <select
                              value={editForm.category || 'defensive'}
                              onChange={(e) => setEditForm({ ...editForm, category: e.target.value as StoreItem['category'] })}
                              style={{
                                width: '100%',
                                padding: '0.5rem',
                                border: `1px solid ${styles.border}`,
                                borderRadius: '4px',
                                backgroundColor: styles.inputBg,
                                color: styles.text,
                              }}
                            >
                              <option value="defensive">Defensive</option>
                              <option value="offensive">Offensive</option>
                              <option value="tactical">Tactical</option>
                              <option value="utility">Utility</option>
                            </select>
                          </div>

                          <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: styles.text }}>
                              Icon:
                            </label>
                            <input
                              type="text"
                              value={editForm.icon || ''}
                              onChange={(e) => setEditForm({ ...editForm, icon: e.target.value })}
                              placeholder="e.g., ❤️"
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
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                              <label style={{ fontWeight: 'bold', color: styles.text }}>
                                Levels:
                              </label>
                              <button
                                type="button"
                                onClick={() => {
                                  const currentLevels = editForm.levels || [];
                                  const maxLevel = Math.max(...currentLevels.map(l => l.level), 0);
                                  const newLevel = maxLevel < 3 ? maxLevel + 1 : 1;
                                  setEditForm({
                                    ...editForm,
                                    levels: [...currentLevels, { level: newLevel, effect: '', description: '' }],
                                  });
                                }}
                                disabled={catalogLoading || (editForm.levels?.length || 0) >= 3}
                                style={{
                                  padding: '0.25rem 0.5rem',
                                  backgroundColor: (editForm.levels?.length || 0) >= 3 ? styles.buttonDisabled : styles.buttonSuccess,
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: (editForm.levels?.length || 0) >= 3 ? 'not-allowed' : 'pointer',
                                  fontSize: '0.85rem',
                                }}
                              >
                                ➕ Add Level
                              </button>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                              {editForm.levels?.map((level, index) => (
                                <div
                                  key={`${level.level}-${index}`}
                                  style={{
                                    padding: '1rem',
                                    backgroundColor: styles.bgSecondary,
                                    borderRadius: '4px',
                                    border: `1px solid ${styles.border}`,
                                    position: 'relative',
                                  }}
                                >
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                    <h4 style={{ margin: 0, color: styles.text }}>Level {level.level}</h4>
                                    {editForm.levels && editForm.levels.length > 1 && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const newLevels = editForm.levels?.filter((_, i) => i !== index) || [];
                                          setEditForm({ ...editForm, levels: newLevels });
                                        }}
                                        disabled={catalogLoading}
                                        style={{
                                          padding: '0.25rem 0.5rem',
                                          backgroundColor: '#f44336',
                                          color: 'white',
                                          border: 'none',
                                          borderRadius: '4px',
                                          cursor: catalogLoading ? 'not-allowed' : 'pointer',
                                          fontSize: '0.85rem',
                                        }}
                                      >
                                        🗑️ Remove
                                      </button>
                                    )}
                                  </div>
                                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                                    <div>
                                      <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem', color: styles.textSecondary }}>
                                        Effect:
                                      </label>
                                      <input
                                        type="text"
                                        value={level.effect || ''}
                                        onChange={(e) => {
                                          const newLevels = [...(editForm.levels || [])];
                                          newLevels[index] = { ...level, effect: e.target.value };
                                          setEditForm({ ...editForm, levels: newLevels });
                                        }}
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
                                  </div>
                                  <div style={{ marginTop: '0.5rem' }}>
                                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem', color: styles.textSecondary }}>
                                      Description:
                                    </label>
                                    <textarea
                                      value={level.description || ''}
                                      onChange={(e) => {
                                        const newLevels = [...(editForm.levels || [])];
                                        newLevels[index] = { ...level, description: e.target.value };
                                        setEditForm({ ...editForm, levels: newLevels });
                                      }}
                                      rows={2}
                                      style={{
                                        width: '100%',
                                        padding: '0.5rem',
                                        border: `1px solid ${styles.border}`,
                                        borderRadius: '4px',
                                        backgroundColor: styles.inputBg,
                                        color: styles.text,
                                        resize: 'vertical',
                                      }}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                            <button
                              type="button"
                              onClick={saveCatalogChanges}
                              disabled={catalogLoading}
                              style={{
                                flex: 1,
                                padding: '0.75rem',
                                backgroundColor: catalogLoading ? styles.buttonDisabled : styles.buttonSuccess,
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: catalogLoading ? 'not-allowed' : 'pointer',
                                fontWeight: 'bold',
                              }}
                            >
                              {catalogLoading ? 'Saving...' : '💾 Save Changes'}
                            </button>
                            <button
                              type="button"
                              onClick={cancelEditing}
                              disabled={catalogLoading}
                              style={{
                                flex: 1,
                                padding: '0.75rem',
                                backgroundColor: styles.bgTertiary,
                                color: styles.text,
                                border: `1px solid ${styles.border}`,
                                borderRadius: '4px',
                                cursor: catalogLoading ? 'not-allowed' : 'pointer',
                                fontWeight: 'bold',
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div style={{ marginTop: '1rem' }}>
                        {(item.levels?.length ?? 0) > 0 ? (
                          <>
                            <h4 style={{ margin: '0 0 0.5rem 0', color: styles.text }}>Levels:</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                              {(item.levels ?? []).map((level) => (
                                <div
                                  key={level.level}
                                  style={{
                                    padding: '1rem',
                                    backgroundColor: styles.bgTertiary,
                                    borderRadius: '4px',
                                    border: `1px solid ${styles.border}`,
                                    position: 'relative',
                                  }}
                                >
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                                    <div style={{ fontWeight: 'bold', color: styles.text }}>
                                      Level {level.level}
                                    </div>
                                    {(item.levels?.length ?? 0) > 1 && (
                                      <button
                                        type="button"
                                        onClick={() => deleteLevel(item.id, level.level)}
                                        disabled={catalogLoading || !isAdminWalletConnected}
                                        style={{
                                          padding: '0.25rem 0.5rem',
                                          backgroundColor: isAdminWalletConnected && !catalogLoading ? '#f44336' : styles.buttonDisabled,
                                          color: 'white',
                                          border: 'none',
                                          borderRadius: '4px',
                                          cursor: isAdminWalletConnected && !catalogLoading ? 'pointer' : 'not-allowed',
                                          fontSize: '0.75rem',
                                        }}
                                        title="Remove this level"
                                      >
                                        🗑️
                                      </button>
                                    )}
                                  </div>
                                  <div style={{ fontSize: '0.9rem', color: styles.textSecondary, marginBottom: '0.25rem' }}>
                                    <strong>Effect:</strong> {level.effect}
                                  </div>
                                  <div style={{ fontSize: '0.85rem', color: styles.textSecondary }}>
                                    {level.description}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </>
                        ) : null}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Inventory Management Section */}
      {activeSection === 'inventory' && (
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
          discoveredWalletsCount={effectiveDiscoveredWallets.length}
          discoveryError={walletDiscovery.discoveryError}
          emptyListHint="Enter a wallet address above and click Search to manage that wallet's inventory (add or remove items)."
          contractSelection={contractSelection}
          setContractSelection={setContractSelection}
          contractSelectionEnvVar="OLD_PREMIUM_STORE_OBJECT_ID_TESTNET"
          badgeContent={pendingChanges.length > 0 ? (
            <span className="admin-badge admin-badge-primary">
              {pendingChanges.length} change{pendingChanges.length !== 1 ? 's' : ''} pending
            </span>
          ) : undefined}
        />

        <WalletList
          styles={styles}
          wallets={effectiveDiscoveredWallets}
          filteredWallets={effectiveFilteredWallets}
          searchAddress={walletDiscovery.searchAddress}
          expandedWallets={walletDiscovery.expandedWallets}
          onToggleExpansion={toggleWalletExpansion}
          getWalletData={(address) => {
            // Always return a valid wallet data object
            const data = walletInventories[address] || { inventory: null, loading: false, error: null };
            // Ensure inventory is explicitly null (not undefined) if not set
            return {
              inventory: data.inventory ?? null,
              loading: data.loading ?? false,
              error: data.error ?? null
            };
          }}
          renderWalletContent={(address, isExpanded, walletData) => {
            if (walletData.loading) {
              return (
                <div style={{ padding: '2rem', textAlign: 'center', color: styles.textSecondary }}>
                  Loading inventory...
                </div>
              );
            }

            // Don't return early on error: show error banner inside the empty-state so admin can still add/set/remove items

            // Show add item cards if inventory is null/undefined/empty (wallet has no inventory yet)
            // Show even if there's an error (network issues shouldn't prevent adding items)
            const hasNoInventory = !walletData.inventory || 
                                   walletData.inventory === null || 
                                   walletData.inventory === undefined || 
                                   (typeof walletData.inventory === 'object' && Object.keys(walletData.inventory).length === 0);
            const isNotLoading = !walletData.loading;
            
            // For wallets without inventory, show add item cards (even if there was an error checking)
            // This allows adding items to wallets that don't have inventory yet
            if (hasNoInventory && isNotLoading) {
              // Wallet has no inventory yet - show empty state but allow adding items
              // Use the same structure as wallets with inventory
              const walletPendingChanges = pendingChanges.filter(c => c.address === address);
              
              // Get categories in proper order (matching wallets with inventory)
              const properItemOrder = ['extra_lives', 'force_field', 'orb_level', 'coin_tractor_beam', 'slow_time', 'destroy_all', 'boss_kill_shot'];
              const orderedCategories = properItemOrder.filter(id => itemTypes.some(t => t.id === id));
              
              return (
                <div>
                  <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <h4 style={{ margin: 0, color: styles.text, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      Inventory for <CopyableAddress value={address} styles={styles} compact />
                    </h4>
                    {getPendingChangesCount(address) > 0 && (
                      <span className="admin-badge admin-badge-primary">
                        {getPendingChangesCount(address)} pending
                      </span>
                    )}
                  </div>

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

                  {/* Show empty inventory with same structure as wallets with inventory */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <h4 style={{ marginTop: 0, marginBottom: '1rem', color: styles.text, fontSize: '1.1rem' }}>Current Inventory</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {orderedCategories.map((categoryId) => {
                        const categoryType = itemTypes.find(t => t.id === categoryId);
                        if (!categoryType) return null;
                        
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
                                {categoryType.name}
                              </h5>
                            </div>
                            <div style={{ 
                              display: 'grid', 
                              gridTemplateColumns: 'repeat(4, 1fr)', 
                              gap: '0.75rem' 
                            }}>
                              {/* Leveled items: render levels 1..3. Non-leveled items: render a single base card (level=0). */}
                              {(categoryType.levels.length > 0 ? [1, 2, 3] : [0]).map((level) => {
                                // Check if this level exists for this category
                                if (level > 0 && !categoryType.levels.includes(level)) return null;
                                
                                // Check for pending changes
                                const pendingChange = getPendingChange(address, categoryId, level);
                                const currentQuantity = 0; // No inventory yet
                                const targetQuantity = pendingChange ? pendingChange.targetQuantity : currentQuantity;
                                const difference = targetQuantity - currentQuantity;
                                const hasChange = difference !== 0;
                                
                                return (
                                  <div
                                    key={`${categoryId}_${level}`}
                                    className={`admin-card-compact inventory-item-card ${hasChange ? (difference > 0 ? 'admin-card-positive has-change-positive' : 'admin-card-negative has-change-negative') : ''}`}
                                    style={{
                                      backgroundColor: !hasChange ? styles.bgTertiary : undefined,
                                      borderColor: !hasChange ? styles.border : undefined,
                                    }}
                                  >
                                    <div className="admin-content inventory-item-content">
                                      {level > 0 && (
                                        <div className="admin-level-badge">
                                          <span className="admin-level-text">
                                            L{level}
                                          </span>
                                        </div>
                                      )}
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
                                              updatePendingChange(address, categoryId, level, newValue);
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
                                        onClick={() => updatePendingChange(address, categoryId, level, targetQuantity + 1)}
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
                                        onClick={() => updatePendingChange(address, categoryId, level, Math.max(0, targetQuantity - 1))}
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
                              
                              {/* Add Item Card - 4th Column (matching wallets with inventory) */}
                              <CategoryAddItemCard
                                onAddOne={() => {
                                  const level = categoryType?.levels[0] ?? 0;
                                  const key = level > 0 ? `${categoryId}_${level}` : categoryId;
                                  const currentQty = walletInventories[address]?.inventory?.[key] ?? 0;
                                  const target = getPendingChange(address, categoryId, level)?.targetQuantity ?? currentQty;
                                  updatePendingChange(address, categoryId, level, target + 1);
                                }}
                                disabled={itemsLoading || removeItemsLoading}
                                styles={styles}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            }

            // Fallback: If we reach here and inventory is still null/undefined, show empty inventory cards
            // This ensures wallets without inventory can always add items with the correct layout
            if (!walletData.inventory || walletData.inventory === null || walletData.inventory === undefined) {
              const walletPendingChanges = pendingChanges.filter(c => c.address === address);
              const properItemOrder = ['extra_lives', 'force_field', 'orb_level', 'coin_tractor_beam', 'slow_time', 'destroy_all', 'boss_kill_shot'];
              const orderedCategories = properItemOrder.filter(id => itemTypes.some(t => t.id === id));
              
              return (
                <div>
                  <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <h4 style={{ margin: 0, color: styles.text, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      Inventory for <CopyableAddress value={address} styles={styles} compact />
                    </h4>
                    {getPendingChangesCount(address) > 0 && (
                      <span className="admin-badge admin-badge-primary">
                        {getPendingChangesCount(address)} pending
                      </span>
                    )}
                  </div>
                  <div style={{ marginBottom: '1.5rem' }}>
                    <h4 style={{ marginTop: 0, marginBottom: '1rem', color: styles.text, fontSize: '1.1rem' }}>Current Inventory</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {orderedCategories.map((categoryId) => {
                        const categoryType = itemTypes.find(t => t.id === categoryId);
                        if (!categoryType) return null;
                        
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
                                {categoryType.name}
                              </h5>
                            </div>
                            <div style={{ 
                              display: 'grid', 
                              gridTemplateColumns: 'repeat(4, 1fr)', 
                              gap: '0.75rem' 
                            }}>
                              {(categoryType.levels.length > 0 ? [1, 2, 3] : [0]).map((level) => {
                                if (level > 0 && !categoryType.levels.includes(level)) return null;
                                
                                const pendingChange = getPendingChange(address, categoryId, level);
                                const currentQuantity = 0;
                                const targetQuantity = pendingChange ? pendingChange.targetQuantity : currentQuantity;
                                const difference = targetQuantity - currentQuantity;
                                const hasChange = difference !== 0;
                                
                                return (
                                  <div
                                    key={`${categoryId}_${level}`}
                                    className={`admin-card-compact inventory-item-card ${hasChange ? (difference > 0 ? 'admin-card-positive has-change-positive' : 'admin-card-negative has-change-negative') : ''}`}
                                    style={{
                                      backgroundColor: !hasChange ? styles.bgTertiary : undefined,
                                      borderColor: !hasChange ? styles.border : undefined,
                                    }}
                                  >
                                    <div className="admin-content inventory-item-content">
                                      {level > 0 && (
                                        <div className="admin-level-badge">
                                          <span className="admin-level-text">L{level}</span>
                                        </div>
                                      )}
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
                                              updatePendingChange(address, categoryId, level, newValue);
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
                                            <span className={`admin-badge-${difference > 0 ? 'positive' : 'negative'}`}>
                                              {difference > 0 ? '+' : ''}{difference}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="inventory-button-row">
                                      <button
                                        type="button"
                                        onClick={() => updatePendingChange(address, categoryId, level, targetQuantity + 1)}
                                        disabled={itemsLoading || removeItemsLoading}
                                        className="admin-button-small admin-button-add inventory-button"
                                        title="Add 1"
                                      >
                                        +
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => updatePendingChange(address, categoryId, level, Math.max(0, targetQuantity - 1))}
                                        disabled={(itemsLoading || removeItemsLoading) || targetQuantity <= 0}
                                        className="admin-button-small admin-button-remove inventory-button"
                                        style={{
                                          backgroundColor: ((itemsLoading || removeItemsLoading) || targetQuantity <= 0) ? styles.buttonDisabled : undefined,
                                          cursor: ((itemsLoading || removeItemsLoading) || targetQuantity <= 0) ? 'not-allowed' : 'pointer',
                                        }}
                                        title="Remove 1"
                                      >
                                        −
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                              <CategoryAddItemCard
                                onAddOne={() => {
                                  const level = categoryType?.levels[0] ?? 0;
                                  const key = level > 0 ? `${categoryId}_${level}` : categoryId;
                                  const currentQty = walletInventories[address]?.inventory?.[key] ?? 0;
                                  const target = getPendingChange(address, categoryId, level)?.targetQuantity ?? currentQty;
                                  updatePendingChange(address, categoryId, level, target + 1);
                                }}
                                disabled={itemsLoading || removeItemsLoading}
                                styles={styles}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div>
                {/* Wallet Header with pending badge - custom for inventory */}
                <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <h4 style={{ margin: 0, color: styles.text, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    Inventory for <CopyableAddress value={address} styles={styles} compact />
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
                          // Always show full grid (all categories, all levels) so admin can add/set/remove any item.
                          // Current quantity comes from wallet inventory; target from pending or current.
                          const properItemOrder = ['extra_lives', 'force_field', 'orb_level', 'coin_tractor_beam', 'slow_time', 'destroy_all', 'boss_kill_shot'];
                          const allCategories = properItemOrder.filter(id => itemTypes.some(t => t.id === id));

                          return (
                              <div style={{ marginBottom: '1.5rem' }}>
                                <h4 style={{ marginTop: 0, marginBottom: '1rem', color: styles.text, fontSize: '1.1rem' }}>Current Inventory</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                  {allCategories.map((categoryId) => {
                                    const categoryType = itemTypes.find(t => t.id === categoryId);
                                    if (!categoryType) return null;
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
                                        <div style={{ paddingBottom: '0.5rem', borderBottom: `1px solid ${styles.border}`, marginBottom: '0.25rem' }}>
                                          <h5 style={{ margin: 0, color: styles.text, fontSize: '0.95rem', fontWeight: 'bold' }}>{categoryType.name}</h5>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
                                          {(categoryType.levels.length > 0 ? [1, 2, 3] : [0]).map((level) => {
                                            if (level > 0 && !categoryType.levels.includes(level)) return null;
                                            const pendingChange = getPendingChange(address, categoryId, level);
                                            const currentQuantity = walletData.inventory?.[level > 0 ? `${categoryId}_${level}` : categoryId] ?? 0;
                                            const targetQuantity = pendingChange ? pendingChange.targetQuantity : currentQuantity;
                                            const difference = targetQuantity - currentQuantity;
                                            const hasChange = difference !== 0;
                                            return (
                                              <div
                                                key={`${categoryId}_${level}`}
                                                className={`admin-card-compact inventory-item-card ${hasChange ? (difference > 0 ? 'admin-card-positive has-change-positive' : 'admin-card-negative has-change-negative') : ''}`}
                                                style={{ backgroundColor: !hasChange ? styles.bgTertiary : undefined, borderColor: !hasChange ? styles.border : undefined }}
                                              >
                                                <div className="admin-content inventory-item-content">
                                                  {level > 0 && <div className="admin-level-badge"><span className="admin-level-text">L{level}</span></div>}
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
                                                        onChange={(e) => { const v = parseInt(e.target.value) || 0; updatePendingChange(address, categoryId, level, v); }}
                                                        min="0"
                                                        className="admin-input-number inventory-target-input"
                                                        style={{ borderColor: hasChange ? (difference > 0 ? '#4CAF50' : '#f44336') : styles.border, borderWidth: '1.5px', borderStyle: 'solid' }}
                                                        onWheel={(e) => e.currentTarget.blur()}
                                                      />
                                                      {hasChange && <span className={`admin-badge-${difference > 0 ? 'positive' : 'negative'}`}>{difference > 0 ? '+' : ''}{difference}</span>}
                                                    </div>
                                                  </div>
                                                </div>
                                                <div className="inventory-button-row">
                                                  <button type="button" onClick={() => updatePendingChange(address, categoryId, level, targetQuantity + 1)} disabled={itemsLoading || removeItemsLoading} className="admin-button-small admin-button-add inventory-button" title="Add 1">+</button>
                                                  <button type="button" onClick={() => updatePendingChange(address, categoryId, level, Math.max(0, targetQuantity - 1))} disabled={(itemsLoading || removeItemsLoading) || targetQuantity <= 0} className="admin-button-small admin-button-remove inventory-button" style={{ backgroundColor: ((itemsLoading || removeItemsLoading) || targetQuantity <= 0) ? styles.buttonDisabled : undefined, cursor: ((itemsLoading || removeItemsLoading) || targetQuantity <= 0) ? 'not-allowed' : 'pointer' }} title="Remove 1">−</button>
                                                </div>
                                              </div>
                                            );
                                          })}
                                          <CategoryAddItemCard
                                            onAddOne={() => {
                                              const level = categoryType?.levels[0] ?? 0;
                                              const currentQty = walletData.inventory?.[level > 0 ? `${categoryId}_${level}` : categoryId] ?? 0;
                                              const target = getPendingChange(address, categoryId, level)?.targetQuantity ?? currentQty;
                                              updatePendingChange(address, categoryId, level, target + 1);
                                            }}
                                            disabled={itemsLoading || removeItemsLoading}
                                            styles={styles}
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
                    <div style={{ fontSize: '0.85rem', color: styles.textSecondary }}>
                      <CopyableAddress value={change.address} styles={styles} compact />
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
                disabled={itemsLoading || removeItemsLoading || (!connectedAddress && !adminAddress)}
                title={(!connectedAddress && !adminAddress) ? 'Connect the admin wallet to apply changes' : undefined}
                style={{
                  flex: 1,
                  padding: '1rem',
                  fontSize: '1.1rem',
                  backgroundColor: (itemsLoading || removeItemsLoading || (!connectedAddress && !adminAddress)) ? styles.buttonDisabled : styles.buttonPrimary,
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: (itemsLoading || removeItemsLoading || (!connectedAddress && !adminAddress)) ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                }}
              >
                {(itemsLoading || removeItemsLoading) ? 'Applying...' : (!connectedAddress && !adminAddress) ? 'Connect wallet to apply' : 'Apply All Changes'}
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
      {effectiveDiscoveredWallets.length > 0 && (
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
                    <CopyableAddress value={userInv.address} styles={styles} compact />
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
                    : `${bulkOperation === 'add' ? 'Add' : 'Remove'} Items to/from All ${effectiveDiscoveredWallets.length} Wallets`}
                </button>
              </div>
        </div>
      )}
        </div>
        </>
      )}

      {/* Stockroom Section */}
      {activeSection === 'stockroom' && (
        <StockroomTab
          isAdminWalletConnected={isAdminWalletConnected}
          connectedAddress={connectedAddress}
          adminAddress={adminAddress}
          styles={styles}
        />
      )}

      {/* Merge Recipes Section */}
      {activeSection === 'merge-recipes' && (
        <MergeRecipeBuilder
          styles={styles}
          isAdminWalletConnected={isAdminWalletConnected}
          adminAddress={adminAddress}
          itemChoices={itemTypes.map((t) => ({ id: t.id, name: t.name, levels: t.levels }))}
        />
      )}
    </>
  );
}
