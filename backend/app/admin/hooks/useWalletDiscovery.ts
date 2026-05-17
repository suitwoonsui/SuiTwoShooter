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
  discoveryType: 'inventory' | 'stats' | 'game-pass' | 'badges' | 'milestones' | 'insignia';
  checkWalletExists: (address: string) => Promise<boolean>;
  contract?: 'new' | 'old';
  onWalletsDiscovered?: (wallets: string[]) => void;
  onWalletExpanded?: (address: string) => void;
}

export function useWalletDiscovery({
  isAdminWalletConnected,
  connectedAddress,
  adminAddress,
  discoveryType,
  checkWalletExists,
  contract,
  onWalletsDiscovered,
  onWalletExpanded,
}: UseWalletDiscoveryProps) {
  const [discoveredWallets, setDiscoveredWallets] = useState<string[]>([]);
  const [discoveringWallets, setDiscoveringWallets] = useState(false);
  const [discoveryError, setDiscoveryError] = useState<string | null>(null);
  const [searchAddress, setSearchAddress] = useState('');
  const [searchingWallet, setSearchingWallet] = useState(false);
  const [expandedWallets, setExpandedWallets] = useState<Set<string>>(new Set());

  // Discover all wallets
  const handleDiscoverWallets = async () => {
    setDiscoveringWallets(true);
    setDiscoveryError(null);
    setDiscoveredWallets([]);
    setExpandedWallets(new Set());

    const result = await discoverWallets({
      type: discoveryType,
      isAdminWalletConnected,
      connectedAddress,
      adminAddress,
      contract,
    });

    if (result.success && result.wallets) {
      setDiscoveredWallets(result.wallets);
      if (result.wallets.length === 0) {
        alert(`No wallets with ${discoveryType} found.`);
      }
      onWalletsDiscovered?.(result.wallets);
    } else {
      setDiscoveryError(result.error || 'Failed to discover wallets');
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
        // For inventory and game-pass, allow adding by address even if not in discovered list
        // (game-pass: add credits to accounts without a pass yet — contract creates pass on first add)
        const allowAddByAddress = discoveryType === 'inventory' || discoveryType === 'game-pass';
        if (allowAddByAddress && address.startsWith('0x') && address.length === 66) {
          const newWallets = [...discoveredWallets, address];
          setDiscoveredWallets(newWallets);
          onWalletsDiscovered?.(newWallets);
          const newExpanded = new Set(expandedWallets);
          newExpanded.add(address);
          setExpandedWallets(newExpanded);
          onWalletExpanded?.(address);
        } else if (allowAddByAddress) {
          alert('Invalid wallet address format. Sui addresses should start with 0x and be 66 characters long.');
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
        // For inventory and game-pass, allow adding by address (game-pass: add credits creates pass if needed)
        const allowAddByAddress = discoveryType === 'inventory' || discoveryType === 'game-pass';
        if (allowAddByAddress && address.startsWith('0x') && address.length === 66) {
          setDiscoveredWallets([address]);
          onWalletsDiscovered?.([address]);
          const newExpanded = new Set([address]);
          setExpandedWallets(newExpanded);
          onWalletExpanded?.(address);
        } else if (allowAddByAddress) {
          alert('Invalid wallet address format. Sui addresses should start with 0x and be 66 characters long.');
        } else {
          alert(`No ${discoveryType} found for this wallet address.`);
        }
      }
    } catch (error) {
      // For inventory and game-pass, allow adding by address even if check fails (network error, etc.)
      const allowAddByAddress = discoveryType === 'inventory' || discoveryType === 'game-pass';
      if (allowAddByAddress && address.startsWith('0x') && address.length === 66) {
        setDiscoveredWallets([address]);
        onWalletsDiscovered?.([address]);
        const newExpanded = new Set([address]);
        setExpandedWallets(newExpanded);
        onWalletExpanded?.(address);
      } else if (!allowAddByAddress) {
        alert(error instanceof Error ? error.message : 'Network error');
      } else {
        alert('Invalid wallet address format. Sui addresses should start with 0x and be 66 characters long.');
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
    discoveryError,
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

