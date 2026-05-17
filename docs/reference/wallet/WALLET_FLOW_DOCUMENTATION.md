# Wallet Flow Documentation

## Overview

This document describes the complete wallet integration flow in the SuiTwo shooter game. It covers initialization, connection, event handling, balance checking, badge loading, UI updates, and game readiness checks.

**Last Updated**: Current implementation (Post-MenuService refactoring)

---

## Table of Contents

1. [Wallet Initialization](#wallet-initialization)
2. [Wallet Connection Flow](#wallet-connection-flow)
3. [Wallet Event Handling](#wallet-event-handling)
4. [Balance Checking Flow](#balance-checking-flow)
5. [Badge Loading Flow](#badge-loading-flow)
6. [UI Update Flow](#ui-update-flow)
7. [Game Readiness System](#game-readiness-system)
8. [Wallet Disconnection Flow](#wallet-disconnection-flow)
9. [Key Functions Reference](#key-functions-reference)
10. [Dependencies and Integration Points](#dependencies-and-integration-points)

---

## Wallet Initialization

### Location
`src/game/systems/ui/menu-system.js` - `initializeWalletIntegration()`

### Flow

1. **Wait for React/WalletAPI** (500ms delay)
   - Ensures React and WalletAPI are loaded before initialization

2. **Fetch Network Configuration**
   - Tries to fetch network from backend API: `${API_BASE_URL}/config`
   - Defaults to `'testnet'` if backend unavailable
   - Network must match backend network for proper functionality

3. **Initialize WalletAPI**
   ```javascript
   const api = await WalletAPI.initialize({ network });
   window.walletAPIInstance = api; // Store globally
   ```

4. **Setup Event Listeners**
   - Registers listener via `api.on(async (event) => {...})`
   - Handles `'connected'` and `'disconnected'` events
   - Implements event deduplication (500ms debounce)

5. **Check Existing Connection**
   - If wallet already connected on page load:
     - Calls `updateWalletUI(address)`
     - Calls `checkMEWSBalanceAndUpdateUI(address)` (loads balance + badge)
     - Calls `updateMenuStats()` (updates menu statistics)
   - If wallet not connected:
     - Shows wallet requirements UI
     - Disables start game button
     - Shows available wallets or installation message

### Key Features
- ✅ Network configuration from backend
- ✅ Event deduplication (prevents duplicate processing)
- ✅ Handles already-connected wallets on page load
- ✅ Graceful error handling

---

## Wallet Connection Flow

### Entry Point
`handleConnectWallet()` - Called from HTML `onclick="handleConnectWallet()"`

### Flow

1. **Validation**
   - Checks if `WalletAPI` and `window.walletAPIInstance` are available
   - Shows alert if not initialized

2. **Button State Management**
   - Disables connect button
   - Changes button text to "Connecting..."

3. **Connection Attempt**
   ```javascript
   const result = await window.walletAPIInstance.connect();
   ```

4. **On Success** (`result.success === true`)
   - Logs connection success
   - Calls `updateWalletUI(result.address)` - Updates UI immediately
   - **IMPORTANT**: Does NOT call `checkMEWSBalanceAndUpdateUI()` here
   - **Why**: The wallet event listener (in `initializeWalletIntegration`) will handle it
   - This prevents duplicate calls and ensures proper event flow

5. **On Failure** (`result.success === false`)
   - Shows error alert
   - Calls `updateWalletUI(null)` - Resets UI
   - Calls `disableStartGameButton()` - Disables game start

6. **Error Handling**
   - Catches exceptions during connection
   - Shows error alert
   - Resets UI and disables start button

7. **Button Re-enable**
   - Always re-enables button in `finally` block
   - Resets button text to "Connect Wallet"

### Key Features
- ✅ Prevents duplicate balance/badge loading (event-driven)
- ✅ Proper button state management
- ✅ Error handling with user feedback
- ✅ UI updates immediately on connection

---

## Wallet Event Handling

### Event Listener Setup
Located in `initializeWalletIntegration()` - `api.on(async (event) => {...})`

### Event Types

#### 1. `'connected'` Event

**Trigger**: Wallet successfully connected (via `handleConnectWallet()` or external wallet extension)

**Flow**:
1. **Event Deduplication**
   - Checks if same event fired within 500ms
   - Skips duplicate events

2. **GameDataFlow Integration**
   - Calls `GameDataFlow.onWalletConnected(event.address)`
   - This triggers:
     - State reset
     - Balance loading
     - Badge loading
     - UI updates

3. **Menu Stats Update**
   - Calls `updateMenuStats()` to fetch blockchain stats
   - Updates best score, games played from blockchain

4. **Game Readiness**
   - `updateGameReadiness()` called after data loads
   - Enables/disables start button based on balance

#### 2. `'disconnected'` Event

**Trigger**: Wallet disconnected (via `handleDisconnectWallet()` or external wallet extension)

**Flow**:
1. **Event Deduplication** (same as connected)

2. **GameDataFlow Integration**
   - Calls `GameDataFlow.onWalletDisconnected()`
   - This triggers:
     - State reset
     - Badge display cleared
     - Loading state cleared

3. **UI Updates**
   - Calls `disableStartGameButton()` - Disables start button
   - Calls `updateBalanceUI(null, false)` - Clears balance display
   - Updates wallet status text
   - Disables test button

4. **Menu Stats Update**
   - Calls `updateMenuStats()` to clear stats (shows "--")

### Event Deduplication

**Implementation**:
```javascript
const WALLET_EVENT_DEBOUNCE_MS = 500;
let lastWalletEvent = null;
let lastWalletEventTime = 0;

// Check if duplicate
const eventKey = `${event.type}_${event.address || 'null'}`;
const timeSinceLastEvent = now - lastWalletEventTime;

if (lastWalletEvent === eventKey && timeSinceLastEvent < WALLET_EVENT_DEBOUNCE_MS) {
  return; // Skip duplicate
}
```

**Why**: Prevents duplicate processing when multiple events fire rapidly (e.g., wallet extension + manual connect)

### Key Features
- ✅ Event deduplication (500ms window)
- ✅ Integration with GameDataFlow (new refactored system)
- ✅ Automatic data loading on connection
- ✅ Proper cleanup on disconnection

---

## Balance Checking Flow

### Entry Points
1. `checkMEWSBalanceAndUpdateUI(address)` - Direct call
2. `GameDataFlow.load(address)` - Via GameDataFlow (preferred)

### Flow (via GameDataFlow)

1. **Wrapper Function** (`checkMEWSBalanceAndUpdateUI`)
   - Validates `window.walletAPIInstance` available
   - Validates `GameDataFlow` available
   - Calls `GameDataFlow.load(address)`

2. **GameDataFlow.load()**
   - Checks if already loading for this address (prevents duplicates)
   - Checks if already loaded for this address (prevents redundant loads)
   - Shows loading modal: "Loading game data... Please wait"
   - Loads balance and badge in parallel:
     ```javascript
     const [balance, badge] = await Promise.all([
       this.loadBalance(walletAddress),
       this.loadBadge(walletAddress)
     ]);
     ```

3. **Balance Loading** (`GameDataFlow.loadBalance()`)
   - Calls `window.walletAPIInstance.checkMEWSBalance(address, network)`
   - Updates `GameDataState.balance`
   - Updates `GameDataState.hasMinimumBalance` (500K MEWS required)

4. **Badge Loading** (`GameDataFlow.loadBadge()`)
   - Calls `window.BadgeService.getBadgeForAddress(address)`
   - Handles migration check if needed
   - Updates `GameDataState.badge`

5. **UI Updates**
   - Calls `updateBalanceUI(balance, hasMinimum)`
   - Calls `GameDataFlow.displayBadge(badge)` if badge exists
   - Updates game readiness state from `GameDataState`

6. **Game Readiness Update**
   - Updates `gameReadinessState` from `GameDataState.getReadinessState()`
   - Calls `updateGameReadiness()` to enable/disable buttons

7. **Loading Modal**
   - Hides loading modal when complete

### Key Features
- ✅ Parallel loading (balance + badge)
- ✅ Duplicate prevention (active loads tracking)
- ✅ Loading modal feedback
- ✅ Error handling
- ✅ Integration with GameDataState

---

## Badge Loading Flow

### Entry Points
1. `loadMenuBadgeDisplay(walletAddress)` - Direct call
2. `GameDataFlow.load(address)` - Via GameDataFlow (preferred)
3. `GameDataFlow.displayBadge(badge)` - Display existing badge

### Flow (via GameDataFlow)

1. **Badge Loading** (`GameDataFlow.loadBadge()`)
   - Checks if badge modal is visible (prevents loading during modal)
   - Calls `window.BadgeService.getBadgeForAddress(address)`
   - Handles migration check:
     - If migration needed, shows modal
     - Waits for user to close modal
     - Re-checks badge after migration

2. **Badge Display** (`GameDataFlow.displayBadge()`)
   - Gets badge display container: `document.getElementById('menuBadgeDisplay')`
   - Calls `displayBadgeInUI(container, badgeData, walletAddress)`
   - Updates `GameDataState.badgeDisplayVisible = true`

3. **Badge UI Rendering** (`badge-ui.js` - `displayBadgeInUI()`)
   - Constructs badge HTML with:
     - Badge image (from API or constructed URL)
     - Badge tier name
     - Discounts information
     - Games played count
   - Handles image loading errors (fallback URLs)
   - Updates DOM

### Badge Display States

- **Hidden**: When wallet not connected or no badge
- **Visible**: When wallet connected and badge loaded
- **Loading**: During badge fetch (handled by loading modal)

### Key Features
- ✅ Migration check integration
- ✅ Image fallback handling
- ✅ Games played count from registry
- ✅ Discount display
- ✅ Error handling

---

## UI Update Flow

### Functions

#### `updateWalletUI(address)`

**Purpose**: Updates wallet connection UI elements

**Flow**:
1. **If Connected** (`address` provided):
   - Hides connect button
   - Shows connected state (compact view)
   - Displays formatted address: `window.walletAPIInstance.formatAddress(address)`
   - Hides balance display (compact view - only address shown)
   - Hides legacy address display

2. **If Disconnected** (`address === null`):
   - Shows connect button
   - Hides connected state
   - Hides badge display
   - Hides legacy address display

**UI Elements Updated**:
- `connectWalletBtn` - Show/hide
- `walletConnectedState` - Show/hide
- `walletAddressCompact` - Address text
- `walletBalanceCompact` - Hidden in compact view
- `walletAddressDisplay` - Legacy (hidden)
- `menuBadgeDisplay` - Hidden when disconnected

#### `updateBalanceUI(balance, hasMinimum)`

**Purpose**: Updates balance display and minimum requirement notice

**Flow**:
1. **Balance Display** (`mewsBalanceDisplay`, `mewsBalance`):
   - If balance provided: Shows balance with color (green if sufficient, red if insufficient)
   - If no balance: Hides display

2. **Minimum Notice** (`walletMinimumNotice`):
   - Shows if balance insufficient or unknown
   - Hides if balance sufficient (500K+ MEWS)

**Color Coding**:
- Green (`#39ff14`): Sufficient balance (500K+ MEWS)
- Red (`#ff4444`): Insufficient balance (< 500K MEWS)

#### `updateWalletRequirementsUI(walletConnected, hasMinimumBalance)`

**Purpose**: Legacy function (kept for backward compatibility)
- Currently does nothing (simplified)
- Minimum notice visibility handled by `updateBalanceUI()`

### Key Features
- ✅ Compact wallet UI (address only, no balance in compact view)
- ✅ Color-coded balance display
- ✅ Minimum requirement notice
- ✅ Legacy element support (backward compatibility)

---

## Game Readiness System

### Purpose
Determines when the game can be started. Ensures all required data is loaded before enabling start button.

### State Object
```javascript
const gameReadinessState = {
  dataLoaded: false,              // Balance + badge loaded
  migrationCheckComplete: false,  // Migration check done
  migrationModalClosed: true      // Migration modal closed (or not needed)
};
```

### Readiness Check
```javascript
function isGameReady() {
  return gameReadinessState.dataLoaded && 
         gameReadinessState.migrationCheckComplete &&
         gameReadinessState.migrationModalClosed;
}
```

### Update Function
`updateGameReadiness()` - Called after data loads

**Flow**:
1. **If Ready** (`isGameReady() === true`):
   - **Test Button**: Enabled if wallet connected (bypasses balance check)
   - **Start Button**: Enabled if wallet connected AND balance sufficient (500K+ MEWS)

2. **If Not Ready**:
   - Both buttons disabled
   - Logs what's waiting (dataLoaded, migrationCheckComplete, migrationModalClosed)

### State Updates

**From GameDataState**:
```javascript
const readiness = GameDataState.getReadinessState();
gameReadinessState.dataLoaded = readiness.dataLoaded;
gameReadinessState.migrationCheckComplete = readiness.migrationCheckComplete;
gameReadinessState.migrationModalClosed = readiness.migrationModalClosed;
```

**Called After**:
- `GameDataFlow.load()` completes
- Migration check completes
- Migration modal closes

### Button States

#### Start Game Button (`startGameBtn`)
- **Enabled**: Wallet connected + Data loaded + Migration complete + Balance sufficient (500K+ MEWS)
- **Disabled**: Any condition not met

#### Test Mode Button (`startGameTestBtn`)
- **Enabled**: Wallet connected + Data loaded + Migration complete (bypasses balance check)
- **Disabled**: Any condition not met (except balance)

### Key Features
- ✅ Three-state readiness check
- ✅ Separate test mode (bypasses balance)
- ✅ Clear logging of what's waiting
- ✅ Automatic button state management

---

## Wallet Disconnection Flow

### Entry Point
`handleDisconnectWallet()` - Called from HTML `onclick="handleDisconnectWallet()"`

### Flow

1. **Validation**
   - Checks if `WalletAPI` and `window.walletAPIInstance` are available
   - Returns early if not available

2. **Disconnect Attempt**
   ```javascript
   const result = await window.walletAPIInstance.disconnect();
   ```

3. **On Success** (`result.success === true`):
   - **Badge Cache Clear**:
     - Calls `window.BadgeService.clearBadgeCache()` if available
   - **Badge Display Clear**:
     - Hides `menuBadgeDisplay`
     - Clears badge HTML content
   - **UI Updates**:
     - Calls `updateWalletUI(null)` - Resets wallet UI
     - Calls `disableStartGameButton()` - Disables start button
   - **Menu Stats Clear**:
     - Calls `updateMenuStats()` - Clears stats (shows "--")

4. **Error Handling**
   - Catches exceptions
   - Logs error (doesn't show alert - disconnection is usually user-initiated)

### Event-Driven Disconnection

When wallet extension disconnects (not via button):
- `'disconnected'` event fires
- Event listener in `initializeWalletIntegration()` handles it
- Calls `GameDataFlow.onWalletDisconnected()`
- Updates UI and clears state

### Key Features
- ✅ Badge cache clearing
- ✅ UI state reset
- ✅ Menu stats clearing
- ✅ Error handling
- ✅ Event-driven support

---

## Key Functions Reference

### Wallet Connection

#### `handleConnectWallet()`
- **Location**: `menu-system.js`
- **Purpose**: Handle wallet connection button click
- **Flow**: Validates → Connects → Updates UI → Event listener handles data loading
- **Returns**: `Promise<void>`

#### `handleDisconnectWallet()`
- **Location**: `menu-system.js`
- **Purpose**: Handle wallet disconnection
- **Flow**: Disconnects → Clears cache → Updates UI → Clears stats
- **Returns**: `Promise<void>`

### UI Updates

#### `updateWalletUI(address)`
- **Location**: `menu-system.js`
- **Purpose**: Update wallet connection UI
- **Parameters**: `address` (string | null)
- **Updates**: Connect button, connected state, address display, badge display

#### `updateBalanceUI(balance, hasMinimum)`
- **Location**: `menu-system.js`
- **Purpose**: Update balance display and minimum notice
- **Parameters**: `balance` (number | null), `hasMinimum` (boolean)
- **Updates**: Balance display, minimum requirement notice

### Data Loading

#### `checkMEWSBalanceAndUpdateUI(address)`
- **Location**: `menu-system.js`
- **Purpose**: Wrapper for GameDataFlow.load() (backward compatibility)
- **Flow**: Validates → Calls GameDataFlow.load() → Updates readiness
- **Returns**: `Promise<void>`

#### `loadMenuBadgeDisplay(walletAddress)`
- **Location**: `menu-system.js`
- **Purpose**: Load badge display (wrapper for GameDataFlow)
- **Flow**: Calls GameDataFlow.load() with skipBalance option
- **Returns**: `Promise<void>`

### Game Readiness

#### `updateGameReadiness()`
- **Location**: `menu-system.js`
- **Purpose**: Update start button states based on readiness
- **Flow**: Checks isGameReady() → Enables/disables buttons based on balance
- **Returns**: `void`

#### `isGameReady()`
- **Location**: `menu-system.js`
- **Purpose**: Check if game is ready to start
- **Returns**: `boolean` - true if all readiness checks pass

#### `enableStartGameButton()`
- **Location**: `menu-system.js`
- **Purpose**: Enable start game button
- **Updates**: Button disabled state, opacity, cursor, title

#### `disableStartGameButton()`
- **Location**: `menu-system.js`
- **Purpose**: Disable start game button
- **Updates**: Button disabled state, opacity, cursor, title

### Initialization

#### `initializeWalletIntegration()`
- **Location**: `menu-system.js`
- **Purpose**: Initialize wallet API and setup event listeners
- **Flow**: Wait → Fetch network → Initialize → Setup listeners → Check existing connection
- **Returns**: `Promise<void>`
- **Called**: On menu scripts load

---

## Dependencies and Integration Points

### External Dependencies

1. **WalletAPI Module** (`wallet-module/dist/wallet-api.umd.cjs`)
   - Provides `WalletAPI.initialize()`
   - Provides `window.walletAPIInstance`
   - Methods: `connect()`, `disconnect()`, `isConnected()`, `getAddress()`, `checkMEWSBalance()`, `getBalanceStatus()`, `formatAddress()`, `getWallets()`, `on()`

2. **GameDataFlow** (`game-data-flow.js`)
   - Main entry point for data loading
   - Methods: `load()`, `onWalletConnected()`, `onWalletDisconnected()`, `onReturnToMenu()`, `displayBadge()`

3. **GameDataState** (`game-data-state.js`)
   - State management for game data
   - Methods: `getReadinessState()`, `reset()`, `setWalletAddress()`

4. **LoadingManager** (`loading-manager.js`)
   - Loading modal management
   - Methods: `show()`, `hide()`, `update()`

5. **BadgeService** (`badge-service.js`)
   - Badge operations
   - Methods: `getBadgeForAddress()`, `checkBadgeMigration()`, `clearBadgeCache()`

6. **updateMenuStats()** (`game-state-manager.js`)
   - Updates menu statistics from blockchain
   - Fetches best score, games played

### Integration Points

1. **MenuService Integration**
   - MenuService calls `updateWalletUI()` when showing menu
   - MenuService delegates wallet operations to existing functions

2. **GameDataFlow Integration**
   - All data loading goes through GameDataFlow
   - Event-driven architecture
   - State management via GameDataState

3. **Store Integration**
   - Store has separate wallet connect modal
   - Uses same `window.walletAPIInstance.connect()`
   - Separate UI but same underlying API

### Global Exposures

Functions exposed to `window` for HTML onclick handlers:
- `window.handleConnectWallet` - Connect wallet
- `window.handleDisconnectWallet` - Disconnect wallet
- `window.updateWalletUI` - Update wallet UI (internal use)
- `window.checkMEWSBalanceAndUpdateUI` - Check balance (wrapper)
- `window.updateGameReadiness` - Update button states

---

## Flow Diagrams

### Complete Wallet Connection Flow

```
User Clicks "Connect Wallet"
    ↓
handleConnectWallet()
    ↓
Validate WalletAPI available
    ↓
Disable button, show "Connecting..."
    ↓
window.walletAPIInstance.connect()
    ↓
Success? ──No──→ Show error, reset UI, re-enable button
    │
   Yes
    ↓
updateWalletUI(address) [Immediate UI update]
    ↓
Re-enable button
    ↓
[Wallet Extension fires 'connected' event]
    ↓
Event Listener (initializeWalletIntegration)
    ↓
GameDataFlow.onWalletConnected(address)
    ↓
GameDataFlow.load(address)
    ↓
Parallel: Load Balance + Load Badge
    ↓
Update UI: Balance + Badge + Stats
    ↓
updateGameReadiness()
    ↓
Enable/Disable Start Button
```

### Wallet Disconnection Flow

```
User Clicks Disconnect OR Extension Disconnects
    ↓
handleDisconnectWallet() OR 'disconnected' event
    ↓
window.walletAPIInstance.disconnect()
    ↓
Clear Badge Cache
    ↓
Clear Badge Display
    ↓
GameDataFlow.onWalletDisconnected()
    ↓
Reset GameDataState
    ↓
updateWalletUI(null)
    ↓
disableStartGameButton()
    ↓
updateMenuStats() [Clear stats]
```

### Game Readiness Flow

```
Data Loading Complete
    ↓
Update gameReadinessState from GameDataState
    ↓
updateGameReadiness()
    ↓
isGameReady()? ──No──→ Disable all buttons
    │
   Yes
    ↓
Wallet Connected? ──No──→ Disable all buttons
    │
   Yes
    ↓
Test Button: Enable (bypasses balance)
    ↓
Balance Sufficient? ──No──→ Disable start button
    │
   Yes
    ↓
Enable Start Button
```

---

## Important Notes

### Event-Driven Architecture

**Critical**: The wallet connection flow is event-driven to prevent duplicate calls:

1. `handleConnectWallet()` does NOT call `checkMEWSBalanceAndUpdateUI()` directly
2. Instead, it calls `updateWalletUI()` for immediate UI feedback
3. The wallet extension fires a `'connected'` event
4. The event listener calls `GameDataFlow.onWalletConnected()`
5. This triggers balance + badge loading

**Why**: Prevents duplicate API calls and ensures proper event flow.

### Balance Requirements

- **Minimum Balance**: 500,000 MEWS (500K)
- **Start Button**: Requires minimum balance
- **Test Button**: Bypasses balance check (for development/testing)

### Network Configuration

- Network is fetched from backend API: `${API_BASE_URL}/config`
- Defaults to `'testnet'` if backend unavailable
- Network must match backend network for proper functionality

### Migration Check

- Badge loading includes migration check
- If migration needed, shows modal
- Waits for user to close modal before continuing
- Re-checks badge after migration

### State Management

- **GameDataState**: Centralized state for balance, badge, loading states
- **gameReadinessState**: Local state for button enable/disable logic
- **GameDataFlow**: Orchestrates data loading and state updates

---

## Testing Checklist

When refactoring wallet functionality, ensure:

- [ ] Wallet connects successfully
- [ ] Wallet disconnects successfully
- [ ] Balance loads and displays correctly
- [ ] Badge loads and displays correctly
- [ ] Minimum balance check works (500K MEWS)
- [ ] Start button enables only when balance sufficient
- [ ] Test button enables when data loaded (bypasses balance)
- [ ] Menu stats update from blockchain
- [ ] Event deduplication works (no duplicate loads)
- [ ] Already-connected wallet on page load works
- [ ] Migration check and modal work
- [ ] Badge cache clears on disconnect
- [ ] UI updates correctly on connect/disconnect
- [ ] Error handling works (API unavailable, connection failed, etc.)

---

## Future Refactoring Considerations

When extracting wallet functionality into a service:

1. **Preserve Event-Driven Architecture**
   - Keep event listener setup
   - Maintain event deduplication
   - Don't break event flow

2. **Maintain GameDataFlow Integration**
   - All data loading should go through GameDataFlow
   - Don't bypass GameDataFlow for direct API calls

3. **Preserve UI Update Functions**
   - `updateWalletUI()` - Keep as-is or move to WalletService
   - `updateBalanceUI()` - Keep as-is or move to WalletService
   - These are called from multiple places

4. **Maintain Game Readiness System**
   - `updateGameReadiness()` - Keep or integrate into WalletService
   - `isGameReady()` - Keep or integrate into WalletService
   - Button enable/disable logic must be preserved

5. **Keep Backward Compatibility**
   - Global function wrappers for HTML onclick handlers
   - Existing function signatures
   - Existing return values

6. **Preserve Error Handling**
   - All error paths must be maintained
   - User feedback (alerts, UI updates)
   - Graceful degradation

---

## Conclusion

The wallet flow is a complex, event-driven system with multiple integration points. When refactoring:

1. **Document all entry points** (HTML onclick, event listeners, function calls)
2. **Preserve event flow** (don't break event-driven architecture)
3. **Maintain state management** (GameDataState, gameReadinessState)
4. **Keep UI update functions** (called from multiple places)
5. **Test thoroughly** (use checklist above)

This documentation should serve as a reference when extracting wallet functionality into a service.

