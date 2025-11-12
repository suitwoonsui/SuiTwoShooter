# Premium Store Design

## 📦 Phase 5.2: Premium Store System (MVP Important)

This document outlines the complete design and implementation guide for a premium store system where players can purchase power-ups and advantages before starting a game. The store will accept payments in SUI or $MEWS tokens, and purchases will be stored on-chain for transparency and verification.

**⚠️ CRITICAL: Game Code Implementation Required**
All premium items must be **coded into the existing game logic**. This is not just a store/payment system - it requires:
- **NEW game features** to be built (Slow Time, Destroy All Enemies, Boss Kill Shot, Coin Magnet)
- **Modifications to existing game code** (Extra Lives, Force Field, Orb Level systems)
- **Game logic changes** in `main.js`, enemy systems, boss systems, UI rendering, etc.

**Document Number:** 12  
**Last Updated:** 2025-01-15  
**Status:** Design Phase - Planning  
**Implementation Phase:** Phase 5.2 (MVP Important) - **REQUIRED FOR BURN MECHANICS**  
**Estimated Time:** 25-35 hours (total for all components)  
**Dependencies:** Phase 4.1, Phase 4.2  
**Note:** Premium Store is required before burn mechanics (Phase 5.3) as it generates revenue to fund burns.

**See:** [IMPLEMENTATION_ROADMAP.md](./IMPLEMENTATION_ROADMAP.md) for phase details

---

## 1. Business Model & Pricing

