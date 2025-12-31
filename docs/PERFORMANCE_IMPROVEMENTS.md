# Performance Improvements Plan

## 🎯 Overview
This document outlines performance optimization opportunities identified in the codebase, prioritized by impact and effort.

---

## 🔴 High Impact, Low Effort

### 1. **Reduce Console Logging in Production** ⚡
**Current State**: 1,205+ `console.log/warn/error` statements in frontend code
**Impact**: High - Console logging has significant overhead, especially in production
**Effort**: Low-Medium

**Recommendation**:
- Create a centralized logger utility (similar to backend `StoreLogger`/`MigrationLogger`)
- Add environment-based log levels (`DEBUG`, `INFO`, `WARN`, `ERROR`)
- Disable `DEBUG` and `INFO` logs in production via environment variable
- Keep `WARN` and `ERROR` for production debugging

**Files to Update**:
- `src/game/systems/ui/*.js` (all UI modules)
- `src/game/systems/store/*.js`
- `src/game/systems/core/*.js`
- `src/game/main.js`

**Expected Improvement**: 5-10% performance boost, cleaner console output

---

### 2. **Cache DOM Queries** ⚡
**Current State**: Multiple `querySelector`/`getElementById` calls throughout code
**Impact**: Medium - Reduces DOM traversal overhead
**Effort**: Low

**Recommendation**:
- Cache frequently accessed DOM elements (e.g., `mainMenu`, `gameContainer`, `canvas`)
- Store in module-level variables or service state
- Re-query only when DOM structure changes

**Example**:
```javascript
// Before (multiple queries)
const menu = document.getElementById('mainMenuOverlay');
// ... later ...
const menu = document.getElementById('mainMenuOverlay');

// After (cached)
let _mainMenuCache = null;
function getMainMenu() {
  if (!_mainMenuCache) {
    _mainMenuCache = document.getElementById('mainMenuOverlay');
  }
  return _mainMenuCache;
}
```

**Files to Update**:
- `src/game/systems/ui/game-service.js` (gameContainer, canvas)
- `src/game/systems/ui/menu-service.js` (mainMenu)
- `src/game/systems/ui/store-modal.js` (storeModal, viewportContainer)

**Expected Improvement**: 2-5% performance boost, especially during frequent UI updates

---

### 3. **Optimize setTimeout Usage** ⚡
**Current State**: 88+ `setTimeout`/`setInterval` calls, many with arbitrary delays
**Impact**: Medium - Some delays may be unnecessary or too long
**Effort**: Low

**Recommendation**:
- Review and reduce arbitrary delays (e.g., `setTimeout(..., 500)` → `setTimeout(..., 100)`)
- Consolidate multiple timeouts where possible
- Use `requestAnimationFrame` for animation-related delays instead of `setTimeout`
- Remove unnecessary delays (e.g., `setTimeout(..., 0)` for event handlers - use proper event handling)

**Files to Review**:
- `src/game/systems/ui/store-purchase-flow.js` (multiple 500ms-3000ms delays)
- `src/game/systems/ui/badge-ui-*.js` (3000ms-5000ms delays)
- `src/game/systems/ui/game-data-flow-service.js` (100ms delay)

**Expected Improvement**: Faster UI responsiveness, reduced perceived latency

---

## 🟡 High Impact, Medium Effort

### 4. **Image Loading Optimization** 🖼️
**Current State**: Images loaded synchronously when modules load
**Impact**: High - Affects initial load time and memory usage
**Effort**: Medium

**Recommendation**:
- **Preload critical images** (player, enemies, bosses) before game starts
- **Lazy load non-critical images** (badge images, store icons)
- **Use image sprites** for small, frequently used images (icons, UI elements)
- **Implement progressive loading** for large images (show placeholder → low-res → high-res)

**Current Image Loading**:
- Images are created with `new Image()` and `src` is set immediately
- No preloading strategy
- No loading state management

**Proposed Solution**:
```javascript
// Image preloader utility
class ImagePreloader {
  constructor() {
    this.cache = new Map();
    this.loading = new Set();
  }
  
  async preload(url) {
    if (this.cache.has(url)) {
      return this.cache.get(url);
    }
    if (this.loading.has(url)) {
      // Wait for existing load
      return new Promise(resolve => {
        const checkInterval = setInterval(() => {
          if (this.cache.has(url)) {
            clearInterval(checkInterval);
            resolve(this.cache.get(url));
          }
        }, 50);
      });
    }
    
    this.loading.add(url);
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.cache.set(url, img);
        this.loading.delete(url);
        resolve(img);
      };
      img.onerror = reject;
      img.src = url;
    });
  }
}
```

**Files to Update**:
- `src/game/rendering/bosses/boss-images.js`
- `src/game/rendering/player/player-images.js`
- `src/game/rendering/enemies/enemy-images.js`
- `src/game/rendering/collectibles/collectible-images.js`

**Expected Improvement**: 20-30% faster initial game load, better memory management

---

### 5. **Game Loop Frame Rate Optimization** 🎮
**Current State**: Game loop uses `requestAnimationFrame` but no frame rate limiting
**Impact**: Medium - Can cause unnecessary CPU/GPU usage on high-refresh displays
**Effort**: Medium

**Recommendation**:
- Add frame rate limiting (target 60 FPS)
- Implement delta time-based updates for consistent gameplay
- Add frame skipping for low-end devices

