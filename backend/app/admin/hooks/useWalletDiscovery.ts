// ==========================================
// Admin Page - Reusable Wallet Discovery Hook
// Handles wallet discovery and search logic
// ==========================================

import { useState } from 'react';
import { discoverWallets } from '../utils/wallet-discovery';

interface UseWalletDiscoveryProps {
  isAdminWalletConnected: boolean;
  connectedAddress: string | null;
  adminAddress: string | null;
  discoveryType: 'inventory' | 'stats' | 'game-pass' | 'badges' | 'milestones';
  checkWalletExists: (address: string) => Promise<boolean>;
  onWalletsDiscovered?: (wallets: string[]) => void;
  onWalletExpanded?: (address: string) => void;
}

export function useWalletDiscovery({
  isAdminWalletConnected,
  connectedAddress,
  adminAddress,
  discoveryType,
  checkWalletExists,
  onWalletsDiscovered,
  onWalletExpanded,
}: UseWalletDiscoveryProps) {
  const [discoveredWallets, setDiscoveredWallets] = useState<string[]>([]);
  const [discoveringWallets, setDiscoveringWallets] = useState(false);
  const [searchAddress, setSearchAddress] = useState('');
  const [searchingWallet, setSearchingWallet] = useState(false);
  const [expandedWallets, setExpandedWallets] = useState<Set<string>>(new Set());

  // Discover all wallets
  const handleDiscoverWallets = async () => {
    setDiscoveringWallets(true);
    setDiscoveredWallets([]);
    setExpandedWallets(new Set());

    const result = await discoverWallets({
      type: discoveryType,
      isAdminWalletConnected,
      connectedAddress,
      adminAddress,
    });

    if (result.success && result.wallets) {
      setDiscoveredWallets(result.wallets);
      if (result.wallets.length === 0) {
        alert(`No wallets with ${discoveryType} found.`);
      }
      onWalletsDiscovered?.(result.wallets);
    } else {
      alert(result.error || 'Failed to discover wallets');
    }

    setDiscoveringWallets(false);
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
        onWalletExpanded?.(found);
      } else {
        // For inventory type, allow adding wallets that don't have inventory yet
        if (discoveryType === 'inventory') {
          // Validate address format (basic Sui address check)
          if (address.startsWith('0x') && address.length === 66) {
            // Add wallet to discovered list even if it doesn't have inventory
            const newWallets = [...discoveredWallets, address];
            setDiscoveredWallets(newWallets);
            onWalletsDiscovered?.(newWallets);
            
            // Expand and load the wallet
            const newExpanded = new Set(expandedWallets);
            newExpanded.add(address);
            setExpandedWallets(newExpanded);
            onWalletExpanded?.(address);
          } else {
            alert('Invalid wallet address format. Sui addresses should start with 0x and be 66 characters long.');
          }
        } else {
          alert('Wallet not found in discovered wallets. Please discover wallets first or check the address.');
        }
      }
      return;
    }

    // If no wallets discovered, search for this specific wallet
    setSearchingWallet(true);
    
    try {
      const exists = await checkWalletExists(address);
      if (exists) {
        // Wallet exists, add it to discovered wallets
        setDiscoveredWallets([address]);
        onWalletsDiscovered?.([address]);
        
        // Expand and load the wallet
        const newExpanded = new Set([address]);
        setExpandedWallets(newExpanded);
        onWalletExpanded?.(address);
      } else {
        // For inventory type, allow adding wallets that don't have inventory yet
        if (discoveryType === 'inventory') {
          // Validate address format (basic Sui address check)
          if (address.startsWith('0x') && address.length === 66) {
            // Add wallet to discovered list even if it doesn't have inventory
            setDiscoveredWallets([address]);
            onWalletsDiscovered?.([address]);
            
            // Expand and load the wallet
            const newExpanded = new Set([address]);
            setExpandedWallets(newExpanded);
            onWalletExpanded?.(address);
          } else {
            alert('Invalid wallet address format. Sui addresses should start with 0x and be 66 characters long.');
          }
        } else {
          alert(`No ${discoveryType} found for this wallet address.`);
        }
      }
    } catch (error) {
      // For inventory type, allow adding wallets even if check fails (network error, etc.)
      if (discoveryType === 'inventory') {
        // Validate address format (basic Sui address check)
        if (address.startsWith('0x') && address.length === 66) {
          // Add wallet to discovered list
          setDiscoveredWallets([address]);
          onWalletsDiscovered?.([address]);
          
          // Expand and load the wallet
          const newExpanded = new Set([address]);
          setExpandedWallets(newExpanded);
          onWalletExpanded?.(address);
        } else {
          alert('Invalid wallet address format. Sui addresses should start with 0x and be 66 characters long.');
        }
      } else {
        alert(error instanceof Error ? error.message : 'Network error');
      }
    } finally {
      setSearchingWallet(false);
    }
  };

  // Toggle wallet expansion
  const toggleWalletExpansion = (address: string) => {
    const newExpanded = new Set(expandedWallets);
    if (newExpanded.has(address)) {
      newExpanded.delete(address);
    } else {
      newExpanded.add(address);
      onWalletExpanded?.(address);
    }
    setExpandedWallets(newExpanded);
  };

  // Filter wallets based on search term
  const filteredWallets = searchAddress.trim()
    ? discoveredWallets.filter(w => w.toLowerCase().includes(searchAddress.trim().toLowerCase()))
    : discoveredWallets;

  return {
    discoveredWallets,
    discoveringWallets,
    searchAddress,
    setSearchAddress,
    searchingWallet,
    expandedWallets,
    setExpandedWallets,
    filteredWallets,
    handleDiscoverWallets,
    handleSearchWallet,
    toggleWalletExpansion,
  };
}

