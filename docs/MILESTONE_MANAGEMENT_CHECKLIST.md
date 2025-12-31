# Milestone Management - Pre-Deployment Checklist

## Overview
This document lists all the functions and features needed for complete milestone definition management before deploying the updated Move contract.

## Entry Functions Required (for TypeScript/API access)

### ✅ Already Implemented

1. **Add Milestone**
   - `add_milestone_definition_entry` - ✅ Added (accepts parallel vectors)
   - Creates a new milestone definition with threshold, credits, and items

2. **Update Milestone (Partial)**
   - `update_milestone_threshold` - ✅ Exists (entry function)
   - `update_milestone_credits` - ✅ Exists (entry function)
   - `update_milestone_definition_entry` - ✅ Just added (full update with parallel vectors)

3. **Delete Milestone**
   - `delete_milestone_definition` - ✅ Exists (entry function)

4. **Item Management (Individual)**
   - `add_milestone_reward` - ✅ Exists (entry function) - Add single item to milestone
   - `edit_milestone_reward` - ✅ Exists (entry function) - Edit single item in milestone
   - `delete_milestone_reward` - ✅ Exists (entry function) - Delete single item from milestone
   - `clear_milestone_rewards` - ✅ Exists (entry function) - Clear all items from milestone

5. **Read Functions**
   - `get_milestone_definition_full` - ✅ Exists (public fun) - Get full milestone (threshold, credits, items)
   - `get_all_milestone_levels_for_category` - ✅ Exists (public fun) - Get all milestone levels for a category
   - `get_milestone_definitions_for_category` - ✅ Exists (public fun) - Get all milestones for a category

## Backend Implementation Status

### ✅ Completed

1. **Migration Script**
   - `backend/scripts/migrate-milestones.ts` - ✅ Created
   - Deploys all hardcoded milestone definitions to on-chain
   - Uses `add_milestone_definition_entry` with parallel vectors

2. **Backend Service**
   - `AchievementService.getMilestoneDefinitions()` - ✅ Public method
   - Fetches from on-chain with 5-minute cache
   - Falls back to hardcoded definitions if on-chain is empty
   - Parses Move return values correctly

3. **API Endpoints**
   - `GET /api/admin/milestones` - ✅ Lists all milestones
   - `POST /api/admin/milestones` - ✅ Adds new milestone (uses entry function)
   - `PUT /api/admin/milestones/[category]/[level]` - ✅ Updates milestone (uses entry functions)
   - `DELETE /api/admin/milestones/[category]/[level]` - ✅ Deletes milestone

4. **Admin UI**
   - `MilestonesTab` component - ✅ Created
   - View milestones by category
   - Add/Edit/Delete milestones
   - Form for threshold, credits, and items

## Contract Changes Summary

### New Entry Functions Added

1. **`add_milestone_definition_entry`**
   ```move
   public entry fun add_milestone_definition_entry(
       _admin_cap: &AdminCapability,
       registry: &mut AchievementRegistry,
       category: u8,
       milestone_level: u8,
       threshold: u64,
       credits: u64,
       item_ids: vector<u8>,
       item_levels: vector<u8>,
       item_quantities: vector<u64>,
       clock: &Clock,
       ctx: &mut TxContext
   )
   ```
   - Purpose: Add milestone with parallel vectors (avoids TypeScript serialization issues)
   - Status: ✅ Added

2. **`update_milestone_definition_entry`**
   ```move
   public entry fun update_milestone_definition_entry(
       _admin_cap: &AdminCapability,
       registry: &mut AchievementRegistry,
       category: u8,
       milestone_level: u8,
       new_threshold: u64,
       new_credits: u64,
       item_ids: vector<u8>,
       item_levels: vector<u8>,
       item_quantities: vector<u64>,
       clock: &Clock
   )
   ```
   - Purpose: Update full milestone with parallel vectors
   - Status: ✅ Just added

## Pre-Deployment Checklist

### Move Contract
- [x] `add_milestone_definition_entry` entry function added
- [x] `update_milestone_definition_entry` entry function added
- [x] All existing entry functions verified (update_threshold, update_credits, delete, etc.)
- [x] Read functions exist for fetching milestones

### Backend
- [x] Migration script created (`migrate-milestones.ts`)
- [x] AchievementService reads from on-chain with fallback
- [x] API endpoints use entry functions (not internal functions)
- [x] Cache clearing after mutations

### Frontend
- [x] Admin UI component created
- [x] Tab added to admin page
- [x] Forms for add/edit/delete

## Post-Deployment Steps

1. **Deploy Updated Contract**
   - Deploy `achievement_system.move` with new entry functions
   - Update `ACHIEVEMENT_REGISTRY_OBJECT_ID_TESTNET` if needed
   - Update `ACHIEVEMENT_ADMIN_CAP_OBJECT_ID_TESTNET` if needed

2. **Run Migration Script**
   ```bash
   cd backend
   npx ts-node scripts/migrate-milestones.ts
   ```
   - This will deploy all hardcoded milestone definitions to on-chain
   - Script handles "already exists" errors gracefully

3. **Verify**
   - Check admin UI shows milestones from on-chain
   - Test adding a new milestone via UI
   - Test editing a milestone via UI
   - Test deleting a milestone via UI

## Potential Issues & Solutions

### Issue: Vector<ItemReward> Serialization
**Solution**: ✅ Added entry functions with parallel vectors (item_ids, item_levels, item_quantities)

### Issue: Empty On-Chain Data
**Solution**: ✅ Backend falls back to hardcoded definitions when on-chain is empty

### Issue: Cache Not Clearing
**Solution**: ✅ API endpoints clear cache after mutations

## Notes

- All milestone management operations require admin wallet connection
- Milestone definitions are stored in `AchievementRegistry.milestone_definitions[category][milestone_level]`
- Milestone levels are 1-indexed (first milestone is level 1, not 0)
- Categories are mapped: gamesPlayed=1, bossesPerGame=2, ..., coinStreak=12
- Item IDs are mapped: orbLevel=0, forceField=1, ..., bossKillShot=6
