# Badge Migration Guide

This guide explains how to migrate badges from an old contract deployment to a new contract deployment.

## Overview

When you redeploy the badge contract (e.g., after renaming "Starter" to "Standard"), existing badges remain in player wallets but are no longer tracked by the new contract's registry. This migration system allows you to:

1. **Bulk Migration (Admin)**: Migrate all badges at once using admin functions
2. **Player Migration**: Allow players to migrate their own badges

## Migration Process

### Step 1: Deploy New Contract

1. Deploy the new contract with updated code
2. Initialize the new `BadgeRegistry`
3. Update environment variables with new contract IDs

### Step 2: Find Old Badges

The migration script will automatically find all badges from the old contract by:
- Querying `BadgeMinted` events from the old contract
- Reading badge data from each badge object

### Step 3: Choose Migration Method

#### Option A: Admin-Assisted Migration (For Finding Old Badges)

The migration script can help you find and extract old badge data:

```bash
cd backend
npm run build
node dist/scripts/migrate-badges.js
```

**Important Notes:**
- ⚠️ **DO NOT use `admin_mint_badge` for migration** - it creates badges in the admin wallet
- Soulbound NFTs must be created directly in player wallets
- The script is useful for **finding old badges** and **extracting their data**
- Players must use `migrate_badge` to actually migrate (see Option B)

#### Option B: Player Self-Migration (✅ REQUIRED for Soulbound NFTs)

**This is the ONLY correct way to migrate soulbound badges.**

Players migrate their own badges by calling the `migrate_badge` function:

1. **Backend provides migration data**: Create an API endpoint that reads old badge data
2. **Player signs transaction**: Player calls `migrate_badge` with their old badge data
3. **Badge created in player wallet**: New badge is created directly in player's wallet (truly soulbound)

**Why this is required:**
- Soulbound NFTs must be created directly in the player's wallet
- `admin_mint_badge` creates badges in the admin wallet (breaks soulbound behavior)
- Only the player can sign a transaction that creates an object in their wallet

### Step 4: Environment Variables

Add these to your `.env.local`:

```env
# Old contract IDs (for migration)
OLD_GAME_SCORE_CONTRACT_TESTNET=0x...
OLD_BADGE_REGISTRY_OBJECT_ID_TESTNET=0x...

# New contract IDs (already set)
GAME_SCORE_CONTRACT_TESTNET=0x...
BADGE_REGISTRY_OBJECT_ID_TESTNET=0x...
```

## Migration Function Details

### `migrate_badge` (Player-Callable)

**Contract Function:**
```move
public entry fun migrate_badge(
    registry: &mut BadgeRegistry,
    stats_registry: &StatisticsRegistry,
    clock: &Clock,
    old_tier: u8,
    old_games_played: u64,
    old_mint_date: u64,
    image_data: vector<u8>,
    ctx: &mut TxContext
)
```

**Features:**
- Player signs the transaction (badge goes to their wallet)
- **Burns (deletes) the old badge** after creating the new one
- Preserves original `mint_date`
- Uses current `games_played` from stats registry (source of truth)
- Uses higher of old tier or current tier (no downgrades)
- Updates `last_updated` to current time
- **Player pays gas fees** for creating new badge + deleting old badge

**Backend Helper:**
```typescript
const txb = badgeService.buildMigrateBadgeTransaction(
  oldBadgeId,  // Object ID of old badge to be burned
  oldTier,
  oldGamesPlayed,
  oldMintDate,
  imageData
);
// Player signs and executes this transaction
// Old badge is automatically deleted by Sui
```

## Migration Script Usage

### Prerequisites

1. Old contract IDs in environment variables
2. New contract deployed and initialized
3. Admin wallet configured

### Running the Script

```bash
cd backend
npm run build
node dist/scripts/migrate-badges.js
```

The script will:
1. Find all badges from the old contract
2. Extract badge data (tier, games_played, mint_date, image_data)
3. **Display migration data** (does NOT automatically migrate)
4. You can use this data to help players migrate via `migrate_badge`

### Output

The script provides:
- List of all badges found
- Migration status for each badge
- Summary of successful/failed migrations

## Important Considerations

### Badge Ownership & Deletion

- **Old badges**: **Automatically burned (deleted)** when `migrate_badge` completes ✅
- **New badges (migrate_badge)**: Created in player wallet ✅ (REQUIRED for soulbound)
- **⚠️ admin_mint_badge**: Creates badges in admin wallet - **DO NOT USE for migration**
- **Gas fees**: Player pays for creating new badge + deleting old badge (single transaction)

### Tier Calculation

During migration:
- Current `games_played` is fetched from stats registry (source of truth)
- Tier is calculated based on current games
- If old tier is higher than current tier, old tier is preserved (no downgrades)

### Image Data

- Old badge image data is preserved
- If image data is missing, the script loads the appropriate tier image from `backend/public/badges/`

### Registry Cleanup

After migration:
- Old registry entries remain (harmless)
- New registry tracks new badges
- You can use `admin_cleanup_orphaned_entry` to clean up old registry if needed

## API Endpoint for Player Migration

You may want to create an API endpoint to help players migrate:

```typescript
// GET /api/badges/[address]/migrate
// Returns old badge data for migration
```

This endpoint would:
1. Check if player has old badge
2. Read old badge data
3. Return data needed for `migrate_badge` call

## Troubleshooting

### "Player already has badge" Error

- Player already migrated their badge
- Or player has a new badge from the new contract
- Check the new registry to confirm

### "Badge not found" Error

- Old badge may have been burned or deleted
- Check old contract events to verify badge existence

### Image Data Missing

- Script will load default tier image
- Ensure `backend/public/badges/` has all tier images

## Best Practices

1. **Test migration on testnet first**
2. **Backup old badge data** before migration
3. **Communicate with players** about migration process
4. **Provide clear instructions** for player self-migration
5. **Monitor migration progress** and handle failures

## Next Steps

After migration:
1. Update frontend to use new contract IDs
2. Update Display object for new contract
3. Test badge queries and display
4. Monitor for any issues

