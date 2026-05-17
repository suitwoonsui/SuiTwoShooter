# NFT Badge System - Planning Document

## 📋 Executive Summary

This document outlines the design and implementation plan for a dynamic NFT badge system that rewards early supporters and long-term players. The badge serves as a collectible, status symbol, and utility token that provides increasing benefits as players progress through the game.

**Status**: Planning Complete - Ready for Implementation  
**Last Updated**: November 2025  
**Sui Documentation Verified**: ✅ Yes - Storage model and dynamic NFT capabilities confirmed  
**All Critical Decisions**: ✅ Complete

---

## ✅ Verified Understanding (Sui Documentation Review)

**Sui's Object-Centric Architecture**:
- ✅ NFTs are stored **completely on-chain** as Sui objects (verified)
- ✅ Sui's object-centric model is a key differentiator from account-based chains
- ✅ Each NFT is a distinct object with unique attributes stored on-chain
- ✅ **Dynamic NFTs** are a core strength - objects can be updated on-chain

**Storage Model**:
- ✅ Sui supports **both** on-chain and off-chain image storage (flexibility for developers)
- ✅ On-chain storage is economically viable due to **Storage Fund** mechanism
- ✅ Storage Fund compensates validators, making on-chain storage sustainable
- ✅ **Sui object size limit: 256KB total** (includes all object data: metadata + image + fields)
- ✅ Sui Object Display standard uses `image_url` field for off-chain references
- ✅ **Image format matters**: WebP provides 25-35% better compression than PNG for on-chain storage

**Dynamic NFT Capabilities**:
- ✅ Objects can be updated on-chain (tier upgrades, image changes)
- ✅ Updates are atomic transactions - tier and image update together
- ✅ No separate metadata updates needed - everything in one object
- ✅ True dynamic NFTs are a core strength of Sui's architecture

**Soulbound Tokens (Non-Transferable)**:
- ✅ Sui supports soulbound tokens by omitting `store` ability from struct
- ✅ Objects with only `key` ability (no `store`) cannot be transferred
- ✅ Prevents trading, selling, or transferring badges
- ✅ Badges are permanently bound to original owner's wallet

**Key Insight**: Sui provides flexibility - developers can choose on-chain storage (for true decentralization and composability) or off-chain storage (for cost efficiency with large files), while still benefiting from dynamic NFT capabilities in both cases.

---

## 🎯 Core Concept

### Overview
- **Purpose**: Reward early supporters and incentivize continued gameplay
- **Type**: Dynamic NFT (dNFT) that evolves based on player activity
- **Minting**: Automatic minting for first-time players
- **Evolution**: Badge rarity and appearance change based on games played
- **Utility**: Higher-tier badges provide discounts and gameplay benefits
- **Transferability**: **Non-tradable (Soulbound)** - Badges are permanently bound to the original owner

### Key Features
1. **Early Supporter Recognition**: First-time players receive a commemorative NFT
2. **Progressive Rarity**: Badge evolves from Starter → Common → Uncommon → Rare → Epic → Legendary
3. **Visual Evolution**: Color and design change to reflect current tier
4. **Utility Benefits**: Discounts on store purchases and gameplay features
5. **On-Chain Verification**: All progression tracked on Sui blockchain
6. **Soulbound (Non-Tradable)**: Badges cannot be transferred or sold - permanently bound to owner

---

## 🏆 Badge Tier System

### Tier Progression Structure

| Tier | Games Played | Rarity Level | Color Theme | Store Discount | Gameplay Discount |
|------|--------------|--------------|-------------|----------------|-------------------|
| **Starter** | 1-5 | Common | Gray/Silver | 0% | 0% |
| **Common** | 6-15 | Common+ | Blue | 5% | 0% |
| **Uncommon** | 16-35 | Uncommon | Green | 10% | 5% |
| **Rare** | 36-75 | Rare | Purple | 15% | 10% |
| **Epic** | 76-149 | Epic | Orange/Red | 20% | 15% |
| **Legendary** | 150+ | Legendary | Gold/Rainbow | 25% | 20% |

### Tier Thresholds (DECIDED)

**Decision**: ✅ **Option A - Faster Progression with Extremely Rare Legendary**

**Rationale**:
- **MVP Context**: No player data available, so starting with faster progression for early tiers
- **Early Engagement**: Quick progression through Starter → Common → Uncommon rewards early players
- **Accessible Mid-Tiers**: Rare and Epic are achievable for dedicated players
- **Rare Legendary**: 150+ games makes Legendary exclusive and prestigious without being unattainable
- **Adjustable**: Can fine-tune based on actual player data after launch

**Final Thresholds**:
- **Starter**: 1-5 games (Entry level, everyone starts here - very quick first upgrade)
- **Common**: 6-15 games (Early engagement reward - fast progression)
- **Uncommon**: 16-35 games (Regular player recognition - accessible)
- **Rare**: 36-75 games (Dedicated player status - achievable milestone)
- **Epic**: 76-149 games (Hardcore player badge - significant commitment)
- **Legendary**: 150+ games (Elite supporter status - rare and prestigious)

**Progression Analysis**:
- **Starter → Common**: 5 games (very fast, immediate reward)
- **Common → Uncommon**: 10 games (fast, keeps engagement)
- **Uncommon → Rare**: 20 games (moderate, feels achievable)
- **Rare → Epic**: 40 games (moderate, dedicated players)
- **Epic → Legendary**: 74 games (slow, exclusive but achievable)
- **Total to Legendary**: 150 games (elite status)

### Alternative Threshold Options (Reference - Not Selected)

**Note**: These were considered but not selected. Final decision is documented above.

**Option B - Slower Progression** (More exclusive):
- Starter: 1-15
- Common: 16-35
- Uncommon: 36-75
- Rare: 76-150
- Epic: 151-300
- Legendary: 301+

**Option C - Exponential Scaling** (Rewards long-term players):
- Starter: 1-10
- Common: 11-30
- Uncommon: 31-60
- Rare: 61-120
- Epic: 121-250
- Legendary: 251+

---

## 🎨 Visual Design System

### Color Progression

Each tier should have a distinct visual identity:

1. **Starter (Gray/Silver)**
   - Base: #808080 (Gray) or #C0C0C0 (Silver)
   - Accent: #FFFFFF (White highlights)
   - Effect: Subtle metallic sheen

2. **Common (Blue)** ✅ **UPDATED**
   - Base: #4DA2FF (Sui Blue - Primary Brand Color)
   - Accent: #3A7BD5 (Sui Blue - Secondary/Darker)
   - Effect: Gentle glow
   - **Note**: Uses official Sui blue from game's color scheme

3. **Uncommon (Green)**
   - Base: #50C878 (Emerald Green)
   - Accent: #90EE90 (Light Green)
   - Effect: Moderate glow with particle effects

4. **Rare (Purple)** ✅ **UPDATED**
   - Base: #6A1B9A (Deep/Dark Purple)
   - Accent: #9B59B6 (Medium Purple)
   - Effect: Strong glow with static particles (in image)
   - **Note**: Deep/dark purple for more dramatic, rare appearance

5. **Epic (Orange/Red)**
   - Base: #FF6B35 (Orange-Red)
   - Accent: #FFA500 (Orange)
   - Effect: Strong glow with static particles (in image)

