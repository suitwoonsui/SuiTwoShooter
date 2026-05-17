# Badge Service Module Split Plan

## 🎯 Goal
Split the 3,877-line `badge-service.ts` into focused, maintainable modules.

## 📁 Proposed Module Structure

```
backend/lib/sui/badge-service/
├── index.ts                    # Main BadgeService class (orchestrator)
├── badge-queries.ts            # Query operations (hasBadge, getBadge)
├── badge-transactions.ts       # Transaction building (mint, upgrade, migrate)
├── badge-images.ts             # Image loading and management
├── badge-admin.ts              # Admin operations (mint, burn, cleanup)
├── badge-old-contract.ts       # Old contract support methods
├── badge-utilities.ts          # Helper functions (tier calculation, discounts)
└── types.ts                    # Shared types and interfaces
```

## 📊 Module Breakdown

### 1. `badge-queries.ts` (~300 lines)
**Methods:**
- `hasBadge(playerAddress)`
- `getBadge(playerAddress)`
- `hasBadgeOldContract(playerAddress)`
- `getBadgeOldContract(playerAddress)`

**Dependencies:**
- BadgeLogger
- BadgeError
- BadgeValidators
- getBadgeRequestCache
- SuiClient

### 2. `badge-transactions.ts` (~600 lines)
**Methods:**
- `buildMintBadgeTransaction()`
- `buildUpgradeBadgeTransaction()`
- `buildMigrateBadgeTransaction()`
- `checkAndBuildBadgeUpdate()`
- `getMintBadgeTransactionData()`

**Dependencies:**
- BadgeLogger
- BadgeError
- BadgeValidators
- Badge images module
- Badge queries module

### 3. `badge-images.ts` (~400 lines)
**Methods:**
- `loadBadgeImage(tier)`
- `getBadgeImageUrl(tier)`
- `createPlaceholderImage(tier)`
- `createImageDataObjectChunked(imageData)`

**Dependencies:**
- BadgeLogger
- BadgeError
- getBadgeImageCache
- fs, path

### 4. `badge-admin.ts` (~500 lines)
**Methods:**
- `adminMintBadge()`
- `adminBurnBadge()`
- `adminCleanupOrphanedEntry()`
- `adminMintBadgeOldContract()`
- `adminBurnBadgeOldContract()`

**Dependencies:**
- BadgeLogger
- BadgeError
- BadgeValidators
- Badge transactions module

### 5. `badge-old-contract.ts` (~800 lines)
**Methods:**
- `findOldContractObjects()`
- `findOldBadgeRegistry()`
- `verifyOldContractConfig()`
- `getPackageDeploymentInfo()`
- `comparePackageAges()`
- `verifyEnvironmentConfig()`
- `inspectOldContractFunctions()`

**Dependencies:**
- BadgeLogger
- BadgeError
- SuiClient

### 6. `badge-utilities.ts` (~200 lines)
**Methods:**
- `calculateTierFromGames(gamesPlayed)`
- `getDiscounts(tier)`
- Helper functions

**Dependencies:**
- None (pure functions)

### 7. `index.ts` (~300 lines)
**Main BadgeService class:**
- Orchestrates all modules
- Provides unified API
- Maintains backward compatibility

## 🚀 Implementation Strategy

### Phase 1: Extract Utilities (Lowest Risk)
1. Extract `badge-utilities.ts` (pure functions, no dependencies)
2. Test utilities work
3. Update main service to use utilities

### Phase 2: Extract Images (Low Risk)
1. Extract `badge-images.ts`
2. Test image loading works
3. Update main service to use images module

### Phase 3: Extract Queries (Medium Risk)
1. Extract `badge-queries.ts`
2. Test queries work
3. Update main service to use queries module

### Phase 4: Extract Transactions (Medium Risk)
1. Extract `badge-transactions.ts`
2. Test transaction building works
3. Update main service to use transactions module

### Phase 5: Extract Admin & Old Contract (Higher Risk)
1. Extract remaining modules
2. Test all admin operations
3. Final cleanup

## ✅ Benefits

1. **Maintainability**: Each module < 800 lines, focused responsibility
2. **Testability**: Easier to test individual modules
3. **Reusability**: Modules can be used independently
4. **Reduced Conflicts**: Multiple developers can work on different modules
5. **Better Organization**: Clear separation of concerns

## 📝 Notes

- All modules will maintain the same public API
- Backward compatibility will be preserved
- Existing code will continue to work
- Gradual migration (can be done incrementally)

