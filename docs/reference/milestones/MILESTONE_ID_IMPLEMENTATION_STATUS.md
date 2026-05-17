# Milestone ID Implementation Status

## ✅ Completed

### Contract Changes (`contracts/suitwo_game/sources/achievement_system.move`)

1. **Added `milestone_id` to MilestoneDefinition**
   - Stable unique identifier (u64) that never changes
   - Added as first field in struct

2. **Updated AchievementRegistry**
   - Added `next_milestone_id: u64` counter
   - Added `milestone_by_id: Table<u64, MilestoneLocation>` index
   - Added `claimed_milestone_ids: Table<address, vector<u64>>` for ID-based tracking
   - Created `MilestoneLocation` struct for index values

3. **Updated `initialize_achievement_registry`**
   - Initializes `next_milestone_id` to 1
   - Creates new index tables

4. **Updated `add_milestone_definition`**
   - Auto-assigns `milestone_id` from counter
   - Increments counter
   - Adds entry to `milestone_by_id` index
   - Includes `milestone_id` in event

5. **Updated `get_milestone_definition_full`**
   - Now returns `(bool, u64, u64, u64, vector<ItemReward>)`
   - Returns: `(exists, milestone_id, threshold, credits, items)`
   - **Breaking change**: Return signature changed

6. **Added new lookup functions**
   - `get_milestone_by_id()` - Get milestone by stable ID
   - `get_milestone_id()` - Get ID for category/level

7. **Updated `claim_milestone`**
   - Gets `milestone_id` from definition
   - Tracks claims in both level-based and ID-based structures
   - Includes `milestone_id` in event

8. **Updated `delete_milestone_definition`**
   - Removes from `milestone_by_id` index when deleting

9. **Added migration function**
   - `update_milestone_id()` - Add IDs to existing milestones

10. **Added reorganization function**
    - `reorganize_category_levels()` - Reorganize levels while keeping IDs stable
    - Handles level swaps using temporary storage

11. **Updated events**
    - `MilestoneDefinitionAdded` includes `milestone_id`
    - `AchievementClaimed` includes `milestone_id`

### Backend Changes

1. **Updated interfaces** (`backend/lib/sui/achievement-service.ts`)
   - `MilestoneDefinition` includes `milestoneId?: number`
   - `EligibleAchievement` includes `milestoneId?: number`

2. **Updated parsing logic**
   - `_fetchMilestoneDefinitions()` now extracts `milestone_id` from return values
   - Updated to handle new return signature: `(exists, milestone_id, threshold, credits, items)`

3. **Updated `checkCategory`**
   - Includes `milestoneId` in eligible achievements

4. **Updated level manager** (`backend/lib/sui/milestone-level-manager.ts`)
   - `MilestoneDefinition` interface includes `milestoneId`
   - `LevelReorganization` includes `milestoneId` for tracking

### Migration Script

1. **Created** (`backend/scripts/add-milestone-ids.ts`)
   - Scans all existing milestones
   - Assigns sequential IDs (1, 2, 3...)
   - Updates each milestone with ID
   - Handles all 12 categories

## ⚠️ Breaking Changes

1. **`get_milestone_definition_full` return signature changed**
   - **Old**: `(bool, u64, u64, vector<ItemReward>)` - (exists, threshold, credits, items)
   - **New**: `(bool, u64, u64, u64, vector<ItemReward>)` - (exists, milestone_id, threshold, credits, items)
   - **Impact**: All callers need to be updated
   - **Status**: ✅ Updated in contract (claim_milestone)
   - **Status**: ✅ Updated in backend (achievement-service.ts)

## 🔄 Migration Required

### Step 1: Deploy Contract
- Deploy updated contract with `milestone_id` support
- New milestones automatically get IDs
- Existing milestones still work (without IDs initially)

### Step 2: Run Migration Script
```bash
cd backend
npx tsx scripts/add-milestone-ids.ts
```

This will:
- Scan all existing milestones
- Assign sequential IDs
- Update each milestone via `update_milestone_id()`
- Populate `milestone_by_id` index

### Step 3: Verify
- Check all milestones have IDs
- Verify `milestone_by_id` index is populated
- Test reorganization

## 📋 Remaining Tasks

### Backend Updates
- [ ] Update `getClaimedMilestones()` to also return IDs
- [ ] Update claim endpoints to use `milestone_id` when available
- [ ] Add API endpoint for reorganization
- [ ] Update migration service to handle IDs

### Frontend Updates
- [ ] Display `milestone_id` in MilestonesTab
- [ ] Use IDs for tracking during reorganization
- [ ] Handle ID-based claims

### Testing
- [ ] Test contract changes on testnet
- [ ] Test migration script
- [ ] Test reorganization function
- [ ] Test backward compatibility (milestones without IDs)

## 🎯 Benefits Achieved

1. **Stable References**: Milestones can be referenced by ID that never changes
2. **Easy Reorganization**: Change levels without breaking claims
3. **Better Tracking**: Can track milestone history by ID
4. **Future-Proof**: Foundation for more advanced features

## 📝 Notes

- `milestone_id` is optional in TypeScript interfaces for backward compatibility
- Milestones without IDs (pre-migration) will have `milestoneId: undefined`
- After migration, all milestones will have IDs
- Reorganization uses IDs to maintain stable references