6. **Legendary (Gold/Rainbow - Neo Tokyo)** ✅ **DECIDED**
   - Base: #FFD700 (Gold)
   - Accent: **Full Spectrum Rainbow with Neo Tokyo Aesthetic**
     - **Final Gradient**: Red → Orange → Yellow → Green → Cyan → Sui Blue → Deep Purple → Neon Magenta
     - **Color Breakdown**:
       - **Total colors**: 8 (streamlined from 9)
       - **Warm colors**: Red, Orange, Yellow (3)
       - **Neutral**: Green (1)
       - **Cool colors**: Cyan, Sui Blue, Deep Purple, Neon Magenta (4)
       - **Balance**: 4 warm/neutral, 4 cool (better balance while maintaining neo Tokyo emphasis)
   
   **Final color palette** (with neo Tokyo emphasis):
     - Red: #FF0000 (Neon Red)
     - Orange: #FF6B35 (Matches Epic tier)
     - Yellow: #FFD700 (Matches Gold base)
     - Green: #39FF14 (Market Green - matches game accent)
     - Cyan: #00FFFF (Electric Cyan - neon cyberpunk)
     - Sui Blue: #4DA2FF (Sui Blue - matches brand, removed redundant Royal Blue)
     - Deep Purple: #6A1B9A (Deep Purple - matches Rare tier)
     - Neon Magenta: #FF00FF (Neon Magenta - cyberpunk end)
   
   - Effect: Intense neon glow, cyberpunk-style rainbow particle trail (static in image)
   - **Theme**: Full spectrum rainbow with neo Tokyo cyberpunk aesthetic - emphasizes blues and purples with neon magenta
   - **Note**: All effects are static in the NFT image - no animation in the NFT itself
   - **Decision**: Removed Royal Blue (#4169E1) as redundant with Sui Blue, keeping streamlined 8-color full spectrum

### Badge Design Elements

**Core Concept**: The badge should feature the game's iconic **Blue Orb** (`assets/Blue_Orb_Shot.webp`) as the central element, surrounded by a badge frame that evolves with tier progression.

**Base Structure**:
- **Badge Shape**: **Hexagonal frame** - Modern, tech-forward design that complements the game's aesthetic
- **Central Element**: Blue Orb image from the game (`Blue_Orb_Shot.webp`)
- **Trail Effect**: Orb trail rendered behind/around the orb (see Trail Options below)
- **Tier Frame**: Hexagonal border that changes color and complexity with tier
- **Tier Glow**: Outer glow effect matching tier color (can extend beyond hexagon edges)
- **Optional Elements**: 
  - Small game count indicator (subtle, in corner)
  - Tier name text (optional, may clutter design)

**Orb Integration**:
- Use the actual game asset: `assets/Blue_Orb_Shot.webp`
- Orb should be centered in the hexagonal badge

**Orb Size** ✅ **DECIDED**:
- **Size**: 40-50% of hexagon width (or 35-45% of hexagon height)
- **Recommendation**: Use 45% of hexagon width as optimal size
- Maintain orb's original appearance (blue, glowing)
- Orb may have tier-specific color tint overlay (subtle, preserves original look)
- Orb should fit comfortably within hexagon with space for trail and frame elements

**NFT Animation Support - Technical Background**:

**Can NFTs Support Animation?**
- **Yes**, NFTs can support animation, but with important caveats:
  - **Method 1**: `animation_url` field in metadata pointing to animated content (MP4, WEBM, GLB, HTML, animated GIF/WebP)
  - **Method 2**: Animated image formats (animated GIF, animated WebP) stored directly as the image
  - **Viewer Support**: Varies widely - many wallets/viewers don't support animations or only show first frame
  - **On-Chain Storage**: Animated formats are significantly larger (2-10x file size), making 256KB limit very constraining
  - **Compatibility**: Static images have universal support; animations are hit-or-miss

**For Our Use Case (On-Chain Storage, 256KB Limit)**:
- Animated formats would be too large for on-chain storage
- Viewer/wallet support is inconsistent
- Static images provide maximum compatibility and reliability

**Animated WebP vs Static WebP - File Size Comparison**:
- **Static WebP (512x512px)**: ~40-80KB (our current target)
- **Animated WebP (512x512px)**: Size increases with frame count
  - **10 frames**: ~80-160KB (2x static)
  - **15 frames**: ~120-240KB (3x static)
  - **20 frames**: ~160-320KB (4x static)
  - **25 frames**: ~200-400KB (5x static)
  - **Note**: Frame-to-frame compression helps, but each frame adds data
- **Factors affecting size**:
  - **Number of frames**: More frames = larger file (each frame adds data)
  - **Frame-to-frame changes**: WebP compresses similar frames well, but moving trail adds new data per frame
  - **Compression settings**: Lower quality = smaller size, but may reduce visual quality
  - **Animation complexity**: Simple trail movement vs complex particle effects

**Frame Count Feasibility Analysis** (Re-evaluation with Actual Metadata Size):

**Available Space**:
- **Total object limit**: 256KB
- **Badge struct metadata**: ~77 bytes (negligible)
- **Available for image**: ~256KB (image dominates, struct is <0.1% of limit)

**Frame Count Capacity**:
- **10 frames**: ~80-160KB ✅ **Fits easily** (96-176KB headroom)
- **15 frames**: ~120-240KB ✅ **Fits comfortably** (16-136KB headroom)
- **20 frames**: ~160-320KB ⚠️ **Risky** (best case fits, worst case exceeds)
- **25 frames**: ~200-400KB ❌ **Likely exceeds** (only best case might fit)

**Frame Count Recommendations**:
- **10 frames**: ✅ **Very safe** - plenty of headroom, smooth animation
- **15 frames**: ✅ **Safe** - good headroom, smoother animation
- **20 frames**: ⚠️ **Possible but risky** - requires careful optimization, may exceed in worst case
- **25+ frames**: ❌ **Not recommended** - too risky, likely exceeds limit

**Feasibility Assessment**:
- **Struct metadata is negligible** (~77 bytes) - image size is the only constraint
- **10-15 frames is very feasible** - plenty of room even in worst case
- **20 frames is possible** but requires careful optimization and testing
- **More frames = smoother animation** but also larger file size
- **Recommendation**: **10-15 frames** for optimal balance of smoothness and safety

**Practical Considerations**:
- **10 frames**: Smooth enough for trail animation, very safe margin
- **15 frames**: Even smoother, still safe margin
- **20 frames**: Maximum smoothness, but risky - test carefully
- **Compression quality**: Can adjust to fit more frames if needed

**Recommendation**: 
  - **10-15 frames is optimal** - smooth animation with safe margin
  - **Static is still recommended** for MVP due to universal wallet/viewer compatibility
  - **Animation (10-15 frames) is very feasible** if wallet/viewer support is verified
  - Decision depends on: wallet compatibility testing vs. visual appeal trade-off

**Trail Options**:

**Option A - Static Trail in Image** ✅ **SELECTED** (Recommended for NFT compatibility):
- Render trail as part of the static image file
- Trail curves behind/around the orb in an arc or spiral pattern
- Trail uses tier-specific color (matches tier theme)
- Trail opacity and length increase with tier
- **Pros**: 
  - Works in **all** NFT viewers and wallets (universal compatibility)
  - Smaller file size (fits within 256KB on-chain limit)
  - Reliable display across all platforms
- **Cons**: Static, no motion effect

**Option B - Animated Trail** ❌ **NOT RECOMMENDED**:
- Use animated GIF or animated WebP
- Trail animates with motion blur effect
- More dynamic and eye-catching
- **Pros**: More engaging, matches game's dynamic trail
- **Cons**: 
  - **Much larger file size** (2-10x larger, likely exceeds 256KB limit)
  - **Inconsistent viewer/wallet support** - many show only first frame
  - More complex to implement
  - **Decision**: ❌ **NOT USED** - Static images only for maximum compatibility and on-chain storage

**Option C - Hybrid Approach** (Optional Future Enhancement):
- Static trail in NFT image (for wallet/NFT gallery - universal compatibility)
- Optional animated version for web display (in-game UI only)
- NFT metadata points to static version
- Frontend can enhance with animation when displaying in game UI
- **Note**: This is optional - NFT itself remains static for compatibility

**Decision**: ✅ **Option A (Static Trail)** - All NFT images are static for maximum compatibility across all wallets and NFT viewers, and to fit within on-chain storage constraints.

**Trail Pattern Decision** ✅ **DECIDED**:
- **Pattern Type**: Spiral (complements game's directional trail, no arc)
- **Position**: Behind orb for lower tiers, combination (behind + around) for higher tiers
- **Design Intent**: Match game's directional trail aesthetic while adding visual progression
- **Progression**: Simple spiral behind → Complex spiral wrapping around

**Tier-Specific Trail Design**:
- **Starter**: Short, subtle spiral trail (gray/silver, 2-3 segments)
  - Simple spiral behind orb
  - Minimal curvature, directional trail effect
  
- **Common**: Medium spiral trail (Sui blue, 4-5 segments)
  - Spiral behind orb with gentle curvature
  - More pronounced than Starter, still primarily behind
  
- **Uncommon**: Longer spiral trail (green, 6-7 segments)
  - Spiral behind orb with more pronounced curvature
  - Trail extends further, more dynamic
  
- **Rare**: Extended spiral trail (deep purple, 8-10 segments)
  - Spiral behind orb, begins to wrap slightly around sides
  - More complex spiral pattern, trail extends around orb edges
  
- **Epic**: Dramatic spiral trail (orange/red, 10-12 segments)
  - Complex spiral that wraps around orb (combination: behind + around)
  - Trail flows behind and curves around orb sides
  - More dynamic, full spiral effect
  
- **Legendary**: Maximum spiral trail (gold/rainbow, 12+ segments)
  - Full spiral wrapping around orb (behind + around combination)
  - Complete spiral effect with trail flowing behind and around orb
  - Maximum complexity with rainbow gradient and particles

**Evolution Mechanics**:
- **Color Shift**: Badge frame and trail color change with tier
- **Glow Intensity**: Stronger outer glow for higher tiers
- **Trail Complexity**: Trail length and pattern complexity increase with tier
- **Border Ornamentation**: More ornate borders for rare tiers (geometric patterns, decorative elements)
- **Particle Effects**: ✅ **DECIDED** - Static particles around orb for Epic/Legendary (in image)
- **Note**: All visual effects are static in the NFT image - no animation in the NFT itself for maximum compatibility

**Badge Frame Design** (Hexagonal) ✅ **DECIDED**:

**Frame Design Principles**:
- **Frame Thickness**: Consistent across all tiers (same thickness)
- **Layering**: Single frame layer (keep it simple, no multiple layers)
- **Progression**: Clean, minimal frames at lower tiers → Neo Tokyo cyberpunk aesthetic at higher tiers
- **Designer Freedom**: Designer will choose specific corner decorations and edge patterns, with examples provided below

**Tier-Specific Frame Design**:

- **Starter**: Simple hexagonal frame, gray/silver, minimal decoration, clean edges
  - Clean, minimal aesthetic
  - No decorative elements or patterns
  - Simple, unadorned hexagon

- **Common**: Slightly ornate hexagon, Sui blue accents, simple border pattern, subtle corner details
  - Clean aesthetic with subtle details
  - Simple border pattern (designer's choice)
  - Subtle corner decorations (designer's choice)

- **Uncommon**: More decorative hexagon, green accents, geometric patterns along edges, corner embellishments
  - More decorative than Common
  - Geometric patterns along edges (designer's choice)
  - Corner embellishments (designer's choice)

- **Rare**: Ornate hexagonal frame, deep purple accents, complex geometric patterns, decorative corner elements
  - More ornate than Uncommon
  - Complex geometric patterns (designer's choice)
  - Decorative corner elements (designer's choice)

- **Epic**: Highly ornate hexagon, orange/red accents, intricate edge designs, elaborate corner decorations
  - **Neo Tokyo aesthetic begins**: Incorporate cyberpunk elements
  - Intricate edge designs with neo Tokyo style (circuit patterns, neon lines, tech details)
  - Elaborate corner decorations with cyberpunk aesthetic

- **Legendary**: Maximum ornamentation, gold/rainbow accents, elaborate decorative elements, neo Tokyo cyberpunk style
  - **Full neo Tokyo aesthetic**: Maximum cyberpunk/neo Tokyo elements
  - Elaborate decorative elements with neo Tokyo style
  - Circuit patterns, neon accents, tech details, cyberpunk aesthetic
  - Rainbow gradient accents (from color scheme)

**Design Guidance for Designer**:

**Corner Decoration Options** (Designer's Choice):
- ✅ **Geometric shapes**: Small hexagons, triangles, circles, squares at corners
- ✅ **Gems/Crystals**: Small gem or crystal shapes at corners
- ✅ **Orbs**: Small orb shapes at corners (matches central orb theme)
- ✅ **Tech elements**: Small tech/cyberpunk elements (circuits, nodes, connectors)
- ❌ **Spikes**: Not desired - avoid spike designs

**Edge Pattern Options** (Designer's Choice):
- ✅ **Lines**: Parallel lines, diagonal lines, crosshatch patterns
- ✅ **Dots**: Dot patterns, dotted lines, point patterns
- ✅ **Triangles**: Triangle patterns, triangular shapes
- ✅ **Hexagons**: Hexagonal patterns (matches frame shape)
- ✅ **Circuit patterns**: For Epic/Legendary - circuit board style patterns
- ✅ **Neon lines**: For Epic/Legendary - neon-style glowing lines

**Neo Tokyo Elements** (Epic & Legendary):
- Circuit board patterns
- Neon-style glowing lines/accents
- Tech/cyberpunk details
- Futuristic geometric patterns
- Blue/purple neon aesthetic (matches color scheme)

**Particle Effects Design** ✅ **DECIDED**:
- **Epic Tier**: Static particles around orb (orange/red theme)
  - Particle style: Small glowing particles, sparks, or energy fragments
  - Color: Orange/red to match tier theme
  - Distribution: Around orb, not too dense
  - Effect: Adds energy/dynamic feel without overwhelming
  
- **Legendary Tier**: Static particles around orb (gold/rainbow theme)
  - Particle style: More particles than Epic, can include rainbow-colored particles
  - Color: Gold base with rainbow accents (matching gradient)
  - Distribution: More dense than Epic, creates more dramatic effect
  - Effect: Maximum visual impact, prestigious appearance

**Design Notes**:
- All particles are static in the image (no animation)
- Particles should complement the orb, not obscure it
- Style should match neo Tokyo aesthetic for Legendary
- Designer can choose specific particle shapes/styles (sparks, energy fragments, glowing dots, etc.)

**Visual Hierarchy**:
1. **Orb** (center, most prominent)
2. **Trail** (behind orb, tier-colored)
3. **Frame** (outer edge, tier-styled)
4. **Glow** (outermost, tier-colored)
5. **Particles** (around orb, Epic/Legendary only)

**Trail Rendering Reference** (Based on Game Implementation):
- Game uses multi-layer trail rendering with diminishing opacity
- Trail segments drawn from newest to oldest
- Each segment has 3 layers for depth effect
- Trail color: Cyan in game, but use tier color for badges
- Trail width: Diminishes from full size to 0 (newest to oldest)
- Trail pattern: Curved arc or spiral behind orb
- For static badge: Render trail as curved path with gradient opacity

**Conceptual Badge Layout** (Hexagonal):
```
        [Tier Glow - Outer Hexagon/Hexagonal Aura]
                    |
        [Hexagonal Badge Frame - Tier Colored]
                    |
        [Trail - Curved/Spiral Pattern]
                    |
        [Blue Orb - Centered, 40-50% size]
                    |
        [Particles - Epic/Legendary only]
```

**Hexagon Design Notes**:
- Hexagon provides 6 corners for decorative elements
- Each tier can add complexity to corners and edges
- Hexagonal shape creates modern, tech-forward aesthetic
- Glow can extend beyond hexagon edges for dramatic effect
- Trail can curve within or extend beyond hexagon boundaries

### Image Format & Generation

**⚠️ Critical Constraint: Sui Object Size Limit**
- **Maximum object size: 256KB** (includes all object data, not just image)
- Badge object includes: metadata + image data + other fields
- Image must fit within this limit along with metadata
- **Practical image size limit: ~200-220KB** (leaving room for metadata)

**Format Comparison for On-Chain Storage**:

**Option 1: WebP** (Recommended for On-Chain Storage)
- **Best compression** - typically 25-35% smaller than PNG
- Supports transparency (like PNG)
- High quality at smaller file sizes
- Example: 512x512px badge ~30-50KB, 1024x1024px ~80-120KB
- **Pros**: Smallest file size, good quality, transparency support
- **Cons**: Slightly less universal support (but widely supported now)
- **Best for**: On-chain storage, staying under 256KB limit

**Option 2: PNG** (Alternative for On-Chain)
- High quality, supports transparency
- Widely supported by all platforms
- Larger file size than WebP
- Example: 512x512px badge ~50-80KB, 1024x1024px ~150-250KB
- **Pros**: Universal support, lossless quality
- **Cons**: Larger file size (may push 1024x1024px close to limit)
- **Best for**: Maximum compatibility, smaller resolutions

**Option 3: SVG** (Not Recommended for On-Chain)
- Vector-based, scales perfectly
- Can be very small for simple designs
- **Pros**: Scalable, potentially very small
- **Cons**: Complex badges with effects may be large, not all viewers support
- **Best for**: Simple designs, off-chain storage

**Badge Size Decision Framework**:

**Actual Display Contexts** (Confirmed):
1. **Main Menu Modal** (In-game display)
   - Display size: Can be larger (modal has space)
   - Source size needed: 256x256px to 512x512px (comfortable viewing)
   - **Not a constraint** - modal can accommodate larger badges
   
2. **Store Modal** (In-game display)
   - Display size: Can be larger (modal has space)
   - Source size needed: 256x256px to 512x512px (comfortable viewing)
   - **Not a constraint** - modal can accommodate larger badges
   
3. **Item Consumption Modal** (In-game display)
   - Display size: Can be moderate to large (modal has space)
   - Source size needed: 256x256px to 512x512px
   - **Not a constraint** - modal can accommodate larger badges
   
4. **Wallet/NFT Gallery** (Primary constraint)
   - Display size: ~128x128px to 256x256px (thumbnail view in wallet)
   - Full view: ~512x512px (when clicked/expanded)
   - Source size needed: **512x512px recommended** (2x for retina, good quality at full view)
   - **This is the primary size consideration** - wallet gallery is where quality matters most
   
5. **NFT Marketplace** (Secondary consideration)
   - Display size: ~256x256px to 512x512px (marketplace thumbnails)
   - Full view: ~512x512px to 1024x1024px
   - Source size needed: 512x512px to 1024x1024px

**Key Insight**: 
- In-game modals (Main Menu, Store, Consumption) can display badges at comfortable sizes - **not a constraint**
- **Wallet/NFT Gallery is the primary consideration** - this is where users will view their badge most often
- Badges won't be shown during gameplay (no real-time performance concerns)
- Size should optimize for wallet gallery viewing experience

**Recommended Badge Sizes**:

**Option 1: 512x512px** (Recommended for Wallet Gallery Quality)
- **Display contexts**: Excellent for wallet gallery (primary viewing location)
- **File size (WebP)**: ~40-80KB ✅ (well under 256KB limit)
- **File size (PNG)**: ~80-150KB ✅ (fits with metadata, WebP preferred)
- **Quality**: Excellent at all display sizes
  - Perfect at 256x256px wallet thumbnail (2x scaling)
  - Perfect at 512x512px wallet full view
  - Scales down beautifully for modals
- **Pros**: 
  - **Optimal for wallet gallery** - primary viewing location
  - Excellent quality at full wallet view (512px)
  - Future-proof for any display size
  - Still fits comfortably in 256KB object limit (WebP)
  - In-game modals can display at comfortable size
- **Cons**: 
  - Larger file size than 256x256px (but still efficient)
  - PNG may be tight with metadata (use WebP)

**Option 2: 256x256px** (Minimalist Approach)
- **Display contexts**: Adequate but may look pixelated in wallet full view
- **File size (WebP)**: ~15-30KB ✅ (very small)
- **File size (PNG)**: ~25-50KB ✅ (very small)
- **Quality**: Good for thumbnails, may be pixelated at 512px full view
- **Pros**: 
  - Smallest file size
  - Maximum room for metadata
  - Fastest loading
- **Cons**: 
  - **May look pixelated in wallet gallery at full 512px view**
  - Less optimal for primary viewing location (wallet)
  - In-game modals could display larger but source limits quality

**Option 3: 1024x1024px** (Maximum Quality - Off-Chain Only)
- **Display contexts**: Overkill, requires off-chain storage
- **File size (WebP)**: ~120-200KB ⚠️ (may exceed 256KB with metadata)
- **File size (PNG)**: ~250-400KB ❌ (exceeds 256KB limit)
- **Quality**: Maximum quality
- **Pros**: 
  - Highest quality possible
  - Future-proof for any display size
- **Cons**: 
  - **Likely requires off-chain storage** (exceeds 256KB limit)
  - Overkill for badge use case
  - Larger storage costs if on-chain

**Recommendation**: **512x512px WebP** 
- **Optimal for wallet gallery** - primary viewing location
- Excellent quality at wallet full view (512px)
- Perfect quality at wallet thumbnail (256px with 2x scaling)
- In-game modals can display at comfortable sizes
- Still fits comfortably in 256KB object limit (~40-80KB WebP)
- Leaves ~170-210KB for metadata (plenty of room)
- Efficient on-chain storage

**Format Recommendation Based on Storage Choice**:

**For On-Chain Storage (<256KB object limit)**:
- **Primary**: **WebP** format at **512x512px**
  - Best compression ratio
  - Optimal size for wallet gallery (primary viewing location)
  - File size: ~40-80KB (leaves ~170-210KB for metadata)
  - Perfect quality at wallet full view (512px)
  - Perfect quality at wallet thumbnail (256px with 2x scaling)
- **Compression**: Use quality setting 85-90% (excellent quality, small size)
- **Fallback**: PNG at 512x512px if WebP not available (~80-150KB, still fits)
- **Alternative**: 256x256px if file size becomes concern (but 512x512px WebP recommended)

**For Off-Chain Storage (No Size Limit)**:
- **Primary**: **PNG** or **WebP** at 512x512px
- **Resolution**: 512x512px recommended (optimal for wallet gallery)
- **Compression**: Can use higher quality settings if desired
- **Note**: Off-chain not recommended - 512x512px WebP fits on-chain comfortably

**Compression Strategy**:
1. **Optimize images** before encoding to `vector<u8>`
2. Use image optimization tools (TinyPNG, ImageOptim, etc.)
3. Test file sizes at different quality levels
4. Ensure final size + metadata < 256KB for on-chain storage
5. Consider progressive compression - start with high quality, reduce if needed

**Image Generation Approach** (DECIDED):
- **Manual Generation**: Create badge images manually using design tools (Figma, Photoshop, etc.)
  - Design each tier as a separate image file
  - **Workflow**:
    1. Create base badge template with layers:
       - Base layer: Hexagonal badge frame (tier-specific styling)
       - Orb layer: Blue Orb image (`Blue_Orb_Shot.webp`, centered, ~40-50% of hexagon width)
       - Trail layer: Rendered trail (static, tier-specific color and length)
       - Glow layer: Outer glow effect (tier-specific)
       - Particle layer: Static particles (Epic/Legendary only)
    2. Design 6 tier-specific versions:
       - Starter: Gray/Silver theme
       - Common: Blue theme
       - Uncommon: Green theme
       - Rare: Purple theme
       - Epic: Orange/Red theme with particles
       - Legendary: Gold/Rainbow theme with particles
    3. Export specifications:
       - Format: WebP (recommended for on-chain storage)
       - Resolution: 512x512px
       - Optimize compression to target <200KB per image
       - Test file size before encoding to `vector<u8>`

**Image Storage on Sui**:

**Sui's Object-Centric NFT Model** (Verified from Sui Documentation):
- **NFT Object**: Stored **completely on-chain** as a Sui object
  - Sui's object-centric architecture is a key differentiator from account-based chains
  - Each NFT is a distinct object with unique attributes stored on-chain
  - Badge metadata (tier, games_played, timestamps, etc.) - **on-chain**
  - All attributes and properties - **on-chain**
  - **Dynamic NFT capability**: Objects can be updated on-chain (tier upgrades)
  - This is Sui's strength - true dynamic NFTs with on-chain object updates
  - **Storage Fund**: Sui's economic model makes on-chain storage economically viable by compensating validators

**Image Storage Options for Sui**:

**Option A: On-Chain Image Storage** ✅ **SELECTED** (Leverages Sui's Object Model):
- Store image data directly in the NFT object as `vector<u8>` (byte array)
- Sui's object-centric model supports storing media files on-chain
- **⚠️ Critical Constraint**: Sui object size limit is **256KB total** (image + metadata)
- **Recommended badge size**: **512x512px WebP** (~40-80KB)
  - Leaves ~170-210KB for metadata (plenty of room)
  - **Optimal for wallet gallery** - primary viewing location
  - Perfect quality at wallet full view (512px)
  - Perfect quality at wallet thumbnail (256px with 2x scaling)
  - In-game modals can display at comfortable sizes
- **Format recommendation**: **WebP** for best compression (25-35% smaller than PNG)
- **Pros**: 
  - Fully on-chain, no external dependencies
  - Leverages Sui's object-centric architecture
  - True decentralization and immutability
  - Image updates are on-chain transactions (dynamic NFT)
  - Enhanced composability - smart contracts can interact directly with image data
  - Storage Fund mechanism makes on-chain storage economically viable
  - Small file size = lower storage costs
- **Cons**: 
  - Storage fees apply (paid to storage fund)
  - **256KB object size limit** constrains image size
  - Must optimize image compression to fit within limit
- **File Size Targets** (Badge-Specific):
  - 256x256px WebP: ~15-30KB ✅ (fits but may be pixelated in wallet full view)
  - **512x512px WebP: ~40-80KB ✅ (RECOMMENDED - optimal for wallet gallery)**
  - 512x512px PNG: ~80-150KB ✅ (fits, but WebP is better)
  - 1024x1024px WebP: ~120-200KB ⚠️ (may exceed limit with metadata, off-chain recommended)
- **Note**: Sui documentation confirms on-chain storage is supported and economically viable due to storage fund

**Option B: Off-Chain with On-Chain URI** (Sui Object Display Standard):
- Store image on IPFS/Arweave/CDN
- Store `image_url` in on-chain object (following Sui Object Display standard)
- Update `image_url` when tier upgrades (on-chain update)
- **Pros**: 
  - Lower storage costs for large files
  - Can use larger/higher quality images
  - Still benefits from Sui's dynamic NFT capabilities (URI updates on-chain)
  - Compatible with Sui Object Display standard
- **Cons**: 
  - External dependency on image storage
  - Less decentralized than fully on-chain
  - Depends on availability of external storage
- **Note**: Sui Object Display standard uses `image_url` field, suggesting this is a common pattern

**Option C: Hybrid - On-Chain Metadata + Off-Chain Image**:
- Store image rendering metadata on-chain (colors, tier info, etc.)
- Generate image dynamically from on-chain data
- Or store small thumbnail on-chain, full image off-chain
- **Pros**: 
  - Balances decentralization and cost
  - Can regenerate images from on-chain data
- **Cons**: 
  - More complex implementation
  - Requires image generation service

**Decision for Sui Dynamic NFTs** (Based on Badge Use Case & Size Limits):
- **✅ DECIDED: 512x512px WebP On-Chain** (Option A)
  - **Format**: WebP (best compression)
  - **Resolution**: **512x512px** (optimal for wallet gallery - primary viewing location)
  - **File size**: ~40-80KB (leaves ~170-210KB for metadata)
  - **Storage**: On-chain `image_data: vector<u8>` in badge object
  - Fully leverages Sui's object-centric model
  - True dynamic NFT with on-chain image updates
  - Badge image updates when tier upgrades (all on-chain)
  - Storage Fund makes this economically viable
  - Enhanced composability for smart contract interactions
  - **Optimal for wallet gallery** (primary viewing location)
  - **Perfect for in-game modals** (Main Menu, Store, Consumption - can display at comfortable sizes)
  - **Must ensure**: Image + metadata < 256KB total object size

**Key Insight from Sui Documentation**:
- Sui supports **both** approaches - developers have flexibility
- On-chain storage is economically viable due to Storage Fund mechanism
- Dynamic NFTs are a core strength - objects can be updated on-chain regardless of storage choice
- The choice depends on image size, cost considerations, and decentralization priorities

**Sui's Dynamic NFT Advantage**:
- Badge object can be updated on-chain when tier upgrades
- Image URI (or image data) updates atomically with tier
- No need for separate metadata updates - everything in one object
- True dynamic NFTs are a core strength of Sui's architecture

**Dynamic Image Updates (Sui's Dynamic NFT Strength)**:
- When tier upgrades, generate new badge image
- **On-Chain Update**: Update NFT object's `image_data` or `image_uri` field via `update_badge_tier()` function
- **Atomic Update**: Tier and image update in single on-chain transaction
- **True Dynamic NFT**: Image changes are permanent, on-chain, and verifiable
- **No External Dependencies**: If using on-chain storage, no IPFS/CDN needed
- Consider storing previous tier image data/URIs in metadata for history/provenance
- Old images remain accessible (on-chain or via previous URIs)

### Metadata Considerations

**⚠️ IMPORTANT: We need to decide what metadata to include and where it's stored**

**Current Badge Struct Fields** (On-Chain in Move Contract):
```move
public struct EarlySupporterBadge has key {
    id: UID,                    // ~32 bytes (Sui object ID)
    owner: address,             // ~20 bytes (wallet address)
    tier: u8,                   // 1 byte (0-5)
    games_played: u64,          // 8 bytes
    mint_date: u64,             // 8 bytes (timestamp)
    last_updated: u64,          // 8 bytes (timestamp)
    image_data: vector<u8>,     // ~40-80KB (WebP image)
}
```
**Estimated Struct Size**: ~40-80KB (image) + ~77 bytes (other fields) = **~40-80KB total**

**Questions to Discuss**:

1. **NFT Metadata for Viewers/Wallets** (Sui Object Display Standard):
   - Sui uses Object Display standard for NFT metadata shown in wallets/viewers
   - This is separate from the Move struct fields
   - Typically includes: `name`, `description`, `image_url`, `attributes`, etc.
   - **Question**: Do we need separate metadata fields, or can wallets derive everything from struct fields?

2. **What Metadata Do We Actually Need?**
   - **Essential** (already in struct):
     - ✅ `tier` (u8) - needed for discounts
     - ✅ `games_played` (u64) - needed for tier calculation
     - ✅ `owner` (address) - needed for ownership
     - ✅ `image_data` (vector<u8>) - the badge image
   - **Timestamps** (in struct):
     - ✅ `mint_date` - useful for provenance/history
     - ✅ `last_updated` - useful for tracking upgrades
   - **Derivable** (can be calculated, don't need to store):
     - `tier_name` - can derive from `tier` (0="Starter", 1="Common", etc.)
     - `discount_store` - can calculate from `tier` using function
     - `discount_gameplay` - can calculate from `tier` using function
   - **For NFT Viewers** (metadata attributes):
     - `name`: "Early Supporter Badge - [Tier Name]" - can be generated
     - `description`: Static text about the badge - can be static
     - `attributes`: Array of key-value pairs for NFT viewers
     - `soulbound`: true - can be static (all badges are soulbound)
     - `transferable`: false - can be static

3. **Size Considerations**:
   - Current struct: ~40-80KB (mostly image)
   - If we add metadata strings to struct: Could add 1-5KB for name/description
   - **Question**: Should metadata be:
     - **Option A**: Only in struct (minimal, calculated when needed)
     - **Option B**: Stored in struct as strings (name, description, attributes)
     - **Option C**: Handled by Sui Object Display standard (separate from struct)

**Detailed Comparison of Options A, B, and C**:

---

### **Option A: Only in Struct (Minimal, Calculated When Needed)**

**How It Works**:
- Store only essential data in Move struct (current fields: id, owner, tier, games_played, mint_date, last_updated, image_data)
- No additional metadata strings stored
- Frontend/backend generates metadata when needed:
  - `name`: "Early Supporter Badge - " + get_tier_name(tier)
  - `description`: Static string in frontend code
  - `attributes`: Generated from struct fields when displaying
  - `tier_name`: Derived from `tier` using lookup table
  - Discounts: Calculated from `tier` using functions

**Implementation**:
```move
// Move struct - minimal
public struct EarlySupporterBadge has key {
    id: UID,
    owner: address,
    tier: u8,
    games_played: u64,
    mint_date: u64,
    last_updated: u64,
    image_data: vector<u8>,
}

// Frontend/Backend generates metadata:
function getBadgeMetadata(badge: EarlySupporterBadge) {
    return {
        name: `Early Supporter Badge - ${getTierName(badge.tier)}`,
        description: "A dynamic, soulbound badge...",
        attributes: {
            tier: badge.tier,
            tier_name: getTierName(badge.tier),
            games_played: badge.games_played,
            // ... etc
        }
    }
}
```

**Pros**:
- ✅ **Smallest struct size** - only essential data (~40-80KB total)
- ✅ **Maximum flexibility** - can change metadata format without on-chain updates
- ✅ **No redundancy** - don't store what can be calculated
- ✅ **Easy to update** - change metadata display logic without contract changes
- ✅ **Plenty of room** - leaves ~170-210KB for future additions

**Cons**:
- ❌ **Requires frontend/backend logic** - must generate metadata for each viewer
- ❌ **Not standardized** - each viewer might need custom logic
- ❌ **May not work with all wallets** - some wallets expect standard metadata format
- ❌ **More complex integration** - need to implement metadata generation

**Size Impact**: ~40-80KB (no change from current)

---

### **Option B: Stored in Struct as Strings (Name, Description, Attributes)**

**How It Works**:
- Add metadata fields directly to Move struct:
  - `name: vector<u8>` (UTF-8 encoded string)
  - `description: vector<u8>` (UTF-8 encoded string)
  - `tier_name: vector<u8>` (optional)
  - `attributes: Table<String, String>` (optional map)
- Store these strings on-chain in the badge object
- Update strings when tier upgrades (on-chain update)

**Implementation**:
```move
// Move struct - includes metadata strings
public struct EarlySupporterBadge has key {
    id: UID,
    owner: address,
    tier: u8,
    games_played: u64,
    mint_date: u64,
    last_updated: u64,
    image_data: vector<u8>,
    // Metadata strings
    name: vector<u8>,              // "Early Supporter Badge - Starter"
    description: vector<u8>,       // Full description text
    tier_name: vector<u8>,         // "Starter", "Common", etc.
}

// Update when tier changes
public fun update_badge_tier(badge: &mut EarlySupporterBadge, ...) {
    // ... update tier ...
    badge.name = b"Early Supporter Badge - Common";  // Update name
    badge.tier_name = b"Common";  // Update tier name
}
```

**Pros**:
- ✅ **Standard format** - wallets can read directly from struct
- ✅ **No frontend logic needed** - metadata is on-chain
- ✅ **Works with all wallets** - standard NFT metadata format
- ✅ **Immutable history** - old metadata preserved in struct
- ✅ **Self-contained** - all data in one place

**Cons**:
- ❌ **Larger struct size** - adds 1-5KB for strings
- ❌ **Redundancy** - stores derivable data (tier_name, discounts)
- ❌ **Less flexible** - changing metadata format requires contract updates
- ❌ **Update complexity** - must update strings when tier changes
- ❌ **Still fits** - but uses more of the 256KB limit

**Size Impact**: ~41-85KB (adds ~1-5KB for strings)

**Example String Sizes**:
- `name`: ~30-50 bytes ("Early Supporter Badge - Legendary")
- `description`: ~200-500 bytes (full description text)
- `tier_name`: ~5-15 bytes ("Starter", "Common", etc.)
- **Total**: ~235-565 bytes (still small, but adds up)

---

### **Option C: Handled by Sui Object Display Standard (Separate from Struct)**

**How It Works**:
- Keep Move struct minimal (Option A approach)
- Use Sui's Object Display standard for NFT viewer metadata
- Object Display is a separate metadata layer that wallets/viewers use
- Display metadata is configured separately from the struct
- Can be set once per object type, or per object instance

**Implementation**:
```move
// Move struct - minimal (same as Option A)
public struct EarlySupporterBadge has key {
    id: UID,
    owner: address,
    tier: u8,
    games_played: u64,
    mint_date: u64,
    last_updated: u64,
    image_data: vector<u8>,
}

// Object Display configuration (separate from struct)
// This is typically configured in a Display object or via SDK
{
    "name": "{tier_name} Badge",
    "description": "A dynamic, soulbound badge...",
    "image_url": "{image_data}",  // Wallets decode from image_data
    "attributes": {
        "tier": "{tier}",
        "games_played": "{games_played}",
        // ... etc
    }
}
```

**How Sui Object Display Works**:
- Sui has a built-in Display standard for NFT metadata
- Display metadata can reference struct fields using `{field_name}` syntax
- Wallets/viewers automatically format Display metadata for display
- Display can be:
  - **Per-type**: Same display format for all badges of this type
  - **Per-instance**: Custom display per badge (more complex)
- Display metadata is stored separately from the struct (in Display registry)

**Pros**:
- ✅ **Standard Sui approach** - follows Sui's recommended pattern
- ✅ **Minimal struct** - keeps struct small (~40-80KB)
- ✅ **Wallet compatibility** - wallets understand Display standard
- ✅ **Flexible** - can update Display format without changing struct
- ✅ **Best of both worlds** - minimal struct + standard metadata

**Cons**:
- ❌ **Requires Display setup** - need to configure Display object/registry
- ❌ **Additional complexity** - two systems (struct + Display)
- ❌ **May need per-instance Display** - if badges need unique metadata
- ❌ **Learning curve** - need to understand Sui Display standard

**Size Impact**: ✅ **ZERO impact on badge object size** - struct stays minimal (~40-80KB)

**Sui Object Display Details**:
- Display metadata is stored in a **separate Display object** (not in each NFT object)
- Display is typically configured **once per object type** (all badges share the same Display)
- Display can use template strings: `"{tier_name} Badge"` references struct field
- Wallets automatically format Display metadata for viewing
- Can include: name, description, image_url, attributes, external_url, etc.
- **Storage Impact**: 
  - ✅ **Badge object size**: Unchanged (~40-80KB) - Display is separate
  - ✅ **Display object**: One shared Display object for all badges (minimal size, ~1-5KB)
  - ✅ **Total per badge**: Still ~40-80KB (Display doesn't count against badge object limit)
  - ✅ **256KB limit**: Only applies to badge object, Display is separate

---

### **Comparison Summary**:

| Aspect | Option A (Minimal) | Option B (Strings in Struct) | Option C (Object Display) |
|--------|-------------------|----------------------------|---------------------------|
| **Struct Size** | ~40-80KB | ~41-85KB | ~40-80KB |
| **Wallet Compatibility** | ⚠️ May need custom logic | ✅ Standard format | ✅ Sui standard |
| **Flexibility** | ✅ High | ❌ Low | ✅ Medium |
| **Complexity** | ⚠️ Medium (frontend logic) | ✅ Low | ⚠️ Medium (Display setup) |
| **Redundancy** | ✅ None | ❌ Some | ✅ None |
| **Update Ease** | ✅ Easy (frontend) | ❌ Requires contract update | ✅ Easy (Display) |
| **Sui Best Practice** | ⚠️ Custom | ⚠️ Custom | ✅ Recommended |

---

**Recommendation**:
- **Option C (Object Display)** appears to be the Sui-recommended approach
- Balances minimal struct size with wallet compatibility
- Follows Sui standards for NFT metadata
- However, requires understanding and setting up Sui Display standard

**✅ DECIDED: Option C (Sui Object Display Standard)**
- **Storage Impact**: **ZERO** - badge object size remains ~40-80KB
- Display is a separate shared object (one Display for all badges)
- Badge struct stays minimal (no additional fields needed)
- Wallet compatibility maintained through Sui standard
- Follows Sui best practices for NFT metadata

4. **Proposed Minimal Metadata** (For Discussion):
   - **In Move Struct** (On-Chain):
     - Keep current fields (id, owner, tier, games_played, mint_date, last_updated, image_data)
     - **Total**: ~40-80KB (mostly image)
   - **For NFT Viewers** (Sui Object Display):
     - `name`: Generated from tier ("Early Supporter Badge - Starter")
     - `description`: Static text (same for all badges)
     - `image`: Derived from `image_data` (wallets can decode)
     - `attributes`: Generated from struct fields:
       - `tier`: Current tier number
       - `tier_name`: Human-readable name (derived from tier)
       - `games_played`: Total games
       - `mint_date`: When minted
       - `last_updated`: Last upgrade
       - `soulbound`: true
   - **Discounts**: Calculated on-the-fly from tier (no need to store)

5. **What Should We Store?** ✅ **DECIDED** (Based on Option C - Object Display):
   - ✅ **Keep**: All current struct fields (minimal, efficient)
   - ❌ **Don't Add**: `tier_name` as string (redundant, can derive via Display)
   - ❌ **Don't Add**: `discount_store` and `discount_gameplay` (redundant, can calculate from tier)
   - ❌ **Don't Add**: `name` and `description` strings (handled by Object Display standard)
   - ❌ **Don't Add**: `attributes` map (handled by Object Display standard)
   - ❌ **Don't Add**: History of previous tiers (not needed for MVP, adds size)

**✅ DECIDED: Keep Struct Minimal**
- **Struct fields**: Only essential on-chain data (id, owner, tier, games_played, mint_date, last_updated, image_data)
- **Metadata for viewers**: Handled by Sui Object Display standard (separate from struct)
- **Derivable data**: Calculate on-the-fly (tier_name, discounts) or generate via Display (name, description, attributes)
- **Total size**: ~40-80KB (image) + ~77 bytes (struct) = **~40-80KB**
- **Room for future**: ~170-210KB remaining (plenty of headroom)

---

## 💰 Utility & Benefits System

### Store Discounts

**Implementation**:
- Discount applies to all store purchases (consumables, power-ups, etc.)
- Discount percentage increases with tier
- Applied automatically at checkout
- Display discount badge in store UI

**Discount Percentages** (DECIDED):
- Starter: 0% discount
- Common: 5% discount
- Uncommon: 10% discount
- Rare: 15% discount
- Epic: 20% discount
- Legendary: 25% discount

**Examples**:
- Rare tier (15% discount) buying 1000 MEWS item → pays 850 MEWS
- Legendary tier (25% discount) buying 1000 MEWS item → pays 750 MEWS

**Note**: These percentages may need adjustment based on player feedback and economic analysis after launch.

### Gameplay Discounts

**Application**: Discount on game start cost (pay-to-play)
- Users pay to start each game (e.g., $0.05 per game)
- Discount percentage applies to game start cost
- Example: $0.05 per game with 20% discount = $0.04 per game
- Payment covers gas fees and possible token burns by admin account

**Discount Percentages** (DECIDED):
- Starter: 0% discount
- Common: 0% discount
- Uncommon: 5% discount
- Rare: 10% discount
- Epic: 15% discount
- Legendary: 20% discount

**Note**: These percentages may need adjustment based on player feedback and economic analysis after launch.

### Additional Benefits (Future Considerations)

- **Exclusive Content**: Access to special badges, skins, or content
- **Leaderboard Recognition**: Special indicator on leaderboards
- **Community Perks**: Access to exclusive channels, events, or tournaments
- **Airdrop Eligibility**: Priority for future token/NFT airdrops

---

## 🔧 Technical Architecture

### Smart Contract Structure

**Move Contract Design**:

```move
module suitwo_game::badge_system {
    use sui::object::{Self, UID};
    use sui::event;
    use sui::table::{Self, Table};
    
    // Tier constants
    const TIER_STARTER: u8 = 0;
    const TIER_COMMON: u8 = 1;
    const TIER_UNCOMMON: u8 = 2;
    const TIER_RARE: u8 = 3;
    const TIER_EPIC: u8 = 4;
    const TIER_LEGENDARY: u8 = 5;
    
    // Tier thresholds (Option A - Faster Progression with Extremely Rare Legendary)
    const THRESHOLD_COMMON: u64 = 6;
    const THRESHOLD_UNCOMMON: u64 = 16;
    const THRESHOLD_RARE: u64 = 36;
    const THRESHOLD_EPIC: u64 = 76;
    const THRESHOLD_LEGENDARY: u64 = 150;
    
    // Badge NFT structure - Fully on-chain Sui object (Soulbound/Non-Tradable)
    // Sui's object-centric model allows all metadata and image data on-chain
    // NOTE: Only has 'key' ability, NOT 'store' - this makes it non-transferable (soulbound)
    public struct EarlySupporterBadge has key {
        id: UID,
        owner: address,
        tier: u8,
        games_played: u64,
        mint_date: u64,
        last_updated: u64,
        // Image storage - On-chain (DECIDED)
        image_data: vector<u8>,  // Raw WebP image bytes (512x512px, ~40-80KB)
        // Decision: Store images on-chain for true decentralization and atomic updates
        // Format: WebP for best compression
        // Size: 512x512px WebP fits comfortably within 256KB object limit
    }
    
    // IMPORTANT: Badge struct has 'key' but NOT 'store' ability
    // This makes it non-transferable (soulbound) - cannot be sold or traded
    // Badge is permanently bound to the original owner's wallet
    
    // Registry to track badges per player
    public struct BadgeRegistry has key {
        id: UID,
        badges: Table<address, ID>,
    }
    
    // Events
    public struct BadgeMinted has copy, drop {
        owner: address,
        badge_id: ID,
        timestamp: u64,
    }
    
    public struct BadgeTierUpgraded has copy, drop {
        owner: address,
        badge_id: ID,
        old_tier: u8,
        new_tier: u8,
        games_played: u64,
        timestamp: u64,
    }
}
```

### Key Functions

1. **`mint_badge(owner: address, is_demo_mode: bool, image_data: vector<u8>)`**
   - Validates game was NOT played in demo mode
   - Rejects minting if `is_demo_mode === true`
   - Mints badge for first-time player as Sui object
   - Sets initial tier to Starter (0)
   - Records mint date
   - Sets `image_data` to Starter tier badge image (on-chain)
   - Badge object is fully on-chain, leveraging Sui's object-oriented model
   - Emits BadgeMinted event

2. **`update_badge_tier(badge: &mut Badge, games_played: u64, is_demo_mode: bool, new_image_data: vector<u8>)`**
   - Validates game was NOT played in demo mode
   - Rejects update if `is_demo_mode === true`
   - Calculates new tier based on games_played (only non-demo games)
   - Updates badge object on-chain if tier increased
   - Updates `image_data` to new tier's badge image (on-chain update)
   - Updates last_updated timestamp
   - **Dynamic NFT Update**: Single atomic transaction updates tier and image
   - Emits BadgeTierUpgraded event if tier changed
   - This is Sui's strength - true dynamic NFTs with on-chain object updates

3. **`get_badge_tier(games_played: u64): u8`**
   - Pure function to calculate tier from games played
   - Returns tier level (0-5)

4. **`get_discount_store(tier: u8): u8`**
   - Returns store discount percentage for tier

5. **`get_discount_gameplay(tier: u8): u8`**
   - Returns gameplay discount percentage for tier

### Integration Points

**Backend Integration**:
- Hook into existing game completion tracking
- Query player's `total_games` from `PlayerStats` in `score_submission` contract
- Call `update_badge_tier` after each game completion
- Verify badge ownership before applying discounts
- **Statistics Source**: `score_submission.move` contract's `PlayerStats.total_games`
- **Badge Tier Calculation**: Uses ONLY `total_games` (games played) - other statistics are for leaderboards/profiles
- **Demo Games**: Automatically excluded (demo games don't create GameSession objects)

**Frontend Integration**:
- Display badge in player profile/header
- Show tier progression indicator
- Apply discounts automatically in store
- Show badge in wallet/NFT gallery

**Statistics System Integration**:
- Link badge tier to `total_games` statistic
- Use existing statistics tracking infrastructure
- Ensure badge updates align with score submissions

---

## 📊 Data Flow & Update Mechanism

### Game Counting & Badge Update Timing

**Critical Design Decision**: When to count games and update badges.

**Problem Statement**:
- **Game Start Counting**: Vulnerable to exploitation (user can repeatedly start games without playing)
- **Game End Counting**: Risk of losing count if network error occurs during submission
- Need to balance **integrity** (prevent exploitation) with **reliability** (don't lose legitimate game counts)

**Option Analysis**:

**Option A: Count at Game Start** ❌ **NOT RECOMMENDED**
- **When**: Increment `games_played` when game session starts
- **Pros**: 
  - Immediate count (no risk of losing count)
  - Simple implementation
- **Cons**: 
  - **Major Exploitation Risk**: User can repeatedly start games without playing
  - User could start 100 games, close browser, get 100 games counted
  - No validation that game was actually played
  - Badge progression can be gamed easily
- **Verdict**: Too vulnerable to exploitation

**Option B: Count at Game End** ✅ **RECOMMENDED**
- **When**: Increment `games_played` when game completes and score is submitted
- **Pros**: 
  - **Prevents Exploitation**: Only counts games that were actually played
  - Validates game completion (score submission proves game was played)
  - Aligns with existing score submission flow
  - Can validate minimum game duration/score requirements
- **Cons**: 
  - Risk of losing count if network error occurs
  - Requires robust error handling and retry logic
- **Mitigation Strategies**:
  1. **Retry Logic**: Queue failed updates and retry automatically
  2. **Idempotency**: Use session IDs to prevent duplicate counting
  3. **Client-Side Queue**: Store pending updates locally, retry on reconnect
  4. **Backend Reconciliation**: Periodically check for missed updates
  5. **User Feedback**: Show "Updating badge..." status, allow manual retry

**Option C: Hybrid - Start Session, Count at End** ✅ **ALTERNATIVE**
- **When**: 
  - Create game session at start (on-chain or backend)
  - Count game only when session completes successfully
- **Pros**: 
  - Tracks game sessions (prevents duplicate counting)
  - Only counts completed games
  - Can validate session duration/score
- **Cons**: 
  - More complex implementation
  - Requires session management
  - Still has network error risk (but can retry based on session)
- **Implementation**: Similar to existing game session system

**Recommended Approach: Option B (Count at Game End) with Robust Error Handling**

**Implementation Strategy**:

1. **Game Completion Flow**:
   ```
   Game Ends → Score Submitted → Validate Game → Count Game → Update Badge
   ```

2. **Validation Requirements** (before counting):
   - ✅ Game was NOT in demo mode
   - ✅ Score was successfully submitted to blockchain
   - ✅ Minimum game duration met (e.g., 5 seconds)
   - ✅ Minimum score achieved (e.g., 100 points)
   - ✅ Session ID not already counted (idempotency)

3. **Error Handling & Retry**:
   - **Queue System**: Failed badge updates go to retry queue
   - **Automatic Retry**: Retry failed updates with exponential backoff
   - **Client-Side Persistence**: Store pending updates in localStorage
   - **Backend Reconciliation**: Periodic check for missed updates
   - **User Notification**: Show status ("Badge updating...", "Update failed, retrying...")
   - **Manual Retry**: Allow user to manually retry failed updates

4. **Idempotency Protection**:
   - **Reuse existing session ID** from score submission system
   - Session ID is already generated at game start (`game.sessionId = crypto.randomUUID()`)
   - Session ID is already validated on-chain in `SessionRegistry` (prevents duplicate score submissions)
   - Can extend `SessionRegistry` or create separate `BadgeRegistry` to track counted games
   - Check if session ID already counted before incrementing badge
   - Prevents duplicate counting on retry (same session ID = same game)

5. **Fallback Mechanisms**:
   - **Backend Reconciliation**: Daily/weekly job to check for missed games
   - **User Self-Service**: Allow users to report missing game counts
   - **Statistics Sync**: Use statistics system as source of truth, sync badge periodically

**Example Implementation Flow**:

```javascript
// After successful score submission
// NOTE: Session ID is already generated and used in score submission
// Location: src/game/main.js - game.sessionId = crypto.randomUUID()
// Location: src/game/blockchain/score-submission.js - sessionId: gameStats.sessionId
// Location: contracts/suitwo_game/sources/score_submission.move - session_id: vector<u8>
// The same session ID used for score submission can be used for badge counting

async function handleGameCompletion(gameSession) {
  // 1. Validate game is eligible for badge counting
  if (gameSession.is_demo_mode) {
    return; // Don't count demo games
  }
  
  if (gameSession.duration < MIN_GAME_DURATION) {
    return; // Don't count games that ended too quickly
  }
  
  if (gameSession.score < MIN_SCORE) {
    return; // Don't count games with no real gameplay
  }
  
  // 2. Use the SAME session ID from score submission (already validated on-chain)
  // Session ID is generated at game start: game.sessionId = crypto.randomUUID()
  // Session ID is included in score submission and stored in GameSession object
  // Session ID is checked for duplicates in SessionRegistry (prevents replay attacks)
  const sessionId = gameSession.session_id; // Same ID used for score submission
  
  // 3. Check if already counted (idempotency)
  // Can query badge system or maintain separate registry
  if (await isGameAlreadyCounted(sessionId)) {
    return; // Already counted, skip
  }
  
  // 4. Queue badge update (with retry logic)
  await queueBadgeUpdate({
    playerAddress: gameSession.player,
    sessionId: sessionId, // Reuse score submission session ID
    gamesPlayed: await getTotalGamesPlayed(gameSession.player) + 1,
    timestamp: Date.now()
  });
  
  // 5. Attempt immediate update
  try {
    await updateBadgeTier(gameSession.player, sessionId);
    markGameAsCounted(sessionId);
  } catch (error) {
    // 6. On failure, add to retry queue
    console.error('Badge update failed, queuing for retry:', error);
    addToRetryQueue(sessionId, gameSession);
    showUserNotification('Badge update queued, will retry automatically');
  }
}
```

**Existing Session ID System** (Already Implemented):

1. **Session ID Generation** (`src/game/main.js`):
   ```javascript
   // Generated at game start
   game.sessionId = crypto.randomUUID(); // or timestamp-based fallback
   ```

2. **Session ID in Score Submission** (`src/game/blockchain/score-submission.js`):
   ```javascript
   sessionId: gameStats.sessionId || null  // Included in score submission
   ```

3. **Session ID in Smart Contract** (`contracts/suitwo_game/sources/score_submission.move`):
   ```move
   struct GameSession has key, store {
       // ... other fields ...
       session_id: vector<u8>,  // Session ID stored on-chain
   }
   
   struct SessionRegistry has key {
       used_sessions: Table<vector<u8>, bool>,  // Tracks used session IDs
   }
   
   // Prevents duplicate submissions
   assert!(!is_session_used(registry, session_id), 0);
   mark_session_used(registry, session_id);
   ```

4. **Backend Integration** (`backend/app/api/scores/submit/route.ts`):
   ```typescript
   const { playerAddress, playerName, sessionId, scoreData } = body;
   // Session ID passed through to smart contract
   ```

**Leveraging Existing Session ID for Badge System**:
- ✅ **Reuse same session ID** from score submission (no need to generate new one)
- ✅ **Session ID already validated** on-chain (prevents duplicates)
- ✅ **Session ID stored in GameSession** object (can query for badge counting)
- ✅ **SessionRegistry tracks used IDs** (can extend or create separate badge registry)
- ✅ **Idempotency built-in** (same session ID = same game, can't be counted twice)

**Backend Reconciliation Process**:
- Periodically (daily/weekly) check statistics system
- Compare `total_games` from statistics with badge `games_played`
- If discrepancy found, update badge to match statistics
- Log reconciliation actions for audit

### Badge Lifecycle

1. **First Game Played**
   - Player completes first game (game over)
   - Score successfully submitted to blockchain
   - **⚠️ Demo Mode Check**: Verify game was NOT played in demo mode
   - **Validation**: Minimum duration, minimum score, not duplicate
   - Backend detects no existing badge
   - Calls `mint_badge()` on smart contract
   - Badge minted with Starter tier
   - Badge transferred to player's wallet
   - **Error Handling**: If mint fails, queue for retry

2. **Subsequent Games**
   - Player completes game (game over)
   - Score successfully submitted to blockchain
   - **⚠️ Demo Mode Check**: Verify game was NOT played in demo mode
   - **Validation**: Minimum duration, minimum score, not duplicate
   - Backend queries current `games_played` from statistics (only counts non-demo games)
   - Backend queries current badge tier
   - Calculates new tier based on games_played
   - If tier increased, calls `update_badge_tier()`
   - **Error Handling**: If update fails, queue for retry
   - Frontend refreshes badge display

3. **Tier Upgrade**
   - Smart contract updates badge metadata
   - Event emitted for frontend to react
   - Visual update triggered (color change, effects)
   - Discounts automatically updated

### Demo Mode Restrictions

**Critical Requirement**: Demo mode games must NOT count towards badge progression.

**Restrictions**:
- ❌ **No Badge Minting**: Demo mode games cannot trigger badge minting
- ❌ **No Game Count**: Demo mode games do not increment `games_played` counter
- ❌ **No Tier Updates**: Demo mode games cannot trigger tier upgrades
- ✅ **Demo Mode Identification**: System must clearly identify and flag demo mode sessions

**Implementation Requirements**:

1. **Backend Validation**:
   - Check for demo mode flag before processing any badge-related operations
   - Only count games where `is_demo_mode === false` or `demo_mode === false`
   - Reject badge minting requests from demo mode sessions
   - Skip game count increments for demo mode games

2. **Smart Contract Protection**:
   - Contract should verify game session is not demo mode (if flag passed)
   - Consider adding `is_demo_mode: bool` parameter to relevant functions
   - Reject transactions that attempt to update badge from demo sessions

3. **Statistics Integration**:
   - Ensure statistics system tracks `is_demo_mode` flag
   - Only include non-demo games in `total_games` count used for badge progression
   - Demo mode games may be tracked separately for analytics but not for badge progression

4. **Frontend Handling**:
   - Clearly indicate when playing in demo mode
   - Show message: "Demo mode games do not count towards badge progression"
   - Disable badge-related UI elements during demo mode
   - Prevent badge display/updates during demo sessions

**Example Validation Logic**:
```javascript
// Backend validation before badge operations
function canMintBadge(playerAddress, gameSession) {
  // Check if game was played in demo mode
  if (gameSession.is_demo_mode === true) {
    return {
      allowed: false,
      reason: "Demo mode games cannot mint badges"
    };
  }
  
  // Validate game completion requirements
  if (gameSession.duration < MIN_GAME_DURATION) {
    return {
      allowed: false,
      reason: "Game duration too short"
    };
  }
  
  if (gameSession.score < MIN_SCORE) {
    return {
      allowed: false,
      reason: "Game score too low"
    };
  }
  
  // Check if score was successfully submitted
  if (!gameSession.score_submitted) {
    return {
      allowed: false,
      reason: "Score not submitted"
    };
  }
  
  // Check if player already has a badge
  if (hasExistingBadge(playerAddress)) {
    return {
      allowed: false,
      reason: "Player already has a badge"
    };
  }
  
  return { allowed: true };
}

function shouldUpdateBadge(playerAddress, gameSession) {
  // Demo mode games never count
  if (gameSession.is_demo_mode === true) {
    return false;
  }
  
  // Validate game completion requirements
  if (gameSession.duration < MIN_GAME_DURATION) {
    return false;
  }
  
  if (gameSession.score < MIN_SCORE) {
    return false;
  }
  
  // Only update if game was completed and score submitted
  if (!gameSession.completed || !gameSession.score_submitted) {
    return false;
  }
  
  // Check idempotency - has this game already been counted?
  // Use the same session_id from score submission (already validated on-chain)
  if (isGameAlreadyCounted(gameSession.session_id)) {
    return false; // Already counted, skip
  }
  
  // Note: session_id is the same UUID generated at game start
  // It's already stored in GameSession object on-chain from score submission
  
  return true;
}

// Retry queue management
async function queueBadgeUpdate(updateData) {
  // Store in local queue (localStorage or backend queue)
  const queue = getRetryQueue();
  queue.push({
    ...updateData,
    attempts: 0,
    lastAttempt: Date.now()
  });
  saveRetryQueue(queue);
  
  // Attempt immediate update
  await attemptBadgeUpdate(updateData);
}

async function attemptBadgeUpdate(updateData) {
  try {
    await updateBadgeTier(updateData.playerAddress, updateData.sessionId);
    markGameAsCounted(updateData.sessionId);
    removeFromRetryQueue(updateData.sessionId);
  } catch (error) {
    // Increment attempts, schedule retry
    updateData.attempts++;
    updateData.lastAttempt = Date.now();
    scheduleRetry(updateData);
  }
}
```

**Move Contract Example**:
```move
// Badge registry to track counted session IDs (similar to SessionRegistry for scores)
public struct BadgeRegistry has key {
    id: UID,
    counted_sessions: Table<vector<u8>, bool>,  // session_id -> true if counted
}

public fun update_badge_tier(
    badge: &mut EarlySupporterBadge,
    registry: &mut BadgeRegistry,
    games_played: u64,
    is_demo_mode: bool,
    session_id: vector<u8>,  // Same session_id from score submission
    ctx: &mut TxContext
) {
    // Reject demo mode updates
    assert!(!is_demo_mode, E_DEMO_MODE_NOT_ALLOWED);
    
    // Idempotency check - prevent counting same session twice
    assert!(!table::contains(&registry.counted_sessions, session_id), E_SESSION_ALREADY_COUNTED);
    
    // Mark session as counted
    table::add(&mut registry.counted_sessions, session_id, true);
    
    // Calculate and update tier
    let new_tier = get_badge_tier(games_played);
    if (new_tier > badge.tier) {
        badge.tier = new_tier;
        badge.last_updated = sui::clock::timestamp_ms(ctx);
    }
    
    // Update games_played count
    badge.games_played = games_played;
}
```

**Integration with Existing Session ID System**:
- ✅ **Reuse session ID** from `GameSession` object (already on-chain from score submission)
- ✅ **Extend SessionRegistry pattern** - create `BadgeRegistry` to track counted games
- ✅ **Same validation** - session ID already validated for score submission, reuse for badge
- ✅ **No duplicate generation** - use existing `game.sessionId` from game start
- ✅ **On-chain verification** - session ID stored in `GameSession` object, can query for badge counting

### Update Frequency

**Options**:
- **Real-time**: Update after every game completion (recommended)
- **Batch**: Update periodically (e.g., daily) - not recommended (delayed feedback)
- **On-demand**: Update when player views badge - not recommended (missed updates)

**Recommendation**: **Real-time updates** after game completion with robust error handling.

**Update Timing**:
- **When**: After successful score submission (game end)
- **Why**: Prevents exploitation, ensures game was actually played
- **Error Handling**: Queue failed updates, retry automatically
- **User Feedback**: Show update status, allow manual retry if needed

### Gas Cost Considerations

- **Minting**: One-time cost for first-time players
- **Updates**: Only when tier increases (not every game)
- **Queries**: Read-only, no gas cost
- **Optimization**: Batch updates if gas becomes concern

---

## 🎮 User Experience Flow

### First-Time Player Journey

1. Player connects wallet
2. Player completes first game
3. **Badge Minting Notification**:
   - "🎉 Congratulations! You've received an Early Supporter Badge!"
   - Show badge preview with Starter tier
   - Explain badge evolution system
   - **Important**: Explain badge is soulbound (non-transferable) - represents personal achievement
4. Badge appears in wallet (marked as "Soulbound" or "Non-Transferable")
5. Badge displayed in game UI

### Tier Upgrade Experience

1. Player completes game that triggers tier upgrade
2. **Upgrade Animation**:
   - Current badge fades out
   - New tier badge fades in with color transition
   - Particle effects for visual impact
   - Sound effect (optional)
3. **Notification**:
   - "🌟 Badge Upgraded! You're now [Tier Name]!"
   - Show new benefits (discounts)
4. Badge automatically updates in wallet
5. Store discounts immediately active

### Badge Display Locations

1. **Game Header/Profile**
   - Small badge icon next to player name
   - Hover/tap to see full badge and tier info

2. **Store Interface**
   - Badge displayed prominently
   - Discount percentage shown
   - "Your [Tier] badge saves you X%!"

3. **Wallet/NFT Gallery**
   - Full badge display
   - Metadata and attributes visible
   - **Non-transferable** - Badge is soulbound to owner (cannot be sold or traded)

4. **Leaderboard**
   - Badge icon next to player name
   - Indicates supporter status

---

## 🔐 Security & Validation

### Soulbound Token (Non-Transferable) Implementation

**Critical Design Decision**: Badges are **Soulbound Tokens (SBTs)** - non-transferable NFTs.

**Implementation on Sui**:
- Badge struct has `key` ability but **NOT** `store` ability
- Without `store` ability, badge cannot be transferred or sold
- Badge is permanently bound to the original owner's wallet
- This prevents:
  - Selling badges on marketplaces
  - Transferring badges to other wallets
  - Trading badges between players
  - Badge farming/exploitation

**Why Soulbound?**:
- Badges represent **personal achievement** and **early supporter status**
- Prevents badge farming or exploitation
- Ensures badges reflect actual player progression
- Maintains integrity of tier system (can't buy high-tier badges)
- Aligns with purpose: recognition of individual player dedication

**Technical Implementation**:
```move
// Soulbound badge - only 'key' ability, no 'store'
public struct EarlySupporterBadge has key {
    // ... fields ...
}
// This prevents transfer: transfer::public_transfer() will fail
```

**User Communication**:
- Clearly indicate badges are non-transferable in UI
- Explain that badges represent personal achievement
- Show badge as "Soulbound" or "Non-Transferable" in wallet
- Consider adding badge description: "This badge is permanently bound to your wallet and cannot be transferred or sold"

### Minting Security

- **One Badge Per Player**: Prevent duplicate minting
- **Wallet Verification**: Ensure wallet is connected and valid
- **First Game Verification**: Verify player actually completed a game
- **Demo Mode Validation**: ❌ **CRITICAL** - Reject minting from demo mode games
- **Rate Limiting**: Prevent abuse of minting function
- **Soulbound Enforcement**: Badge struct lacks `store` ability (enforced by Sui)

### Tier Update Security

- **Games Played Verification**: Verify games_played from on-chain statistics (only non-demo games)
- **Demo Mode Validation**: ❌ **CRITICAL** - Reject updates from demo mode games
- **Tier Calculation Validation**: Ensure tier calculation is correct
- **Update Authorization**: Only badge owner or authorized backend can update
- **Replay Protection**: Prevent duplicate tier updates

### Discount Application Security

- **Badge Ownership Verification**: Verify player owns badge before discount
- **Tier Verification**: Verify current tier from on-chain data
- **Discount Calculation**: Calculate discount server-side, verify on-chain
- **Transaction Validation**: Ensure discount applied correctly in transactions

---

## 📈 Economic Considerations

### Discount Impact Analysis

**Store Discounts** (DECIDED):
- Discounts: 0%, 5%, 10%, 15%, 20%, 25% (Starter through Legendary)
- Applied to all store purchases
- Need to monitor tier distribution and revenue impact
- May need adjustment based on player feedback and economic analysis

**Gameplay Discounts** (DECIDED):
- Discounts: 0%, 0%, 5%, 10%, 15%, 20% (Starter through Legendary)
- Applied to game start cost (pay-to-play)
- Example: $0.05 per game base cost, 20% discount = $0.04 per game
- Payment covers gas fees and possible token burns by admin account
- Need to monitor economic impact and player feedback

### Badge Value Proposition

**For Players**:
- **Personal Achievement Recognition** (soulbound - represents individual dedication)
- Status symbol (tier progression tied to actual gameplay)
- Utility value (discounts on store and gameplay)
- Early supporter recognition (permanent, non-transferable proof)
- **Authentic Progression** (can't buy or trade high-tier badges - must earn them)

**For Project**:
- Player retention incentive (badges tied to continued play)
- Engagement driver (progression system)
- Community building tool (early supporters feel recognized)
- Marketing/PR value (early supporter story)
- **Integrity Protection** (soulbound prevents badge farming/exploitation)
- **Fair Progression** (tier system reflects actual player dedication, not wealth)

### Future Monetization (Optional)

- **Badge Trading**: ❌ **NOT APPLICABLE** - Badges are soulbound (non-transferable)
- **Badge Upgrades**: Paid tier upgrades (controversial, consider carefully)
- **Badge Variants**: Special edition badges for events (also soulbound)
- **Badge Fusion**: Combine multiple badges (advanced feature, if implemented)
- **Note**: Since badges are non-tradable, they cannot be monetized through sales/trading

---

## 🚀 Implementation Phases (Future)

### Phase 1: Foundation
- Smart contract development
- Badge minting functionality
- Basic tier system (Starter → Common → Uncommon)
- On-chain statistics integration

### Phase 2: Evolution
- Complete tier system (all 6 tiers)
- Visual evolution system
- Tier upgrade notifications
- Badge display in game UI

### Phase 3: Utility
- Store discount integration
- Gameplay discount system
- Discount verification and application
- UI updates for discount display

### Phase 4: Enhancement
- Advanced visual effects
- Badge gallery/viewer
- Leaderboard integration
- Community features

---

## ❓ Open Questions & Decisions Needed

### Tier Thresholds
- [x] **Tier Thresholds** - ✅ **DECIDED**: Option A - Faster Progression with Extremely Rare Legendary
  - Starter: 1-5 games
  - Common: 6-15 games
  - Uncommon: 16-35 games
  - Rare: 36-75 games
  - Epic: 76-149 games
  - Legendary: 150+ games (rare and prestigious)
  - Rationale: Fast early progression for MVP, extremely exclusive Legendary tier
  - Can be adjusted based on player data after launch
- [ ] Consider seasonal adjustments or special events (future consideration)

### Visual Design
- [x] **Orb Integration** - ✅ **DECIDED**: Use `Blue_Orb_Shot.webp` as central element
- [x] **Trail Approach** - ✅ **DECIDED**: Static trail in image (Option A) for NFT compatibility
- [x] **Color Scheme** - ✅ **DECIDED**: All tiers finalized (Starter: Gray/Silver, Common: Sui Blue, Uncommon: Green, Rare: Deep Purple, Epic: Orange/Red, Legendary: Gold/Rainbow Neo Tokyo)
- [x] **Badge Shape** - ✅ **DECIDED**: Hexagonal frame
- [x] **Trail Pattern Design** - ✅ **DECIDED**: Spiral pattern (behind orb for lower tiers, behind + around for higher tiers)
- [x] **Badge Frame Styles** - ✅ **DECIDED**: Consistent thickness, single layer, clean progression to neo Tokyo aesthetic, designer chooses specific patterns/decorations
- [x] **Orb Size** - ✅ **DECIDED**: 40-50% of hexagon width (recommended: 45% of hexagon width)
- [x] **Particle Effects** - ✅ **DECIDED**: Static particles around orb for Epic/Legendary (Epic: orange/red particles, Legendary: gold/rainbow particles)
- [x] **Image Format** - ✅ **DECIDED**: WebP recommended for on-chain (best compression)
- [x] **Image Resolution** - ✅ **DECIDED**: 512x512px (optimal for wallet gallery, ~40-80KB WebP)
  - **Primary consideration**: Wallet/NFT gallery (primary viewing location)
  - Perfect quality at wallet full view (512px)
  - Perfect quality at wallet thumbnail (256px with 2x scaling)
  - In-game modals (Main Menu, Store, Consumption) can display at comfortable sizes
  - Leaves ~170-210KB for metadata in 256KB object limit (plenty of room)
  - Excellent quality at all display sizes
- [x] **Image Storage** - ✅ **DECIDED**: On-chain `image_data` (vector<u8>)
  - **Decision**: Store images on-chain as `vector<u8>` in badge object
  - **Rationale**: 
    - Leverages Sui's object-centric model and dynamic NFT capabilities
    - True decentralization - no external dependencies
    - Atomic updates - tier and image update together
    - Storage Fund makes on-chain storage economically viable
  - **Constraints**: 
    - Sui object size limit: 256KB total (image + metadata)
    - Image size: 512x512px WebP ~40-80KB (well within limit)
    - Leaves ~170-210KB for metadata (plenty of room)
  - **Implementation**: Store `image_data: vector<u8>` in `EarlySupporterBadge` struct
  - **Note**: Must test final object size before deployment to ensure <256KB
- [x] **Badge Generation Workflow** - ✅ **DECIDED**: Manual generation
  - Create badge images manually using design tools
  - Design each tier as a separate image file
  - Full design control for polished, custom designs
  - Create 6 tier-specific badge images (Starter, Common, Uncommon, Rare, Epic, Legendary)
  - Export as 512x512px WebP format for on-chain storage
  - Optimize compression to target <200KB per image

### Discount Levels
- [x] **Store Discount Percentages** - ✅ **DECIDED**: 0%, 5%, 10%, 15%, 20%, 25% (Starter through Legendary)
  - Applied to all store purchases (consumables, power-ups, etc.)
  - May need adjustment based on player feedback and economic analysis
- [x] **Gameplay Discount Percentages** - ✅ **DECIDED**: 0%, 0%, 5%, 10%, 15%, 20% (Starter through Legendary)
  - Applied to game start cost (pay-to-play, e.g., $0.05 per game)
  - Example: $0.05 per game with 20% discount = $0.04 per game
  - Payment covers gas fees and possible token burns by admin account
  - May need adjustment based on player feedback and economic analysis
- [ ] Model economic impact (can be done during implementation/testing)
- [ ] Set discount caps (if any) - Currently no caps, may add if needed

### Technical Decisions
- [x] **Game Counting Timing** - ✅ **DECIDED**: Count at game end (after score submission) with robust error handling
  - Prevents exploitation (can't game by repeatedly starting games)
  - Requires validation: minimum duration, minimum score, not duplicate
  - Implements retry queue for failed updates
  - **Uses existing session ID system** from score submission for idempotency
  - Session ID already generated at game start (`game.sessionId = crypto.randomUUID()`)
  - Session ID already validated on-chain in `SessionRegistry` (prevents duplicate score submissions)
  - Reuse same session ID for badge counting (no duplicate generation needed)
  - Backend reconciliation as fallback
- [x] **Update Frequency** - ✅ **DECIDED**: Real-time updates (recommended approach)
- [x] **Error Handling** - ✅ **DECIDED**: Retry queue + background reconciliation job
  - Retry queue with exponential backoff for failed updates
  - Background reconciliation job to catch missed updates
  - Ensures data consistency
- [x] **Badge Transferability** - ✅ **DECIDED**: True soulbound (non-transferable)
  - Badge struct has `key` but NOT `store` ability
  - Player signs mint transaction, badge created directly in their wallet
  - Cannot be transferred, sold, or traded
- [x] **Minting Fee** - ✅ **DECIDED**: $0.10 dollar-pegged (user pays)
  - Frontend calculates SUI amount based on current price
  - Contract validates minimum payment (safety net)
  - Fee recipient: Admin wallet (set `FEE_RECIPIENT` constant before deployment)
  - Total cost: ~$0.11 ($0.10 minting fee + $0.01 gas)
- [x] **Image Storage** - ✅ **DECIDED**: On-chain `image_data` (vector<u8>)
  - Store 512x512px WebP images on-chain in badge object
  - Leverages Sui's object-centric model and dynamic NFT capabilities
  - True decentralization, atomic updates, no external dependencies
  - Image size ~40-80KB, leaves ~170-210KB for metadata (well within 256KB limit)
- [x] **Image Storage Method** - ✅ **DECIDED**: Pass images as parameters (backend loads and passes)
  - Backend loads WebP files from filesystem
  - Converts to `vector<u8>` format
  - Passes image data as parameter to `mint_badge()` and `update_badge_tier()`
  - Flexible, smaller contract size, can update images without redeploy
- [x] **Statistics System Integration** - ✅ **DECIDED**: Enhance existing `score_submission.move` contract
  - Add `PlayerStats` struct with `total_games` field
  - Track `total_games` in `Table<address, PlayerStats>`
  - Update `total_games` when each game session is submitted
  - Badge queries `PlayerStats.total_games` from score_submission contract
  - Demo games automatically excluded (they don't create GameSession objects)
  - Demo mode implementation will come later, but design accounts for it
- [x] **Metadata Storage** - ✅ **DECIDED**: Sui Object Display Standard
  - Configure Display object with template strings
  - Badge name: "Early Supporter Badge - {tier_name}"
  - Description: "A soulbound badge that evolves based on games played"
  - Attributes: tier, games_played, mint_date, discounts
  - Works in all wallets (Sui Wallet, Sui Explorer, etc.)
- [x] **Badge Registry Initialization** - ✅ **DECIDED**: Admin calls `init()` during deployment
  - Admin wallet calls `init()` function after contract deployment
  - Creates `BadgeRegistry` shared object
  - One-time setup, standard approach
- [x] **Demo mode restrictions** - ✅ **DECIDED**: Demo mode games cannot mint badges or count towards progression
- [ ] Gas optimization strategy (can be done during implementation)

### User Experience
- [x] **Badge Minting Flow** - ✅ **DECIDED**: Modal on game over screen after first game
  - Modal overlays game over screen immediately
  - Shows badge preview, explanation, perks, soulbound notice
  - Actions: "Mint Badge" (primary) or "Maybe Later" (secondary)
  - User pays $0.10 minting fee + gas fees
  - "Maybe Later" prompts again on next game completion
- [x] **Tier Upgrade Notifications** - ✅ **DECIDED**: Same flow as badge creation (at end of game)
  - After game over screen, check if badge tier upgraded
  - Show notification modal if tier upgraded
  - Modal shows: "Badge Upgraded!", new tier preview, new benefits
  - Same UX pattern as badge minting (consistent experience)
- [x] **Discount Application** - ✅ **DECIDED**: Query badge at modal loads
  - Store Modal: Query badge tier when user opens store modal
  - Start Game Modal: Query badge tier when user clicks "Start Game" (pay-to-play)
  - Apply discount percentage to prices/features
  - Display discount clearly in UI
- [ ] Badge display locations and prominence (decide during frontend implementation)
- [ ] Badge viewer/gallery design (post-MVP feature)
- [ ] Educational content for new players (can be added to modal)

### Future Features
- [ ] Badge trading/marketplace - ❌ **NOT APPLICABLE** (badges are soulbound/non-transferable)
- [ ] Special edition badges (also soulbound)
- [ ] Badge fusion/combination (if implemented, resulting badge also soulbound)
- [ ] Cross-game badge integration (if applicable)

---

## 📝 Notes & Considerations

### Player Retention
- Badge system should incentivize continued play
- Tier thresholds should feel achievable but rewarding
- Visual progression should be satisfying

### Economic Balance
- Discounts should reward players without breaking economics
- Consider lifetime value vs. discount cost
- Monitor tier distribution over time

### Technical Scalability
- Ensure badge system scales with player base
- Optimize gas costs for frequent updates
- Consider layer 2 solutions if needed

### Community Impact
- Early supporters should feel recognized
- Badge should be a status symbol
- Consider community events around badge milestones
- Soulbound nature emphasizes personal achievement and dedication
- Prevents badge market manipulation or exploitation

### Legal/Compliance
- Ensure NFT structure complies with regulations
- Consider tax implications of NFT ownership
- Review terms of service for badge system

---

## 🔍 Additional Considerations & Edge Cases

### Wallet & Account Management

**Multiple Wallets Per Player**:
- **Decision**: ✅ Badge is per wallet (wallet-specific)
- **Rationale**: 
  - Badge is soulbound to specific wallet address
  - If player uses different wallet, they start fresh (no badge transfer)
  - This is by design (soulbound = permanent binding to wallet)
- **Implementation**: Badge tied to wallet address, not player identity

**Wallet Loss/Recovery**:
- **Decision**: ✅ Not responsible for wallet loss
- **Rationale**: 
  - Badge is permanently bound to wallet (soulbound token)
  - If wallet is lost, badge cannot be recovered
  - This is inherent to blockchain and soulbound token design
- **Documentation**: Clearly communicate that badge loss is permanent if wallet is lost

**Wallet Switching During Game**:
- **Decision**: ✅ Not an issue - wallet module not available during gameplay
- **Rationale**: 
  - Wallet connection happens before game starts
  - Wallet module is not accessible during active gameplay
  - Session ID tied to wallet at game start, cannot change mid-session
- **Implementation**: No special handling needed - wallet locked during game

### Statistics System Integration

**Source of Truth for Games Played**:
- **Decision**: ✅ Statistics system is authoritative source
- **Rationale**: 
  - Statistics system already tracks `total_games` on-chain
  - Badge `games_played` should match statistics `total_games` (non-demo games only)
  - Statistics system is the single source of truth for game counts
- **Implementation Strategy**:
  1. **Query Statistics First**: When updating badge, query statistics system for `total_games`
  2. **Badge Sync**: Badge `games_played` should always match statistics `total_games` (non-demo)
  3. **Update Logic**: 
     - Calculate tier based on statistics `total_games`
     - Update badge `games_played` to match statistics
     - Only update badge if tier would change OR if `games_played` is out of sync
  4. **Reconciliation**: Periodic job to sync badge `games_played` with statistics `total_games`

**Statistics System Location**:
- **Decision**: ✅ **Enhance existing `score_submission.move` contract to track total games**
- **Current State**: 
  - `score_submission.move` contract exists and stores `GameSession` objects
  - Each game creates a `GameSession` object owned by the player
  - No aggregated `total_games` count currently exists
- **Enhancement Plan**:
  - Add `PlayerStats` struct to `score_submission.move` contract
  - Track `total_games` per player in a `Table<address, PlayerStats>`
  - Update `total_games` when each game session is submitted
  - Badge system queries `PlayerStats.total_games` from this contract
- **Demo Mode Handling**:
  - **Decision**: Demo mode games will NOT create `GameSession` objects
  - Demo games won't call `submit_game_session_for_player()` at all
  - This automatically excludes demo games from `total_games` count
  - No need for `is_demo_mode` flag in `GameSession` - demo games simply don't create sessions
  - Demo mode setup will be implemented later, but design accounts for it
- **Benefits**:
  - Fast single query for game count
  - Single source of truth in existing contract
  - No need to query/count multiple `GameSession` objects
  - Demo games automatically excluded (they don't create sessions)
- **Implementation Approach**:
  ```javascript
  // Pseudo-code for badge update flow
  async function updateBadgeFromStatistics(playerAddress, sessionId) {
    // 1. Query PlayerStats from score_submission contract for total games
    // Demo games are automatically excluded (they don't create GameSession objects)
    const playerStats = await queryPlayerStats(playerAddress); // From score_submission contract
    const totalGames = playerStats.total_games; // Already excludes demo (demo games don't create sessions)
    
    // 2. Query current badge
    const badge = await queryBadge(playerAddress);
    const currentGamesPlayed = badge?.games_played || 0;
    
    // 3. Check if update needed
    if (totalGames === currentGamesPlayed) {
      return; // Already in sync, no update needed
    }
    
    // 4. Calculate new tier
    const newTier = calculateTier(totalGames);
    const currentTier = badge?.tier || 0;
    
    // 5. Update badge if tier changed OR games_played out of sync
    if (newTier > currentTier || totalGames !== currentGamesPlayed) {
      await updateBadgeTier(playerAddress, totalGames, newTier, sessionId);
    }
  }
  ```

**Contract Enhancement Required**:
- Add `PlayerStats` struct to `score_submission.move`:
  ```move
  public struct PlayerStats has key, store {
      id: UID,
      player: address,
      total_games: u64,  // Total games played (non-demo only)
      // Can add other stats here if needed
  }
  
  // Shared object to store player statistics
  public struct StatisticsRegistry has key {
      id: UID,
      player_stats: Table<address, PlayerStats>,
  }
  ```
- Update `submit_game_session_for_player()` to increment `total_games`
- Add view function `get_player_stats(player: address): PlayerStats` for badge queries

**Statistics Query Considerations**:
- **Demo Mode Tracking**: 
  - ✅ **DECIDED**: Demo games will NOT create `GameSession` objects
  - Demo games won't call `submit_game_session_for_player()` at all
  - This automatically excludes demo games from statistics
  - No need for `is_demo_mode` flag - demo games simply don't submit sessions
  - Demo mode implementation will come later, but design accounts for it
- **Query Performance**:
  - Fast single query: `get_player_stats(player_address)` returns `total_games`
  - No need to query/count multiple `GameSession` objects
  - Consider caching game count in backend for performance (optional)

**Sync Frequency**:
- **Real-time**: Update badge immediately after score submission (recommended)
- **Batch**: Periodic sync job as backup (daily/weekly reconciliation)
- **On-demand**: Sync when player views badge (fallback)
- **Recommendation**: Real-time updates with batch reconciliation as safety net

### Edge Cases & Error Scenarios

**Note**: These will be considered and addressed during implementation phase.

**Key Scenarios to Handle**:
- Score submission succeeds, badge update fails (retry queue + reconciliation)
- Network failures during badge update (retry logic with exponential backoff)
- Contract upgrades (Sui supports package upgrades, badges remain valid)
- Emergency pause mechanism (admin-only pause function for maintenance/exploits)

**Implementation**: Will work through these scenarios during development and testing.

### Testing & Rollout Strategy

**Testing Approach**: ✅ Testnet first (same as rest of the app)
- **Testnet Deployment**: Deploy badge system to Sui testnet
- **Testing**: Comprehensive testing on testnet before mainnet
- **Process**: Follow same testing methodology as other game features
- **Timeline**: Test thoroughly on testnet, then deploy to mainnet when ready

### Cost Analysis

**Cost Model**:
- **Minting**: Done by admin account (not user-paid)
- **Updates**: Done by admin account (not user-paid)
- **User Payment**: Users pay to play game, which covers badge costs and score submission
- **Analysis**: Will discuss actual costs once we start testing on testnet
- **Monitoring**: Track gas costs during testnet testing to understand actual expenses

### User Experience Considerations

**Badge Visibility**:
- **Decision**: ✅ Badge visible in discussed areas (Main Menu, Store, Item Consumption Modal)
- **Implementation**: Will determine exact display design during implementation
- **No Opt-Out**: Badge is automatic for first-time players, no opt-out mechanism needed
- **Privacy**: Not a concern - badge progression is public on-chain (inherent to blockchain)

### Backend Infrastructure

**Note**: Will work through backend architecture during implementation phase.

**Key Components**:
- Badge update queue and retry logic
- Statistics system integration
- Error monitoring and logging
- Reconciliation processes

**Implementation**: Architecture will be designed and built during development.

### Integration Points

**Store & Game Discount Application**:
- **Decision**: ✅ Discounts load upon modal loading
- **Implementation**: 
  - Query badge tier when Store modal opens
  - Query badge tier when gameplay discount modal opens
  - Apply discount percentage to prices/features
  - Display discount clearly in UI
- **Performance**: Cache badge tier, refresh on wallet connect/disconnect

**UI Display Integration**:
- **Locations**: Main Menu, Store, Item Consumption Modal
- **Implementation**: Will determine exact display design during implementation
- **Components**: Badge display component with tier-based styling and loading states

### Future Enhancements

**Note**: Future enhancements will be considered after initial implementation is complete.

**Potential Enhancements** (for future consideration):
- Badge history/provenance tracking
- Special edition badges for events
- Cross-game badge integration
- Additional badge types or features

---

## 🔗 Related Documentation

- [Sui Integration Overview](./01-overview-and-architecture.md)
- [Smart Contracts Guide](./05-smart-contracts.md)
- [Store System Documentation](./STORE_READY_TO_BUILD.md)
- [Tier System Documentation](../sui-integration/TIER_SYSTEM.md)
- [Statistics System](../sui-integration/../project-status/PROJECT_STATUS.md)

---

## 📅 Document History

- **2025-11-18**: Initial planning document created
- Future updates will track design decisions and implementation progress

---

**Status**: This is a planning document. Implementation will begin after design decisions are finalized and approved.

