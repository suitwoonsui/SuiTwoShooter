# Leaderboard Carousel Design - Discussion Document

## 🎯 Overview

Design discussion for integrating blockchain leaderboard into the main menu modal with a carousel-style interface similar to Insomnia's leaderboard system.

**Status:** Design Phase - Discussion  
**Related:** Phase 4.3 (Blockchain Leaderboard Integration)  
**Reference:** [11. Blockchain Leaderboard Integration](./11-blockchain-leaderboard.md)

---

## 📋 Current State

### Existing Implementation
- **Location:** `src/game/systems/ui/leaderboard-system.js`
- **Current Behavior:** 
  - Creates separate modal that replaces main menu
  - Uses localStorage for scores
  - Simple list display (rank, name, score)
  - "Back to Menu" button to return

### Main Menu Structure
- **File:** `index.html` (main menu overlay)
- **Button:** "Leaderboard" button in menu buttons section
- **Modal System:** Uses viewport-container for panels (settings, instructions, sound-test)

---

## 🎨 Proposed Design (Insomnia-Style Carousel)

### Layout Structure

```
┌─────────────────────────────────────────┐
│         [Category Title]                │  ← Top: Category name with icon
│      (e.g., "🏆 Overall Score")         │
├─────────────────────────────────────────┤
│  ←  │  [Leaderboard List]  │  →        │  ← Middle: Leaders with arrows
│     │  Rank | Address | Name | Score    │
│     │  1    | 0x1234  | Test | 50,000  │
│     │  2    | 0x5678  |      | 45,000  │
│     │  ...                              │
├─────────────────────────────────────────┤
│    [Refresh] [Back to Menu]             │  ← Bottom: Actions
└─────────────────────────────────────────┘
```

### Key Features

1. **Category Title (Top)**
   - Centered category name with icon
   - Examples:
     - 🏆 Overall Score
     - 📏 Distance Traveled
     - 👹 Bosses Defeated
     - 💀 Enemies Defeated
     - 💰 Coins Collected

2. **Carousel Navigation (Left/Right Arrows)**
   - Left arrow (←) - Previous category
   - Right arrow (→) - Next category
   - Arrows on sides of leaderboard list
   - Circular navigation (wraps around)
   - Disabled when only one category

3. **Leaderboard List (Center)**
   - Top 10-25 players per category
   - Display format:
     - Rank (1, 2, 3...)
     - Wallet address (always shown, truncated: `0x1234...5678`)
     - Player name (separate column, shown if provided, empty if not)
     - Primary stat (score, distance, etc.)
     - Secondary stats (bosses, enemies, coins) - smaller text
   - Loading state while fetching
   - Empty state when no scores
   - Error state on API failure

4. **Actions (Bottom)**
   - Refresh button (🔄) - Reload current category
   - Back to Menu button (←) - Return to main menu

---

## 📊 Proposed Categories (Based on Actual Captured Stats)

**Available Stats from Blockchain:**
- ✅ `score` - Total game score
- ✅ `distance` - Distance traveled (meters)
- ✅ `coins` - Coins collected
- ✅ `bossesDefeated` - Number of bosses defeated
- ✅ `enemiesDefeated` - Number of enemies defeated
- ✅ `longestCoinStreak` - Longest coin streak (now included in backend)
- ✅ `timestamp` - Submission timestamp (ISO string format) - **For weekly/time-based leaderboards**
- ✅ `playerName` - Optional player name (if provided)
- ✅ `walletAddress` - Player wallet address
- ✅ `transactionHash` - Transaction digest for verification

**Note:** Tier is NOT captured or stored. It's an internal game mechanic, not a user stat.

**Time-Based Features Enabled:**
- Weekly leaderboards (filter by timestamp range)
- Daily leaderboards
- Monthly leaderboards
- Time-based rankings (e.g., "Best score this week")

### Category 1: Overall Score (Default)
- **Icon:** 🏆
- **Primary Stat:** Score
- **Secondary Stats:** Distance, Bosses, Enemies
- **Sort:** Descending by score
- **API:** `GET /api/leaderboard?sort=score&limit=25`

