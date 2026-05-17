# Admin Page Refactoring Plan

## Overview
We've successfully refactored `ItemsTab`, `StatsManagementTab`, and `GamePassManagementTab` to use a consolidated wallet discovery pattern. This document outlines the plan to expand this pattern to other admin tabs.

## Refactored Pattern

### Components Used
1. **`useWalletDiscovery` hook** - Centralized wallet discovery logic
2. **`WalletDiscoveryUI` component** - Reusable UI for wallet discovery/search
3. **`WalletList` component** - Reusable UI for displaying and managing discovered wallets

### Pattern Structure
```typescript
// 1. Create checkWalletExists function
const checkWalletExists = async (address: string): Promise<boolean> => {
  try {
    const response = await fetch(getApiUrl(`api/[endpoint]/${address}`));
    const data = await response.json();
    return response.ok && data.success;
  } catch {
    return false;
  }
};

// 2. Create refresh function (if needed)
const refreshWalletData = async (address: string) => {
  // Load data for wallet
};

// 3. Use the hook
const walletDiscovery = useWalletDiscovery({
  isAdminWalletConnected,
  connectedAddress,
  adminAddress,
  discoveryType: '[type]', // 'inventory' | 'stats' | 'game-pass' | 'badges' | 'milestones'
  checkWalletExists,
  onWalletsDiscovered: () => {
    // Reset state when wallets are discovered
  },
  onWalletExpanded: (address) => {
    // Load data when wallet is expanded
    if (!walletData[address] || walletData[address].data === null) {
      refreshWalletData(address);
    }
  },
});

// 4. Use the components
<WalletDiscoveryUI
  styles={styles}
  title="🔍 Discover Wallets with [Type]"
  discoverButtonText="🔍 Discover All Wallets with [Type]"
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
  getWalletData={(address) => walletData[address] || { data: null, loading: false, error: null }}
  renderWalletContent={(address, isExpanded, walletData) => {
    // Custom content for each wallet
  }}
/>
```

## Tabs to Refactor

### ✅ Already Refactored
- [x] **ItemsTab** - Uses full pattern with WalletList
- [x] **StatsManagementTab** - Uses full pattern with WalletList
- [x] **GamePassManagementTab** - Uses full pattern with WalletList

### 🔄 Needs Refactoring

#### 1. BadgesTab
**Current State:**
- Manual wallet discovery (lines 43-69)
- Simple list display (lines 241-281)
- Click to copy/fill address functionality

**Refactoring Approach:**
- Replace manual discovery with `useWalletDiscovery` hook
- Replace simple list with `WalletDiscoveryUI` component
- Keep the click-to-copy functionality but integrate with WalletList if we want expansion
- **Note:** BadgesTab might not need full WalletList expansion since it's just for copying addresses

**Priority:** Medium (simpler use case)

#### 2. MilestonesTab - User Management Section
**Current State:**
- Manual wallet discovery (lines 87-113)
- Simple search by address (lines 1059-1101)
- Displays user data when found

**Refactoring Approach:**
- Replace manual discovery with `useWalletDiscovery` hook
- Replace search UI with `WalletDiscoveryUI` component
- Could use `WalletList` to show discovered wallets with milestone claims
- Integrate with existing user data display

**Priority:** High (similar to ItemsTab/StatsTab pattern)

#### 3. MigrationTab Sub-tabs
**Current State:**
- Each sub-tab has its own wallet discovery logic
- Manual state management for discovered wallets

**Refactoring Approach:**
- Refactor each migration sub-tab to use `useWalletDiscovery` hook
- Replace manual discovery UI with `WalletDiscoveryUI` component
- Keep migration-specific logic separate

**Priority:** Low (migration is a special use case)

## Implementation Order

1. **MilestonesTab** - High priority, similar pattern to existing refactored tabs
2. **BadgesTab** - Medium priority, simpler use case
3. **MigrationTab Sub-tabs** - Low priority, special use case

## Benefits of Refactoring

1. **Code Reusability** - Eliminate duplicate wallet discovery code
2. **Consistency** - Same UI/UX across all admin tabs
3. **Maintainability** - Single source of truth for wallet discovery logic
4. **Features** - All tabs get search, filtering, and expansion features automatically
5. **Bug Fixes** - Fix once, applies everywhere

## Notes

- The `useWalletDiscovery` hook supports these discovery types:
  - `'inventory'`
  - `'stats'`
  - `'game-pass'`
  - `'badges'`
  - `'milestones'`

- Each tab may have different data loading requirements, so the `refreshWalletData` function will be tab-specific

- The `WalletList` component is flexible and can render different content per wallet via the `renderWalletContent` prop

