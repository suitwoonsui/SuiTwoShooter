# Player Rewards UI Design

## Overview

This document describes the player-facing UI for viewing and claiming rewards. Players can:
- **View** all available rewards (milestones, daily login, tournaments)
- **Claim** eligible rewards (milestones, daily login)
- **Create** tournament events with custom reward configurations

## Player Capabilities by Reward Type

| Reward Type | View | Claim | Create |
|-------------|------|-------|--------|
| **Milestones** | ✅ Yes | ✅ Yes | ❌ No (Admin only) |
| **Daily Login** | ✅ Yes | ✅ Yes | ❌ No (Admin only) |
| **Tournament Events** | ✅ Yes | ❌ No (Auto-distributed) | ✅ Yes (With payment) |

## Player UI Components

### 1. Milestone Rewards View & Claim

**Location:** Leaderboard Modal → Milestones Tab

**Current Implementation:**
- Players can view milestone progress
- Shows current value, next target, progress bar
- "Claim Reward" button appears when milestones are eligible
- Clicking "Claim Reward" calls `/api/achievements/check` which:
  - Checks eligible milestones
  - Distributes rewards (credits + items)
  - Marks as claimed on-chain
  - Shows achievement popup

**UI Flow:**
```
1. Player opens Leaderboard Modal
   ↓
2. Player clicks "Milestones" tab
   ↓
3. Player sees all milestone categories:
   - Current value (left)
   - Category name + progress bar (middle)
   - Next target (right)
   ↓
4. If milestones are eligible:
   - "Claim Reward (X)" button appears
   - X = number of eligible milestones
   ↓
5. Player clicks "Claim Reward"
   ↓
6. Backend checks and distributes rewards
   ↓
7. Achievement popup appears (mandatory, blocks UI)
   ↓
8. Player closes popup
   ↓
9. Rewards are in inventory/GamePass
```

**No Changes Needed:** This is already implemented and working.

### 2. Daily Login Rewards View & Claim

**Location:** Main Menu (auto-display on login) or dedicated Daily Login button

**UI Components:**

**A. Daily Login Modal (Auto-Display)**
```
┌─────────────────────────────────────────────────┐
│  🎁 Daily Login Reward                          │
├─────────────────────────────────────────────────┤
│                                                 │
│  🔥 Current Streak: 5 days                      │
│  🏆 Longest Streak: 12 days                    │
│                                                 │
│  ┌─ Today's Reward ─────────────────────────┐  │
│  │  You've earned:                          │  │
│  │  • 0 Credits                              │  │
│  │  • 1x Orb Level Level 1                  │  │
│  │                                          │  │
│  │  [Claim Reward]                          │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
│  ┌─ Streak Calendar ─────────────────────────┐  │
│  │  Day 1  Day 2  Day 3  Day 4  Day 5  Day 6│  │
│  │   ✅     ✅     ✅     ✅     ✅     ⏳   │  │
│  │  Day 7 (Next milestone)                   │  │
│  │  • 2x Items                               │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
│  [Close]                                        │
└─────────────────────────────────────────────────┘
```

**B. Daily Login Status Display (Persistent)**
```
Main Menu Header:
┌─────────────────────────────────────┐
│  🔥 5 day streak                     │
│  (Click to view details)              │
└─────────────────────────────────────┘
```

**UI Flow:**
```
1. Player logs in
   ↓
2. Backend checks daily login status
   ↓
3. If reward available:
   - Backend automatically distributes (team pays gas)
   - Daily Login Modal appears (mandatory, blocks UI)
   - Shows streak and today's reward
   ↓
4. Player sees "Reward Claimed!" message
   ↓
5. Player closes modal
   ↓
6. Streak indicator appears in main menu
```

**Implementation:**
- Auto-display modal on login (if reward available)
- Persistent streak display in main menu
- Click streak indicator to view full calendar

### 3. Tournament Event Rewards View

**Location:** Tournament Modal → Tournament Details

**UI Components:**

**A. Tournament List View**
```
┌─────────────────────────────────────────────────┐
│  🏆 Tournaments                                 │
├─────────────────────────────────────────────────┤
│                                                 │
│  Tournament: Weekly High Score #1              │
│  Status: Active                                 │
│  Prize Pool: $200.00                            │
│                                                 │
│  ┌─ Reward Information ─────────────────────┐  │
│  │  Reward Type: Default                    │  │
│  │  Top 3: MEWS tokens (50%, 30%, 20%)     │  │
│  │  Top 10: Items (rank-based)              │  │
│  │                                          │  │
│  │  Estimated Rewards (if you rank #1):     │  │
│  │  • $50.00 in MEWS tokens                 │  │
│  │  • Destroy All x1                         │  │
│  │  • Boss Kill Shot x1                      │  │
│  │  • Random Level 1 x1                      │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
│  [Enter Tournament] [View Leaderboard]         │
└─────────────────────────────────────────────────┘
```

