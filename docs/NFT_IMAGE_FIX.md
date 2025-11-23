# NFT Image Display Fix for Slush Wallet

## Problem
NFT images are not showing in Slush Testnet NFT Gallery - they appear as "no media" even though the badge has an `image` field with a valid Vercel URL.

## Root Cause
The Sui Display object's `image_url` field was configured with a hardcoded URL template instead of referencing the badge's struct field. Wallets look for `display.data.image_url`, but the template value must be `{image}` to reference the badge's `image` field.

## How Sui Display Works
1. **Display Object**: A separate object that defines how NFTs appear in wallets
2. **Template System**: Uses placeholders like `{image}` to reference struct fields
3. **Wallet Lookup**: Wallets query `display.data.image_url` to find the image URL
4. **Field Mapping**: The Display key `image_url` maps to the template value `{image}`, which references `badge.image`

## The Fix

### What Was Wrong
The `update-badge-display-image.js` script was setting:
```javascript
values = ['https://suitwo.game/api/badges/{owner}/image'];  // ❌ Wrong - hardcoded URL
```

### What's Correct
The Display template should reference the struct field:
```javascript
values = ['{image}'];  // ✅ Correct - references badge.image field
```

## Solution Steps

### 1. Check Current Display Object State
```bash
cd contracts/suitwo_game
node check-display-fields.js
```

This will show:
- Whether `image_url` field exists
- What value it currently has
- Whether it needs to be fixed

### 2. Fix the Display Object
```bash
node update-badge-display-image.js
```

This script now correctly sets `image_url` → `{image}`.

### 3. Verify the Fix
After running the update:
```bash
node check-display-fields.js
```

You should see:
```
✅ image_url field is present!
   Current value: {image}
✅ CORRECT: image_url references {image} struct field
```

### 4. Test in Wallet
1. Refresh your Slush Wallet
2. Check the NFT Gallery
3. The badge image should now appear

## Technical Details

### Display Object Structure
The Display object should have:
```json
{
  "fields": {
    "image_url": "{image}"  // Template that references badge.image
  }
}
```

### How It Works
1. Badge struct has: `image: String` (contains the Vercel URL)
2. Display object has: `image_url: "{image}"` (template)
3. When wallet queries Display, it resolves `{image}` → badge's actual `image` value
4. Wallet displays the image from the resolved URL

### Badge Image Field
Each badge's `image` field should contain the full URL, e.g.:
- `https://suitwo-game.vercel.app/Badges/Common.webp`
- `https://suitwo.game/api/badges/{address}/image`

The Display template `{image}` will use whatever URL is stored in each badge's `image` field.

## Files Changed
1. `contracts/suitwo_game/update-badge-display-image.js` - Fixed to use `{image}` template
2. `contracts/suitwo_game/check-display-fields.js` - Improved to diagnose Display object state

## Verification
After fixing, verify on SuiVision:
1. Go to: `https://suivision.xyz/object/{BADGE_OBJECT_ID}?network=testnet`
2. Check the Display section
3. Should show: `image_url: "https://your-vercel-url/Badges/Common.webp"` (resolved from `{image}`)

## Notes
- The Move contract code (`badge_system.move`) was already correct
- The issue was in the JavaScript update script
- Display objects are versioned - after updating, wallets will see the new version
- You may need to wait a few minutes for wallets to refresh their cache

