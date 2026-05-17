# Force Field Preview Cycling Fix

## Update
The force field preview canvas now cycles through all 3 levels (Level 1, 2, and 3) to demonstrate the different colors and power levels. The rendering matches the in-game force field exactly, including all visual effects.

## Changes Made

### Level Cycling (`how-to-play-modal.js`)
- **Cycles through levels:** Level 1 → Level 2 → Level 3 → repeat
- **Timing:** Each level displays for 2 seconds (6 second total cycle)
- **Colors:**
  - Level 1: Sui Blue (`#4DA2FF`) - 60px radius
  - Level 2: Green (`#39ff14`) - 70px radius  
  - Level 3: Gold (`#FFD700`) - 75px radius
- **Visual details (matching in-game exactly):**
  - **Level 1:** Blue gradient, 60px radius, 0.4 alpha, 2px outline, pulsing animation
  - **Level 2:** Green gradient, 70px radius, 0.5 alpha, 2px outline, pulsing animation, **8 white sparkles** rotating around the edge
  - **Level 3:** Gold gradient, 75px radius, 0.6 alpha, 3px outline, stronger pulse, **atomic model with 2 orbital rings:**
    - Inner ring: 6 gold particles at 60% orbit radius, rotating forward
    - Outer ring: 6 gold particles at 100% orbit radius, rotating backward at 0.7x speed
    - All particles have gold glow effect (shadowBlur: 8)

## How It Works

1. **Cycle tracking:** Each canvas stores its cycle start time in `dataset.cycleStartTime`
2. **Level calculation:** Based on elapsed time, calculates which level to show (1, 2, or 3)
3. **Continuous animation:** The pulsing animation continues while cycling through levels
4. **Reset on hide:** When canvas becomes hidden, cycle resets so it starts from Level 1 when shown again

## Testing

1. **Open "How to Play" modal**
2. **Navigate to "The Character" tab**
3. **Check "Abilities & Powers" section:**
   - ✅ **Level 1 (blue):** Basic force field with pulsing animation
   - ✅ **Level 2 (green):** Force field + 8 white sparkles rotating around edge
   - ✅ **Level 3 (gold):** Force field + atomic model with 2 rings of orbiting gold particles
   - ✅ Each level displays for 2 seconds, then cycles to next
4. **Check "Collectibles & Items" tab:**
   - ✅ Force Field preview there should also cycle through all levels with same effects

## Timing

- **2 seconds per level** - Long enough to see the color clearly
- **6 seconds total cycle** - Complete cycle through all 3 levels
- **Smooth transitions** - Level changes happen instantly at the 2-second mark

If you want to adjust the timing, change the `levelDuration` constant (currently 2000ms = 2 seconds).

## Code Refactoring

**Update:** Force field rendering has been refactored to use a shared utility function, eliminating code duplication.

### Shared Utility Created
- **File:** `apps/shooter-game/frontend/src/game/rendering/player/force-field-rendering.js`
- **Function:** `renderForceFieldAt(ctx, centerX, centerY, level, timeOverride)`
- **Usage:** Both in-game rendering and preview use the same function
- **Benefits:**
  - Single source of truth for force field visuals
  - Always in sync between preview and in-game
  - Easier maintenance (update once, works everywhere)

### Files Modified

- `apps/shooter-game/frontend/src/game/rendering/player/force-field-rendering.js` (NEW)
  - Created shared force field rendering utility
  - Exported to `window.renderForceFieldAt` for global access
  - Loads with menu scripts (available early)

- `apps/shooter-game/frontend/src/game/rendering/player/player-rendering.js`
  - Updated to use shared `renderForceFieldAt` function
  - Eliminates duplicate rendering code

- `apps/shooter-game/frontend/src/game/systems/ui/how-to-play-modal.js`
  - Updated to call shared `renderForceFieldAt` function
  - Maintains cycling logic (2 seconds per level)
  - No longer duplicates rendering code

- `apps/shooter-game/frontend/src/game/systems/core/lazy-loader.js`
  - Added `force-field-rendering.js` to MENU_SCRIPTS
  - Ensures function is available when modal opens

---

**Last Updated:** 2025-01-04  
**Refactoring:** ✅ Code duplication eliminated