### Base Game Entry Fee
- **Current:** $0.01 per game (doesn't cover gas)
- **Proposed:** $0.05 per game (covers gas + margin)
- **Gas Cost:** ~$0.011 per transaction (at current SUI price ~$2.17)
- **Margin:** ~$0.039 per game (78% margin for operations)

### Premium Item Pricing Strategy

#### Tier-Based Pricing
- **Basic Tier:** Entry-level power-ups (affordable)
- **Standard Tier:** Mid-range power-ups (moderate price)
- **Premium Tier:** High-value power-ups (expensive)

#### Example Pricing Structure (in $MEWS or SUI equivalent)

| Item | Level 1 | Level 2 | Level 3 | Max Level |
|------|---------|---------|---------|-----------|
| Extra Life | 100 $MEWS | 250 $MEWS | 500 $MEWS | 3 lives max |
| Force Field Start | 200 $MEWS | 400 $MEWS | 600 $MEWS | Level 3 max |
| Orb Level Start | 150 $MEWS | 300 $MEWS | 450 $MEWS | Level 4 max (cap at 5) |
| Slow Time Power | 300 $MEWS | 600 $MEWS | 900 $MEWS | 3 uses max |
| Destroy All Enemies | 500 $MEWS | 1000 $MEWS | 1500 $MEWS | 1 use max |
| Boss Kill Shot | 750 $MEWS | 1500 $MEWS | 2500 $MEWS | 1 use max |

**Note:** Prices are examples - adjust based on token economics and game balance.

---

## 2. Premium Items Catalog

### 2.1 Extra Lives
**Description:** Start the game with additional lives beyond the default 3.

**Levels:**
- **Level 1:** +1 life (4 total)
- **Level 2:** +2 lives (5 total)
- **Level 3:** +3 lives (6 total)

**Max:** 3 additional lives (6 total max)

**Important Constraints:**
- **Purchased lives are NON-REPLENISHABLE:** If a replenishment system is added in the future, only the base 3 lives can be replenished
- **Purchased lives are tracked separately:** Must distinguish between base lives and purchased lives
- **Single-use per game:** Purchased lives are consumed when used and don't carry over

**Value Proposition:**
- Level 1 (+1 life): Moderate advantage, doubles your margin for error
- Level 2 (+2 lives): Significant advantage, 67% more lives than default
- Level 3 (+3 lives): **Very expensive** - Doubles your total lives (6 vs 3), massive advantage
- **Why purchase?** Extra lives provide direct gameplay advantage, especially Level 3 which doubles your survival capacity

**Implementation:**
- Track lives separately:
  - `game.baseLives: number` (default 3, can be replenished)
  - `game.purchasedLives: number` (from store, cannot be replenished)
  - `game.lives: number` (total = baseLives + purchasedLives)
- Modify `restart()` to initialize based on purchases
- Store purchase in game session data
- Display in UI: "Starting with X lives (3 base + Y purchased)"
- Future replenishment logic must only affect `game.baseLives`

**Pricing Philosophy:**
- **Level 3 should be very expensive** (similar to Force Field Level 3) because it provides a massive advantage (doubles total lives)
- Level 1 and Level 2 should be progressively priced, with Level 3 being the premium tier
- Pricing to be determined, but Level 3 should reflect its significant gameplay impact

---

### 2.2 Force Field Start
**Description:** Begin the game with an active force field at a specified level.

**Levels:**
- **Level 1:** Start with Level 1 force field
- **Level 2:** Start with Level 2 force field
- **Level 3:** Start with Level 3 force field

**Max:** Level 3 (new max force field level)

**Current In-Game Acquisition (Coin Streak Requirements):**
- **Level 1:** Streak >= 5 coins (current, keep - good for beginners, requires skill)
- **Level 2:** Streak >= 12 coins (exponential jump, harder to achieve)
- **Level 3:** Streak >= 30 coins (extremely hard, exponential jump - very rare to achieve naturally)

**Value Proposition:**
- Level 1 is achievable but requires skill (5 coins without getting hit)
- Level 2 is significantly harder (12 coins), making it valuable to purchase
- Level 3 is extremely difficult (30 coins), very expensive purchase, but provides significant value
- **Why purchase?** Getting Level 2 and especially Level 3 naturally is very difficult, making purchases valuable for players who want the advantage

**Force Field Mechanics:**
- **Strength:** All levels provide the same protection (one hit = one level down)
- **Behavior:** When hit, force field drops one level (Level 3 → Level 2 → Level 1 → 0)
- **Streak Reset:** When force field is hit, coin streak resets to 0 (must rebuild from scratch)
- **Upgrade Path:** Purchased force fields can still be upgraded via coin streak if player maintains streak

**Implementation:**
- Initialize `game.forceField.level` and `game.forceField.active = true` at game start based on purchase
- Purchased force fields can still be upgraded via coin streak (if player maintains streak)
- Display in UI: "Starting with Force Field Level X"
- Update `checkForceFieldActivation()` to support Level 3 with thresholds: 5 → 12 → 30

**Game Balance Impact:**
- **Exponential progression:** 5 → 12 → 30 (makes higher levels very hard to earn)
- **Streak requirements are fixed:** When hit, streak resets to 0, but thresholds remain the same
- **Purchased force fields:** Start with purchased level, can upgrade further if streak is maintained
- **Pricing:** To be determined (Level 3 should be very expensive to reflect its rarity and power)

---

### 2.3 Orb Level Start
**Description:** Begin the game with a higher magic orb level.

**Levels:**
- **Level 1:** Start at Orb Level 2
- **Level 2:** Start at Orb Level 3
- **Level 3:** Start at Orb Level 4

**Max Purchase:** Start at Level 4 (cannot purchase starting at max level 10)

**Current In-Game System:**
- **Max Level:** 10 (stretched from current 6)
- **Starting Level:** 1 (default, no purchase)
- **Power-ups:** Collect power-up bonuses to increase level (+1 per power-up)
- **Power-downs:** Collect power-downs to decrease level (-1 per power-down)
- **Auto-fire Speed:** 300ms at level 1, decreases by 50ms per level (min 100ms)
- **Damage:** Level = damage per hit (e.g., Level 3 = 3 damage)
- **Size:** `level * 8 + 16` pixels (bigger = more powerful)

**Value Proposition:**
- Level 1 (Start at 2): Moderate advantage, skip initial grind
- Level 2 (Start at 3): Significant advantage, stronger starting power
- Level 3 (Start at 4): **More expensive** - Strong starting power, but cannot purchase max level (10)
- **Why purchase?** Starting at higher levels saves time and provides early advantage, but players can still progress naturally via power-ups

**Pricing Philosophy:**
- **Level 3 should be more expensive** (but not as expensive as Force Field Level 3 or Extra Lives Level 3)
- Reason: Cannot purchase max level (10), so there's still natural progression value
- Progressive pricing: Level 1 < Level 2 < Level 3

**Power-Up Cap System:**
- **Dynamic Cap:** Power-ups stop spawning when player reaches `startingLevel + 2`
  - Start at Level 1 → Cap at Level 3 (power-ups stop spawning)
  - Start at Level 2 → Cap at Level 4 (power-ups stop spawning)
  - Start at Level 3 → Cap at Level 5 (power-ups stop spawning)
  - Start at Level 4 → Cap at Level 6 (power-ups stop spawning)
- **Lucky Double-Upgrade:** If two power-ups spawn simultaneously (or close together), allow the double-upgrade even if it exceeds the cap
  - Example: At Level 2, two power-ups spawn → can reach Level 4 (lucky!)
- **Resume Spawning:** If player drops below cap (via power-down), resume power-up spawning
  - Example: At Level 3 (capped), hit power-down → Level 2 → power-ups resume spawning
- **Level 1 Boost (Precautionary):** Players starting at orb level 1 (default, no purchase) should have increased power-up spawn rate to ensure they can upgrade before the first boss
  - **Reason:** Fighting boss with level 1 orb is extremely difficult, especially when boss enrages
  - **Current Status:** No issues reported yet, but document for potential future adjustment
  - **Implementation (if needed):** If `game.projectileLevel === 1` and `game.bossesDefeated === 0`, increase power-up spawn probability
  - **Note:** This is a safeguard to ensure fair gameplay for non-purchasing players
- **Implementation:**
  - Track `game.startingOrbLevel` (set at game start)
  - Track `game.orbLevelCap` = `startingOrbLevel + 2`
  - In power-up spawn logic: Check if `game.projectileLevel >= game.orbLevelCap`
  - If at or above cap, don't spawn power-ups (but allow lucky double-spawns)
  - If below cap, spawn power-ups normally
  - **Future:** Monitor if Level 1 players struggle with first boss - if so, implement increased spawn rate for Level 1

**Implementation:**
- Stretch orb system from 6 levels to 10 levels
  - Redistribute power curve: Level 10 = current Level 6 power
  - Update projectile size calculation: `level * 8 + 16` (scales to 10)
  - Update auto-fire speed: `300 - (level - 1) * 50` (scales to 10)
- Modify `game.projectileLevel` initialization based on purchase
- Track `game.startingOrbLevel` for cap calculation
- Implement dynamic power-up spawn cap system
- Update projectile properties based on starting level
- Display in UI: "Starting with Orb Level X"

**Game Balance Impact:**
- **Stretched progression:** 10 levels instead of 6 (more granular progression)
- **Dynamic power-up cap:** Prevents excessive leveling, but allows lucky double-upgrades
- **Natural progression still valuable:** Players can still progress from purchased level to max (10) via power-ups
- **Purchased levels save time:** Skip early grind, but don't replace natural progression entirely

---

### 2.4 Slow Time Power
**Description:** Activate a power that slows game speed for a short duration.

**Levels:**
- **Level 1:** Slow time for 4 seconds (50% speed reduction)
- **Level 2:** Slow time for 6 seconds (50% speed reduction)
- **Level 3:** Slow time for 8 seconds (50% speed reduction)

**Max:** 1 use per game (all levels)

**Speed Affected:**
- **Affected:** `scrollSpeed` (visual/obstacle movement) and `enemySpeed` (enemy movement)
- **Not Affected:** `distanceSpeed` (boss timing remains consistent)
- **Speed Reduction:** All levels use 50% reduction (0.5x multiplier)

**Value Proposition:**
- Level 1 (4 seconds): Brief tactical advantage for dodging or positioning
- Level 2 (6 seconds): Moderate advantage, more time to react
- Level 3 (8 seconds): **More expensive** - Longer duration for extended advantage
- **Why purchase?** Provides tactical advantage during difficult moments (boss fights, dense enemy waves)
- **Pricing:** Less expensive than Force Field Level 3 or Extra Lives Level 3 (consumable power, one-time use)

**Implementation:**
- Add `game.slowTimePower` object with:
  - `usesRemaining: number` (1 for all levels)
  - `duration: number` (4, 6, or 8 seconds based on level)
  - `speedReduction: number` (0.5 for all levels - 50% reduction)
  - `active: boolean` (whether slow time is currently active)
  - `remainingTime: number` (time remaining in current activation)
- Add UI button (on-screen) and keyboard shortcut (e.g., Space, Q) for activation
  - **Mobile:** Touch button on screen
  - **Desktop:** Both button and keyboard shortcut
- Modify game speed calculation during activation:
  - `game.scrollSpeed *= 0.5` (temporary multiplier)
  - `game.enemySpeed *= 0.5` (temporary multiplier)
  - `game.distanceSpeed` remains unchanged (boss timing consistent)
- **No cooldown:** One-time use per game, no cooldown needed

**Visual Effect:**
- Screen tint/glow effect (e.g., blue/purple tint)
- Particle effects (time distortion particles)
- Audio cue (activation sound, ambient slow-time sound)
- UI indicator showing remaining time

**Game Balance Impact:**
- Provides tactical advantage without trivializing gameplay
- One-time use encourages strategic timing
- Longer durations at higher levels provide more value
- Less expensive than permanent advantages (Force Field, Extra Lives)

---

### 2.5 Destroy All Enemies Power
**Description:** Launch seeking missiles that automatically destroy all enemies on screen.

**Levels:**
- **Single Level:** Launch one seeking missile per enemy on screen. Each missile automatically destroys its target enemy. Regular score awarded (15 × enemy.type per enemy).

**Max:** 1 use per game

**Targeting:**
- **One missile per enemy:** Each enemy on screen gets exactly one missile
- **Closest enemy first:** Missiles target enemies starting with the closest to the player
- **Automatic destruction:** Missiles instantly destroy enemies on impact (no HP reduction needed)
- **Boss exclusion:** Power does NOT work on bosses (only regular enemies)

**Score:**
- **Regular score only:** Each destroyed enemy awards standard score (15 × enemy.type)
- **No score bonus:** No additional score multipliers or bonuses
- **No coins:** Destroyed enemies do NOT drop coins

**Value Proposition:**
- **Why purchase?** Clear the screen of all enemies instantly, providing breathing room during difficult moments
- **Strategic use:** Best used when overwhelmed by multiple enemies or to clear a path
- **Pricing:** Similar to Slow Time Level 3 (consumable power, one-time use, tactical advantage)

**Implementation:**
- Add `game.destroyAllPower` object with:
  - `usesRemaining: number` (1)
  - `active: boolean` (whether missiles are currently active)
  - `missiles: Array` (array of active missile objects)
- Create seeking missile system:
  - On activation, identify all enemies on screen (from both `tiles[].obstacles` and `enemies[]` array)
  - Sort enemies by distance to player (closest first)
  - Spawn one missile per enemy from player position
  - Each missile seeks its assigned target enemy
  - On impact, instantly destroy enemy (set `enemy.hp = 0` or remove from array)
  - Award regular score: `updateScore(15 * enemy.type)`
  - Track enemy defeat: `game.enemiesDefeated++`
  - Create explosion effect at impact point
- Add UI button (on-screen) and keyboard shortcut (e.g., E, X) for activation
  - **Mobile:** Touch button on screen
  - **Desktop:** Both button and keyboard shortcut
- **Boss check:** Before activation, check if boss is active. If boss is active, power still works but only affects regular enemies (not the boss).

**Visual Effects:**
- **Missile trails:** Visible trails following each missile
- **Explosion effects:** Individual explosion at each enemy impact point
- **Screen shake:** Subtle screen shake when missiles impact
- **Audio cues:**
  - Launch sound (when power activated)
  - Missile whoosh sound (during flight)
  - Explosion sound (on each impact)
  - Completion sound (when all missiles have hit)

**Game Balance Impact:**
- Provides tactical advantage without trivializing gameplay
- One-time use encourages strategic timing
- No score bonus keeps it balanced with other powers
- No coins prevents exploitation of coin streak system
- Boss exclusion maintains boss fight challenge

---

### 2.6 Boss Kill Shot
**Description:** Instant kill the current boss with a powerful screen-wide attack.

**Levels:**
- **Single Level:** Instant kill (100% damage) - Instantly defeats any boss regardless of remaining HP.

**Max:** 1 use per game

**Boss Compatibility:**
- **Works on all bosses:** Tier 1, Tier 2, Tier 3, and Tier 4 bosses
- **Activation requirement:** Only available when boss is active and in position (not during entrance animation)
- **Boss check:** Power is disabled if no boss is active or boss is still entering

**Score:**
- **Regular score only:** Awards standard boss defeat score (5000 × tier)
- **No score bonus:** No additional score multipliers or bonuses
- **Same as normal defeat:** Score is identical to defeating the boss through normal gameplay

**Value Proposition:**
- **Why purchase?** Instantly defeat any boss, saving time and avoiding difficult boss mechanics
- **Strategic use:** Best used on high-tier bosses (Tier 3-4) where the time investment is significant
- **Pricing:** **Most expensive** premium item (strongest power, instant boss defeat)

**Activation Flow:**
1. **Player activates power** (button/key press)
2. **Quick charge animation** (1-2 seconds):
   - Player stops auto-firing orbs
   - Visual charging effect around player
   - Audio: Charging sound
3. **Screen-wide flash** (instant):
   - Bright screen flash effect
   - Boss HP instantly set to 0
   - Boss defeat triggered immediately
4. **Boss defeat sequence** (normal):
   - Regular boss defeat animation
   - Victory particles
   - Score awarded (5000 × tier)
   - Audio: Boss defeat sound

**Implementation:**
- Add `game.bossKillShot` object with:
  - `usesRemaining: number` (1)
  - `charging: boolean` (whether charge animation is active)
  - `chargeTime: number` (time remaining in charge)
  - `chargeDuration: number` (total charge time, e.g., 1.5 seconds)
- **Activation check:**
  - Verify `game.bossActive === true`
  - Verify `game.boss.vulnerable === true` (boss is in position, not during entrance)
  - Verify `game.bossKillShot.usesRemaining > 0`
- **Charge sequence:**
  - Set `game.bossKillShot.charging = true`
  - Set `game.bossKillShot.chargeTime = chargeDuration`
  - **Stop auto-firing:** Temporarily disable player projectile spawning
  - Show charging visual effect (particles, glow around player)
  - Play charging audio
- **Execution (after charge completes):**
  - Set `game.bossKillShot.charging = false`
  - Set `game.bossKillShot.usesRemaining = 0`
  - **Instant damage:** Set `game.boss.hp = 0`
  - **Screen flash:** Create full-screen flash effect (white/colored overlay that fades quickly)
  - **Resume auto-firing:** Re-enable player projectile spawning
  - Boss defeat logic triggers normally (score, particles, music, etc.)
- Add UI button (on-screen) and keyboard shortcut (e.g., R, B) for activation
  - **Mobile:** Touch button on screen
  - **Desktop:** Both button and keyboard shortcut
  - **Button state:** Disabled/grayed out when boss is not active or during entrance

**Visual Effects:**
- **Charging phase:**
  - Particle effects around player (energy gathering)
  - Glow/pulse effect on player sprite
  - Screen darkening or vignette effect
- **Execution phase:**
  - **Screen-wide flash:** Bright white/colored flash covering entire screen
  - Flash fades quickly (0.2-0.5 seconds)
  - Boss defeat particles (normal boss defeat effect)
- **Audio cues:**
  - **Charging sound:** Energy building/charging audio
  - **Flash sound:** Powerful explosion/impact sound
  - **Boss defeat sound:** Normal boss defeat audio
  - **Victory music:** Normal boss victory music

**Game Balance Impact:**
- **Most powerful item:** Instant boss defeat is the strongest advantage
- **Time saver:** Especially valuable for high-tier bosses (Tier 3-4) that take 90-120 seconds
- **One-time use:** Encourages strategic timing (save for hardest bosses)
- **No score bonus:** Keeps leaderboard competitive (same score as normal defeat)
- **Most expensive:** Pricing reflects the power level

---

### 2.7 Coin Magnet / Pull Beam
**Description:** Activate a magnetic field that pulls coins (and power-ups at higher levels) toward the player automatically.

**Levels:**
- **Level 1:** 4 seconds duration, pulls coins from 30% of screen width
- **Level 2:** 6 seconds duration, pulls coins from 60% of screen width
- **Level 3:** 8 seconds duration, pulls coins and power-ups from 90% of screen width

**Max:** 1 use per game (all levels)

**Pull Mechanics:**
- **Pull speed:** Fast but not instant (coins move smoothly toward player)
- **Range calculation:** Distance from player position (X coordinate)
  - Level 1: Coins within 30% of screen width are pulled
  - Level 2: Coins within 60% of screen width are pulled
  - Level 3: Coins and power-ups within 90% of screen width are pulled
- **Targets:**
  - **Level 1-2:** Coins only
  - **Level 3:** Coins and power-ups (bonus feature)
- **Coin streak:** Pulled coins count toward coin streak (for force field activation)

**Value Proposition:**
- **Why purchase?** Automatically collect coins without precise positioning, building coin streak faster
- **Strategic use:** Best used when multiple coins are on screen or when focusing on dodging enemies
- **Level 3 bonus:** Power-up pulling provides additional value (collect power-ups while dodging)
- **Pricing:** Similar to Slow Time Level 3 (consumable power, one-time use, tactical advantage)

**Activation Flow:**
1. **Player activates power** (button/key press)
2. **Magnetic field activates** (instant):
   - Visual magnetic field effect appears
   - Pull particles start emitting
   - Audio: Magnet activation sound
3. **Coins/power-ups are pulled** (during duration):
   - Coins within range move toward player
   - Fast but smooth movement (not instant teleport)
   - Pull particles follow coins
   - Audio: Coin pull sound (continuous during active period)
4. **Collection occurs** (when coins reach player):
   - Normal coin collection logic triggers
   - Coin streak increments
   - Force field activation checked
   - Audio: Normal coin collection sound
5. **Power deactivates** (after duration):
   - Visual effect fades
   - Audio: Power deactivation sound

**Implementation:**
- Add `game.coinMagnet` object with:
  - `usesRemaining: number` (1)
  - `active: boolean` (whether magnet is currently active)
  - `duration: number` (4, 6, or 8 seconds based on level)
  - `remainingTime: number` (time remaining in current activation)
  - `level: number` (1, 2, or 3)
  - `range: number` (screen width percentage: 0.3, 0.6, or 0.9)
  - `pullSpeed: number` (pixels per frame, e.g., 8-12 pixels/frame)
- **Activation:**
  - Set `game.coinMagnet.active = true`
  - Set `game.coinMagnet.remainingTime = duration`
  - Calculate pull range: `pullRange = game.width * range`
  - Start visual effects (magnetic field particles)
  - Play activation audio
- **Update loop (each frame while active):**
  - Decrement `remainingTime`
  - For each coin in `tiles[]`:
    - Calculate distance from player: `distance = Math.abs(coinX - player.x)`
    - If `distance <= pullRange`:
      - Calculate direction to player
      - Move coin toward player: `coinX += directionX * pullSpeed`
      - Update coin position in tile
      - Emit pull particles along path
  - For Level 3, also pull power-ups (same logic)
  - When coin reaches player collision box, trigger normal collection
  - If `remainingTime <= 0`, deactivate magnet
- **Deactivation:**
  - Set `game.coinMagnet.active = false`
  - Set `game.coinMagnet.usesRemaining = 0`
  - Fade visual effects
  - Play deactivation audio
- Add UI button (on-screen) and keyboard shortcut (e.g., M, C) for activation
  - **Mobile:** Touch button on screen
  - **Desktop:** Both button and keyboard shortcut

**Visual Effects:**
- **Magnetic field effect:**
  - Circular or radial field around player (visible during active period)
  - Field color/intensity based on level (brighter at higher levels)
  - Pulsing/glowing effect
- **Pull particles:**
  - Particles emitted along the path of coins being pulled
  - Trail effect following coins toward player
  - Magnetic field lines (optional, subtle effect)
- **Coin movement:**
  - Smooth movement toward player (not instant)
  - Slight acceleration as coins get closer
  - Visual feedback when coin is being pulled

**Audio Cues:**
- **Activation sound:** Magnetic field activation (whoosh, energy sound)
- **Pull sound:** Continuous sound while coins are being pulled (subtle magnetic hum)
- **Collection sound:** Normal coin collection sound (when coins reach player)
- **Deactivation sound:** Power ending (fade out sound)

**Game Balance Impact:**
- **Convenience feature:** Makes coin collection easier without trivializing gameplay
- **Streak building:** Helps build coin streak faster for force field activation
- **Level 3 bonus:** Power-up pulling adds significant value
- **One-time use:** Encourages strategic timing (use when many coins on screen)
- **Pricing similar to Slow Time:** Reflects tactical advantage value

---

## 3. Game Balance Adjustments

### 3.1 Force Field Acquisition Difficulty

**Current System:**
- Coin streak: 5 → 10 → 15
- Force field activates at streak 5

**Proposed Changes:**
- **Coin streak requirement:** 7 → 12 → 18 (more difficult)
- **Force field drop rate:** Reduce by 30-40%
- **Force field durability:** Slightly reduce (make it more valuable)
- **Force field regeneration:** Remove or significantly slow

**Rationale:** If players can start with force field, earning it in-game should be harder to maintain value.

---

### 3.2 Orb Level System Expansion

**Current System:**
- 6 orb levels
- Power-ups appear frequently
- Easy to max out orb level

**Proposed Changes:**
- **Expand to 8-10 levels:**
  - Level 1-2: Early game (current Level 1)
  - Level 3-4: Mid game (current Level 2)
  - Level 5-6: Late game (current Level 3)
  - Level 7-8: End game (current Level 4-5)
  - Level 9-10: Max (current Level 6)
- **Reduce power-up frequency:**
  - Max 2 level increases per game level (tier)
  - Power-ups appear less frequently
  - Make each power-up more valuable
- **Stretch power curve:**
  - Smaller increments between levels
  - More gradual progression
  - Max power remains the same

**Implementation Details:**
```javascript
// Current: 6 levels
const ORB_LEVELS = 6;

// Proposed: 10 levels
const ORB_LEVELS = 10;

// Power curve mapping
const POWER_CURVE = {
  // New Level -> Old Level equivalent
  1: 1,   // Same
  2: 1,   // Same
  3: 2,   // Old level 2
  4: 2,   // Old level 2
  5: 3,   // Old level 3
  6: 3,   // Old level 3
  7: 4,   // Old level 4
  8: 5,   // Old level 5
  9: 6,   // Old level 6
  10: 6   // Old level 6 (max)
};
```

---

### 3.3 Power-Up Frequency Reduction

**Current:**
- Orb power-ups: ~1-2 per level
- Easy to progress

**Proposed:**
- **Orb power-ups:** ~0.5-1 per level (50% reduction)
- **Max progression:** 2 levels per game level (tier)
- **Strategic placement:** Power-ups appear at key moments
- **Rarity system:** Some power-ups are rarer/more valuable

**Implementation:**
- Modify enemy spawn logic
- Add power-up spawn probability system
- Track power-ups collected per tier
- Cap progression per tier

---

## 4. Technical Architecture

### 4.1 Smart Contract Design

**New Contract:** `premium_store.move`

**Functions:**
```move
// Purchase a premium item
public entry fun purchase_item(
    player: address,
    item_type: u8,      // 0=life, 1=force_field, 2=orb_level, etc.
    item_level: u8,     // 1, 2, 3, etc.
    payment_amount: u64, // Amount paid
    ctx: &mut TxContext
)

// Get player's active purchases for a game session
public fun get_player_purchases(
    player: address
): vector<Purchase>

// Use a consumable item (like slow time power)
public entry fun use_consumable(
    player: address,
    item_type: u8,
    session_id: vector<u8>,
    ctx: &mut TxContext
)
```

**Structs:**
```move
struct Purchase has store {
    player: address,
    item_type: u8,
    item_level: u8,
    purchase_time: u64,
    uses_remaining: u64, // For consumables
    active: bool,
}

struct PurchaseReceipt has copy, drop {
    player: address,
    item_type: u8,
    item_level: u8,
    amount_paid: u64,
    timestamp: u64,
}
```

**Events:**
```move
struct ItemPurchased has copy, drop {
    player: address,
    item_type: u8,
    item_level: u8,
    amount_paid: u64,
    timestamp: u64,
}

struct ItemUsed has copy, drop {
    player: address,
    item_type: u8,
    session_id: vector<u8>,
    timestamp: u64,
}
```

---

### 4.2 Backend API Routes

**New Routes:**

1. **`GET /api/store/items`**
   - Returns catalog of available items with prices
   - Response includes item types, levels, prices in SUI and $MEWS

2. **`POST /api/store/purchase`**
   - Process purchase
   - Request: `{ playerAddress, itemType, itemLevel, paymentMethod, paymentAmount }`
   - Validates payment
   - Calls smart contract
   - Returns purchase receipt

3. **`GET /api/store/purchases/:address`**
   - Get player's active purchases
   - Returns items available for next game

4. **`POST /api/store/use-item`**
   - Mark consumable item as used
   - Request: `{ playerAddress, itemType, sessionId }`
   - Updates on-chain state

---

### 4.3 Frontend Store UI

**Components:**

1. **Store Modal/Page**
   - Item catalog display
   - Price display (SUI and $MEWS)
   - Purchase buttons
   - Wallet connection check
   - Balance display

2. **Purchase Flow**
   - Select item and level
   - Confirm purchase
   - Process payment (wallet signature)
   - Show success/error
   - Update available items

3. **Game Start Integration**
   - Show available purchases before game start
   - Allow player to select which items to use
   - Apply items to game initialization

4. **In-Game Power UI**
   - Buttons for consumable powers (slow time, destroy all, boss kill)
   - Cooldown indicators
   - Use count display

---

### 4.4 Payment Processing

**Payment Methods:**
1. **SUI:** Direct SUI transfer
2. **$MEWS:** Token transfer

**Flow:**
1. User selects item and level
2. Frontend calculates price
3. Backend validates price (on-chain query)
4. User approves transaction in wallet
5. Payment processed on-chain
6. Purchase recorded in smart contract
7. Item added to player's inventory

**Gas Fees:**
- Purchase transactions: User pays (or admin sponsors?)
- Item usage: Admin wallet pays (part of game entry fee)

---

## 5. Purchase Analytics & Tracking

### 5.1 Data to Track

**For Each Purchase:**
- **Item Type:** `extraLives`, `forceField`, `orbLevel`, `slowTime`, `destroyAll`, `bossKillShot`
- **Item Level:** 1, 2, 3 (or 4 for orb level)
- **Player Address:** Wallet address of purchaser
- **Payment Amount:** Amount paid (in SUI or $MEWS)
- **Payment Method:** `SUI` or `MEWS`
- **Timestamp:** When purchase was made
- **Transaction Digest:** Sui transaction ID for verification

**Aggregate Metrics:**
- Total purchases per item type
- Total purchases per item level
- Total revenue per item type
- Total revenue per item level
- Average purchase price per item type
- Purchase frequency (purchases per day/week/month)
- Player purchase patterns (which items are bought together)
- Conversion rate (players who purchase vs. total players)

### 5.2 Storage Strategy

**On-Chain (Smart Contract Events):**
- **Primary Source of Truth:** All purchases emit `ItemPurchased` events on-chain
- **Event Structure:**
  ```move
  struct ItemPurchased has copy, drop {
      player: address,
      item_type: u8,        // 0=extraLives, 1=forceField, 2=orbLevel, etc.
      item_level: u8,        // 1, 2, 3, or 4
      amount_paid: u64,     // Amount in smallest unit (MIST for SUI, token decimals for $MEWS)
      payment_method: u8,   // 0=SUI, 1=MEWS
      timestamp: u64,
      transaction_digest: vector<u8>,  // Transaction ID for verification
  }
  ```
- **Benefits:** Immutable, verifiable, transparent, no single point of failure

**Backend Database (Optional, for Fast Queries):**
- **Purpose:** Fast analytics queries without scanning blockchain
- **Structure:** Mirror on-chain events in database
- **Sync:** Backend listens to on-chain events and updates database
- **Use Cases:** 
  - Real-time dashboards
  - Historical trend analysis
  - Player-specific purchase history
  - Revenue reporting

### 5.3 Reporting & Analytics

**Key Reports Needed:**

1. **Sales Report (By Item Type)**
   - Total purchases per item type
   - Revenue per item type
   - Average price per item type
   - Best/worst selling items

2. **Sales Report (By Item Level)**
   - Total purchases per level (Level 1, 2, 3)
   - Revenue per level
   - Which levels are most popular

3. **Revenue Report**
   - Total revenue (SUI + $MEWS equivalent)
   - Revenue by payment method (SUI vs $MEWS)
   - Daily/weekly/monthly revenue trends
   - Revenue per player (average)

4. **Player Behavior Report**
   - Purchase conversion rate (% of players who purchase)
   - Average purchases per purchasing player
   - Most common purchase combinations
   - Purchase frequency (one-time vs. repeat purchasers)

5. **Item Performance Report**
   - Which items are selling well vs. not selling
   - Price sensitivity analysis
   - Recommendations for pricing adjustments

**Query Methods:**

1. **On-Chain Queries (Primary):**
   - Query `ItemPurchased` events from smart contract
   - Filter by date range, item type, player address
   - Aggregate results in backend or frontend

2. **Backend API Endpoints (If Database Used):**
   - `GET /api/analytics/purchases` - All purchases with filters
   - `GET /api/analytics/revenue` - Revenue metrics
   - `GET /api/analytics/items` - Item performance metrics
   - `GET /api/analytics/players` - Player purchase patterns

### 5.4 Decision-Making Use Cases

**Pricing Adjustments:**
- If Level 3 items aren't selling → Consider lowering price
- If Level 1 items are selling too well → Consider raising price or adjusting value
- If certain items aren't selling → Consider removing or redesigning

**Inventory Management:**
- Track which items players actually want
- Identify underperforming items
- Plan future item additions based on demand

**Game Balance:**
- Monitor if purchased items are too powerful (affecting game balance)
- Track if free players are at a significant disadvantage
- Adjust game difficulty based on purchase patterns

**Marketing & Promotions:**
- Identify best-selling items for featured promotions
- Create bundles based on common purchase combinations
- Target promotions to non-purchasing players

**Revenue Optimization:**
- Identify peak purchase times
- Optimize pricing for maximum revenue
- Plan seasonal promotions or sales

### 5.5 Implementation Notes

**Smart Contract:**
- Ensure `ItemPurchased` event includes all necessary data
- Event should be queryable by date range, player, item type
- Consider adding event indexing for faster queries

**Backend:**
- Create event listener service to sync on-chain events to database
- Implement analytics API endpoints
- Create scheduled jobs for daily/weekly/monthly reports
- Store aggregated metrics for fast dashboard loading

**Frontend (Admin Dashboard):**
- Create analytics dashboard (admin-only)
- Display key metrics (revenue, top items, conversion rate)
- Allow filtering by date range, item type, player
- Export reports to CSV/JSON

**Privacy Considerations:**
- On-chain events are public (by design)
- Backend database should only store aggregated/anonymized data if needed
- Player-specific data should only be accessible to that player or admins

---

## 6. User Experience Flow

### 6.1 Purchase Flow

```
1. User clicks "Store" button on main menu
2. Store modal opens showing available items
3. User browses items and prices
4. User selects item and level
5. System checks wallet balance
6. If insufficient: Show error, suggest adding funds
7. If sufficient: Show purchase confirmation
8. User confirms purchase
9. Wallet prompts for signature
10. Transaction processes
11. Success: Item added to inventory
12. Error: Show error message
```

### 6.2 Game Start with Purchases

```
1. User clicks "Start Game"
2. System checks for available purchases
3. If purchases exist: Show "Select Items" screen
   - List available items
   - Allow selection (checkboxes)
   - Show total cost (if any additional fees)
4. User selects items to use
5. User confirms
6. Game initializes with selected items
7. Game starts
```

### 6.3 In-Game Power Usage

```
1. User has consumable power (slow time, destroy all, boss kill)
2. Power button appears in UI
3. User clicks button (or key binding)
4. System checks:
   - Uses remaining > 0?
   - Cooldown expired?
5. If valid: Activate power
6. Update uses remaining
7. Start cooldown timer
8. If invalid: Show error (no uses left, on cooldown)
```

---

## 7. Implementation Phases

**Note:** These are internal design phases. For the actual implementation roadmap, see [IMPLEMENTATION_ROADMAP.md](./IMPLEMENTATION_ROADMAP.md) Phase 5.2 (Premium Store System).

### Phase 1: Foundation (Week 1)
- [ ] Design smart contract structure
- [ ] Create store UI mockups
- [ ] Plan game balance changes
- [ ] Document pricing strategy

### Phase 2: Smart Contract (Week 2)
- [ ] Implement `premium_store.move` contract
- [ ] Add purchase functions
- [ ] Add inventory tracking
- [ ] Deploy to testnet
- [ ] Test purchase flow

### Phase 3: Backend API (Week 2-3)
- [ ] Create store API routes
- [ ] Implement payment processing
- [ ] Add purchase validation
- [ ] Test with smart contract

### Phase 4: Frontend Store (Week 3)
- [ ] Create store UI components
- [ ] Integrate wallet for payments
- [ ] Implement purchase flow
- [ ] Add inventory display

### Phase 5: Game Integration (Week 4)
- [ ] Implement game balance changes
- [ ] Add power-up systems
- [ ] Integrate purchased items
- [ ] Test game balance

### Phase 6: Testing & Polish (Week 5)
- [ ] End-to-end testing
- [ ] Balance tuning
- [ ] UI/UX polish
- [ ] Performance optimization

---

## 8. Game Balance Considerations

### 8.1 Pay-to-Win Concerns

**Mitigation Strategies:**
1. **Cap all purchases:** No item can exceed reasonable limits
2. **Skill still matters:** Purchases give advantages, not auto-win
3. **Free players viable:** Game still playable without purchases
4. **Progression balance:** Purchases accelerate, don't replace skill

### 8.2 Economic Balance

**Considerations:**
- Price items so they're valuable but not required
- Ensure free players can still compete
- Make purchases feel rewarding, not necessary
- Balance token economics (supply/demand)

### 8.3 Progression Balance

**Goals:**
- Purchases should feel like shortcuts, not cheats
- Maintain sense of achievement for earned progress
- Keep game challenging even with purchases
- Prevent purchases from trivializing gameplay

---

## 9. Open Questions & Decisions Needed

### 9.1 Payment Timing ✅ **DECIDED: Pre-Purchase Inventory System**

**Decision:** ✅ **Option B (Pre-purchase inventory system)**
- Players buy items and store in inventory
- Items persist across games
- Better UX (don't pay every game)
- Allows gift/transfer of items (future NFT system)
- More flexible
- **Future:** NFT system for inventory items

### 9.2 Gas Fee Strategy
- **Option A:** User pays for purchases (standard)
- **Option B:** Admin sponsors purchase transactions
- **Option C:** Include gas in item price

**Recommendation:** Option A (User pays for purchases)
- Standard blockchain UX
- Clear cost to user
- Admin only pays for game entry

### 9.3 Item Persistence
- **Option A:** Items persist across games (inventory)
- **Option B:** Items are single-use per purchase
- **Option C:** Hybrid (some persistent, some consumable)

**Recommendation:** Option C (Hybrid)
- Lives, Force Field, Orb Level: Single-use per game
- Consumable Powers: Can be used multiple times (with limits)

### 9.4 Max Purchase Limits ✅ **DECIDED**

**Decision:**
- **Per Game:** Only ONE item of each type can be used per game
- **Per Item Type:** Cannot stack multiple of same item type in a single game
- **Total Inventory:** Unlimited inventory (players can accumulate items)
- **Consumption:** Selected items are consumed from inventory when game starts
- **Visual Distinction:** Purchased items (like extra lives) display in different color (gold) vs base items (red)

---

## 10. Next Steps

1. **Review this document** - Discuss and refine design
2. **Finalize pricing** - Set actual prices in $MEWS/SUI
3. **Create mockups** - Design store UI/UX
4. **Prototype game balance** - Test balance changes in isolation
5. **Smart contract design review** - Finalize contract structure
6. **Begin implementation** - Start with Phase 1

---

## 10. Related Documents

- [Gas Fees & Payments](./05a-gas-fees-and-payments.md)
- [Smart Contracts](./05-smart-contracts.md)
- [Token Gatekeeping](./07-token-gatekeeping.md)
- [Backend Setup](./02-backend-setup.md)

---

**Status:** Ready for Review and Discussion

