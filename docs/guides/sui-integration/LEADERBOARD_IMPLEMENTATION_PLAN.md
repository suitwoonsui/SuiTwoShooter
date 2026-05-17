# Leaderboard Carousel Implementation Plan

## 🎯 Implementation Order

**Strategy:** Build UI structure first, then wire to blockchain API. This allows us to test the layout and interactions before connecting to real data.

---

## Phase 1: Update Frontend Modal Structure (2-3 hours)

### Step 1.1: Update Modal HTML Structure
**File:** `src/game/systems/ui/leaderboard-system.js` - `showLeaderboard()` function

**Changes:**
- Add category title section at top
- Add left/right arrow buttons
- Update list structure to show: Rank | Address | Name | Score
- Add refresh button
- Keep "Back to Menu" button

**Mock Data:** Use hardcoded sample data for now to test layout

```javascript
// Temporary mock data for testing
const mockLeaderboard = [
  { walletAddress: '0x1234...5678', playerName: 'TestPlayer', score: 50000, distance: 10000, bossesDefeated: 3, enemiesDefeated: 150 },
  { walletAddress: '0x5678...9012', playerName: '', score: 45000, distance: 9500, bossesDefeated: 2, enemiesDefeated: 120 },
  // ... more mock entries
];
```

### Step 1.2: Add Carousel Navigation Logic
**File:** `src/game/systems/ui/leaderboard-system.js`

**Functions to Add:**
- `nextCategory()` - Move to next category
- `prevCategory()` - Move to previous category
- `updateCategoryTitle()` - Update title based on current category
- Category state management

**Categories Array:**
```javascript
const categories = [
  { id: 'score', name: 'Overall Score', icon: '🏆', primaryField: 'score' },
  { id: 'distance', name: 'Distance Traveled', icon: '📏', primaryField: 'distance' },
  { id: 'bosses', name: 'Bosses Defeated', icon: '👹', primaryField: 'bossesDefeated' },
  { id: 'enemies', name: 'Enemies Defeated', icon: '💀', primaryField: 'enemiesDefeated' },
  { id: 'coins', name: 'Coins Collected', icon: '💰', primaryField: 'coins' },
  { id: 'streak', name: 'Longest Coin Streak', icon: '🔥', primaryField: 'longestCoinStreak' }
];
```

### Step 1.3: Update Display Function
**File:** `src/game/systems/ui/leaderboard-system.js` - `displayLeaderboardModal()`

**Changes:**
- Show separate columns: Address (always) and Name (if provided)
- Sort by current category's primary field
- Update category title when category changes
- Handle empty name column gracefully

### Step 1.4: Add CSS Styling
**Files:** `src/game/rendering/responsive/shared/shared-panels.css` or create new CSS file

**Styles Needed:**
- Carousel arrow buttons (left/right)
- Category title styling
- Leaderboard table/list with columns (Rank, Address, Name, Score)
- Responsive layout for mobile
- Loading/error states

