# Tournament Migration Fix

## Problem
The tournament migration is failing with error:
```
No function was found with function name admin_create_historical_tournament
```

## Root Cause
The backend is using the **old package ID** (`0xd609f0a35712ee249f59c49c684dd9bd17511f5d5fb12e807f980e31c5ea9cea`) instead of the **new package ID** (`0xa91e4969a6c300403da6dca1e58ff709301787a4f3ee1b9299ecbb395f2a4661`).

The `admin_create_historical_tournament` function exists in the new package, but the backend is trying to call it on the old package where it doesn't exist.

## Solution

### Update Backend Environment Variables

You need to update your backend environment variables to use the new package ID and tournament registry IDs.

**If using `.env.local` or system environment variables:**

```env
# Update to new package ID
GAME_SCORE_CONTRACT_TESTNET=0xa91e4969a6c300403da6dca1e58ff709301787a4f3ee1b9299ecbb395f2a4661

# Update to new tournament registry IDs
TOURNAMENT_REGISTRY_OBJECT_ID_TESTNET=0xb53f86f46655e856caa455f8ed528cccad96481a01fe020483b7e36ca813b84b
TOURNAMENT_ADMIN_CAPABILITY_OBJECT_ID_TESTNET=0xce6cbd70e5c8941b237522ce31b055eb99e61c02ca4e44026494d3fc36ae13de

# Keep old package ID for migration source
OLD_GAME_SCORE_CONTRACT_TESTNET=0x4cbf117992134473d2db73b623068c78b16577bb20462aa55bd81171ef12998b
```

**If using Vercel or other deployment platform:**
1. Go to your project settings
2. Navigate to Environment Variables
3. Update the above variables
4. Redeploy your application

### Restart Backend Server

After updating the environment variables, **restart your backend server** to pick up the new values.

## Verification

After updating, the migration should work because:
- ✅ The `admin_create_historical_tournament` function exists in the new package
- ✅ The function is a public entry function (can be called from transactions)
- ✅ The new package ID is correctly configured

## Current Deployment Info

- **New Package ID:** `0xa91e4969a6c300403da6dca1e58ff709301787a4f3ee1b9299ecbb395f2a4661`
- **Transaction:** `2rhbSCP9mpbgVzbFKjHt9XNM4XrwsLtaC6FusqzuytRX`
- **Deployment Date:** 2025-12-15

See `contracts/suitwo_game/DEPLOYMENT_IDS.md` for complete deployment information.

