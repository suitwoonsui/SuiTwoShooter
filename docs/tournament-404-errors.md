# Tournament 404 Errors - Debugging Guide

## Error Summary

The frontend is receiving 404 errors when trying to access:
- `/api/tournaments` (active tournaments)
- `/api/tournaments/past` (past tournaments)

## Root Cause Analysis

The routes **DO exist** in the codebase:
- ✅ `backend/app/api/tournaments/route.ts` - Handles GET `/api/tournaments`
- ✅ `backend/app/api/tournaments/past/route.ts` - Handles GET `/api/tournaments/past`

## Possible Causes

### 1. **Routes Not Deployed to Vercel** (Most Likely)
The routes exist locally but may not have been included in the Vercel build.

**Check:**
- Verify the routes are in the `backend/app/api/tournaments/` directory
- Check Vercel build logs to see if these routes were built
- Ensure the files are committed to git and pushed to the branch Vercel is deploying from

### 2. **Next.js Build Configuration Issue**
The routes might be excluded from the build or there's a configuration issue.

**Check:**
- Review `backend/next.config.ts` for any route exclusions
- Verify the build output includes these routes

### 3. **Missing Environment Variables**
If `getTournamentService()` fails during initialization due to missing env vars, it could cause issues.

**Required Environment Variables:**
```
SUI_TESTNET_NETWORK=testnet (or SUI_NETWORK=testnet)
GAME_WALLET_PRIVATE_KEY=<admin_wallet_private_key>
```

**Check:**
- Verify these are set in Vercel project settings
- Check Vercel function logs for initialization errors

### 4. **Route Handler Initialization Error**
If the route handler throws an error during module load (not request handling), Next.js might not register the route.

**Check:**
- Look for errors in Vercel function logs during cold start
- Check if `getTournamentService()` or `getAdminWalletService()` throws during initialization

## Debugging Steps

### Step 1: Verify Routes Are Accessible
Test the endpoints directly:

```bash
# Test active tournaments
curl https://sui-two-shooter-backend-sui-integra.vercel.app/api/tournaments

# Test past tournaments  
curl https://sui-two-shooter-backend-sui-integra.vercel.app/api/tournaments/past
```

### Step 2: Check Vercel Build Logs
1. Go to Vercel Dashboard → Your Backend Project → Deployments
2. Click on the latest deployment
3. Check the build logs for:
   - Any errors during build
   - Whether the routes were compiled
   - Any warnings about missing routes

### Step 3: Check Vercel Function Logs
1. Go to Vercel Dashboard → Your Backend Project → Functions
2. Look for `/api/tournaments` in the function list
3. Check runtime logs for errors when the route is called

### Step 4: Verify Environment Variables
In Vercel Dashboard → Settings → Environment Variables, verify:
- `SUI_TESTNET_NETWORK` or `SUI_NETWORK` is set
- `GAME_WALLET_PRIVATE_KEY` or `ADMIN_WALLET_PRIVATE_KEY` is set
- All required contract addresses are set

### Step 5: Test Route Locally
Run the backend locally and test:

```bash
cd backend
npm run dev

# In another terminal
curl http://localhost:3000/api/tournaments
curl http://localhost:3000/api/tournaments/past
```

If these work locally but not on Vercel, it's a deployment issue.

## Quick Fixes

### Fix 1: Force Redeploy
1. Make a small change to trigger a redeploy (e.g., add a comment to `route.ts`)
2. Push to git
3. Vercel will auto-deploy

### Fix 2: Check Route Export
Ensure the routes export the handler correctly:

```typescript
// backend/app/api/tournaments/route.ts
export const GET = withApiHandler(async (request: NextRequest) => {
  // ... handler code
});
```

### Fix 3: Verify Next.js Version
Check `backend/package.json` for Next.js version compatibility. App Router routes require Next.js 13+.

## Expected Behavior

When working correctly, the endpoints should return:

**GET `/api/tournaments`:**
```json
{
  "success": true,
  "tournaments": [
    {
      "tournamentId": 1,
      "name": "Tournament Name",
      "category": "highestScore",
      "startTime": 1234567890,
      "endTime": 1234567890,
      "entryFeeTickets": 1,
      "participants": 0,
      "status": "upcoming",
      "objectId": "0x...",
      ...
    }
  ]
}
```

**GET `/api/tournaments/past`:**
```json
{
  "success": true,
  "tournaments": [...]
}
```

## If Still Not Working

1. **Check Vercel Function Limits**: Ensure you haven't hit function count limits
2. **Check Build Output**: Verify `.next/server/app/api/tournaments/` exists in build output
3. **Contact Vercel Support**: If routes exist but aren't accessible, it might be a Vercel platform issue

## Related Files

- `backend/app/api/tournaments/route.ts` - Active tournaments endpoint
- `backend/app/api/tournaments/past/route.ts` - Past tournaments endpoint
- `backend/lib/sui/tournament-service.ts` - Tournament service implementation
- `src/game/systems/ui/tournament-modal.js` - Frontend code calling these endpoints
