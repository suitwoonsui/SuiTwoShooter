# Projectile Speed Scaling Options (Post-Tier 4)

This document calculates different scaling formulas for projectile speed increases after the 4th boss is defeated.

**Formula Format:** `multiplier = 1.0 + (bossesDefeated - 4) * increment`

---

## Option 1: +5% per boss (0.05 increment)
**Formula:** `1.0 + (bossesDefeated - 4) * 0.05`

| Bosses Defeated | Multiplier | Speed Example (Tier 4 Enemy: 8 → ?) |
|----------------|------------|--------------------------------------|
| 4 (no change) | 1.00x | 8.0 |
| 5 | 1.05x | 8.4 |
| 6 | 1.10x | 8.8 |
| 7 | 1.15x | 9.2 |
| 8 | 1.20x | 9.6 |
| 10 | 1.30x | 10.4 |
| 15 | 1.55x | 12.4 |
| 20 | 1.80x | 14.4 |

**Notes:** Gentle progression, takes 20 bosses to double speed (2.0x)

---

## Option 2: +8% per boss (0.08 increment)
**Formula:** `1.0 + (bossesDefeated - 4) * 0.08`

| Bosses Defeated | Multiplier | Speed Example (Tier 4 Enemy: 8 → ?) |
|----------------|------------|--------------------------------------|
| 4 (no change) | 1.00x | 8.0 |
| 5 | 1.08x | 8.6 |
| 6 | 1.16x | 9.3 |
| 7 | 1.24x | 9.9 |
| 8 | 1.32x | 10.6 |
| 10 | 1.48x | 11.8 |
| 15 | 1.88x | 15.0 |
| 20 | 2.28x | 18.2 |

**Notes:** Moderate progression, doubles speed around boss 13

---

## Option 3: +10% per boss (0.10 increment)
**Formula:** `1.0 + (bossesDefeated - 4) * 0.10`

| Bosses Defeated | Multiplier | Speed Example (Tier 4 Enemy: 8 → ?) |
|----------------|------------|--------------------------------------|
| 4 (no change) | 1.00x | 8.0 |
| 5 | 1.10x | 8.8 |
| 6 | 1.20x | 9.6 |
| 7 | 1.30x | 10.4 |
| 8 | 1.40x | 11.2 |
| 10 | 1.60x | 12.8 |
| 15 | 2.10x | 16.8 |
| 20 | 2.60x | 20.8 |

**Notes:** Faster progression, doubles speed at boss 10, triples at boss 24

---

## Option 4: +12% per boss (0.12 increment)
**Formula:** `1.0 + (bossesDefeated - 4) * 0.12`

| Bosses Defeated | Multiplier | Speed Example (Tier 4 Enemy: 8 → ?) |
|----------------|------------|--------------------------------------|
| 4 (no change) | 1.00x | 8.0 |
| 5 | 1.12x | 9.0 |
| 6 | 1.24x | 9.9 |
| 7 | 1.36x | 10.9 |
| 8 | 1.48x | 11.8 |
| 10 | 1.72x | 13.8 |
| 15 | 2.32x | 18.6 |
| 20 | 2.92x | 23.4 |

**Notes:** Aggressive progression, doubles speed at boss 9

---

## Option 5: Square root scaling (slower start, faster later)
**Formula:** `1.0 + Math.sqrt(bossesDefeated - 4) * 0.15`

| Bosses Defeated | Multiplier | Speed Example (Tier 4 Enemy: 8 → ?) |
|----------------|------------|--------------------------------------|
| 4 (no change) | 1.00x | 8.0 |
| 5 | 1.15x | 9.2 |
| 6 | 1.21x | 9.7 |
| 7 | 1.26x | 10.1 |
| 8 | 1.30x | 10.4 |
| 10 | 1.37x | 11.0 |
| 15 | 1.49x | 11.9 |
| 20 | 1.60x | 12.8 |

**Notes:** Starts faster, then slows down. More gradual long-term

---

## Option 6: Logarithmic scaling (fast start, slower later)
**Formula:** `1.0 + Math.log(bossesDefeated - 3) * 0.3`

| Bosses Defeated | Multiplier | Speed Example (Tier 4 Enemy: 8 → ?) |
|----------------|------------|--------------------------------------|
| 4 (no change) | 1.00x | 8.0 |
| 5 | 1.22x | 9.8 |
| 6 | 1.36x | 10.9 |
| 7 | 1.46x | 11.7 |
| 8 | 1.54x | 12.3 |
| 10 | 1.68x | 13.4 |
| 15 | 1.89x | 15.1 |
| 20 | 2.05x | 16.4 |

**Notes:** Fast initial growth, then levels off

---

## Boss Projectile Speed Examples

**Boss Tier 4 Base Projectile Speed:** 9 (normal), 13.5 (enraged)

### Using +8% per boss (Option 2):
| Bosses Defeated | Normal Boss Projectiles | Enraged Boss Projectiles |
|----------------|------------------------|--------------------------|
| 4 | 9.0 | 13.5 |
| 5 | 9.7 | 14.6 |
| 10 | 13.3 | 20.0 |
| 15 | 16.9 | 25.4 |
| 20 | 20.5 | 30.8 |

---

## Recommendations

**For Balanced Difficulty:**
- **Option 2 (+8%)**: Good middle ground, noticeable but not overwhelming
- **Option 3 (+10%)**: More aggressive, good for players who want faster scaling

**For Slow, Gradual Increase:**
- **Option 1 (+5%)**: Very gentle, good for long play sessions
- **Option 5 (Square root)**: Starts noticeable, then slows down

**For Fast Initial Challenge:**
- **Option 4 (+12%)**: Aggressive, doubles quickly
- **Option 6 (Logarithmic)**: Fast start, then stabilizes

---

## Implementation Suggestion

Create a helper function:
```javascript
function getProjectileSpeedMultiplier() {
  if (game.bossesDefeated <= 4) {
    return 1.0; // No change for first 4 bosses
  }
  // Choose one of the formulas above
  return 1.0 + (game.bossesDefeated - 4) * 0.08; // Option 2 example
}
```

Then apply to:
- Enemy projectiles: `speed * getProjectileSpeedMultiplier()`
- Boss projectiles: `projectileSpeed * getProjectileSpeedMultiplier()`

