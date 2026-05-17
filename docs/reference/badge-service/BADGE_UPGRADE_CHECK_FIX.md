# Badge Upgrade Check Fix

## Problem

The `/api/badges/[address]/check-upgrade` endpoint was returning a **503 Service Unavailable** error because it was trying to build transaction data (including creating image data objects on-chain) which requires gas from the admin wallet. The admin wallet had 0 SUI, causing the check to fail.

### Root Cause

The endpoint was calling `checkAndBuildBadgeUpdate()`, which:
1. ✅ Checks if upgrade is available (read-only, no gas needed)
2. ❌ Builds transaction data including creating image data objects on-chain (requires gas)

The failure occurred at step 2 when trying to create image data objects, which requires the admin wallet to have SUI for gas fees.

## Solution

Created a new **check-only** function that stops after determining eligibility, without building transaction data.

### Changes Made

1. **New Function: `checkBadgeUpgrade()`** (in `badge-transactions.ts`)
   - Read-only queries to Sui blockchain
   - Gets player stats and current badge tier
   - Calculates if upgrade is available
   - **Does NOT build transaction data**
   - **Does NOT require gas**

2. **Updated `/check-upgrade` Route**
   - Now calls `checkBadgeUpgrade()` instead of `checkAndBuildBadgeUpdate()`
   - Only checks eligibility, doesn't build transaction
   - Returns `{ success, hasPendingUpgrade, newTier, badgeId }`

3. **Kept `checkAndBuildBadgeUpdate()` for Actual Upgrades**
   - Still used when user actually clicks "Upgrade"
   - Called from `/api/badges/upgrade` endpoint
   - Builds transaction data when needed

## Benefits

✅ **No more 503 errors** - Check endpoint doesn't require gas  
✅ **Faster checks** - No unnecessary transaction building  
✅ **Better separation** - Check vs. build are now separate operations  
✅ **Gas only when needed** - Admin wallet only needs SUI when actually upgrading  

## Why We Need Sui to Check

We need to query Sui blockchain to:
1. **Get current badge tier** - From badge registry (read-only)
2. **Get player statistics** - Total games played from statistics registry (read-only)
3. **Calculate eligibility** - Compare stats against tier requirements

All of these are **read-only queries** that don't require gas. The previous implementation was doing more than necessary by also building transaction data.

## Testing

After this fix:
- `/api/badges/[address]/check-upgrade` should work even if admin wallet has 0 SUI
- Upgrade checks will be faster (no transaction building)
- Actual upgrades will still work (transaction building happens when user clicks upgrade)

