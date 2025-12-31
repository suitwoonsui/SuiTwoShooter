# Performance Audit Findings

## 🔍 Issues Found After Optimization Review

After fixing the projectile performance issues, we audited other game loops and found several additional performance problems.

---

## 🐛 Critical Issues (High Impact)

### 1. **Collectibles Rendering - `find()` Inside Loop** ⚠️
**Location**: `src/game/rendering/collectibles/collectibles-rendering.js`

**Problem**:
- Uses `forEach` on tiles array
- Calls `find()` on `pulledCoins`/`pulledPowerups` for EVERY tile
- Complexity: O(n*m) where n = tiles, m = pulled items

**Impact**: With 30 tiles and 10 pulled coins, that's 300 `find()` operations per frame!

**Code**:
```javascript
tiles.forEach(tile => {
  // ...
  const pulled = window.pulledCoins.find(p => p.tile === tile); // ❌ Called for every tile!
  // ...
});
```

**Fix**: Create a Map/lookup table for pulled items before the loop.

---

### 2. **Coin Collection - `find()` Inside Loop** ⚠️
**Location**: `src/game/systems/collision/collision.js` - `checkCoinCollection()`

**Problem**:
- Uses `forEach` on tiles array
- Calls `find()` on `pulledCoins` for every tile with a coin
- Also calls `getCollectibleDimensions()` for every coin

**Impact**: With 10 coins on screen, that's 10+ `find()` operations and 10 `getCollectibleDimensions()` calls per frame.

**Code**:
```javascript
tiles.forEach(tile => {
  if (tile.coinLane!==null) {
    const pulled = window.pulledCoins.find(p => p.tile === tile); // ❌ Called for every coin!
    const coinDims = getCollectibleDimensions(collectibleImage); // ❌ Called for every coin!
  }
});
```

**Fix**: 
- Create Map for pulled coins before loop
- Cache `getCollectibleDimensions()` result (same for all coins)

---

### 3. **Powerup Collection - `find()` Inside Loop** ⚠️
**Location**: `src/game/systems/collision/collision.js` - `checkPowerupCollection()`

**Problem**:
- Same as coin collection
- Calls `find()` and `getCollectibleDimensions()` for every powerup

**Impact**: Similar to coin collection.

---

## 🟡 Medium Issues (Moderate Impact)

### 4. **Enemy/Boss Projectile Updates - Using `filter()`**
**Location**: 
- `src/game/systems/projectiles/enemy-projectiles.js`
- `src/game/systems/projectiles/boss-projectiles.js`

**Problem**:
- Uses `filter()` for simple updates
- Could be optimized to `for` loop with early exit

**Impact**: Minor - `filter()` is generally fine, but `for` loop is slightly faster.

**Code**:
```javascript
game.enemyProjectiles = game.enemyProjectiles.filter(b => {
  b.x += b.vx * speedMultiplier * deltaMultiplier;
  b.y += b.vy * speedMultiplier * deltaMultiplier;
  return b.x > -50 && b.x < game.width + 50 && b.y > -50 && b.y < game.height + 50;
});
```

**Fix**: Convert to `for` loop (optional optimization).

---

### 5. **Collectibles Rendering - `getCollectibleDimensions()` Called Multiple Times**
**Location**: `src/game/rendering/collectibles/collectibles-rendering.js`

**Problem**:
- `getCollectibleDimensions()` called for every coin/powerup
- Same image = same dimensions, but recalculated each time

**Impact**: Minor - but adds up with many collectibles.

**Fix**: Cache dimensions per image type.

---

## ✅ Already Optimized

### Particles Update
- ✅ Uses `for` loop (not `forEach`)
- ✅ Filters in single pass
- ✅ No nested loops

### Enemy/Tile Updates
- ✅ Uses `for` loop
- ✅ Filters in single pass
- ✅ No nested operations

### Player Projectile Rendering
- ✅ Uses `for` loop
- ✅ No expensive operations inside loop

---

## 📊 Performance Impact Summary

### Before Fixes
- **Collectibles rendering**: O(n*m) with `find()` calls
- **Coin collection**: O(n*m) with `find()` calls
- **Powerup collection**: O(n*m) with `find()` calls
- **Total**: Potentially 1000+ `find()` operations per frame with many collectibles

### After Fixes
- **Collectibles rendering**: O(n+m) with Map lookup
- **Coin collection**: O(n+m) with Map lookup
- **Powerup collection**: O(n+m) with Map lookup
- **Total**: ~30 Map lookups per frame (much faster)

---

## 🎯 Priority Fix Order

1. **High Priority**: Fix collectibles rendering `find()` calls
2. **High Priority**: Fix coin collection `find()` calls
3. **High Priority**: Fix powerup collection `find()` calls
4. **Medium Priority**: Cache `getCollectibleDimensions()` results
5. **Low Priority**: Convert enemy/boss projectile `filter()` to `for` loops

---

## 📝 Files to Update

1. `src/game/rendering/collectibles/collectibles-rendering.js`
2. `src/game/systems/collision/collision.js`
3. `src/game/systems/projectiles/enemy-projectiles.js` (optional)
4. `src/game/systems/projectiles/boss-projectiles.js` (optional)

---

**Status**: Ready for fixes