### Category 2: Distance Traveled
- **Icon:** 📏
- **Primary Stat:** Distance (meters)
- **Secondary Stats:** Score, Bosses, Enemies
- **Sort:** Descending by distance
- **API:** `GET /api/leaderboard?sort=distance&limit=25`

### Category 3: Bosses Defeated
- **Icon:** 👹
- **Primary Stat:** Bosses Defeated
- **Secondary Stats:** Score, Distance, Enemies
- **Sort:** Descending by bosses defeated
- **API:** `GET /api/leaderboard?sort=bosses&limit=25`

### Category 4: Enemies Defeated
- **Icon:** 💀
- **Primary Stat:** Enemies Defeated
- **Secondary Stats:** Score, Distance, Bosses
- **Sort:** Descending by enemies defeated
- **API:** `GET /api/leaderboard?sort=enemies&limit=25`

### Category 5: Coins Collected
- **Icon:** 💰
- **Primary Stat:** Coins Collected
- **Secondary Stats:** Score, Distance, Bosses
- **Sort:** Descending by coins
- **API:** `GET /api/leaderboard?sort=coins&limit=25`

### Category 6: Longest Coin Streak
- **Icon:** 🔥
- **Primary Stat:** Longest Coin Streak
- **Secondary Stats:** Score, Coins, Distance
- **Sort:** Descending by streak
- **API:** `GET /api/leaderboard?sort=streak&limit=25`

---

## 🔧 Technical Implementation

### Component Structure

```javascript
// Leaderboard state
let leaderboardState = {
  categories: [
    { id: 'score', name: 'Overall Score', icon: '🏆', sort: 'score', primaryField: 'score' },
    { id: 'distance', name: 'Distance Traveled', icon: '📏', sort: 'distance', primaryField: 'distance' },
    { id: 'bosses', name: 'Bosses Defeated', icon: '👹', sort: 'bosses', primaryField: 'bossesDefeated' },
    { id: 'enemies', name: 'Enemies Defeated', icon: '💀', sort: 'enemies', primaryField: 'enemiesDefeated' },
    { id: 'coins', name: 'Coins Collected', icon: '💰', sort: 'coins', primaryField: 'coins' },
    { id: 'streak', name: 'Longest Coin Streak', icon: '🔥', sort: 'streak', primaryField: 'longestCoinStreak' }
  ],
  currentCategoryIndex: 0,
  leaderboardData: [],
  isLoading: false,
  lastUpdated: null,
  error: null
};
```

### Functions Needed

1. **`showLeaderboard()`** - Modified to show carousel modal
2. **`hideLeaderboard()`** - Close modal, return to menu
3. **`fetchBlockchainLeaderboard(category)`** - Fetch data for category
4. **`displayLeaderboard(category, data)`** - Render leaderboard list
5. **`nextCategory()`** - Move to next category (carousel)
6. **`prevCategory()`** - Move to previous category (carousel)
7. **`refreshLeaderboard()`** - Reload current category
8. **`formatAddress(address)`** - Truncate wallet address (always shown)
9. **`formatPlayerName(entry)`** - Display player name if available, otherwise empty string

### API Integration

**Backend Endpoint:** `GET /api/leaderboard`

**Query Parameters:**
- `sort`: `score` | `distance` | `bosses` | `enemies` | `coins` | `streak` (optional)
- `limit`: Number of entries (default: 25, max: 100)

**Response Format:**
```json
{
  "leaderboard": [
    {
      "walletAddress": "0x1234...5678",
      "playerName": "TestPlayer",  // Optional: only present if player provided a name
      "score": 50000,
      "distance": 10000,
      "coins": 250,
      "bossesDefeated": 3,
      "enemiesDefeated": 150,
      "longestCoinStreak": 12,
      "transactionHash": "0x...",
      "timestamp": "2025-01-15T12:00:00.000Z"  // ISO format, enables time-based filtering
    }
  ],
  "count": 50,
  "limit": 25
}
```

**Note:** 
- Backend currently returns all stats, but sorting is done client-side. May need backend update to support `sort` parameter for better performance.
- **Timestamp is captured** from Sui Clock when score is submitted, enabling time-based filtering for weekly/monthly leaderboards (see Phase 9: Leaderboard Rewards).

