# Transaction Lock Prevention

## Root Causes of Coin Locks

### 1. **504 Gateway Timeouts**
**Problem**: When an RPC call times out (504), the transaction may have been submitted to the network, but we don't receive a response. The coin gets locked by the submitted transaction, but we don't know about it.

**Solution**: 
- Detect 504/timeout errors
- Exclude the coin that was used from future retries
- Wait and refresh coin list before retrying

### 2. **Not Waiting for Finalization**
**Problem**: If we don't wait for transaction finalization, we might proceed with the next transaction using a coin that's still locked by the previous transaction.

**Solution**: 
- Always wait for `client.waitForTransaction()` with timeout
- Verify transaction status after finalization
- Fail hard if transaction doesn't finalize

### 3. **Using Known Locked Coins**
**Problem**: The transaction builder's automatic coin selection doesn't filter out coins that are known to be locked by pruned transactions.

**Solution**:
- Manually select gas coins before building
- Filter out known locked coin IDs
- Track attempted coins to avoid retrying with locked ones

### 4. **Concurrent Transaction Attempts**
**Problem**: Multiple transactions trying to use the same coin simultaneously can cause locks.

**Solution**:
- Sequential processing with delays between transactions
- Track attempted coins per transaction attempt

## Fixes Implemented

### Transaction Helper (`backend/lib/sui/transaction-helpers.ts`)

1. **Manual Coin Selection**:
   - Fetches coins before building transaction
   - Filters out known locked coins (`0x5e8987f1...`)
   - Filters out previously attempted coins
   - Sorts by version (prefer newer coins)
   - Explicitly sets gas payment

2. **504 Timeout Handling**:
   - Detects 504/timeout errors
   - Excludes the coin that was used from retries
   - Refreshes coin list before retry

3. **Finalization Wait**:
   - Always waits for transaction finalization
   - Verifies transaction status
   - Fails hard if finalization fails

### Tournament Scheduler (`backend/lib/services/tournament-scheduler.ts`)

1. **Simplified Approach**:
   - Uses transaction helper (no manual coin management)
   - Tries once, skips if old transaction locks detected
   - Periodic check retries skipped tournaments

2. **Error Detection**:
   - Detects old transaction locks (`TransactionDigest` in error)
   - Logs warning (not error) for old locks
   - Moves on to next tournament

## Prevention Strategy

1. **Always use `executeTransactionWithFinalization` helper** for server-side admin operations
2. **Filter out known locked coins** before building transactions
3. **Track attempted coins** to avoid retrying with locked ones
4. **Handle 504 timeouts** by excluding the coin that was used
5. **Wait for finalization** before proceeding to next transaction
6. **Add delays** between sequential transactions

## Known Locked Coin

- **Coin ID**: `0x5e8987f1d1a89953d239f6be8c5ae53c401b25a253fc00dd25cba64a7772fc3a`
- **Reason**: Locked by pruned transactions (`EqHnSodJoCNoNcY87AXzbgL4fYPnb7D6UhGPp786ovNU`, `H5ANRmHAfmwj9EtAVhdMgYpqPKEJuPirBiYqSKJQqyYc`)
- **Status**: Cannot be unlocked - will be filtered out automatically

## Testing

After these fixes:
- New transactions should not create new locks
- Unlocked coins should be properly selected and used
- 504 timeouts should be handled gracefully
- Old transaction locks should be detected and skipped
