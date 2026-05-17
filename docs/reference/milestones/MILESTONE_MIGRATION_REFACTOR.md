# Milestone Migration Refactor

## Overview
Refactored the milestone system to properly separate "initialization" (factory defaults) from "migration" (old contract → new contract).

## Changes Made

### 1. Renamed "Migration" to "Initialize"
- **Old**: `/api/admin/milestones/migrate` - Set hardcoded milestones (misnamed)
- **New**: `/api/admin/milestones/initialize` - Initialize factory default milestones
- **Purpose**: Sets up hardcoded milestone definitions on-chain for first-time setup

### 2. Created True Migration Endpoint
- **New**: `/api/admin/milestones/migrate` - Migrate from old contract to new contract
- **Purpose**: Transfers milestone definitions and player claimed milestones from old contract
- **Features**:
  - Reads milestone definitions from old contract
  - Reads player claimed milestones from old contract
  - Writes both to new contract
  - Supports migrating all players or a specific player

### 3. Removed Fallback Logic
- **Before**: System would fall back to hardcoded milestones if on-chain fetch failed
- **After**: System fails gracefully with clear error messages
- **Rationale**: Forces proper setup (either initialize or migrate) instead of silently using fallbacks

### 4. Added Old Contract Configuration
- Added to `config.ts`:
  - `oldAchievementPackageId` - Old contract package ID
  - `oldAchievementRegistryId` - Old contract registry object ID
  - `oldAchievementAdminCapId` - Old contract admin capability ID
- Environment variables:
  - `OLD_ACHIEVEMENT_PACKAGE_ID_TESTNET` / `OLD_ACHIEVEMENT_PACKAGE_ID_MAINNET`
  - `OLD_ACHIEVEMENT_REGISTRY_OBJECT_ID_TESTNET` / `OLD_ACHIEVEMENT_REGISTRY_OBJECT_ID_MAINNET`
  - `OLD_ACHIEVEMENT_ADMIN_CAP_OBJECT_ID_TESTNET` / `OLD_ACHIEVEMENT_ADMIN_CAP_OBJECT_ID_MAINNET`

### 5. Updated Admin UI
- **Initialize Section**: Button to set factory defaults
- **Migration Section**: Form to enter old contract addresses + button to migrate
- Both sections clearly labeled and separated

## Architecture

### Initialize Flow
```
User clicks "Initialize"
  ↓
POST /api/admin/milestones/initialize
  ↓
Reads hardcoded definitions from AchievementService
  ↓
Checks existing milestones on-chain
  ↓
Adds missing milestones (batched by category)
  ↓
Returns summary
```

### Migration Flow
```
User enters old contract addresses
User clicks "Migrate"
  ↓
POST /api/admin/milestones/migrate
  ↓
MilestoneMigrationService.readOldMilestoneDefinitions()
  ↓
MilestoneMigrationService.readOldPlayerClaimedMilestones()
  ↓
MilestoneMigrationService.migrateMilestoneDefinitions()
  ↓
MilestoneMigrationService.migratePlayerClaimedMilestones()
  ↓
Returns summary
```

## Error Handling

### Before (with fallback)
- ❌ Silently uses hardcoded milestones if on-chain fetch fails
- ❌ No indication that milestones aren't properly set up
- ❌ Can lead to confusion about what's actually on-chain

### After (fail gracefully)
- ✅ Throws clear error if milestones not found on-chain
- ✅ Error message instructs to initialize or migrate
- ✅ Forces proper setup before system can function
- ✅ No silent fallbacks

## API Endpoints

### POST /api/admin/milestones/initialize
**Purpose**: Initialize factory default milestones

**Request**:
```json
{
  "adminWalletAddress": "0x...",
  "force": false
}
```

**Response**:
```json
{
  "success": true,
  "message": "Successfully initialized 77 milestone definitions (0 already existed)",
  "summary": {
    "totalCategories": 12,
    "successCount": 12,
    "errorCount": 0,
    "totalAdded": 77,
    "totalSkipped": 0
  },
  "results": [...]
}
```

### POST /api/admin/milestones/migrate
**Purpose**: Migrate from old contract to new contract

**Request**:
```json
{
  "adminWalletAddress": "0x...",
  "oldPackageId": "0x...", // Optional - uses config if not provided
  "oldRegistryId": "0x...", // Optional - uses config if not provided
  "oldAdminCapId": "0x...", // Optional - uses config if not provided
  "migrateDefinitions": true,
  "migratePlayerClaims": true,
  "playerAddress": "0x...", // Optional - if provided, only migrate claims for this player
  "force": false
}
```

**Response**:
```json
{
  "success": true,
  "message": "Migration completed successfully",
  "results": {
    "definitions": {
      "success": true,
      "migrated": 77,
      "skipped": 0
    },
    "playerClaims": {
      "success": true,
      "migrated": 150
    }
  }
}
```

## Migration Service

### MilestoneMigrationService
Located at: `backend/lib/sui/migration-service/milestone-migration.ts`

**Methods**:
1. `readOldMilestoneDefinitions()` - Reads all milestone definitions from old contract
2. `readOldPlayerClaimedMilestones()` - Reads all player claimed milestones from old contract
3. `migrateMilestoneDefinitions()` - Migrates definitions to new contract
4. `migratePlayerClaimedMilestones()` - Migrates player claims to new contract

## Configuration

### Environment Variables

#### Old Contract (for migration)
```bash
# Testnet
OLD_ACHIEVEMENT_PACKAGE_ID_TESTNET=0x...
OLD_ACHIEVEMENT_REGISTRY_OBJECT_ID_TESTNET=0x...
OLD_ACHIEVEMENT_ADMIN_CAP_OBJECT_ID_TESTNET=0x...

# Mainnet
OLD_ACHIEVEMENT_PACKAGE_ID_MAINNET=0x...
OLD_ACHIEVEMENT_REGISTRY_OBJECT_ID_MAINNET=0x...
OLD_ACHIEVEMENT_ADMIN_CAP_OBJECT_ID_MAINNET=0x...
```

## Usage

### First-Time Setup
1. **Option A**: Use "Initialize" to set factory defaults
2. **Option B**: Use "Migrate" if you have an old contract to migrate from

### After Contract Upgrade
1. Use "Migrate" to transfer data from old contract
2. Provide old contract addresses in the UI form
3. System will migrate both definitions and player claims

### Error Recovery
- If milestones are missing, system will fail with clear error
- Error message will instruct to either:
  - Initialize factory defaults, OR
  - Migrate from old contract

## Benefits

1. **Clear Separation**: Initialize vs Migrate are now distinct operations
2. **No Silent Failures**: System fails gracefully instead of using fallbacks
3. **Proper Migration**: True migration from old contract preserves all data
4. **Better UX**: Admin UI clearly shows both options
5. **Maintainability**: No hidden fallback logic to maintain

## Testing Checklist

- [ ] Initialize works with factory defaults
- [ ] Initialize skips existing milestones
- [ ] Migration reads from old contract correctly
- [ ] Migration writes to new contract correctly
- [ ] Migration handles player claims correctly
- [ ] System fails gracefully when milestones not found
- [ ] Error messages are clear and actionable
- [ ] Admin UI shows both options correctly
