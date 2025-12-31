# Locked Transactions Analysis

## Transaction Digests

1. `EoeAQ8g2GZ3hCfRWBn49NZ1nb4PuSH6VsYzSm4zqH75A`
2. `H5ANRmHAfmwj9EtAVhdMgYpqPKEJuPirBiYqSKJQqyYc`

## Status

**Both transactions are PRUNED** - Transaction data is only kept for ~1 day on Sui, so we cannot directly query what functions they called.

## Contextual Analysis

### Most Likely Cause: Tournament Scheduler

Based on user reports and evidence:

**Function**: `setDistributionStatusBatch()`  
**Service**: Tournament Scheduler  
**File**: `backend/lib/services/tournament-scheduler.ts`  
**Move Call**: `tournaments::admin_set_distribution_status`  
**Operation**: Setting tournament distribution status to "no participants" (status = 2)

**Evidence**:
- User reported: "when the scheduler tries to change the reward deployment status, the transaction gets locked"
- User reported: "only one showed a change in status to no participants"
- User reported: "After adding Sui, another lock with another status change to no participants"
- This matches the pattern of `DISTRIBUTION_NO_PARTICIPANTS = 2`

### Other Possible Causes

#### 2. Milestone Migration Script

**Function**: `addMilestoneDefinitionsBatch()`  
**Service**: Milestone Migration Script  
**File**: `backend/scripts/migrate-milestones.ts`  
**Move Call**: `achievement_system::add_milestone_definition_entry`  
**Operation**: Adding milestone definitions to AchievementRegistry

**Evidence**:
- Script was running around the same time
- Script processes multiple categories in sequence
- Could have been running concurrently with scheduler

#### 3. Achievement Service

**Functions**: 
- `addCreditsToPlayer()` - Move call: `game_pass::add_free_credits`
- `markMilestoneClaimed()` - Move call: `achievement_system::claim_milestone`

**Service**: Achievement Service  
**File**: `backend/lib/sui/achievement-service.ts`  
**Operation**: Adding credits or marking milestones as claimed

**Evidence**:
- Less likely - these are single operations, not batches
- But could have been called around the same time

## Coin Information

- **Coin ID**: `0x5e8987f1d1a89953d239f6be8c5ae53c401b25a253fc00dd25cba64a7772fc3a`
- **Version**: `696136829`
- **Previous Transaction**: `9htk7UxiWrKTweZZqXBB9VvRPfE5HgMdV4hje2zNzegQ` (also pruned)
- **Owner**: Admin wallet `0xccf281e7d5a183ff4b63339a4da42220f30653f46e475463e997793f80b56ea3`

## How to Identify (If Transactions Were Available)

If transactions weren't pruned, we could identify them by:

1. **Transaction Input**: Check `showInput: true` to see Move calls
2. **Function Target**: Look for `transaction.data.transaction.transactions[].target`
3. **Object Changes**: Check what objects were modified
4. **Events**: Check emitted events to identify the operation

## Sui Explorer Links

- **Admin Wallet**: https://suiexplorer.com/address/0xccf281e7d5a183ff4b63339a4da42220f30653f46e475463e997793f80b56ea3?network=testnet
- **Transaction 1**: https://suiexplorer.com/txblock/EoeAQ8g2GZ3hCfRWBn49NZ1nb4PuSH6VsYzSm4zqH75A?network=testnet
- **Transaction 2**: https://suiexplorer.com/txblock/H5ANRmHAfmwj9EtAVhdMgYpqPKEJuPirBiYqSKJQqyYc?network=testnet
- **Locked Coin**: https://suiexplorer.com/object/0x5e8987f1d1a89953d239f6be8c5ae53c401b25a253fc00dd25cba64a7772fc3a?network=testnet

## Conclusion

**Most Likely**: Tournament Scheduler's `setDistributionStatusBatch()` function

**Why**:
1. User explicitly reported scheduler status changes locking coins
2. Pattern matches: status changes to "no participants"
3. Scheduler processes multiple tournaments in sequence (batch operations)
4. Scheduler had the same issues we found (no finalization wait, no retry)

**Fix Applied**: ✅ Tournament scheduler now has retry logic and finalization wait

## Tools Created

- `backend/scripts/analyze-locked-transactions.ts` - Script to analyze locked transactions
- Can be run to check transaction details if they're still available
- Provides contextual analysis and Sui Explorer links
