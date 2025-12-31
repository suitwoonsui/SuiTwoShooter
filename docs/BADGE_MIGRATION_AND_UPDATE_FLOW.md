# Badge Migration and Update Flow

## Overview

The `GameDataFlow` automatically checks for both **badge migration** and **badge updates** (tier upgrades) when loading game data. This happens during wallet connection and when returning to the menu.

## Flow Diagram

```
GameDataFlow.load(walletAddress)
    ↓
Load badge data (parallel with balance)
    ↓
    ├─→ Player HAS badge?
    │       ↓
    │       ├─→ YES: Check for pending upgrade
    │       │       ↓
    │       │       handlePendingUpgrade()
    │       │       ↓
    │       │       BadgeService.checkPendingUpgrade()
    │       │       ↓
    │       │       ├─→ Upgrade needed? → Show upgrade modal
    │       │       └─→ No upgrade → Display badge
    │       │
    │       └─→ NO: Check for migration
    │               ↓
    │               handleNoBadge()
    │               ↓
    │               BadgeService.checkBadgeMigration()
    │               ↓
    │               ├─→ Migration needed? → Show migration modal
    │               └─→ No migration → Continue (no badge)
```

## 1. Badge Update Check (Tier Upgrade)

### When It Happens
- **Trigger**: When a player **has a badge** and game data is loaded
- **Location**: `GameDataFlow.handlePendingUpgrade()` in `game-data-flow.js`
- **Called From**: `GameDataFlow._performLoad()` → badge result handler

### How It Works

1. **Check for Pending Upgrade**:
   ```javascript
   // In GameDataFlow.handlePendingUpgrade()
   const upgradeCheck = await window.BadgeService.checkPendingUpgrade(walletAddress);
   ```

2. **Backend API Call**:
   - Calls `/api/badges/{address}/check-upgrade`
   - Backend checks if player's stats qualify for a tier upgrade
   - Returns `{ success, hasPendingUpgrade, newTier, badgeId }`

3. **If Upgrade Needed**:
   - Shows tier upgrade modal (`BadgeUI.showTierUpgradeModal()`)
   - Player can sign transaction to upgrade badge tier
   - After upgrade, badge is reloaded with new tier

4. **If No Upgrade**:
   - Displays current badge normally
   - Marks data as loaded

### State Management
- Uses `GameDataState.shouldSkipUpgradeCheck()` to prevent repeated checks if user dismissed upgrade
- Loading modal stays visible during upgrade check
- Upgrade modal hides loading modal when shown

## 2. Badge Migration Check

### When It Happens
- **Trigger**: When a player **has NO badge** and game data is loaded
- **Location**: `GameDataFlow.handleNoBadge()` in `game-data-flow.js`
- **Called From**: `GameDataFlow._performLoad()` → badge result handler

### How It Works

1. **Skip Check if Recent Mint**:
   ```javascript
   // Prevents migration check immediately after minting
   const timeSinceMint = Date.now() - recentMintTime;
   const shouldCheckMigration = timeSinceMint > 10000; // Wait 10 seconds
   ```

2. **Skip if Already Dismissed**:
   ```javascript
   // If user clicked "Maybe Later", don't check again
   if (GameDataState.migrationCheckComplete && GameDataState.migrationModalClosed) {
     return; // Skip migration check
   }
   ```

3. **Check for Migration**:
   ```javascript
   const migrationCheck = await window.BadgeService.checkBadgeMigration(walletAddress);
   ```

4. **Backend API Call**:
   - Calls `/api/badges/{address}/migrate-data`
   - Backend checks if player has an old badge from previous contract
   - Returns `{ success, needsMigration, migrationData }`

5. **If Migration Needed**:
   - Shows migration modal (`BadgeUI.showBadgeMigrationModal()`)
   - Player can sign transaction to migrate badge to new contract
   - After migration, badge is loaded and displayed

6. **If No Migration**:
   - Marks data as loaded
   - Continues without badge

### State Management
- `GameDataState.migrationCheckComplete`: Tracks if migration check has run
- `GameDataState.migrationModalClosed`: Tracks if user dismissed migration modal
- Both flags prevent repeated checks

## Integration Points

### Wallet Connection Flow
1. User connects wallet → `WalletService.connect()`
2. Wallet event fires → `GameDataFlow.onWalletConnected()`
3. `GameDataFlow.load()` is called
4. **Migration/Update checks happen automatically**

### Return to Menu Flow
1. User returns to menu → `MenuService.show()` or `GameDataFlow.onReturnToMenu()`
2. `GameDataFlow.load()` is called (if badge already loaded, just re-displays)
3. **Migration/Update checks happen if badge not loaded**

## API Endpoints

### Badge Update Check
- **Endpoint**: `GET /api/badges/{address}/check-upgrade`
- **Backend**: Checks player stats against badge tier requirements
- **Returns**: `{ success, hasPendingUpgrade, newTier, badgeId }`

### Badge Migration Check
- **Endpoint**: `GET /api/badges/{address}/migrate-data`
- **Backend**: Checks if player has old badge from previous contract
- **Returns**: `{ success, needsMigration, migrationData: { oldBadgeId, oldTier, oldGamesPlayed, oldMintDate, imageData } }`

## User Experience

### Badge Upgrade Flow
1. Player connects wallet or returns to menu
2. Loading modal shows: "Checking for badge upgrade... Please wait"
3. If upgrade available:
   - Upgrade modal appears with tier comparison
   - Player clicks "Upgrade Badge"
   - Transaction is signed
   - Badge reloads with new tier
4. If no upgrade:
   - Badge displays normally

### Badge Migration Flow
1. Player connects wallet (has no badge in new contract)
2. Loading modal shows: "Checking for badge migration... Please wait"
3. If migration needed:
   - Migration modal appears with old badge info
   - Player clicks "Migrate Badge"
   - Transaction is signed
   - Badge is migrated and displayed
4. If no migration:
   - Player continues without badge (can mint new one)

## State Flags

### GameDataState Flags
- `migrationCheckComplete`: Migration check has completed
- `migrationModalClosed`: User dismissed migration modal
- `shouldSkipUpgradeCheck`: Skip upgrade check (user dismissed upgrade)

### gameReadinessState Flags (in menu-system.js)
- `migrationCheckComplete`: Synced from `GameDataState`
- `migrationModalClosed`: Synced from `GameDataState`
- Used to enable/disable "Start Game" button

## Summary

✅ **Badge Migration**: Automatically checked when player has no badge  
✅ **Badge Updates**: Automatically checked when player has a badge  
✅ **Both integrated**: Part of the standard `GameDataFlow.load()` process  
✅ **User-friendly**: Modals guide user through migration/upgrade process  
✅ **State managed**: Prevents duplicate checks and handles user dismissals

The flow ensures players are always aware of badge migration opportunities and tier upgrade eligibility without requiring manual checks.

