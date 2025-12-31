# Achievement Contract Review

## Current Implementation Status

### ✅ **Milestone Targets (Definitions)**

**Implemented:**
- `add_milestone_definition` - Admin can add milestone definitions (category, threshold, credits)
- `get_milestone_definition` - Get a specific milestone definition by category and threshold
- `has_category_definitions` - Check if a category has any definitions

**Missing:**
- ❌ `get_all_thresholds_for_category` - Get all thresholds for a category (needed for progress display)
- ❌ `get_all_milestone_definitions_for_category` - Get all milestone definitions (threshold + credits) for a category
- ❌ `get_all_milestone_definitions` - Get all milestone definitions across all categories

**Note:** Item rewards are NOT stored on-chain (only credits). Items are handled in the backend. This is intentional.

---

### ✅ **Claims**

**Implemented:**
- `claim_milestone` - Admin marks a milestone as claimed (emits event)
- `is_milestone_claimed` - Check if a specific milestone is claimed
- `get_claimed_milestones` - Get all claimed milestones (direct object access)
- `get_claimed_milestones_for_player` - Get all claimed milestones via registry
- `get_player_achievements_id` - Get PlayerAchievements object ID for a player

**Missing:**
- ❌ `get_claimed_milestones_for_category` - Get claimed milestones for a specific category only (more efficient)

**Issue Found:**
- Backend is calling `get_claimed_milestones(registry, player)` but this function doesn't exist with that signature
- Should call `get_claimed_milestones_for_player(registry, player)` instead

---

### ✅ **Rewards**

**Implemented:**
- `MilestoneDefinition` struct includes `credits` field
- `AchievementClaimed` event includes `credits_awarded`

**Missing:**
- ❌ Item rewards are not stored on-chain (handled in backend)
- ❌ No method to get reward details (credits + items) for a milestone

**Note:** Item rewards are intentionally handled off-chain in the backend service. Only credits are tracked on-chain.

---

## Recommended Additions

### 1. Get All Thresholds for a Category

```move
/// Get all thresholds for a category (sorted)
public fun get_all_thresholds_for_category(
    registry: &AchievementRegistry,
    category: u8
): vector<u64> {
    if (!table::contains(&registry.milestone_definitions, category)) {
        return vector::empty()
    };
    
    let category_table = table::borrow(&registry.milestone_definitions, category);
    // Note: Table doesn't support iteration, so we'd need to use events or store separately
    // This is a limitation - we may need to store thresholds in a vector
}
```

**Problem:** Sui `Table` doesn't support iteration. We need to either:
- Store thresholds in a separate `Table<u8, vector<u64>>` for quick access
- Use events to reconstruct the list
- Query individual thresholds (inefficient)

### 2. Get Milestone Definitions for a Category

```move
/// Get all milestone definitions for a category
public fun get_milestone_definitions_for_category(
    registry: &AchievementRegistry,
    category: u8
): vector<MilestoneDefinition> {
    // Same iteration problem as above
}
```

### 3. Get Claimed Milestones for Category

```move
/// Get claimed milestones for a specific category
public fun get_claimed_milestones_for_category(
    achievements: &PlayerAchievements,
    category: u8
): vector<u64> {
    let claimed_list = get_claimed_list(achievements, category);
    *claimed_list  // Return copy
}
```

---

## Critical Issues to Fix

### Issue 1: Backend Function Call Mismatch

**Backend calls:**
```typescript
target: `${packageId}::achievement_system::get_claimed_milestones`,
arguments: [txb.object(registryId), txb.pure.address(playerAddress)]
```

**Contract has:**
- `get_claimed_milestones(achievements: &PlayerAchievements)` - Wrong signature
- `get_claimed_milestones_for_player(registry: &AchievementRegistry, player: address)` - Correct one

**Fix:** Backend should call `get_claimed_milestones_for_player` instead.

### Issue 2: No Way to Get All Thresholds

The contract cannot return all thresholds for a category because `Table` doesn't support iteration. We need to add a separate storage structure:

```move
struct AchievementRegistry has key {
    // ... existing fields ...
    category_thresholds: Table<u8, vector<u64>>,  // Store sorted thresholds per category
}
```

Then update `add_milestone_definition` to maintain this list.

---

## Recommended Contract Updates

