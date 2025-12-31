# Start Screen & Game Flow Improvement Plan

## Current Issues

1. **CSS Loading Race Condition**: CSS loads asynchronously, causing visual flashes
2. **Too Many Initial Scripts**: Device detection, CSS loader, footer loader all run on DOMContentLoaded
3. **Complex Visibility Management**: Mix of inline styles, CSS classes, and JavaScript manipulation
4. **No Loading Feedback**: User doesn't know what's happening during load
5. **Sequential Blocking**: Scripts load one by one, blocking the UI
6. **CSS Loader Delay**: CSS loader waits for start screen, but timing is fragile

## Proposed Improvements

### 1. **Critical CSS Inlining** (Highest Priority)
**Problem**: CSS loads asynchronously, causing flashes of unstyled content

**Solution**: 
- Inline ALL critical CSS needed for start screen in `<head>`
- This includes: front-page styles, viewport-container, body styles
- Move non-critical CSS (animations, game styles) to async loading

**Benefits**:
- Start screen appears instantly
- No visual flashes
- Better perceived performance

### 2. **Minimal Initial Scripts**
**Problem**: Too many scripts load before start screen is ready

**Current Scripts on Initial Load**:
- device-detection.js
- css-loader.js  
- footer-loader.js
- badge-styles.css
- loading-modal.css
- api-config.js
- contract-config.js

**Solution**:
- Only load `ui-initialization.js` initially
- Defer device detection and CSS loading until after start screen is visible
- Load CSS loader only when user clicks "Enter Game"

**Benefits**:
- Faster initial load
- Start screen appears sooner
- Less JavaScript execution blocking render

### 3. **Progressive Enhancement Flow**

```
Phase 1: Initial Load (Blocking)
├── Critical CSS (inlined)
├── HTML structure
└── ui-initialization.js (minimal, just for start screen)

Phase 2: After Start Screen Visible (Non-blocking)
├── Device detection
├── CSS loader (loads only front-page CSS first)
└── Footer loader

Phase 3: When User Clicks "Enter Game" (Progressive)
├── Show loading indicator
├── Load game scripts (lazy-loader)
├── Load remaining CSS
├── Initialize game systems
└── Show main menu
```

### 4. **Loading States & Feedback**

**Problem**: No visual feedback during loading

**Solution**:
- Show a simple loading spinner on start screen while CSS loads
- Progress indicator when loading game scripts
- Smooth transitions between states

**Implementation**:
```html
<!-- In start screen -->
<div class="loading-indicator" id="startScreenLoader" style="display: none;">
  <div class="spinner"></div>
  <p>Loading...</p>
</div>
```

### 5. **Simplified Visibility Management**

**Problem**: Complex mix of inline styles, CSS classes, and JavaScript

**Solution**: 
- Use CSS classes ONLY (no inline styles)
- Single source of truth: CSS classes control visibility
- JavaScript only toggles classes

**Implementation**:
```css
/* All visibility controlled by classes */
.front-page-overlay-visible { display: flex; }
.front-page-overlay-hidden { display: none; }
.main-menu-overlay-visible { display: flex; }
.main-menu-overlay-hidden { display: none; }
```

### 6. **Resource Preloading**

**Problem**: Images and fonts load when needed, causing delays

**Solution**:
- Preload critical resources (start screen image)
- Use `<link rel="preload">` for fonts
- Lazy load non-critical images

### 7. **Performance Optimizations**

**Current Issues**:
- CSS loader loads 15+ CSS files sequentially
- Scripts load one by one (blocking)
- No code splitting

**Improvements**:
- Load CSS files in parallel (not sequential)
- Use dynamic imports for code splitting
- Bundle critical CSS together
- Use HTTP/2 server push for critical resources

## Implementation Priority

### Phase 1: Critical Fixes (Do First)
1. ✅ Inline critical CSS for start screen
2. ✅ Remove unnecessary initial scripts
3. ✅ Simplify visibility management (CSS classes only)

### Phase 2: User Experience (Do Next)
4. Add loading indicators
5. Improve transitions
6. Add error handling

### Phase 3: Performance (Do Later)
7. Parallel CSS loading
8. Resource preloading
9. Code splitting

## Expected Results

**Before**:
- Start screen appears after ~500ms
- Visual flashes during load
- Complex visibility management
- No loading feedback

**After**:
- Start screen appears instantly (<100ms)
- No visual flashes
- Simple CSS class-based visibility
- Clear loading feedback
- Faster perceived performance

## Metrics to Track

1. **Time to First Paint (TTFP)**: Target <100ms
2. **Time to Interactive (TTI)**: Target <500ms for start screen
3. **Cumulative Layout Shift (CLS)**: Target 0 (no layout shifts)
4. **First Contentful Paint (FCP)**: Target <200ms

