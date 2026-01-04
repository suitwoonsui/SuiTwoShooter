# Game Statistics Summary

## All Stats Tracked in Game

### **Core Gameplay Stats** (Always tracked)
1. **`score`** - Total game score ✅ **INCLUDED IN CONTRACT**
2. **`distance`** - Distance traveled ✅ **INCLUDED IN CONTRACT**
3. **`coins`** - Coins collected ✅ **INCLUDED IN CONTRACT**
4. **`bossesDefeated`** - Number of bosses defeated ✅ **INCLUDED IN CONTRACT**
5. **`enemiesDefeated`** - Number of enemies defeated ✅ **INCLUDED IN CONTRACT**
6. **`longest_coin_streak`** - Longest consecutive coin streak (`game.forceField.maxStreak`) ✅ **INCLUDED IN CONTRACT**
7. **`timestamp`** - When score was submitted ✅ **INCLUDED IN CONTRACT**

### **Game State Stats** (For gameplay mechanics, reset each game)
8. **`currentTier`** - Current game tier (1-4) ❌ **EXCLUDED** (metadata, not needed for validation)
9. **`lives`** - Lives remaining ❌ **EXCLUDED** (game state, not needed for validation)
10. **`projectileLevel`** - Magic orb level (1-6) ❌ **EXCLUDED** (resets at game start, not needed)
11. **`bossTiers[]`** - Array of tiers for each boss defeated ❌ **EXCLUDED** (can calculate from bosses_defeated if needed)

### **Force Field Stats** (Subset tracked)
12. **`forceField.coinStreak`** - Current coin streak (resets when hit) ❌ **EXCLUDED** (current state)
13. **`forceField.maxStreak`** - Longest streak achieved ✅ **INCLUDED IN CONTRACT** (as `longest_coin_streak`)
14. **`forceField.level`** - Force field level (0, 1, 2) ❌ **EXCLUDED** (game state, can calculate from streak)

### **Internal/Technical Stats** (Not displayed or submitted)
15. **`distanceSinceBoss`** - Distance traveled since last boss ❌ **EXCLUDED** (internal tracking)
16. **`bossActive`** - Whether boss is currently active ❌ **EXCLUDED** (game state)
17. **`gameRunning`** - Whether game is running ❌ **EXCLUDED** (game state)
18. **`gameOver`** - Whether game is over ❌ **EXCLUDED** (game state)
19. **`paused`** - Whether game is paused ❌ **EXCLUDED** (game state)

---

## Summary

### ✅ **INCLUDED IN SMART CONTRACT** (7 stats)
1. `score` - Core metric for leaderboard
2. `distance` - Used for validation & display
3. `coins` - Used for score validation & performance burn
4. `bosses_defeated` - Used for score validation & performance burn
5. `enemies_defeated` - Used for performance burn calculation
6. `longest_coin_streak` - Achievement metric & force field indicator
7. `timestamp` - When score was submitted (for leaderboard sorting)

### ❌ **EXCLUDED FROM SMART CONTRACT** (12+ stats)

**Reason: Game State (Resets Each Game)**
- `currentTier` - Just metadata, doesn't affect score validation
- `lives` - Game state, not needed for score validation
- `projectileLevel` - Resets at game start, not persistent
- `forceField.coinStreak` - Current state, only maxStreak matters
- `forceField.level` - Can be calculated from maxStreak

**Reason: Internal Tracking**
- `bossTiers[]` - Array of tiers per boss (can calculate if needed)
- `distanceSinceBoss` - Internal tracking for boss spawning
- `bossActive`, `gameRunning`, `gameOver`, `paused` - Game state flags

**Reason: Not Needed for Validation**
- All excluded stats don't affect score validation
- Score validation already ensures legitimacy via score, coins, bosses, distance

---

## Contract Stats Breakdown

**For Score Validation:**
- `score` - Must match coins + bosses + distance
- `coins` - Validated against score
- `bosses_defeated` - Validated against score
- `distance` - Minimum distance check

**For Performance Burn (Phase 5):**
- `enemies_defeated` - Used for burn calculation
- `bosses_defeated` - Used for burn calculation
- `coins` - Used for burn calculation
- `distance` - Used for burn calculation
- `longest_coin_streak` - Achievement metric

**For Leaderboard Display:**
- All included stats are displayed on leaderboard

---

## Notes

- **Minimal but Complete**: Contract includes only what's needed for validation and burn calculation
- **No Game State**: Contract doesn't store temporary game state (lives, projectile level, etc.)
- **Future-Proof**: Stats included support both score validation and performance burn features