**Test:** Modal should display with mock data, arrows should navigate categories (even if data doesn't change yet)

---

## Phase 2: Wire to Blockchain API (2-3 hours)

### Step 2.1: Replace Mock Data with API Call
**File:** `src/game/systems/ui/leaderboard-system.js`

**Add:**
- `fetchBlockchainLeaderboard(limit)` function
- API base URL configuration
- Error handling

**Update:**
- `displayLeaderboardModal()` to call API instead of using mock data
- Show loading state while fetching
- Show error state on failure

### Step 2.2: Implement Client-Side Sorting
**File:** `src/game/systems/ui/leaderboard-system.js`

**Add:**
- Sort leaderboard data by current category's primary field
- Handle all 6 categories (score, distance, bosses, enemies, coins, streak)
- Update display when category changes

### Step 2.3: Add Formatting Functions
**File:** `src/game/systems/ui/leaderboard-system.js`

**Functions:**
- `formatAddress(address)` - Truncate wallet address
- `formatPlayerName(entry)` - Return name if available, empty string if not
- `formatStatValue(entry, category)` - Format primary stat based on category

### Step 2.4: Add Refresh Functionality
**File:** `src/game/systems/ui/leaderboard-system.js`

**Add:**
- `refreshLeaderboard()` function
- Refresh button click handler
- Show loading state during refresh

**Test:** Leaderboard should load real data from blockchain, sort by category, show names when available

---

## Phase 3: Polish & Enhancements (1-2 hours)

### Step 3.1: Add Secondary Stats Display
- Show bosses, enemies, distance as secondary stats
- Format numbers appropriately

### Step 3.2: Improve Error Handling
- Network error messages
- Empty state messages
- Retry functionality

### Step 3.3: Add Loading States
- Spinner while fetching
- Smooth transitions between categories

### Step 3.4: Mobile Optimization
- Touch-friendly arrow buttons
- Responsive column layout
- Swipe gestures (optional)

---

## 📋 Implementation Checklist

### Phase 1: UI Structure
- [ ] Update `showLeaderboard()` HTML structure
- [ ] Add category title section
- [ ] Add left/right arrow buttons
- [ ] Update list to show: Rank | Address | Name | Score columns
- [ ] Add category navigation logic (next/prev)
- [ ] Add category state management
- [ ] Update `displayLeaderboardModal()` for new structure
- [ ] Add CSS for carousel layout
- [ ] Test with mock data

### Phase 2: Blockchain Integration
- [ ] Add `fetchBlockchainLeaderboard()` function
- [ ] Replace mock data with API call
- [ ] Add loading states
- [ ] Add error handling
- [ ] Implement client-side sorting by category
- [ ] Add `formatAddress()` function
- [ ] Add `formatPlayerName()` function
- [ ] Add refresh button functionality
- [ ] Test with real blockchain data

### Phase 3: Polish
- [ ] Add secondary stats display
- [ ] Improve error messages
- [ ] Add smooth transitions
- [ ] Mobile optimization
- [ ] Final testing

---

## 🎨 Modal Structure (After Phase 1)

```html
<div class="leaderboard-modal leaderboard-modal-visible">
  <div class="leaderboard-content">
    <!-- Category Title -->
    <div class="leaderboard-header">
      <h2>🏆 Overall Score</h2>
    </div>
    
    <!-- Carousel Navigation -->
    <div class="leaderboard-carousel">
      <button class="carousel-arrow carousel-arrow-left" onclick="prevCategory()">←</button>
      
      <!-- Leaderboard List -->
      <div class="leaderboard-list-container">
        <ul class="leaderboard-list" id="modalLeaderboardList">
          <!-- Entries will be added here -->
        </ul>
      </div>
      
      <button class="carousel-arrow carousel-arrow-right" onclick="nextCategory()">→</button>
    </div>
    
    <!-- Actions -->
    <div class="leaderboard-actions">
      <button class="menu-btn" onclick="refreshLeaderboard()">
        <span class="btn-icon">🔄</span> Refresh
      </button>
      <button class="menu-btn primary" onclick="hideLeaderboard()">
        <span class="btn-icon">←</span> Back to Menu
      </button>
    </div>
  </div>
</div>
```

---

## 📝 Entry Display Format

Each leaderboard entry should display:
```
Rank | Address        | Name      | Score
1    | 0x1234...5678  | TestPlayer| 50,000
2    | 0x5678...9012  |           | 45,000
```

- **Rank:** Always shown (1, 2, 3...)
- **Address:** Always shown (truncated)
- **Name:** Shown if provided, empty cell if not
- **Score:** Primary stat for current category

---

## 🔗 Related Documents

- [LEADERBOARD_CAROUSEL_DESIGN.md](./LEADERBOARD_CAROUSEL_DESIGN.md) - Design specifications
- [11. Blockchain Leaderboard Integration](./11-blockchain-leaderboard.md) - Implementation guide
- [IMPLEMENTATION_ROADMAP.md](./IMPLEMENTATION_ROADMAP.md) - Phase 4.3 details

---

**Status:** Ready for Implementation  
**Recommended Order:** Phase 1 (UI) → Phase 2 (API) → Phase 3 (Polish)