1. **Add `category_thresholds` table** to store sorted thresholds per category
2. **Add `get_all_thresholds_for_category`** function
3. **Add `get_claimed_milestones_for_category`** function (efficiency)
4. **Fix backend to use `get_claimed_milestones_for_player`**

---

## Summary

| Feature | Status | Notes |
|---------|--------|-------|
| Add milestone definitions | ✅ | **IMPLEMENTED** |
| Update milestone definitions | ✅ | **NEW - update credits** |
| Delete milestone definitions | ✅ | **NEW - remove milestone** |
| Get single milestone definition | ✅ | Works |
| Get all thresholds for category | ✅ | **NEW - returns sorted vector** |
| Claim milestone | ✅ | Works |
| Unclaim milestone | ✅ | **NEW - admin can unclaim for corrections** |
| Check if claimed | ✅ | Works |
| Get all claimed milestones | ✅ | Works |
| Get claimed for category | ✅ | **NEW - efficiency improvement** |
| Credits tracking | ✅ | Works |
| Item rewards | ✅ | **NEW - Now stored on-chain** |

## New Functions Added

### Milestone Definition Management
1. **`update_milestone_definition`** - Update credits for an existing milestone
2. **`delete_milestone_definition`** - Remove a milestone definition
3. **`get_all_thresholds_for_category`** - Get sorted list of all thresholds for a category

### Claim Management
1. **`unclaim_milestone`** - Admin can unclaim a milestone (for corrections)
2. **`get_claimed_milestones_for_category`** - Get claimed milestones for a specific category (direct object)
3. **`get_claimed_milestones_for_category_via_registry`** - Get claimed milestones for a category (via registry)

### New Events
1. **`MilestoneDefinitionUpdated`** - Emitted when a milestone definition is updated
2. **`MilestoneDefinitionDeleted`** - Emitted when a milestone definition is deleted
3. **`AchievementUnclaimed`** - Emitted when a milestone is unclaimed

## Implementation Details

### Storage Changes
- Added `category_thresholds: Table<u8, vector<u64>>` to `AchievementRegistry`
- Maintains sorted list of thresholds per category for efficient querying
- Automatically updated when milestones are added/deleted

### Helper Functions
- `insert_threshold_sorted` - Inserts threshold into sorted vector (maintains order)
- `remove_threshold` - Removes threshold from sorted vector

### Error Codes
- Added `E_MILESTONE_ALREADY_EXISTS` (error code 6) for duplicate milestone definitions

## Item Rewards Implementation

### ItemReward Struct
```move
struct ItemReward has store {
    item_id: u8,      // 0=orbLevel, 1=forceField, 2=extraLives, 3=slowTime, 4=coinTractorBeam, 5=destroyAll, 6=bossKillShot
    level: u8,        // Item level (1, 2, or 3) - special items are always level 1
    quantity: u64,    // Number of items
}
```

### Item Type Constants
- `ITEM_ORB_LEVEL: u8 = 0`
- `ITEM_FORCE_FIELD: u8 = 1`
- `ITEM_EXTRA_LIVES: u8 = 2`
- `ITEM_SLOW_TIME: u8 = 3`
- `ITEM_COIN_TRACTOR_BEAM: u8 = 4`
- `ITEM_DESTROY_ALL: u8 = 5`
- `ITEM_BOSS_KILL_SHOT: u8 = 6`

### New Functions for Item Rewards
1. **`get_milestone_definition_full`** - Get milestone with credits + items
2. **`get_milestone_definitions_for_category`** - Get all milestone definitions (thresholds, credits, items) for a category

### Updated Functions
- **`add_milestone_definition`** - Now accepts `items: vector<ItemReward>` parameter
- **`update_milestone_definition`** - Now accepts `new_items: vector<ItemReward>` parameter
- **`MilestoneDefinitionAdded`** event - Now includes `items_count`
- **`MilestoneDefinitionUpdated`** event - Now includes `old_items_count` and `new_items_count`

## Remaining Issues

1. **Backend Function Call** - Backend still calls `get_claimed_milestones(registry, player)` but should call `get_claimed_milestones_for_player(registry, player)`
2. **Backend Integration** - Backend needs to be updated to:
   - Pass item rewards when adding/updating milestones
   - Read item rewards from on-chain definitions
   - Convert between string item IDs (backend) and u8 item IDs (contract)

