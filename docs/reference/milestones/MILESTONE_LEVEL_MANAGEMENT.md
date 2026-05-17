# Milestone Level Management

## Overview

Milestone levels are now automatically managed based on threshold ordering. Levels are assigned as 1, 2, 3... in ascending threshold order, ensuring that:
- Level 1 = lowest threshold
- Level 2 = next threshold
- And so on...

This ensures that levels are always consistent with threshold ordering, making the connection between definitions and claimed milestones reliable.

## Implementation Status

### ✅ Completed

1. **Level Manager Service** (`backend/lib/sui/milestone-level-manager.ts`)
   - `calculateLevelForThreshold()` - Calculates proper level for a threshold
   - `getLevelForNewMilestone()` - Gets level for a new milestone
   - `getLevelForUpdatedMilestone()` - Gets level when updating threshold
   - `wouldThresholdChangeRequireReorganization()` - Detects if reorganization is needed
   - `getReorganizationPlan()` - Calculates what level changes are needed

2. **Auto-Level Assignment on Add** (`backend/app/api/admin/milestones/route.ts`)
   - When adding a milestone, level is automatically calculated based on threshold position
   - `milestoneLevel` parameter is now optional (auto-calculated if not provided)
   - Backward compatible: can still provide level manually if needed

3. **Reorganization Detection on Update** (`backend/app/api/admin/milestones/[category]/[level]/route.ts`)
   - When updating a threshold, system detects if level reorganization is needed
   - Returns error if reorganization would be required (prevents inconsistent state)
   - Provides detailed information about what reorganization would be needed

### ⚠️ Pending

1. **Automatic Level Reorganization**
   - When threshold changes require level changes, automatically reorganize
   - Requires updating both `milestone_definitions` table (change level keys)
   - Requires updating `claimed_milestones` table (migrate level values)
   - **Status**: Detection implemented, actual reorganization pending

2. **Contract Function for Reorganization**
   - Need Move contract function to:
     - Update milestone definition level (change key in table)
     - Migrate claimed milestones from old level to new level
     - Handle multiple level changes atomically
   - **Status**: Not yet implemented

3. **Frontend Updates**
   - Remove manual level input from add milestone form
   - Show calculated level in UI
   - Handle reorganization warnings/errors
   - **Status**: Partially done (level calculation works, UI updates pending)

## How It Works

### Adding a Milestone

1. User provides: category, threshold, credits, items
2. System fetches existing definitions for the category
3. System calculates: `level = position in sorted-by-threshold order + 1`
4. System adds milestone with calculated level

**Example:**
- Existing: Level 1 (threshold 5), Level 2 (threshold 10), Level 3 (threshold 20)
- Adding: threshold 15
- Calculated level: 3 (fits between 10 and 20)
- Result: New milestone gets level 3, old level 3 becomes level 4

### Updating a Milestone Threshold

1. User updates threshold for a milestone
2. System checks if new threshold position would change the level
3. If level would change:
   - **Current**: Returns error (prevents inconsistent state)
   - **Future**: Automatically reorganize levels and migrate claims

**Example:**
- Current: Level 2 (threshold 10)
- Update to: threshold 25
- If Level 3 has threshold 20, then:
  - Level 2 should become Level 3
  - Level 3 should become Level 2
  - Requires reorganization

## Level Reorganization

When thresholds change such that levels need to be reordered:

### Current Behavior
- System detects the need for reorganization
- Returns error with details about what changes are needed
- Prevents update to maintain data consistency

### Future Behavior (To Be Implemented)
1. Calculate reorganization plan (old level → new level mappings)
2. For each level change:
   - Update milestone definition level (change table key)
   - Migrate all claimed milestones from old level to new level
3. Update `category_milestone_levels` table
4. All changes in a single transaction (atomic)

## Contract Requirements

To fully implement automatic reorganization, we need:

1. **Function to change milestone level**
   ```move
   public entry fun change_milestone_level(
       _admin_cap: &AdminCapability,
       registry: &mut AchievementRegistry,
       category: u8,
       old_level: u8,
       new_level: u8,
       clock: &Clock
   )
   ```
   - Removes milestone from old level key
   - Adds milestone to new level key
   - Updates category_milestone_levels vector

2. **Function to migrate claimed milestones**
   ```move
   public entry fun migrate_claimed_milestone_level(
       _admin_cap: &AdminCapability,
       registry: &mut AchievementRegistry,
       category: u8,
       old_level: u8,
       new_level: u8
   )
   ```
   - For each player with claimed milestone at old_level
   - Remove old_level from their claimed vector
   - Add new_level to their claimed vector

3. **Batch reorganization function**
   ```move
   public entry fun reorganize_category_levels(
       _admin_cap: &AdminCapability,
       registry: &mut AchievementRegistry,
       category: u8,
       level_changes: vector<u8>, // old_level, new_level pairs
       clock: &Clock
   )
   ```
   - Performs all level changes atomically
   - Updates definitions and claimed milestones

## Benefits

1. **Consistency**: Levels always match threshold order
2. **Reliability**: Connection between definitions and claims is always correct
3. **Maintainability**: No manual level management needed
4. **Data Integrity**: Prevents mismatched levels and thresholds

## Migration Notes

- Existing milestones with levels that don't match threshold order will need reorganization
- Can be done via a one-time migration script
- After migration, levels will be automatically managed going forward
