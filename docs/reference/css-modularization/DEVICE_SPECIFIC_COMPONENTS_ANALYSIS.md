# Device-Specific Components Analysis

**Date:** October 27, 2025  
**Status:** Components that need device-specific styling

## Components Found in HTML

Based on analysis of `index.html` and the modular system, here are the actual components in use:

### ✅ Components in Shared Files (90% coverage)

#### Viewport/Container
- `.viewport-container` - Layout structure ✅
- `.front-page-overlay` - Landing page ✅
- `.front-page-content` - Landing content ✅
- `.main-menu-overlay` - Main menu overlay ✅
- `.main-menu-content` - Main menu content ✅
- `.game-container` - Base game area ✅

#### Headers & Footers
- `.game-header` - Game header (base in shared, enhanced in device-specific) ✅
- `.game-footer` - Game footer (base in shared, enhanced in device-specific) ✅
- `.header-logo` - Logo in header ⚠️
- `.alpha-badge` - Badge in header ✅
- `.version-badge` - Version info ✅

#### Game UI
- `.game-wrapper` - Wrapper around canvas ⚠️ **DEVICE-SPECIFIC**
- `.game-ui-overlay` - In-game UI overlay ⚠️ **DEVICE-SPECIFIC**
- `.game-stats-panel` - In-game stats panel ⚠️ **DEVICE-SPECIFIC**

#### Stats/Controls
- `.stat` - Individual stat ✅
- `.stat-item` - Stat container ✅
- `.stat-label` - Stat label text ✅
- `.stat-value` - Stat value text ✅
- `.stat-icon` - Stat icon ✅
- `.control-item` - Control instruction item ✅
- `.control-icon` - Control icon ✅
- `.control-text` - Control text ✅
- `.controls` - Controls container ⚠️ **DEVICE-SPECIFIC**
- `.stats` - Stats container ⚠️ **DEVICE-SPECIFIC**
- `.version-info` - Version information ✅

#### Panels
- `.settings-panel` - Settings modal ✅
- `.settings-content` - Settings content ✅
- `.settings-header` - Settings header ✅
- `.settings-section` - Settings section ✅
- `.setting-item` - Individual setting ✅
- `.settings-buttons` - Settings action buttons ✅
- `.sound-test-panel` - Sound test modal ✅
- `.sound-test-content` - Sound test content ✅
- `.sound-test-header` - Sound test header ✅
- `.sound-test-section` - Sound test section ✅
- `.sound-btn` - Sound test button ✅
- `.sound-buttons` - Sound buttons container ✅
- `.instructions-panel` - Instructions modal ✅
- `.instructions-content` - Instructions content ✅
- `.instructions-header` - Instructions header ✅
- `.instructions-section` - Instructions section ✅
- `.instructions-buttons` - Instructions action buttons ✅

#### Buttons
- `.enter-game-btn` - Primary game entry button ✅
- `.menu-btn` - Menu navigation button ✅
- `.btn-icon` - Button icon ✅
- `.close-btn` - Panel close button ✅

#### Typography/Content
- `.game-title` - Game title text ✅
- `.game-subtitle` - Game subtitle ✅
- `.game-description` - Game description ✅
- `.title-profile-image` - Profile image ✅
- `.audio-note` - Audio notice ✅

#### Leaderboard (Desktop Only)
- `.leaderboard` - Leaderboard container ⚠️ **DESKTOP-SPECIFIC**
- `.leaderboard-list` - Leaderboard items list ⚠️ **DESKTOP-SPECIFIC**
- `.leaderboard-item` - Individual leaderboard item ⚠️ **DESKTOP-SPECIFIC**

#### Name Input Modal (Desktop Only)
- `.name-input-modal` - Post-game name input ⚠️ **DESKTOP-SPECIFIC**
- `.name-input-content` - Modal content ⚠️ **DESKTOP-SPECIFIC**
- `.score-display` - Score display ⚠️ **DESKTOP-SPECIFIC**

---

## Device-Specific Components (What's Different)

### **Desktop-Specific** (`desktop-game-ui.css` - 528 lines)

#### True Differences:
1. **Layout**: Side-by-side with **INFO BOX ON LEFT, CANVAS ON RIGHT**
2. **Sizing**: Fixed px values for certain elements
3. **Footer**: Full footer with controls section
4. **Leaderboard**: Full leaderboard component
5. **Name Input Modal**: Post-game modal
6. **Canvas Border**: Larger border (3px vs 2px)
7. **Visual Effects**: More complex desktop effects

#### Key Classes:
- `.game-wrapper` - Layout container with flex row
- `.gameplay-area` - Flexible layout area (row direction)
- `.game-ui-overlay` - **INFO BOX - positioned LEFT of canvas** (order: -1)
- `.game-stats-panel` - Larger, desktop-sized stats panel
- `.leaderboard` - Full desktop leaderboard
- `.name-input-modal` - Desktop-only post-game modal

### **Mobile-Specific** (`mobile-game-ui.css` - 367 lines)

#### True Differences:
1. **Layout**: Single-column, full-screen canvas
2. **Sizing**: Viewport units throughout (`min(vw, vh)`)
3. **Footer**: Hidden (`.game-footer.mobile-hidden`)
4. **Header**: Compact header (`.mobile-compact`)
5. **Touch Targets**: Larger touch areas
6. **Pause Menu**: Mobile-specific pause overlay
7. **Canvas Border**: Thinner dynamic border

#### Key Classes:
- `.mobile-game-container` - Mobile game area
- `.mobile-game-overlay` - Full-screen overlay
- `.game-header.mobile-compact` - Compact header variant
- `.mobile-game-stats-panel` - Compact stats panel
- `.mobile-pause-menu` - Mobile pause menu
- `.mobile-game-footer` - Mobile footer (hidden by default)

---

## What Needs to be Done

### 1. **Audit Device-Specific Files** ⚠️
Check if these files contain:
- ✅ True device differences (layout, sizing, touch targets)
- ❌ Duplicate shared styles (should be removed)
- ❌ Unused classes not in HTML (can be removed)

### 2. **Key Questions:**

**For `desktop-game-ui.css`:**
- Is the leaderboard still used?
- Is the name-input-modal still used?
- Can visual effects be moved to shared?

**For `mobile-game-ui.css`:**
- Is mobile-specific overlay structure correct?
- Are touch targets properly sized?
- Is the pause menu actually implemented?

### 3. **Unused Files:**
- `desktop-gameplay.css` (24 lines) - NOT LOADED
- `mobile-gameplay.css` (220 lines) - NOT LOADED  
- `mobile-interactions.css` (263 lines) - NOT LOADED

**Decision needed:** Load these files or remove them?

---

## Summary

### Shared Coverage: ~90% ✅
Most components are already in shared files with base styling

### Device-Specific: ~10% ⚠️
Only true platform differences should remain:
- **Desktop**: Full layout, sidebar, leaderboard, name modal
- **Mobile**: Compact layout, touch-friendly, no footer, pause menu

### Next Steps:
1. Review `desktop-game-ui.css` and `mobile-game-ui.css` for duplication
2. Decide on 3 unused files (load or remove)
3. Clean up any duplicate styles moved to shared
4. Test that device-specific enhancements work correctly

---

**Total Components:** ~60 unique classes  
**In Shared:** ~54 classes (90%)  
**Device-Specific:** ~6 true differences (10%)
