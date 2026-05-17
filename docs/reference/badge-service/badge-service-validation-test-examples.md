# Testing Badge Service Validation

## Quick Test Examples

### ✅ Test 1: Valid Request (Should Work)
```bash
# This should work exactly as before
POST /api/badges/mint
{
  "playerAddress": "0xccf281e7d5a183ff4b63339a4da42220f30653f46e475463e997793f80b56ea3"
}
```

### ❌ Test 2: Invalid Address (Should Return Error with Code)
```bash
POST /api/badges/mint
{
  "playerAddress": "invalid"
}

# Response:
{
  "success": false,
  "error": "Invalid address format: invalid. Must start with '0x'",
  "code": "INVALID_ADDRESS"
}
```

### ❌ Test 3: Missing Address (Should Return Error with Code)
```bash
POST /api/badges/mint
{}

# Response:
{
  "success": false,
  "error": "playerAddress is required",
  "code": "INVALID_ADDRESS"
}
```

### ❌ Test 4: Invalid Tier (Upgrade Endpoint)
```bash
POST /api/badges/upgrade
{
  "playerAddress": "0xccf281e7d5a183ff4b63339a4da42220f30653f46e475463e997793f80b56ea3",
  "badgeId": "0x92ad1cf65a99c73ad0d4199df0e25b798df64b1ec8ca6d65b7a3823630cd6c03",
  "newTier": 99,
  "sessionId": "test"
}

# Response:
{
  "success": false,
  "error": "Invalid tier: 99. Must be between 0 and 5",
  "code": "INVALID_TIER"
}
```

## How to Verify It's Working

### Option 1: Check Logs
When you make a request, you should see:
- **Before**: `📥 Badge mint request received for: 0x...`
- **After**: `[BADGE] Badge mint request received { playerAddress: '0x...', hasPaymentCoinId: true }`

### Option 2: Test Invalid Input
Send an invalid address and check the response includes:
- `"code": "INVALID_ADDRESS"` field
- More descriptive error message

### Option 3: Check Code
The validation is in the code - you can see:
- `BadgeValidators.validateAddress()` calls
- `BadgeError` being thrown/caught
- `BadgeLogger` being used

## What's Different

**For valid requests:** Nothing visible - works exactly the same ✅

**For invalid requests:** 
- Better error messages
- Error codes for programmatic handling
- Consistent format across all endpoints

**In logs:**
- Cleaner format: `[BADGE]` instead of `📥 [BADGE API]`
- Structured data instead of string concatenation

## Verification Checklist

- [ ] App still runs (`npm run dev`)
- [ ] Valid requests work (no change in behavior)
- [ ] Invalid address returns error with code
- [ ] Invalid tier returns error with code
- [ ] Logs show new format when DEBUG_BADGE=true
- [ ] No console errors

The validation is **working** - it's just **invisible for valid requests** (which is good!). Try sending an invalid request to see the difference.

