# Transaction Finalization Fix Plan

## Status Summary

### ✅ Already Fixed
1. **Migration script** (`backend/scripts/migrate-milestones.ts`)
   - ✅ Retry logic with exponential backoff
   - ✅ Transaction finalization wait
   - ✅ Transaction status verification
   - ✅ Concurrent execution prevention

2. **Tournament scheduler** (`backend/lib/services/tournament-scheduler.ts`)
   - ✅ Retry logic with exponential backoff
   - ✅ Transaction finalization wait
   - ✅ Transaction status verification

### ✅ High Priority (FIXED)

These are frequently called or batch operations that could cause coin locks:

1. ✅ **Achievement Service** (`backend/lib/sui/achievement-service.ts`)
   - ✅ `addCreditsToPlayer()` - Now uses helper with retry + finalization wait
   - ✅ `markMilestoneClaimed()` - Now uses helper with retry + finalization wait
   - **Impact**: Called when players claim milestones (frequent)

2. ✅ **Store Service** (`backend/lib/sui/store-service.ts`)
   - ✅ `consumeItems()` - Added finalization wait (already had retry logic)
   - **Impact**: Called when players use items (frequent)

3. ✅ **Rewards Service** (`backend/lib/sui/rewards-service.ts`)
   - ✅ `transferTokens()` - Now uses helper with retry + finalization wait
   - **Impact**: Called for tournament rewards (batch operations)

### 📋 Medium Priority (Consider Fixing)

These are less frequent but could still benefit:

4. **Badge Service** (`backend/lib/sui/badge-service.ts`)
   - Multiple operations (mint, upgrade, update image, etc.)
   - **Impact**: Admin operations, less frequent

5. **Game Pass Service** (`backend/lib/sui/game-pass-service.ts`)
   - `fixTicketCount()` - No retry, no finalization wait
   - **Impact**: One-off fixes, infrequent

6. **Tournament Service** (`backend/lib/sui/tournament-service.ts`)
   - `createTournament()` - No retry, no finalization wait
   - `addTickets()` - No retry, no finalization wait
   - **Impact**: Admin operations, less frequent

### 🔧 Low Priority (Optional)

Migration scripts and one-off operations:
- Migration services (stats, inventory, game-pass, tournament)
- Admin wallet service tests
- Badge image updates

## Recommended Approach

### Option 1: Fix Critical Operations Only (Recommended)

**Fix these 3 high-priority operations:**
1. Achievement Service operations
2. Store Service `consumeItems` (add finalization wait)
3. Rewards Service `distributeRewards`

**Why**: These are the most frequently called and most likely to cause issues.

**Effort**: ~1-2 hours

### Option 2: Create Helper Function + Fix All

**Create a reusable helper function:**
```typescript
async function executeTransactionWithFinalization(
  client: SuiClient,
  signer: Ed25519Keypair,
  txb: Transaction,
  options?: { retries?: number; timeout?: number }
): Promise<{ digest: string; effects: any }> {
  // Retry logic + finalization wait + verification
}
```

**Then update all operations to use it.**

**Why**: Ensures consistency across all operations.

**Effort**: ~4-6 hours (create helper + update all operations)

### Option 3: Fix As Needed

**Fix operations only when they cause issues.**

**Why**: Minimal upfront effort, but reactive approach.

**Effort**: Variable

## Recommendation

**Proceed with Option 1** - Fix the 3 high-priority operations:

1. **Achievement Service** - Most critical (frequently called)
2. **Store Service `consumeItems`** - Already has retry, just needs finalization wait
3. **Rewards Service** - Batch operations, high risk

This addresses the most likely sources of coin locks while keeping effort manageable.

## Implementation Steps

1. ✅ **COMPLETED**: Create helper function for transaction execution with finalization
   - Created `backend/lib/sui/transaction-helpers.ts`
   - Includes retry logic, finalization wait, and status verification

2. ✅ **COMPLETED**: Update Achievement Service operations
   - Updated `addCreditsToPlayer()` to use helper
   - Updated `markMilestoneClaimed()` to use helper

3. ✅ **COMPLETED**: Update Store Service `consumeItems`
   - Added transaction finalization wait (already had retry logic)

4. ✅ **COMPLETED**: Update Rewards Service `distributeRewards`
   - Updated `transferTokens()` to use helper function

5. ⏳ **TODO**: Test with actual operations
   - Test milestone claiming (Achievement Service)
   - Test item consumption (Store Service)
   - Test reward distribution (Rewards Service)

6. ✅ **COMPLETED**: Document remaining operations for future fixes

## Testing Plan

After fixes:
1. Test milestone claiming (Achievement Service)
2. Test item consumption (Store Service)
3. Test reward distribution (Rewards Service)
4. Monitor for coin locks in production
5. Check transaction finalization times
