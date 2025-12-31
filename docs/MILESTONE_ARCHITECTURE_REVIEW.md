# Milestone Architecture Review

## Overview
This document reviews the complete milestone and achievement system architecture, data flow, and identifies any issues or improvements needed.

## Contract Architecture

### Storage Structures

#### 1. AchievementRegistry (Shared Object)
- **Purpose**: Central registry for all milestone definitions and player claim tracking
- **Key Tables**:
  - `milestone_definitions: Table<u8, Table<u8, MilestoneDefinition>>` - Category -> Level -> Definition
  - `category_milestone_levels: Table<u8, vector<u8>>` - Category -> Sorted list of levels
  - `player_achievements: Table<address, ID>` - Player -> PlayerAchievements object ID
  - `claimed_milestones: Table<address, Table<u8, vector<u8>>>` - Player -> Category -> Claimed levels

#### 2. PlayerAchievements (Owned Object)
- **Purpose**: Player-owned object tracking claimed milestones (legacy/backup)
- **Fields**: 12 vectors, one per category, storing claimed milestone levels
- **Note**: This is created for backward compatibility but the primary source of truth is `claimed_milestones` in the registry

#### 3. MilestoneDefinition
- **Structure**:
  - `milestone_level: u8` - Level ID (1, 2, 3, etc.)
  - `category: u8` - Category code (1-12)
  - `threshold: u64` - Value needed to achieve (e.g., 5 games, 100 coins)
  - `credits: u64` - Credits awarded
  - `items: vector<ItemReward>` - Item rewards

### Key Functions

#### Claiming
- `claim_milestone()` - Admin-only entry function
  - Updates: `claimed_milestones` table in registry ✅
  - Creates: `PlayerAchievements` object if needed (for backward compat)
  - **Note**: Does NOT update PlayerAchievements object fields (only creates it)

#### Querying
- `get_claimed_milestones_for_player(registry, player)` - ✅ **CORRECT FUNCTION**
  - Returns: `(bool, vector<u8> x 12)` - (exists, 12 category vectors)
  - Reads from: `claimed_milestones` table in registry
  - **This is the source of truth**

- `get_claimed_milestones(achievements)` - ❌ **WRONG FOR BACKEND**
  - Requires: PlayerAchievements object (owned by player)
  - Returns: `(vector<u8> x 12)` - 12 category vectors
  - Reads from: PlayerAchievements object fields
  - **Backend cannot access player-owned objects directly**

## Backend Architecture

### AchievementService

#### Data Flow

1. **Get Eligible Achievements**
   ```
   getEligibleAchievements(playerAddress)
   ├── getPlayerStats(playerAddress) → Get current stats
   ├── getClaimedMilestones(playerAddress) → Get claimed milestones
   └── checkCategory() → Filter out claimed milestones
   ```

2. **Claim Milestone**
   ```
   claimSingleMilestone(playerAddress, category, threshold)
   ├── getEligibleAchievements() → Verify eligibility
   ├── addCreditsToPlayer() → Distribute credits (admin-paid)
   ├── addItemsToInventory() → Distribute items (admin-paid)
   └── buildMilestoneClaimTransaction() → Mark as claimed on-chain
   ```

3. **Get Claimed Milestones** (FIXED)
   ```
   getClaimedMilestones(playerAddress)
   ├── Call: get_claimed_milestones_for_player(registry, player) ✅
   ├── Parse: (bool, vector<u8> x 12)
   ├── Convert: milestone levels → thresholds using definitions
   └── Return: Record<string, number[]> (category -> thresholds)
   ```

### Issues Found and Fixed

#### ✅ Issue 1: Wrong Function Called
- **Problem**: Backend was calling `get_claimed_milestones` which requires PlayerAchievements object
- **Fix**: Changed to `get_claimed_milestones_for_player` which reads from registry
- **Status**: FIXED

#### ✅ Issue 2: Return Value Parsing
- **Problem**: Function returns 13 values (bool + 12 vectors), backend expected 12
- **Fix**: Updated parsing to skip first value (bool) and process indices 1-12
- **Status**: FIXED

#### ✅ Issue 3: Level to Threshold Conversion
- **Problem**: Definitions might not have `level` field set, causing conversion to fail
- **Fix**: Added level field to fallback definitions, improved error handling
- **Status**: FIXED

#### ✅ Issue 4: Undefined Variable
- **Problem**: `transactionResult` was referenced but never defined
- **Fix**: Removed references to undefined variable
- **Status**: FIXED

## Data Flow Verification

### Claiming Flow ✅
1. User clicks "Claim" → Frontend calls `/api/achievements/claim`
2. Backend verifies eligibility → `getEligibleAchievements()`
3. Backend distributes rewards → Credits + Items (admin-paid)
4. Backend marks as claimed → `claim_milestone()` on-chain
5. On-chain updates → `claimed_milestones` table in registry

