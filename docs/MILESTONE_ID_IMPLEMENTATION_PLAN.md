# Milestone ID Implementation Plan

## Overview

Add stable, immutable `milestone_id` to each milestone definition. This ID will never change, even when levels are reorganized, providing a reliable way to track milestones across their lifetime.

## Goals

1. **Stable Identity**: Each milestone gets a unique ID that never changes
2. **Backward Compatibility**: Existing milestones get IDs via migration
3. **Reorganization Support**: Level changes don't break milestone references
4. **Claim Tracking**: Claimed milestones tracked by ID, not level

## Contract Changes

### 1. Add `milestone_id` to MilestoneDefinition

```move
struct MilestoneDefinition has store, drop, copy {
    milestone_id: u64,        // NEW: Stable unique identifier (never changes)
    milestone_level: u8,      // Level within category (can change during reorganization)
    category: u8,
    threshold: u64,
    credits: u64,
    items: vector<ItemReward>,
}
```

### 2. Add ID Counter to Registry

```move
struct AchievementRegistry has key {
    id: UID,
    admin: address,
    
    // NEW: Auto-incrementing counter for milestone IDs
    next_milestone_id: u64,
    
    // Existing tables...
    milestone_definitions: Table<u8, Table<u8, MilestoneDefinition>>,
    category_milestone_levels: Table<u8, vector<u8>>,
    player_achievements: Table<address, ID>,
    claimed_milestones: Table<address, Table<u8, vector<u8>>>,
    
    // NEW: Index by milestone_id for efficient lookup
    milestone_by_id: Table<u64, (u8, u8)>, // milestone_id -> (category, level)
}
```

### 3. Update Storage Structure

**Option A: Keep level-based storage, add ID index**
- Keep: `milestone_definitions: Table<u8, Table<u8, MilestoneDefinition>>`
- Add: `milestone_by_id: Table<u64, (u8, u8)>` for reverse lookup
- Pros: Minimal changes, backward compatible
- Cons: Two storage structures to maintain

**Option B: Switch to ID-based storage**
- Change: `milestone_definitions: Table<u8, Table<u64, MilestoneDefinition>>` (category -> milestone_id)
- Remove: Level-based storage
- Pros: Single source of truth, cleaner
- Cons: More breaking changes, requires full migration

**Recommendation: Option A** (hybrid approach)
- Keep level-based storage for backward compatibility
- Add ID index for stable references
- Gradually migrate to ID-based lookups

### 4. Update Claimed Milestones Storage

**Current**: `claimed_milestones: Table<address, Table<u8, vector<u8>>>`
- Stores: `category -> vector<milestone_level>`

**New**: Add ID-based tracking
```move
// Keep level-based for backward compatibility
claimed_milestones: Table<address, Table<u8, vector<u8>>>,

// NEW: ID-based tracking (primary)
claimed_milestones_by_id: Table<address, vector<u64>>, // All claimed milestone IDs
```

**Migration Strategy**:
1. Keep both during transition
2. New claims write to both
3. Gradually migrate existing claims
4. Eventually deprecate level-based

## Implementation Steps

### Phase 1: Contract Changes

1. **Add milestone_id field**
   - Update `MilestoneDefinition` struct
   - Add `next_milestone_id` counter to registry
   - Add `milestone_by_id` index table

2. **Update add_milestone_definition**
   - Auto-assign `milestone_id` from counter
   - Increment counter
   - Add entry to `milestone_by_id` index
   - Emit event with `milestone_id`

3. **Add ID-based lookup functions**
   ```move
   public fun get_milestone_by_id(
       registry: &AchievementRegistry,
       milestone_id: u64
   ): (bool, MilestoneDefinition)
   
   public fun get_milestone_id(
       registry: &AchievementRegistry,
       category: u8,
       milestone_level: u8
   ): (bool, u64)
   ```

