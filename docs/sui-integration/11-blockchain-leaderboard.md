# Blockchain Leaderboard Integration

## 📦 Phase 4.3: Blockchain Leaderboard Integration (MVP Critical)

This document covers implementing the blockchain-based leaderboard system, replacing localStorage with on-chain score queries.

**Status:** MVP Critical  
**Estimated Time:** 2-3 hours (basic) | 4-6 hours (with carousel)  
**Dependencies:** Phase 2.2 (Core API Routes), Phase 3.2 (API Client), Phase 4.2 (Transaction Signing)

**⚠️ Design Discussion:** See [LEADERBOARD_CAROUSEL_DESIGN.md](./LEADERBOARD_CAROUSEL_DESIGN.md) for carousel-style leaderboard design discussion.

**📋 Implementation Plan:** See [LEADERBOARD_IMPLEMENTATION_PLAN.md](./LEADERBOARD_IMPLEMENTATION_PLAN.md) for step-by-step implementation order (UI first, then wire to API).

---

## Overview

The leaderboard must be tied to the blockchain for transparency and competition. This is a core feature for a blockchain game.

**Current State:**
- ✅ Backend API route exists: `GET /api/leaderboard`
- ✅ Backend queries `ScoreSubmitted` events from blockchain
- ✅ Frontend connected to blockchain API
- ✅ Pagination with "Load More" button (20 items per page)
- ✅ Current wallet highlighting
- ✅ "Your Rank" section always displayed
- ✅ Mock data support for testing

**Goal:**
- ✅ Replace localStorage leaderboard with blockchain data
- ✅ Display on-chain scores with wallet addresses
- ✅ Show score, distance, bosses defeated, enemies defeated, coins, longest coin streak
- ✅ Handle loading and error states
- ✅ Pagination for large leaderboards
- ✅ Wallet highlighting and rank display

---

## Step 1: Backend API (Already Complete ✅)

The backend API route already exists at `backend/app/api/leaderboard/route.ts`:

```typescript
// GET /api/leaderboard
// Queries ScoreSubmitted events from blockchain
// Returns top scores sorted by score (descending)
```

**Query Parameters:**
- `limit`: Number of scores to return (default: 100, max: 1000)
- `mock`: Set to `'true'` to return mock data for testing (generates 200 entries)

**Response Format:**
```json
{
  "leaderboard": [
    {
      "walletAddress": "0x1234...5678",
      "playerName": "TestPlayer",  // Optional: only if provided
      "score": 50000,
      "distance": 10000,
      "coins": 250,
      "bossesDefeated": 3,
      "enemiesDefeated": 150,
      "longestCoinStreak": 12,
      "transactionHash": "0x...",
      "timestamp": "2025-01-15T12:00:00.000Z"  // ISO format - enables time-based filtering
    }
  ],
  "count": 50,
  "limit": 100
}
```

**Note:** The `timestamp` field is captured from Sui Clock when the score is submitted, enabling time-based filtering for weekly/monthly leaderboards (see Phase 9: Leaderboard Rewards).

---

## Step 2: Update Frontend Leaderboard System

### 2.1 Modify `src/game/systems/ui/leaderboard-system.js`

**Current Implementation:**
- Uses `localStorage.getItem('gameLeaderboard')`
- Stores scores locally
- Not connected to blockchain

**New Implementation:**

