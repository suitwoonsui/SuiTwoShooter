# Tournament Rewards Automation

## Overview

Tournament rewards are now distributed **automatically** when tournaments' grace periods end, eliminating the need for manual distribution. The system uses an event-driven approach that triggers distribution immediately when the grace period expires.

## Implementation

### 1. Automatic Distribution Endpoint

**Endpoint:** `POST /api/admin/tournaments/auto-distribute-rewards`

**Functionality:**
- Checks all tournaments for ended tournaments without distributed rewards
- Automatically distributes rewards to top 10 players
- Processes multiple tournaments in a single run
- Returns detailed results for each tournament

**Authentication:** Requires API key (same as other admin endpoints)

### 2. Manual Distribution (Still Available)

The manual distribution option in the admin UI is still available for:
- Testing
- Manual review before distribution
- Re-distribution if needed (though this is prevented by the contract)

## Setup Options

### Option 1: Event-Driven (Automatic - No Setup Required)

**How it works:** When a player attempts to submit a score after the grace period ends, the system automatically triggers reward distribution. This happens immediately and requires no configuration.

**Benefits:**
- ✅ No setup required
- ✅ Immediate distribution
- ✅ Event-driven (happens when needed)

**Note:** This is the primary method. The cron job below is a backup.

### Option 2: Vercel Cron Jobs (Backup/Redundancy)

If deploying on Vercel, add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/admin/tournaments/auto-distribute-rewards",
      "schedule": "0 * * * *"
    }
  ]
}
```

This runs every hour. Adjust schedule as needed:
- `0 * * * *` - Every hour
- `0 */6 * * *` - Every 6 hours
- `0 0 * * *` - Daily at midnight
- `*/15 * * * *` - Every 15 minutes (for testing)

**Note:** Vercel cron jobs require the Pro plan or higher.

### Option 2: External Cron Service

Use any cron service (cron-job.org, EasyCron, etc.) to call:

```
POST https://your-domain.com/api/admin/tournaments/auto-distribute-rewards
Headers:
  X-API-Key: your-api-key
```

### Option 3: Server Cron Job

If running on your own server, add to crontab:

```bash
# Run every hour
0 * * * * curl -X POST https://your-domain.com/api/admin/tournaments/auto-distribute-rewards \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json"
```

### Option 4: Manual Trigger

You can still trigger it manually via:
- Admin UI (add button if needed)
- API call from any HTTP client
- Script

## How It Works

### Event-Driven Distribution (Primary Method)

**Automatic Trigger:** When a player attempts to submit a score after the grace period ends:
1. Score submission endpoint detects grace period has expired
2. Checks if rewards have been distributed (`rewardsDistributed === false`)
3. Triggers automatic reward distribution in the background
4. Player receives error message (score submission rejected)
5. Rewards are distributed to top 10 players automatically

**Benefits:**
- ✅ Immediate distribution when grace period ends
- ✅ No waiting for cron job
- ✅ Event-driven (happens when needed)
- ✅ Prevents duplicate distributions (checks contract flag)

### Cron Job Distribution (Backup Method)

**Scheduled Trigger:** Runs periodically (every hour) to catch any missed tournaments:
1. **Check Tournaments**: Queries all tournaments
2. **Filter Ended**: Finds tournaments where `gracePeriodEnd < now` and `rewardsDistributed === false`
3. **Get Leaderboard**: Fetches top 10 players for each tournament
4. **Calculate Rewards**: Determines item rewards based on rank
5. **Distribute**: Uses `admin_add_items` to add items to player inventories
6. **Log Results**: Records success/failure for each tournament

**Benefits:**
- ✅ Catches tournaments if no one tries to submit after grace period
- ✅ Processes multiple tournaments at once
- ✅ Backup safety net

## Response Format

```json
{
  "success": true,
  "processed": 2,
  "successful": 2,
  "failed": 0,
  "results": [
    {
      "tournamentId": 1,
      "success": true,
      "distributions": [...],
      "digest": "transaction-digest-1,transaction-digest-2"
    },
    {
      "tournamentId": 2,
      "success": true,
      "distributions": [...],
      "digest": "transaction-digest-3"
    }
  ],
  "message": "Processed 2 tournament(s): 2 successful, 0 failed"
}
```

## Error Handling

- Individual tournament failures don't stop processing of other tournaments
- Each tournament's result is logged separately
- Failed distributions can be retried manually if needed

## Security

- Requires API key authentication
- Only processes tournaments that have actually ended
- Prevents duplicate distribution (contract-level check)
- All operations are logged for audit

## Monitoring

Check logs for:
- `🎁 [AUTO DISTRIBUTE]` - Automatic distribution events
- Success/failure counts
- Tournament IDs processed
- Transaction digests

## Testing

To test the automatic distribution:

1. Create a test tournament with a past end time
2. Ensure it has participants and scores
3. Call the endpoint manually or wait for cron job
4. Verify rewards were distributed in admin UI

## Future Enhancements

- Webhook notifications when rewards are distributed
- Email notifications to winners
- Retry mechanism for failed distributions
- Dashboard showing distribution status

