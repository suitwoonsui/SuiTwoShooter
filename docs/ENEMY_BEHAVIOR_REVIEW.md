# Comprehensive Enemy Behavior Review: Before vs After Level 4

## Overview
This review examines ALL aspects of enemy behavior before level 4 (`bossesDefeated <= 4`) and after level 4 (`bossesDefeated > 4`) to identify differences beyond just speed. Enemies should work identically with the only difference being that after level 4, their top speed increases.

---

## ❌ **CRITICAL BUG #1: Enemy Spawn Count Logic**

### Before Level 4:
```javascript
// Count enemies in tiles
const recent = tiles.slice(-3);
let count = recent.reduce((sum, t) => sum + t.obstacles.length, 0);
if (count < 3 && Math.random() < 0.35) {
  // Spawn enemy in tile.obstacles
  obstacles.push(enemyData);
}
```
- ✅ Correctly counts enemies in `tiles[].obstacles`
- ✅ Limits spawns to max 3 enemies in last 3 tiles

### After Level 4:
```javascript
// Still counts enemies in tiles (WRONG!)
const recent = tiles.slice(-3);
let count = recent.reduce((sum, t) => sum + t.obstacles.length, 0);
if (count < 3 && Math.random() < 0.35) {
  // But spawns enemy in separate enemies[] array
  enemies.push({ x: x + 20, ...enemyData });
}
```
- ❌ **BUG**: Counts enemies in `tiles[].obstacles` (which are always 0 after tier 4)
- ❌ **BUG**: Spawns enemies in separate `enemies[]` array
- ❌ **IMPACT**: Spawn limiting doesn't work - unlimited enemies can spawn!

**Code Location:** `src/game/systems/tiles/tiles.js` lines 28-82

**Fix Required:** After tier 4, count enemies from the `enemies[]` array instead of `tiles[].obstacles`:

```javascript
if (shouldUseSeparateEnemies()) {
  // Count enemies from separate array
  const recentEnemies = enemies.filter(e => e.x > tiles.length > 0 ? tiles[tiles.length - 3].x : -Infinity);
  count = recentEnemies.length;
} else {
  const recent = tiles.slice(-3);
  count = recent.reduce((sum, t) => sum + t.obstacles.length, 0);
}
```

---

## ❌ **CRITICAL BUG #2: Coin/Powerup Lane Selection**

### Before Level 4:
```javascript
const used = obstacles.map(o => o.lane);
const free = lanes.filter(l => !used.includes(l));
```
- ✅ Uses `obstacles` array to find used lanes
- ✅ Correctly avoids enemy lanes

### After Level 4:
```javascript
// obstacles array is always empty after tier 4!
const used = obstacles.map(o => o.lane); // Returns [] - no lanes marked as used
const free = lanes.filter(l => !used.includes(l)); // All lanes available
```
- ❌ **BUG**: `obstacles` array is empty after tier 4
- ❌ **BUG**: Coins/powerups can spawn in same lanes as enemies (no lane avoidance)
- ❌ **IMPACT**: Coins/powerups can overlap with enemies after tier 4

**Code Location:** `src/game/systems/tiles/tiles.js` lines 86-93, 99-109

**Fix Required:** After tier 4, check lanes used by enemies in the `enemies[]` array near the tile position:

```javascript
if (shouldUseSeparateEnemies()) {
  // Find enemies near this tile position
  const nearbyEnemies = enemies.filter(e => Math.abs(e.x - x) < 100);
  const used = nearbyEnemies.map(e => e.lane);
} else {
  const used = obstacles.map(o => o.lane);
}
```

---

## ⚠️ **ISSUE #3: Enemy Spawn Position Calculation**

### Before Level 4:
```javascript
let lastX = tiles.length ? tiles[tiles.length-1].x : game.width;
const x = lastX + game.width / 10;
```
- ✅ Uses last tile's X position
- ✅ Consistent spacing

### After Level 4:
```javascript
if (enemies.length > 0) {
  lastX = Math.max(...enemies.map(e => e.x));
} else if (tiles.length > 0) {
  lastX = tiles[tiles.length-1].x;
} else {
  lastX = game.width;
}
const x = lastX + game.width / 10;
```
- ⚠️ **POTENTIAL ISSUE**: Uses enemy positions instead of tile positions
- ⚠️ Since enemies move faster, they can spread out more
- ⚠️ This could create inconsistent spacing between tiles and enemies
- ✅ **However**: This might be intentional to maintain spacing with faster enemies

**Code Location:** `src/game/systems/tiles/tiles.js` lines 8-24

**Status:** Needs verification - may be intentional but creates different spacing behavior.

---

## ⚠️ **ISSUE #4: Enemy Projectile Speed**

### Before Level 4:
```javascript
const baseSpeed = 4 * enemyStats[enemy.type].speed;
const s = baseSpeed; // No multiplier
```
- ✅ Base speed only

### After Level 4:
```javascript
const baseSpeed = 4 * enemyStats[enemy.type].speed;
const speedMultiplier = getProjectileSpeedMultiplier(); // 1.0 + (bossesDefeated - 4) * 0.05
const s = baseSpeed * speedMultiplier;
```
- ⚠️ **DIFFERENT**: Projectile speed increases after tier 4
- ⚠️ Multiplier increases by 5% per boss after tier 4
- ⚠️ **IMPACT**: Enemy projectiles get faster, not just enemy movement