```javascript
// ==========================================
// BLOCKCHAIN LEADERBOARD SYSTEM
// ==========================================

const API_BASE_URL = window.API_BASE_URL || 'http://localhost:3000';

// Fetch leaderboard from blockchain
async function fetchBlockchainLeaderboard(limit = 100) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/leaderboard?limit=${limit}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data.leaderboard || [];
  } catch (error) {
    console.error('Error fetching blockchain leaderboard:', error);
    return []; // Return empty array on error
  }
}

// Format wallet address for display
function formatAddress(address) {
  if (!address) return 'Unknown';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// Format player name (empty if not provided)
function formatPlayerName(entry) {
  if (entry.playerName && entry.playerName.trim() !== '') {
    return entry.playerName;
  }
  return ''; // Empty string if no name
}

// Display blockchain leaderboard
async function displayLeaderboard() {
  const list = document.getElementById('leaderboardList');
  if (!list) {
    console.warn('⚠️ [LEADERBOARD] leaderboardList element not found');
    return;
  }
  
  // Show loading state
  list.innerHTML = '<li style="text-align: center; color: #888; padding: 20px;">Loading leaderboard from blockchain...</li>';
  
  try {
    // Fetch from blockchain
    const leaderboard = await fetchBlockchainLeaderboard(100);
    
    if (leaderboard.length === 0) {
      list.innerHTML = '<li style="text-align: center; color: #888; padding: 20px;">No scores yet!<br>Be the first to play!</li>';
      return;
    }
    
    // Clear and populate
    list.innerHTML = '';
    
    leaderboard.forEach((entry, index) => {
      const li = document.createElement('li');
      li.className = 'leaderboard-item';
      li.innerHTML = `
        <div style="display: flex; align-items: center;">
          <div class="rank">${index + 1}</div>
          <div class="player-address">${formatAddress(entry.walletAddress || entry.playerAddress)}</div>
          <div class="player-name">${formatPlayerName(entry)}</div>
        </div>
        <div class="player-score">${entry.score.toLocaleString()}</div>
      `;
      list.appendChild(li);
    });
  } catch (error) {
    console.error('Error displaying leaderboard:', error);
    list.innerHTML = '<li style="text-align: center; color: #f00; padding: 20px;">Error loading leaderboard<br>Please try again later</li>';
  }
}

// Add refresh functionality
function refreshLeaderboard() {
  displayLeaderboard();
}

// Auto-refresh every 30 seconds (optional)
let leaderboardRefreshInterval = null;

function startLeaderboardAutoRefresh() {
  if (leaderboardRefreshInterval) {
    clearInterval(leaderboardRefreshInterval);
  }
  leaderboardRefreshInterval = setInterval(() => {
    displayLeaderboard();
  }, 30000); // 30 seconds
}

function stopLeaderboardAutoRefresh() {
  if (leaderboardRefreshInterval) {
    clearInterval(leaderboardRefreshInterval);
    leaderboardRefreshInterval = null;
  }
}

// Initialize on page load
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    displayLeaderboard();
    // Optionally start auto-refresh
    // startLeaderboardAutoRefresh();
  });
}
```

### 2.2 Remove localStorage Dependencies

**Remove or deprecate:**
- `localStorage.getItem('gameLeaderboard')`
- `localStorage.setItem('gameLeaderboard', ...)`
- Local score saving (scores are saved on-chain via score submission)

**Keep:**
- Score submission still works (saves to blockchain)
- Leaderboard now reads from blockchain instead of localStorage

---

## Step 3: Enhanced Leaderboard Display

### 3.1 Show Additional Stats

Update the leaderboard display to show more information:

```javascript
leaderboard.forEach((entry, index) => {
  const li = document.createElement('li');
  li.className = 'leaderboard-item';
  li.innerHTML = `
    <div style="display: flex; align-items: center; flex: 1;">
      <div class="rank">${index + 1}</div>
      <div class="player-address">${formatAddress(entry.walletAddress || entry.playerAddress)}</div>
      <div class="player-name">${formatPlayerName(entry)}</div>
      <div style="flex: 1; font-size: 0.8em; color: #888;">
        ${entry.bossesDefeated} bosses • ${entry.enemiesDefeated || 0} enemies • ${Math.round(entry.distance)}m
      </div>
    </div>
    <div class="player-score">${entry.score.toLocaleString()}</div>
  `;
  list.appendChild(li);
});
```

### 3.2 Add Refresh Button

Add a refresh button to the leaderboard UI:

```html
<!-- In your leaderboard modal/UI -->
<button id="refreshLeaderboard" onclick="refreshLeaderboard()">
  🔄 Refresh
</button>
```

---

## Step 4: Error Handling

### 4.1 Network Errors

Handle cases where the backend is unavailable:

```javascript
async function fetchBlockchainLeaderboard(limit = 100) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/leaderboard?limit=${limit}`);
    
    if (!response.ok) {
      if (response.status === 503) {
        throw new Error('Service temporarily unavailable');
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data.leaderboard || [];
  } catch (error) {
    console.error('Error fetching blockchain leaderboard:', error);
    
    // Show user-friendly error
    if (error.message.includes('Failed to fetch')) {
      console.warn('⚠️ Backend API unavailable, leaderboard cannot be loaded');
    }
    
    return []; // Return empty array
  }
}
```

### 4.2 Empty State

Handle when no scores exist:

```javascript
if (leaderboard.length === 0) {
  list.innerHTML = `
    <li style="text-align: center; color: #888; padding: 20px;">
      <div>No scores yet!</div>
      <div style="margin-top: 10px; font-size: 0.9em;">
        Be the first to play and submit a score!
      </div>
    </li>
  `;
  return;
}
```

---

## Step 5: Testing

### 5.1 Test Checklist

- [ ] Leaderboard loads from blockchain API
- [ ] Wallet addresses are truncated correctly
- [ ] Scores are sorted by score (descending)
- [ ] Loading state displays while fetching
- [ ] Error state displays on API failure
- [ ] Empty state displays when no scores
- [ ] Refresh button works
- [ ] Auto-refresh works (if enabled)
- [ ] Additional stats display correctly (tier, bosses, distance)

### 5.2 Test Scenarios

1. **Normal Load:**
   - API returns scores
   - Leaderboard displays correctly
   - All fields show proper values

2. **Empty Leaderboard:**
   - No scores on blockchain
   - Empty state message displays

3. **API Error:**
   - Backend unavailable
   - Error message displays
   - User can retry

4. **Network Error:**
   - No internet connection
   - Error handling works
   - Graceful degradation

---

## Step 6: Integration with Score Submission

**Important:** Scores are submitted to blockchain via Phase 4.2 (Transaction Signing). The leaderboard automatically reflects new scores once they're on-chain.

**Flow:**
1. Player finishes game
2. Score submitted to blockchain (Phase 4.2)
3. Transaction confirmed
4. Leaderboard queries blockchain events
5. New score appears in leaderboard

**No additional integration needed** - the leaderboard reads from the same blockchain events that score submission creates.

---

## Related Documents

- [03. Sui SDK Integration](./03-sui-sdk-integration.md) - Backend API implementation
- [04. Frontend Integration](./04-frontend-integration.md) - General frontend patterns
- [IMPLEMENTATION_ROADMAP.md](./IMPLEMENTATION_ROADMAP.md) - Phase 4.3 details
- [INTEGRATION_CHECKLIST.md](./INTEGRATION_CHECKLIST.md) - Section 12

---

## Step 7: Enhanced Features (Completed ✅)

### 7.1 Pagination with "Load More"

**Implementation:**
- Shows 20 items at a time (configurable via `itemsPerPage`)
- "Load More" button appears when more entries are available
- Button shows remaining count: "Load More (X remaining)"
- Pagination resets when changing categories or refreshing

**Code Location:**
- `src/game/systems/ui/leaderboard-system.js` - `loadMoreLeaderboard()` function
- `updateLoadMoreButton()` - Manages button visibility

### 7.2 Current Wallet Highlighting

**Implementation:**
- Detects current connected wallet address
- Highlights wallet entry in blue when it appears in the displayed list
- Visual styling: `rgba(100, 200, 255, 0.15)` background, `3px solid #64c8ff` left border
- CSS class: `leaderboard-item-current-wallet`

### 7.3 "Your Rank" Section

**Implementation:**
- Always displayed at the top of the leaderboard (when wallet is connected)
- Shows your best rank for the current category
- Displays: rank number, address, name, and stat value
- Styled with orange/gold theme to distinguish from main list
- Works even if your wallet is already in the displayed list

**Features:**
- Calculates rank from all sorted data (up to 1000 entries)
- Category-specific (your rank may differ per category)
- Handles ties correctly (same value = same rank)

### 7.4 Mock Data for Testing

**Implementation:**
- Backend supports `?mock=true` query parameter
- Generates 200 mock entries with realistic data
- Frontend automatically requests 200 entries in mock mode
- Useful for testing pagination and UI with large datasets

**Usage:**
- Add `?mock=true` to game URL: `http://localhost:8000/?mock=true`
- Or set `USE_MOCK_LEADERBOARD=true` in backend environment

---

## Next Steps

After completing this phase:
- ✅ Leaderboard is blockchain-based
- ✅ Scores are transparent and verifiable
- ✅ Pagination supports large leaderboards
- ✅ Wallet highlighting and rank display enhance UX
- ✅ Ready for Phase 9: Leaderboard Rewards (Post-MVP)

**Note:** Leaderboard rewards (weekly prizes) will be implemented in Phase 9 after launch.