4. **Update claim_milestone**
   - Accept `milestone_id` (in addition to category/level)
   - Store in both level-based and ID-based structures
   - Emit event with `milestone_id`

### Phase 2: Migration Script

**Purpose**: Add IDs to all existing milestones

**Steps**:
1. Query all existing milestones (by category and level)
2. For each milestone:
   - Generate new `milestone_id` (sequential)
   - Update milestone definition with ID
   - Add to `milestone_by_id` index
   - Update `next_milestone_id` counter
3. Migrate claimed milestones:
   - For each player's claimed milestones:
     - Look up milestone_id for each (category, level)
     - Add to `claimed_milestones_by_id`

**Script Location**: `backend/scripts/add-milestone-ids.ts`

### Phase 3: Reorganization Logic Update

**Current Problem**: Reorganization changes levels, breaking references

**New Approach**:
1. Calculate reorganization plan (old level -> new level)
2. For each milestone:
   - Keep `milestone_id` unchanged
   - Update `milestone_level` in definition
   - Update `milestone_by_id` index (category, new_level)
   - Update `category_milestone_levels` vector
3. For claimed milestones:
   - No changes needed! (tracked by ID, not level)
   - Or: Update level-based tracking if still using it

**Contract Function**:
```move
public entry fun reorganize_category_levels(
    _admin_cap: &AdminCapability,
    registry: &mut AchievementRegistry,
    category: u8,
    level_changes: vector<u8>, // old_level, new_level pairs
    clock: &Clock
)
```

### Phase 4: Backend Updates

1. **Update AchievementService**
   - Add methods to work with `milestone_id`
   - Update `getMilestoneDefinitions()` to include IDs
   - Update `getClaimedMilestones()` to use IDs

2. **Update Level Manager**
   - Track milestones by ID during reorganization
   - Map old level -> new level using IDs

3. **Update API Endpoints**
   - Accept `milestone_id` in addition to category/level
   - Return `milestone_id` in responses
   - Support ID-based lookups

### Phase 5: Frontend Updates

1. **Update MilestonesTab**
   - Display `milestone_id` in UI
   - Use ID for tracking during reorganization
   - Handle ID-based claims

2. **Update Claim Flow**
   - Use `milestone_id` for claiming
   - Track claimed by ID

## Migration Plan for Existing Milestones

### Step 1: Deploy Contract Changes
- Deploy updated contract with `milestone_id` support
- New milestones automatically get IDs
- Existing milestones still work (without IDs)

### Step 2: Run Migration Script
```bash
cd backend
npx tsx scripts/add-milestone-ids.ts
```

**Script Logic**:
1. Get all categories
2. For each category:
   - Get all milestone levels
   - For each level:
     - Fetch milestone definition
     - Generate new ID (sequential)
     - Call `update_milestone_id()` contract function
     - Add to index
3. Migrate claimed milestones:
   - For each player:
     - Get claimed milestones (by level)
     - Convert to IDs
     - Update `claimed_milestones_by_id`

### Step 3: Verify Migration
- Check all milestones have IDs
- Verify claimed milestones migrated
- Test reorganization

### Step 4: Gradual Migration
- Update backend to prefer ID-based lookups
- Keep level-based as fallback
- Eventually deprecate level-based

## Benefits

1. **Stable References**: Milestones can be referenced by ID that never changes
2. **Easy Reorganization**: Change levels without breaking claims
3. **Better Tracking**: Can track milestone history by ID
4. **Future-Proof**: Foundation for more advanced features

## Risks & Mitigation

1. **Breaking Changes**: 
   - Mitigation: Keep level-based storage during transition
   - Gradual migration approach

2. **Migration Complexity**:
   - Mitigation: Comprehensive testing, rollback plan

3. **Performance**:
   - Mitigation: Index tables for efficient lookups

## Timeline

1. **Week 1**: Contract changes + migration script
2. **Week 2**: Backend updates + testing
3. **Week 3**: Frontend updates + integration
4. **Week 4**: Migration execution + verification