---

## 🎨 UI/UX Considerations

### Modal Integration
- **Option A:** Replace main menu (current behavior)
  - Pros: Full screen, more space
  - Cons: Hides menu, requires "Back" button
  
- **Option B:** Overlay on main menu (like settings panel)
  - Pros: Menu still visible, consistent with other panels
  - Cons: Less space, might feel cramped

**Recommendation:** Option B (overlay) for consistency with settings/instructions panels

### Responsive Design
- **Desktop:** Full carousel with arrows
- **Mobile:** 
  - Swipe gestures for category navigation
  - Smaller arrows or touch targets
  - Compact list display

### Loading States
- Show spinner while fetching
- Display "Loading leaderboard..." message
- Maintain previous data during refresh

### Error Handling
- Network errors: "Failed to load leaderboard"
- Empty state: "No scores yet! Be the first to play!"
- Retry button on errors

### Visual Design
- Match existing game theme (dark, futuristic)
- Arrows: Large, visible, hover effects
- Category title: Prominent, centered
- List items: Clear hierarchy (rank, address, stats)

---

## 📝 Questions for Discussion

1. **Category Selection:**
   - Which categories should we include? (We have 5-6 options based on actual stats)
   - Should we start with just "Overall Score" and add more later?
   - Include "Coins Collected" and "Longest Coin Streak" categories?

2. **Modal Behavior:**
   - Overlay on menu (like settings) or replace menu?
   - Should it be dismissible by clicking outside?

3. **Data Display:**
   - How many entries per category? (10, 25, 50?)
   - Show pagination or just top N?
   - Include "Your Rank" indicator if player is on leaderboard?
   - Show timestamp/date for each entry? (for transparency)

4. **Time-Based Filtering:**
   - Add "This Week" / "This Month" / "All Time" filter options?
   - Use `timestamp` field to filter entries by date range
   - Enable weekly leaderboard views (see Phase 9: Leaderboard Rewards)

5. **Refresh Strategy:**
   - Manual refresh only?
   - Auto-refresh every X seconds?
   - Refresh on category change?

6. **Mobile Experience:**
   - Swipe gestures for category navigation?
   - Different layout for mobile?

7. **Performance:**
   - Cache leaderboard data?
   - Load all categories at once or on-demand?
   - Cache time-based filtered results?

---

## 🚀 Implementation Plan

**📋 Detailed Step-by-Step Plan:** See [LEADERBOARD_IMPLEMENTATION_PLAN.md](./LEADERBOARD_IMPLEMENTATION_PLAN.md) for complete implementation order.

### Quick Overview

**Phase 1: Update Frontend Modal Structure (2-3 hours)**
- Build carousel UI with category title, arrows, columns
- Add navigation logic (next/prev category)
- Use mock data for testing layout
- **Goal:** Get UI structure working before connecting to API

**Phase 2: Wire to Blockchain API (2-3 hours)**
- Replace mock data with blockchain API calls
- Implement client-side sorting by category
- Add loading/error states
- **Goal:** Connect to real blockchain data

**Phase 3: Polish & Enhancements (1-2 hours)**
- Add secondary stats
- Improve error handling
- Mobile optimization
- **Goal:** Final polish and testing

---

## 📚 Related Documents

- [11. Blockchain Leaderboard Integration](./11-blockchain-leaderboard.md) - Implementation guide
- [IMPLEMENTATION_ROADMAP.md](./IMPLEMENTATION_ROADMAP.md) - Phase 4.3 details
- [INTEGRATION_CHECKLIST.md](./INTEGRATION_CHECKLIST.md) - Section 12

---

## 💬 Next Steps

1. **Review this design** - Discuss categories, layout, behavior
2. **Decide on modal behavior** - Overlay vs. replace menu
3. **Finalize category list** - Which categories to include
4. **Approve implementation plan** - Proceed with Phase 1
5. **Update documentation** - Add to implementation guide once approved

---

**Status:** Ready for Discussion  
**Last Updated:** 2025-01-15

