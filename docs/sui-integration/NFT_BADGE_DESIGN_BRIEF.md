# NFT Badge System - Design Brief for Artist

## Overview

Design 6 tier-specific badge images for an Early Supporter NFT badge system. Each badge features the game's iconic Blue Orb as the central element, with visual progression from simple to elaborate across tiers.

**Deliverables**: 6 badge images (one per tier)
- Starter
- Common
- Uncommon
- Rare
- Epic
- Legendary

**Format**: 512x512px WebP
**Target File Size**: <200KB per image (optimized for on-chain storage)

---

## Core Design Elements

### Central Element: Blue Orb
- **Asset**: Use `assets/Blue_Orb_Shot.webp` from the game
- **Size**: 45% of hexagon width (optimal size)
- **Position**: Centered in hexagonal badge
- **Appearance**: Maintain orb's original blue, glowing appearance
- **Optional**: Subtle tier-specific color tint overlay (preserves original look)

### Badge Shape
- **Shape**: Hexagonal frame
- **Style**: Modern, tech-forward design
- **Frame Thickness**: Consistent across all tiers (same thickness)

---

## Color Schemes by Tier

### 1. Starter (Gray/Silver)
- **Base**: #808080 (Gray) or #C0C0C0 (Silver)
- **Accent**: #FFFFFF (White highlights)
- **Effect**: Subtle metallic sheen

### 2. Common (Sui Blue)
- **Base**: #4DA2FF (Sui Blue - Primary Brand Color)
- **Accent**: #3A7BD5 (Sui Blue - Secondary/Darker)
- **Effect**: Gentle glow
- **Note**: Uses official Sui blue from game's color scheme

### 3. Uncommon (Green)
- **Base**: #50C878 (Emerald Green)
- **Accent**: #90EE90 (Light Green)
- **Effect**: Moderate glow with particle effects

### 4. Rare (Deep Purple)
- **Base**: #6A1B9A (Deep/Dark Purple)
- **Accent**: #9B59B6 (Medium Purple)
- **Effect**: Strong glow with static particles (in image)
- **Note**: Deep/dark purple for more dramatic, rare appearance

### 5. Epic (Orange/Red)
- **Base**: #FF6B35 (Orange-Red)
- **Accent**: #FFA500 (Orange)
- **Effect**: Strong glow with static particles (in image)

### 6. Legendary (Gold/Rainbow - Neo Tokyo)
- **Base**: #FFD700 (Gold)
- **Accent**: Full Spectrum Rainbow with Neo Tokyo Aesthetic
  - **Gradient**: Red → Orange → Yellow → Green → Cyan → Sui Blue → Deep Purple → Neon Magenta
  - **Colors**:
    - Red: #FF0000 (Neon Red)
    - Orange: #FF6B35 (Matches Epic tier)
    - Yellow: #FFD700 (Matches Gold base)
    - Green: #39FF14 (Market Green - matches game accent)
    - Cyan: #00FFFF (Electric Cyan - neon cyberpunk)
    - Sui Blue: #4DA2FF (Sui Blue - matches brand)
    - Deep Purple: #6A1B9A (Deep Purple - matches Rare tier)
    - Neon Magenta: #FF00FF (Neon Magenta - cyberpunk end)
- **Effect**: Intense neon glow, cyberpunk-style rainbow particle trail (static in image)
- **Theme**: Full spectrum rainbow with neo Tokyo cyberpunk aesthetic - emphasizes blues and purples with neon magenta

---

## Trail Design

