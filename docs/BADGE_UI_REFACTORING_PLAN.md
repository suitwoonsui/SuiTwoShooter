# Badge UI Refactoring Plan

## Current State
- **File**: `src/game/systems/ui/badge-ui.js`
- **Size**: 1,124 lines
- **Functions**: 12 functions

## Analysis

### Main Responsibilities

1. **Modal Management** (~300 lines)
   - `showBadgeMintingModal()` - Show minting modal
   - `showTierUpgradeModal()` - Show upgrade modal
   - `showBadgeMigrationModal()` - Show migration modal
   - `hideBadgeModal()` - Hide modals

2. **Transaction Handlers** (~450 lines)
   - `handleBadgeMint()` - Handle minting transaction
   - `handleBadgeUpgrade()` - Handle upgrade transaction
   - `handleBadgeMigration()` - Handle migration transaction
   - `handleBadgeMaybeLater()` - Handle "maybe later" button

3. **UI Display** (~200 lines)
   - `displayBadgeInUI()` - Display badge in containers
   - `showUpgradeError()` - Show error messages

4. **Utilities** (~100 lines)
   - `arrayBufferToBase64()` - Convert array buffer to base64
   - `fetchRegistryGames()` - Fetch games from registry

## Proposed Module Structure

### 1. `badge-ui-service.js` (~200 lines)
**Purpose**: State management and coordination
- State management (modal visibility, transaction state)
- `init()` - Initialize service
- `getState()` - Get current state
- Modal visibility tracking

### 2. `badge-ui-utils.js` (~100 lines)
**Purpose**: Utility functions
- `arrayBufferToBase64()` - Convert array buffer to base64
- `fetchRegistryGames()` - Fetch games from registry
- Image URL construction helpers

### 3. `badge-ui-modals.js` (~300 lines)
**Purpose**: Modal creation and display
- `showBadgeMintingModal()` - Show minting modal
- `showTierUpgradeModal()` - Show upgrade modal
- `showBadgeMigrationModal()` - Show migration modal
- `hideBadgeModal()` - Hide modals
- Modal HTML generation

### 4. `badge-ui-mint.js` (~200 lines)
**Purpose**: Badge minting flow
- `handleBadgeMint()` - Handle minting transaction
- `handleBadgeMaybeLater()` - Handle "maybe later" button
- Mint transaction flow

### 5. `badge-ui-upgrade.js` (~300 lines)
**Purpose**: Badge upgrade flow
- `handleBadgeUpgrade()` - Handle upgrade transaction
- `showUpgradeError()` - Show error messages
- Upgrade transaction flow

### 6. `badge-ui-migration.js` (~200 lines)
**Purpose**: Badge migration flow
- `handleBadgeMigration()` - Handle migration transaction
- Migration transaction flow

### 7. `badge-ui-display.js` (~150 lines)
**Purpose**: Badge display rendering
- `displayBadgeInUI()` - Display badge in containers
- Badge HTML generation
- Image handling

### 8. `badge-ui.js` (~50 lines)
**Purpose**: Main coordination
- Entry points
- Delegation to services
- Global function exposure

## Estimated File Sizes

| File | Lines | Status |
|------|-------|--------|
| `badge-ui-service.js` | ~200 | ✅ Good |
| `badge-ui-utils.js` | ~100 | ✅ Good |
| `badge-ui-modals.js` | ~300 | ✅ Good |
| `badge-ui-mint.js` | ~200 | ✅ Good |
| `badge-ui-upgrade.js` | ~300 | ✅ Good |
| `badge-ui-migration.js` | ~200 | ✅ Good |
| `badge-ui-display.js` | ~150 | ✅ Good |
| `badge-ui.js` | ~50 | ✅ Good |
| **Total** | **~1,500** | ✅ **All files < 350 lines** |

## Module Loading Order

1. `badge-ui-service.js` - State management
2. `badge-ui-utils.js` - Utilities (no dependencies)
3. `badge-ui-display.js` - Display rendering
4. `badge-ui-modals.js` - Modal creation
5. `badge-ui-mint.js` - Minting flow
6. `badge-ui-upgrade.js` - Upgrade flow
7. `badge-ui-migration.js` - Migration flow
8. `badge-ui.js` - Main coordination (loads last)

## Benefits

✅ **All files under 350 lines** - Easy to read and maintain  
✅ **Clear separation of concerns** - Each module has a single responsibility  
✅ **Better testability** - Functions can be tested in isolation  
✅ **Improved maintainability** - Changes are localized to specific modules  
✅ **No functionality changes** - All existing features preserved  

## Ready to Proceed

This plan follows the same successful pattern used for the store and leaderboard refactoring.