**Code Location:** `src/game/systems/enemies/enemy-behavior.js` lines 38-41

**Status:** If only enemy movement speed should increase, this needs to be removed.

---

## ✅ **CORRECT: Enemy Movement Speed**

### Before Level 4:
- Enemies stored in `tiles[].obstacles`
- Speed: `game.scrollSpeed` (capped at 6.0)
- Movement: `tiles.forEach(t => t.x -= game.scrollSpeed)`

### After Level 4:
- Enemies stored in separate `enemies[]` array
- Speed: `game.enemySpeed` with increasing cap: `6.0 + (bossesDefeated - 4) * 0.25`
- Movement: `enemies.forEach(e => e.x -= game.enemySpeed)`

**Status:** ✅ **CORRECT** - This is the intended difference.

---

## ✅ **CORRECT: Enemy Shooting Behavior**

### Before and After Level 4:
- ✅ Same shooting logic (`processEnemyShooting()`)
- ✅ Same fire rate (`enemyStats[enemy.type].fireRate`)
- ✅ Same "no-shoot zone" (stops within 2 columns of player)
- ✅ Same activation logic (canShoot when on screen)

**Status:** ✅ **IDENTICAL**

---

## ✅ **CORRECT: Enemy Stats**

### Before and After Level 4:
- ✅ Same stats per type (fireRate, speed, hp)
- ✅ Same type selection logic
- ✅ Same weighting system

**Status:** ✅ **IDENTICAL**

---

## ✅ **CORRECT: Collision Detection**

### Before and After Level 4:
- ✅ Same collision detection (`checkEnemyCollisionWithPlayer()`)
- ✅ Same collision box calculations
- ✅ Same force field interaction
- ✅ Same player damage logic

**Status:** ✅ **IDENTICAL**

---

## ✅ **CORRECT: Player Projectile Collision**

### Before and After Level 4:
- ✅ Same collision logic (`checkProjectileEnemyCollision()`)
- ✅ Same damage calculation (`enemy.hp -= b.level`)
- ✅ Same scoring (`15 * enemy.type`)
- ✅ Same visual effects

**Status:** ✅ **IDENTICAL**

---

## ✅ **CORRECT: Enemy Removal/Off-screen Filtering**

### Before Level 4:
```javascript
tiles = tiles.filter(t => t.x > -200);
// Enemies removed with tiles
```
- ✅ Enemies removed when tiles are removed

### After Level 4:
```javascript
enemies = enemies.filter(e => e.x > -200);
tiles = tiles.filter(t => t.x > -200);
```
- ✅ Enemies filtered separately
- ✅ Same threshold (-200)

**Status:** ✅ **FUNCTIONALLY IDENTICAL** - Only implementation differs.

---

## ✅ **CORRECT: Enemy Rendering**

### Before and After Level 4:
- ✅ Same rendering function (`renderEnemy()`)
- ✅ Same visual appearance
- ✅ Same health bar display
- ✅ Only difference: position source (`tile.x + 20` vs `enemy.x`)

**Status:** ✅ **IDENTICAL**

---

## Summary of Issues

### ❌ **CRITICAL BUGS TO FIX:**

1. **Enemy Spawn Count Logic** - After tier 4, counts wrong array, breaking spawn limiting
   - **Location:** `src/game/systems/tiles/tiles.js` line 29
   - **Impact:** Unlimited enemy spawning possible

2. **Coin/Powerup Lane Selection** - After tier 4, doesn't check enemy lanes
   - **Location:** `src/game/systems/tiles/tiles.js` lines 86-93, 99-109
   - **Impact:** Coins/powerups can overlap with enemies

### ⚠️ **POTENTIAL ISSUES TO VERIFY:**

3. **Enemy Spawn Position** - Different calculation method
   - **Location:** `src/game/systems/tiles/tiles.js` lines 8-24
   - **Impact:** Different spacing behavior

4. **Enemy Projectile Speed** - Increases after tier 4
   - **Location:** `src/game/systems/enemies/enemy-behavior.js` line 40
   - **Impact:** Projectiles get faster (may be intentional or unintentional)

### ✅ **WORKING CORRECTLY:**
- Enemy movement speed (intended difference)
- Enemy shooting behavior
- Enemy stats and type selection
- Collision detection
- Player projectile collision
- Enemy removal/off-screen filtering
- Enemy rendering

---

## Code References

- **Enemy spawn count:** `src/game/systems/tiles/tiles.js` lines 28-29
- **Coin/powerup lane selection:** `src/game/systems/tiles/tiles.js` lines 86-93, 99-109
- **Enemy spawn position:** `src/game/systems/tiles/tiles.js` lines 8-24
- **Enemy projectile speed:** `src/game/systems/enemies/enemy-behavior.js` lines 38-41
- **Enemy movement speed:** `src/game/main.js` lines 464-473, 497-510
- **Enemy shooting:** `src/game/systems/enemies/enemy-behavior.js` lines 15-45
- **Collision detection:** `src/game/systems/collision/collision.js` lines 6-108
- **Projectile collision:** `src/game/main.js` lines 544-619