**Current Implementation**:
- Uses `requestAnimationFrame` directly
- No frame rate limiting
- No delta time calculation

**Proposed Solution**:
```javascript
class GameLoop {
  constructor(gameState, updateFn, drawFn) {
    // ... existing code ...
    this.targetFPS = 60;
    this.frameTime = 1000 / this.targetFPS;
    this.lastFrameTime = 0;
    this.deltaTime = 0;
  }
  
  _loop(currentTime) {
    this.rafId = requestAnimationFrame(this._loop);
    
    const deltaTime = currentTime - this.lastFrameTime;
    
    // Skip frame if too fast (high refresh rate displays)
    if (deltaTime < this.frameTime) {
      return;
    }
    
    this.deltaTime = deltaTime;
    this.lastFrameTime = currentTime;
    
    // Update and draw
    this.update(this.deltaTime);
    this.draw();
  }
}
```

**Files to Update**:
- `src/game/systems/core/game-loop.js`

**Expected Improvement**: More consistent frame rate, better performance on high-refresh displays

---

### 6. **Reduce Redundant API Calls** 🌐
**Current State**: Some potential for duplicate calls (though `GameDataFlowService` has deduplication)
**Impact**: Medium - Reduces network overhead and improves responsiveness
**Effort**: Medium

**Recommendation**:
- **Extend deduplication** to all API calls (not just `GameDataFlow`)
- **Add request caching** for read-only endpoints (badge data, stats, inventory)
- **Batch related API calls** where possible (e.g., load badge + stats + balance in parallel)

**Current State**:
- `GameDataFlowService` has `_activeLoads` Map for deduplication ✅
- Store and leaderboard don't have deduplication
- No request-level caching

**Proposed Solution**:
```javascript
// API request cache utility
class ApiRequestCache {
  constructor(ttl = 30000) { // 30 second default TTL
    this.cache = new Map();
    this.ttl = ttl;
  }
  
  async get(key, fetcher) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.ttl) {
      return cached.data;
    }
    
    const data = await fetcher();
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
    return data;
  }
  
  invalidate(pattern) {
    // Invalidate cache entries matching pattern
    for (const [key] of this.cache) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }
}
```

**Files to Update**:
- `src/game/systems/ui/store-item-loader.js`
- `src/game/systems/ui/store-inventory.js`
- `src/game/systems/ui/leaderboard-data.js`
- `src/game/systems/core/game-state-manager.js`

**Expected Improvement**: 30-50% reduction in API calls, faster UI updates

---

## 🟢 Medium Impact, Low Effort

### 7. **Optimize Array Operations** 📊
**Current State**: Multiple array iterations and filtering operations
**Impact**: Low-Medium - Can add up during gameplay
**Effort**: Low

**Recommendation**:
- Use `for` loops instead of `forEach` for performance-critical code
- Cache array lengths
- Use `filter` + `map` efficiently (avoid multiple passes)

**Example**:
```javascript
// Before
tiles.forEach(tile => {
  // ...
});
enemies.forEach(enemy => {
  // ...
});

// After (for performance-critical loops)
for (let i = 0, len = tiles.length; i < len; i++) {
  const tile = tiles[i];
  // ...
}
```

**Files to Review**:
- `src/game/systems/core/game-update.js` (tile/enemy updates)
- `src/game/rendering/*.js` (rendering loops)

**Expected Improvement**: 1-3% performance boost during heavy gameplay

---

### 8. **Debounce/Throttle Event Handlers** ⏱️
**Current State**: Some event handlers may fire too frequently
**Impact**: Low-Medium - Reduces unnecessary processing
**Effort**: Low

**Recommendation**:
- Add debouncing to resize handlers (already done in some places ✅)
- Throttle scroll/input handlers
- Debounce search/filter inputs

**Files to Review**:
- `src/game/rendering/responsive/canvas-manager.js` (resize handler)
- `src/game/systems/input/touch-input.js` (touch handlers)

**Expected Improvement**: Smoother UI interactions, reduced CPU usage

---

## 📋 Implementation Priority

### Phase 1 (Quick Wins - 1-2 days)
1. ✅ Reduce console logging (create logger utility)
2. ✅ Cache DOM queries
3. ✅ Optimize setTimeout usage

### Phase 2 (Medium Effort - 3-5 days)
4. ✅ Image loading optimization
5. ✅ Game loop frame rate optimization
6. ✅ Reduce redundant API calls

### Phase 3 (Polish - 2-3 days)
7. ✅ Optimize array operations
8. ✅ Debounce/throttle event handlers

---

## 📊 Expected Overall Impact

**Performance Improvements**:
- Initial load time: **20-30% faster**
- Gameplay FPS: **5-10% more consistent**
- UI responsiveness: **15-25% faster**
- Memory usage: **10-15% reduction**
- Network requests: **30-50% reduction**

**Code Quality**:
- Cleaner console output
- Better error handling
- More maintainable code
- Better user experience

---

## 🔍 Monitoring & Measurement

**Before implementing**, establish baseline metrics:
- Initial page load time
- Time to interactive
- Average FPS during gameplay
- API call frequency
- Memory usage

**After implementing**, measure:
- Same metrics as above
- Compare improvements
- Identify any regressions

---

## 📝 Notes

- Some optimizations may have trade-offs (e.g., caching uses more memory)
- Test thoroughly after each phase
- Monitor for any regressions
- Consider user experience impact (e.g., loading screens vs. instant display)

