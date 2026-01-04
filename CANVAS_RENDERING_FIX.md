# Canvas Rendering Fix for "How to Play" Modal

## Issue
Canvas elements (orb and force field previews) in the "Abilities & Powers" section of "The Character" tab are not rendering.

## Root Cause
The `renderProjectilePreviews()` function was only called when the modal first initialized. At that time, only the first tab ("Getting Started") was visible, so canvases in other tabs (like "The Character") had `offsetParent === null` and were skipped.

When users switched to "The Character" tab, the canvases became visible, but `renderProjectilePreviews()` was never called again, so they remained blank.

## Fix Applied

### 1. Re-render on Tab Switch (`how-to-play-modal.js`)
- Added call to `renderProjectilePreviews()` when tabs are switched
- Called after tab content becomes visible (with a small delay to ensure DOM is updated)
- Uses `requestAnimationFrame` and `setTimeout` to ensure rendering happens after visibility changes

### 2. Re-render on Section Switch (`how-to-play-modal.js`)
- Added call to `renderProjectilePreviews()` when content sections are switched
- Ensures canvases in different sections get rendered when they become visible

## Code Changes

1. **`showHowToPlayTab()` function:**
   - After showing tab content, calls `renderProjectilePreviews()` with a delay
   - Ensures canvases are rendered when their tab becomes visible

2. **`showHowToPlayContent()` function:**
   - After showing a section, calls `renderProjectilePreviews()` with a delay
   - Ensures canvases are rendered when their section becomes visible

## Testing

1. **Open "How to Play" modal**
2. **Navigate to "The Character" tab**
3. **Check "Abilities & Powers" section:**
   - ✅ Magic Orb preview canvas should render (blue orb with trail)
   - ✅ Force Field preview canvas should render (blue pulsing circle)
4. **Navigate to other tabs and back:**
   - ✅ Canvases should still render correctly

## Expected Behavior

After the fix:
- ✅ Canvas elements render when their tab becomes visible
- ✅ Canvas elements render when their section becomes visible
- ✅ Canvases re-render correctly when switching between tabs
- ✅ Animation works correctly (orb trail, force field pulse)

## Files Modified

- `apps/shooter-game/frontend/src/game/systems/ui/how-to-play-modal.js`
  - Added `renderProjectilePreviews()` calls in `showHowToPlayTab()`
  - Added `renderProjectilePreviews()` calls in `showHowToPlayContent()`

---

**Last Updated:** 2025-01-04