**B. Tournament Leaderboard (After Tournament Ends)**
```
┌─────────────────────────────────────────────────┐
│  Tournament: Weekly High Score #1               │
│  Status: Ended - Rewards Distributed            │
├─────────────────────────────────────────────────┤
│                                                 │
│  Your Rank: #3                                  │
│                                                 │
│  ┌─ Your Rewards ───────────────────────────┐  │
│  │  ✅ Rewards Distributed!                  │  │
│  │  • $20.00 in MEWS tokens (in wallet)      │  │
│  │  • Destroy All x1 (in inventory)          │  │
│  │  • Random Level 1 x1 (in inventory)       │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
│  [View Full Leaderboard]                        │
└─────────────────────────────────────────────────┘
```

**Player Actions:**
- **View**: Can see reward configuration for any tournament
- **View**: Can see their rank and rewards after tournament ends
- **No Claim**: Rewards are automatically distributed (no player action needed)

### 4. Tournament Event Creation (Player)

**Location:** Main Menu → "Create Tournament" button

**UI Components:**

**A. Tournament Creation Wizard**
```
Step 1: Basic Info
┌─────────────────────────────────────────────────┐
│  Create Tournament Event                         │
├─────────────────────────────────────────────────┤
│                                                 │
│  Tournament Name: [________________]            │
│                                                 │
│  Category:                                      │
│  [🎯 High Score] [💰 Coins] [🔥 Streak]        │
│  [📏 Distance] [👹 Bosses] [💀 Enemies]        │
│                                                 │
│  [Next →]                                       │
└─────────────────────────────────────────────────┘

Step 2: Schedule
┌─────────────────────────────────────────────────┐
│  Tournament Schedule                             │
├─────────────────────────────────────────────────┤
│                                                 │
│  Start: [Date] [Time]                           │
│  End:   [Date] [Time]                           │
│                                                 │
│  Entry Fee: [1] tournament ticket(s)            │
│                                                 │
│  [← Back] [Next →]                              │
└─────────────────────────────────────────────────┘

Step 3: Reward Configuration
┌─────────────────────────────────────────────────┐
│  Configure Rewards                               │
├─────────────────────────────────────────────────┤
│                                                 │
│  [Universal Reward UI - Tournament Mode]        │
│  (Same component as admin, but player-facing)   │
│                                                 │
│  • Reward Depth: [10] players                   │
│  • Pool Depth: [3] players                      │
│  • Pool Distribution: 50%, 30%, 20%            │
│  • Item Rewards per Rank: [Configure...]        │
│                                                 │
│  [← Back] [Next →]                              │
└─────────────────────────────────────────────────┘

Step 4: Starting Ante
┌─────────────────────────────────────────────────┐
│  Starting Prize Pool Contribution                │
├─────────────────────────────────────────────────┤
│                                                 │
│  Add to Prize Pool: [$0.00]                     │
│  (Optional - leave $0.00 if no contribution)    │
│                                                 │
│  [← Back] [Next →]                              │
└─────────────────────────────────────────────────┘

Step 5: Review & Payment
┌─────────────────────────────────────────────────┐
│  Review Tournament                               │
├─────────────────────────────────────────────────┤
│                                                 │
│  Tournament: Weekly High Score #1                │
│  Category: High Score                            │
│  Start: Dec 15, 2024 12:00 PM                   │
│  End: Dec 22, 2024 12:00 PM                     │
│  Entry Fee: 1 ticket                             │
│                                                 │
│  Reward Configuration:                          │
│  • Reward Depth: 10 players                     │
│  • Pool Depth: 3 players                        │
│  • Pool Distribution: 50%, 30%, 20%            │
│  • Custom item rewards configured               │
│                                                 │
│  Starting Ante: $50.00                           │
│                                                 │
│  ┌─ Payment Summary ─────────────────────────┐  │
│  │  Tournament Creation Fee: $5.00           │  │
│  │  Starting Ante: $50.00                    │  │
│  │  ──────────────────────────────────────── │  │
│  │  Total: $55.00                             │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│  Payment Method: [SUI ▼] [MEWS] [USDC]         │
│                                                 │
│  [← Back] [Pay & Create Tournament]            │
└─────────────────────────────────────────────────┘
```

**Player Actions:**
- **Create**: Can create tournament events
- **Configure Rewards**: Uses Universal Reward UI (Tournament Mode)
- **Pay**: Must pay creation fee + starting ante
- **View**: Can view their created tournaments

## Player UI Locations

### Main Menu

**Reward-Related Buttons:**
- **Leaderboard** → Opens Leaderboard Modal
  - "Leaderboard" tab: View tournament leaderboards
  - "Milestones" tab: View and claim milestone rewards
- **Tournaments** → Opens Tournament Modal
  - View active tournaments
  - Enter tournaments
  - View tournament rewards
  - **Create Tournament** button (new)
- **Daily Login** → Opens Daily Login Modal (if reward available)
  - Auto-displays on login
  - Can be accessed via streak indicator

### Leaderboard Modal

**Tabs:**
1. **Leaderboard Tab**
   - View tournament leaderboards
   - View rankings and scores
   - No reward claiming (rewards auto-distributed)