### Pattern Type
- **Style**: Spiral (complements game's directional trail, NO arc)
- **Position**: Behind orb for lower tiers, combination (behind + around) for higher tiers
- **Progression**: Simple spiral behind → Complex spiral wrapping around

### Tier-Specific Trail Specifications

**Starter**: Short, subtle spiral trail (gray/silver, 2-3 segments)
- Simple spiral behind orb
- Minimal curvature, directional trail effect

**Common**: Medium spiral trail (Sui blue, 4-5 segments)
- Spiral behind orb with gentle curvature
- More pronounced than Starter, still primarily behind

**Uncommon**: Longer spiral trail (green, 6-7 segments)
- Spiral behind orb with more pronounced curvature
- Trail extends further, more dynamic

**Rare**: Extended spiral trail (deep purple, 8-10 segments)
- Spiral behind orb, begins to wrap slightly around sides
- More complex spiral pattern, trail extends around orb edges

**Epic**: Dramatic spiral trail (orange/red, 10-12 segments)
- Complex spiral that wraps around orb (combination: behind + around)
- Trail flows behind and curves around orb sides
- More dynamic, full spiral effect

**Legendary**: Maximum spiral trail (gold/rainbow, 12+ segments)
- Full spiral wrapping around orb (behind + around combination)
- Complete spiral effect with trail flowing behind and around orb
- Maximum complexity with rainbow gradient and particles

**Trail Color**: Use tier-specific color from color scheme above
**Trail Style**: Static in image (no animation) - rendered as part of the static image file

---

## Badge Frame Design

### Frame Design Principles
- **Frame Thickness**: Consistent across all tiers (same thickness)
- **Layering**: Single frame layer (keep it simple, no multiple layers)
- **Progression**: Clean, minimal frames at lower tiers → Neo Tokyo cyberpunk aesthetic at higher tiers
- **Designer Freedom**: You choose specific corner decorations and edge patterns (see options below)

### Tier-Specific Frame Design

**Starter**: Simple hexagonal frame, gray/silver, minimal decoration, clean edges
- Clean, minimal aesthetic
- No decorative elements or patterns
- Simple, unadorned hexagon

**Common**: Slightly ornate hexagon, Sui blue accents, simple border pattern, subtle corner details
- Clean aesthetic with subtle details
- Simple border pattern (your choice)
- Subtle corner decorations (your choice)

**Uncommon**: More decorative hexagon, green accents, geometric patterns along edges, corner embellishments
- More decorative than Common
- Geometric patterns along edges (your choice)
- Corner embellishments (your choice)

**Rare**: Ornate hexagonal frame, deep purple accents, complex geometric patterns, decorative corner elements
- More ornate than Uncommon
- Complex geometric patterns (your choice)
- Decorative corner elements (your choice)

**Epic**: Highly ornate hexagon, orange/red accents, intricate edge designs, elaborate corner decorations
- **Neo Tokyo aesthetic begins**: Incorporate cyberpunk elements
- Intricate edge designs with neo Tokyo style (circuit patterns, neon lines, tech details)
- Elaborate corner decorations with cyberpunk aesthetic

**Legendary**: Maximum ornamentation, gold/rainbow accents, elaborate decorative elements, neo Tokyo cyberpunk style
- **Full neo Tokyo aesthetic**: Maximum cyberpunk/neo Tokyo elements
- Elaborate decorative elements with neo Tokyo style
- Circuit patterns, neon accents, tech details, cyberpunk aesthetic
- Rainbow gradient accents (from color scheme)

### Corner Decoration Options (Your Choice)
- ✅ **Geometric shapes**: Small hexagons, triangles, circles, squares at corners
- ✅ **Gems/Crystals**: Small gem or crystal shapes at corners
- ✅ **Orbs**: Small orb shapes at corners (matches central orb theme)
- ✅ **Tech elements**: Small tech/cyberpunk elements (circuits, nodes, connectors)
- ❌ **Spikes**: Not desired - avoid spike designs

### Edge Pattern Options (Your Choice)
- ✅ **Lines**: Parallel lines, diagonal lines, crosshatch patterns
- ✅ **Dots**: Dot patterns, dotted lines, point patterns
- ✅ **Triangles**: Triangle patterns, triangular shapes
- ✅ **Hexagons**: Hexagonal patterns (matches frame shape)
- ✅ **Circuit patterns**: For Epic/Legendary - circuit board style patterns
- ✅ **Neon lines**: For Epic/Legendary - neon-style glowing lines

### Neo Tokyo Elements (Epic & Legendary)
- Circuit board patterns
- Neon-style glowing lines/accents
- Tech/cyberpunk details
- Futuristic geometric patterns
- Blue/purple neon aesthetic (matches color scheme)

---

## Particle Effects

### Epic Tier: Static particles around orb (orange/red theme)
- **Particle style**: Small glowing particles, sparks, or energy fragments
- **Color**: Orange/red to match tier theme
- **Distribution**: Around orb, not too dense
- **Effect**: Adds energy/dynamic feel without overwhelming

### Legendary Tier: Static particles around orb (gold/rainbow theme)
- **Particle style**: More particles than Epic, can include rainbow-colored particles
- **Color**: Gold base with rainbow accents (matching gradient)
- **Distribution**: More dense than Epic, creates more dramatic effect
- **Effect**: Maximum visual impact, prestigious appearance

**Design Notes**:
- All particles are static in the image (no animation)
- Particles should complement the orb, not obscure it
- Style should match neo Tokyo aesthetic for Legendary
- You can choose specific particle shapes/styles (sparks, energy fragments, glowing dots, etc.)

---

## Visual Hierarchy

1. **Orb** (center, most prominent)
2. **Trail** (behind orb, tier-colored)
3. **Frame** (outer edge, tier-styled)
4. **Glow** (outermost, tier-colored)
5. **Particles** (around orb, Epic/Legendary only)

---

## Design Progression Summary

**Lower Tiers (Starter, Common, Uncommon)**:
- Clean, minimal aesthetic
- Simple spiral trail behind orb
- Minimal frame decoration
- No particles

**Mid Tiers (Rare)**:
- More ornate design
- Trail begins to wrap around orb
- More complex frame patterns
- No particles

**Higher Tiers (Epic, Legendary)**:
- Neo Tokyo cyberpunk aesthetic
- Full spiral trail wrapping around orb
- Elaborate frame with cyberpunk elements
- Particle effects around orb
- Maximum visual complexity

---

## Technical Specifications

### Image Requirements
- **Resolution**: 512x512px
- **Format**: WebP (for best compression)
- **File Size Target**: <200KB per image (optimized for on-chain storage)
- **Color Space**: RGB
- **Transparency**: Supported (WebP supports transparency)

### Export Settings
- Optimize compression to target <200KB per image
- Test file size before final delivery
- Ensure images are crisp and clear at 512x512px
- Images will be displayed in wallets/NFT galleries (primary viewing location)

---

## Design References

### Game Theme
- **Neo Tokyo cyberpunk aesthetic**: Blues and purples with neon accents
- **Game asset**: Blue Orb (`Blue_Orb_Shot.webp`) - use this as central element
- **Color scheme**: Sui blue (#4DA2FF) and market green (#39FF14) are brand colors

### Trail Reference
- Game uses directional trail effect
- Trail should complement game's trail aesthetic
- Spiral pattern (not arc) to match game's directional movement

---

## Questions or Clarifications?

If you need any clarification on:
- Color specifications
- Trail design details
- Frame decoration options
- Particle effects
- Neo Tokyo aesthetic elements
- File format or size requirements

Please reach out for discussion. You have creative freedom within these specifications!

---

## Deliverables Checklist

- [ ] Starter tier badge (512x512px WebP, <200KB)
- [ ] Common tier badge (512x512px WebP, <200KB)
- [ ] Uncommon tier badge (512x512px WebP, <200KB)
- [ ] Rare tier badge (512x512px WebP, <200KB)
- [ ] Epic tier badge (512x512px WebP, <200KB)
- [ ] Legendary tier badge (512x512px WebP, <200KB)

All images should be optimized and ready for on-chain storage.