### Querying Flow ✅
1. Frontend requests eligible → `/api/achievements/check`
2. Backend gets stats → `getPlayerStats()`
3. Backend gets claimed → `getClaimedMilestones()` → `get_claimed_milestones_for_player()`
4. Backend filters → Removes claimed milestones from eligible list
5. Frontend displays → Shows only unclaimed eligible milestones

## Table Setup Verification

### ✅ Milestone Definitions Table
- **Location**: `registry.milestone_definitions: Table<u8, Table<u8, MilestoneDefinition>>`
- **Key Structure**: Category (u8) → Level (u8) → Definition
- **Status**: ✅ Properly set up via migration script
- **Migration**: `backend/scripts/migrate-milestones.ts` deployed 77 milestones

### ✅ Category Milestone Levels Table
- **Location**: `registry.category_milestone_levels: Table<u8, vector<u8>>`
- **Purpose**: Efficiently query all levels for a category
- **Status**: ✅ Updated when milestones are added

### ✅ Claimed Milestones Table
- **Location**: `registry.claimed_milestones: Table<address, Table<u8, vector<u8>>>`
- **Key Structure**: Player (address) → Category (u8) → Claimed Levels (vector<u8>)
- **Status**: ✅ Properly set up, updated on claim
- **Source of Truth**: This is the primary storage for claimed milestones

### ✅ Player Achievements Table
- **Location**: `registry.player_achievements: Table<address, ID>`
- **Purpose**: Maps player to their PlayerAchievements object ID
- **Status**: ✅ Created on first claim (backward compatibility)
- **Note**: PlayerAchievements object fields are NOT updated by `claim_milestone()`

## Key Verification

### Admin Capability ✅
- **Object**: `AdminCapability` (owned by admin)
- **Usage**: Required for all admin functions (add/update/delete milestones, claim milestones)
- **Status**: ✅ Properly configured in backend

### Registry ID ✅
- **Type**: Shared Object ID
- **Usage**: Required for all registry operations
- **Status**: ✅ Properly configured in backend

## API Endpoints

### ✅ GET /api/achievements/check
- **Purpose**: Get eligible (claimable) milestones
- **Flow**: Stats → Claimed → Filter → Return eligible
- **Status**: ✅ Working (after fixes)

### ✅ POST /api/achievements/claim
- **Purpose**: Claim a specific milestone
- **Flow**: Verify → Distribute rewards → Mark claimed
- **Status**: ✅ Working (after fixes)

### ✅ GET /api/milestones/definitions
- **Purpose**: Get all milestone definitions
- **Flow**: Fetch from on-chain → Cache → Return
- **Status**: ✅ Working

## Frontend Integration

### ✅ Achievement Progress Display
- **Component**: `achievement-progress.js`
- **Flow**: Fetch eligible → Display → Handle claim
- **Status**: ✅ Working

### ✅ Badge UI
- **Component**: `badge-ui.js` and related modules
- **Flow**: Check eligibility → Show claimable → Handle claim
- **Status**: ✅ Working

## Remaining Considerations

### 1. Caching
- **Milestone Definitions**: ✅ Cached (5 minute TTL)
- **Claimed Milestones**: ❌ Not cached (queries on-chain each time)
- **Recommendation**: Consider caching claimed milestones with short TTL (30 seconds)

### 2. Error Handling
- **On-Chain Failures**: ✅ Handled with try/catch
- **Gas Issues**: ✅ Handled with retry logic
- **Network Issues**: ✅ Handled with error messages

### 3. Performance
- **Batch Queries**: ✅ Used for milestone definitions
- **Individual Queries**: ⚠️ Used for claimed milestones (could be optimized)

## Summary

### ✅ What's Working
1. Milestone definitions properly stored on-chain
2. Claiming flow works correctly
3. Rewards distribution (credits + items) works
4. On-chain claim tracking works
5. Querying eligible milestones works (after fixes)

### ✅ What Was Fixed
1. Backend now uses correct contract function
2. Return value parsing handles 13 values correctly
3. Level-to-threshold conversion improved
4. Undefined variable error fixed

### 🔄 Recommendations
1. Add caching for claimed milestones
2. Consider batch querying for multiple players
3. Add monitoring/logging for claim success rates
4. Consider adding claim history/events API

## Testing Checklist

- [x] Milestone definitions can be fetched
- [x] Eligible milestones are calculated correctly
- [x] Claimed milestones are filtered out
- [x] Claiming a milestone works
- [x] Rewards are distributed correctly
- [x] On-chain state is updated correctly
- [x] Querying claimed milestones works
- [ ] Multiple players can claim independently
- [ ] Concurrent claims are handled correctly
- [ ] Error cases are handled gracefully
