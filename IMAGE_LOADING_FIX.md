# Image Loading Fix for "How to Play" Modal

## Issue
Images in the "How to Play" modal are not loading consistently - some images display while others don't, appearing to show "every other image."

## Root Cause Analysis
The issue could be caused by:
1. **Server path resolution** - Some images may not be found in the nested assets directory
2. **Image loading errors** - Images failing to load without proper error handling
3. **Browser caching** - Cached 404 responses preventing retries
4. **Race conditions** - Images loading before DOM is ready

## Fixes Applied

### 1. Server Asset Path Resolution (`server.js`)
- ✅ Improved asset path checking with better logging
- ✅ Added debug logs when assets are not found
- ✅ Ensured nested assets location (`apps/shooter-game/frontend/assets/assets/`) is checked first
- ✅ Reduced 404 logging noise for assets (only log when not found)

### 2. Image Error Handling (`how-to-play-content-generator.js`)
- ✅ Added `onerror` handlers to all `<img>` tags
- ✅ Added console warnings for failed image loads
- ✅ Images that fail to load will hide gracefully instead of showing broken image icons
- ✅ Fallback image handling for SuiTwo_Character.webp

## Testing Steps

1. **Restart the frontend server:**
   ```bash
   # Stop current server (Ctrl+C)
   npm run dev
   ```

2. **Clear browser cache completely:**
   - Open DevTools (F12)
   - Right-click the refresh button
   - Select "Empty Cache and Hard Reload"
   - Or use `Ctrl+Shift+Delete` to clear cache

3. **Test the "How to Play" modal:**
   - Open the modal
   - Navigate through different tabs:
     - Character tab - Check SuiTwo_Character.webp
     - Enemies tab - Check all 4 enemy images
     - Bosses tab - Check all 4 boss images
   - Verify all images load correctly

4. **Check browser console:**
   - Look for any `Failed to load image:` warnings
   - These will indicate which specific images are failing

5. **Check server console:**
   - Look for any `⚠️ Asset not found:` messages
   - These will show which images are missing and where they were checked

## Expected Behavior

After the fix:
- ✅ All images in "How to Play" modal should load
- ✅ Images should appear in all tabs (Character, Enemies, Bosses, etc.)
- ✅ No 404 errors in browser console for image files
- ✅ Failed images will hide gracefully (no broken image icons)
- ✅ Console warnings will help identify any remaining issues

## Debugging

If images still don't load:

1. **Check browser Network tab:**
   - Filter by "Img"
   - Look for failed requests (red)
   - Check the request URL and response

2. **Check server console:**
   - Look for `⚠️ Asset not found:` messages
   - Verify the paths being checked

3. **Verify file locations:**
   - Ensure images exist in: `apps/shooter-game/frontend/assets/assets/`
   - Check file names match exactly (case-sensitive)

4. **Test image URLs directly:**
   - Try opening `http://localhost:8000/assets/Enemy_Jeet.webp` directly in browser
   - If it loads, the server is working correctly
   - If it doesn't, check server console for the path resolution

## Files Modified

1. `server.js` - Improved asset path resolution and logging
2. `apps/shooter-game/frontend/src/game/systems/ui/how-to-play-content-generator.js` - Added error handling to image tags

---

**Last Updated:** 2025-01-04
