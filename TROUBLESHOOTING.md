# Troubleshooting Guide

## Common Issues After Refactoring

### Issue 1: 404 Errors for Config Files

**Symptoms:**
- `api-config.js:1 Failed to load resource: 404`
- `contract-config.js:1 Failed to load resource: 404`

**Cause:** Server not resolving `../../base/...` paths correctly

**Fix:** The server has been updated to handle relative paths. Make sure you're using the updated `server.js`.

**Verification:**
- Check server console for path resolution logs
- Verify files exist at:
  - `base/frontend/src/config/api-config.js`
  - `base/frontend/src/config/contract-config.js`

### Issue 2: Wallet Module 404

**Symptoms:**
- `wallet-api.umd.cjs:1 Failed to load resource: 404`
- `❌ Failed to load wallet module`

**Cause:** Using old path `wallet-module/dist/` instead of `base/wallet-module/dist/`

**Fix:** 
1. Updated `lazy-loader.js` fallback path
2. Updated `api-config.js` to use correct path
3. Build wallet module: `cd base/wallet-module && npm run build`

**Verification:**
- Check browser console for: `🔧 [BASE CONFIG] Wallet Module URL: ../../../base/wallet-module/dist/wallet-api.umd.cjs`
- Verify file exists: `base/wallet-module/dist/wallet-api.umd.cjs`

### Issue 3: Duplicate Contract Config Declaration

**Symptoms:**
- `Uncaught SyntaxError: Identifier 'GAME_CONTRACT_CONFIG' has already been declared`

**Cause:** Script being loaded twice or browser cache issue

**Fix:**
1. Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)
2. Clear browser cache
3. Check `index.html` - contract-config.js should only be loaded once

**Verification:**
- Check Network tab - `contract-config.js` should only appear once
- Check script tags in `index.html` - no duplicates

### Issue 4: Images Not Loading

**Symptoms:**
- `SuiTwo_Profile.webp:1 Failed to load resource: 404`

**Cause:** Image paths may need updating for new structure

**Fix:** Images should be in `apps/shooter-game/frontend/assets/` and referenced with correct paths

## Quick Fixes

### Clear Browser Cache
```bash
# Chrome/Edge: Ctrl+Shift+Delete
# Or hard refresh: Ctrl+Shift+R (Windows) / Cmd+Shift+R (Mac)
```

### Rebuild Wallet Module
```bash
cd base/wallet-module
npm run build
```

### Verify Server Paths
The server should log:
- `✅ Serving: /../../base/frontend/src/config/api-config.js`
- Check server console for 404 errors and their resolved paths

## Expected Console Output

When everything works, you should see:
```
🔧 [BASE CONFIG] API Base URL: http://localhost:3000/api
🔧 [BASE CONFIG] Wallet Module URL: ../../../base/wallet-module/dist/wallet-api.umd.cjs
🔧 [BASE CONFIG] Hostname: localhost
🔧 [BASE CONFIG] Protocol: http:
🔧 [BASE CONFIG] Is Production: false
🔧 [BASE CONTRACT CONFIG] Initialized
🔧 [GAME CONTRACT CONFIG] Merged with base config
✅ Wallet bundle loaded
```

## Still Having Issues?

1. **Check server console** - Look for 404 errors and their resolved paths
2. **Check browser console** - Look for JavaScript errors
3. **Verify file locations** - Make sure all files are in the new structure
4. **Hard refresh** - Clear cache and reload

---

**Last Updated:** 2025-01-04