2. **Milestones Tab**
   - View milestone progress
   - See all categories and tiers
   - **Claim Reward** button (when eligible)
   - Shows claimed vs. unclaimed milestones

### Tournament Modal

**Sections:**
1. **Active Tournaments**
   - List of active tournaments
   - Shows prize pool and reward info
   - "Enter Tournament" button
   - "View Details" button

2. **Tournament Details**
   - Full tournament information
   - Reward configuration display
   - Leaderboard (if active)
   - Your rank and rewards (if ended)

3. **Create Tournament** (New)
   - Tournament creation wizard
   - Reward configuration
   - Payment processing

## Player Actions Summary

### Milestones
- ✅ **View**: See all milestone categories, tiers, and rewards
- ✅ **Claim**: Click "Claim Reward" when eligible
- ❌ **Create/Edit**: Admin only

### Daily Login
- ✅ **View**: See streak, calendar, and rewards
- ✅ **Claim**: Automatic (backend distributes, modal shows confirmation)
- ❌ **Create/Edit**: Admin only

### Tournament Events
- ✅ **View**: See tournament details and reward configuration
- ✅ **Create**: Create tournaments with custom rewards (with payment)
- ✅ **View Rewards**: See rank and rewards after tournament ends
- ❌ **Claim**: Automatic (rewards auto-distributed when tournament ends)
- ❌ **Edit**: Cannot edit after creation (admin can edit before start)

## Implementation Components

### Player-Facing Components

1. **MilestoneRewardsView.tsx** (Already exists)
   - Located in Leaderboard Modal → Milestones tab
   - Shows progress and claim button
   - No changes needed

2. **DailyLoginModal.tsx** (To be created)
   - Auto-displays on login
   - Shows streak and today's reward
   - Confirmation of auto-claimed reward

3. **DailyLoginStreakIndicator.tsx** (To be created)
   - Persistent display in main menu
   - Shows current streak
   - Click to open Daily Login Modal

4. **TournamentRewardsView.tsx** (To be created)
   - Shows reward configuration for tournaments
   - Shows player's rank and rewards (after end)
   - Read-only view

5. **UserTournamentCreationWizard.tsx** (To be created)
   - Tournament creation wizard for players
   - Includes reward configuration step
   - Payment processing
   - Uses Universal Reward UI (Tournament Mode)

## API Endpoints (Player-Facing)

### Viewing Rewards

1. **GET /api/achievements/progress**
   - Get player's milestone progress and claimed status
   - Returns: `{ stats, claimed }`
   - Used by: Milestone Rewards View

2. **GET /api/daily-login/current**
   - Get player's daily login status
   - Returns: `{ streakLength, lastLoginDate, todayClaimed, todayReward }`
   - Used by: Daily Login Modal

3. **GET /api/tournaments/[id]**
   - Get tournament details including reward configuration
   - Returns: `{ tournament, rewardConfig, leaderboard }`
   - Used by: Tournament Details View

### Claiming Rewards

1. **POST /api/achievements/check**
   - Check and claim eligible milestones
   - Returns: `{ claimed: Array<EligibleAchievement> }`
   - Used by: Milestone "Claim Reward" button

2. **POST /api/daily-login/auto-claim** (Backend-only)
   - Automatically distributes daily login reward
   - Called by backend on login detection
   - Player doesn't call this directly

### Creating Tournaments

1. **POST /api/tournaments/create**
   - Create tournament event (player)
   - Requires payment (creation fee + starting ante)
   - Parameters: `{ name, category, startTime, endTime, entryFeeTickets, rewardConfig, startingAnteUsdCents, payment }`
   - Returns: `{ success, tournamentId }`

## Key Differences: Admin vs Player UI

| Feature | Admin UI | Player UI |
|---------|----------|-----------|
| **Milestone Management** | Create/Edit/Delete | View/Claim only |
| **Daily Login Management** | Create/Edit/Delete | View/Claim only |
| **Tournament Creation** | Create (no payment) | Create (with payment) |
| **Tournament Rewards** | Edit before start | View only |
| **Reward Configuration** | Full CRUD | View + Create (tournaments only) |

## Implementation Priority

1. **Phase 1: Milestone Rewards (Already Complete)**
   - ✅ View milestone progress
   - ✅ Claim milestone rewards
   - ✅ Achievement popup

2. **Phase 2: Daily Login Rewards UI**
   - Create Daily Login Modal
   - Create streak indicator
   - Auto-display on login
   - Show reward confirmation

3. **Phase 3: Tournament Rewards View**
   - Add reward configuration display to tournament details
   - Show player's rank and rewards after tournament ends
   - Read-only reward view

4. **Phase 4: Tournament Creation (Player)**
   - Create UserTournamentCreationWizard
   - Integrate Universal Reward UI
   - Payment processing
   - Tournament creation API

5. **Phase 5: Enhancements**
   - Reward history view
   - Reward analytics for players
   - Social sharing of achievements

