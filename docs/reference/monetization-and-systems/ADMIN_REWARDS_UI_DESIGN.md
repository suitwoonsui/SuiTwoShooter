# Admin Rewards Management UI Design

## Overview

A unified admin interface for managing all reward types (milestones, daily login, tournaments) in a single tab with sub-categories for each reward type.

## UI Structure

### Main Admin Tab: "Rewards"

```
┌─────────────────────────────────────────────────────────────┐
│  Admin Dashboard > Rewards                                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─ Sub-Tabs ───────────────────────────────────────────┐  │
│  │  [Milestones] [Daily Login] [Tournament Events]     │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─ Content Area (changes based on active sub-tab) ─────┐  │
│  │                                                       │  │
│  │  [Sub-tab content here]                              │  │
│  │                                                       │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Sub-Tab 1: Milestone Rewards

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Milestone Rewards Management                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [Create New Milestone] [+ Add Milestone]                  │
│                                                             │
│  ┌─ Category Filter ───────────────────────────────────┐  │
│  │  Category: [All ▼]                                    │  │
│  │  [Games Played] [Bosses Per Game] [Bosses Cumulative]│  │
│  │  [Score Per Game] [Score Cumulative] [Distance...]    │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─ Milestones Table ───────────────────────────────────┐  │
│  │                                                       │  │
│  │  Category    │ Level │ Threshold │ Credits │ Items  │  │
│  │  ───────────────────────────────────────────────────  │  │
│  │  Games Played│   1   │     5     │    1    │ 2 items│  │
│  │              │       │           │         │ [View]  │  │
│  │  Games Played│   2   │    15     │    2    │ 3 items│  │
│  │              │       │           │         │ [View]  │  │
│  │  Games Played│   3   │    35     │    3    │ 4 items│  │
│  │              │       │           │         │ [View]  │  │
│  │  ...         │  ...  │    ...    │   ...   │ ...    │  │
│  │                                                       │  │
│  │  [Edit] [Delete] buttons per row                      │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─ Milestone Details (Expanded View) ───────────────────┐  │
│  │  When a row is expanded or "View" is clicked:        │  │
│  │                                                       │  │
│  │  Category: Games Played                               │  │
│  │  Level: 1                                             │  │
│  │  Threshold: 5 games                                   │  │
│  │                                                       │  │
│  │  Rewards:                                             │  │
│  │  • Credits: 1                                         │  │
│  │  • Items:                                             │  │
│  │    - Extra Lives Level 1 x1                          │  │
│  │    - Orb Level Level 1 x1                            │  │
│  │                                                       │  │
│  │  [Edit Rewards] [Delete Milestone]                   │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Features

1. **Category Filtering**
   - Filter by category (Games Played, Score, Coins, etc.)
   - "All" shows all milestones across categories
   - Grouped display by category

2. **Milestones Table**
   - Shows all milestones for selected category
   - Columns: Category, Level, Threshold, Credits, Items Count
   - Sortable columns
   - Expandable rows to show full details

3. **Create/Edit Milestone**
   - Wizard flow:
     - Step 1: Select Category
     - Step 2: Select Level (or auto-increment)
     - Step 3: Set Threshold
     - Step 4: Configure Rewards (Universal Reward UI - Milestone Mode)
     - Step 5: Review & Create
   - Edit: Click "Edit" → Load existing → Modify → Save

4. **Reward Display**
   - Compact view: "2 items" with [View] button
   - Expanded view: Full list of items with quantities
   - Visual item icons

5. **Bulk Operations** (Future)
   - Import milestones from CSV
   - Export milestones to CSV
   - Bulk edit thresholds
   - Copy rewards from one milestone to another

## Sub-Tab 2: Daily Login Rewards

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Daily Login Rewards Management                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [Create New Reward] [+ Add Daily Reward]                  │
│                                                             │
│  ┌─ Streak Day Filter ──────────────────────────────────┐  │
│  │  Show: [All Days ▼]                                   │  │
│  │  [Days 1-7] [Milestone Days (7,14,30)] [All]          │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─ Daily Rewards Table ─────────────────────────────────┐  │
│  │                                                       │  │
│  │  Day │ Credits │ Items │ Tickets │ Status            │  │
│  │  ───────────────────────────────────────────────────  │  │
│  │   1  │    0    │ 1 item│    0    │ ✅ Configured     │  │
│  │      │         │ [View]│         │                    │  │
│  │   2  │    0    │ 1 item│    0    │ ✅ Configured     │  │
│  │      │         │ [View]│         │                    │  │
│  │  ... │   ...   │  ...  │   ...   │ ...               │  │
│  │   7  │    0    │ 2 items│   0    │ ✅ Configured     │  │
│  │      │         │ [View]│         │                    │  │
│  │  14  │    5    │ 3 items│   0    │ ✅ Configured     │  │
│  │      │         │ [View]│         │                    │  │
│  │  30  │   10    │ 5 items│   0    │ ✅ Configured     │  │
│  │      │         │ [View]│         │                    │  │
│  │                                                       │  │
│  │  [Edit] button per row                                 │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─ Reward Details (Expanded View) ───────────────────────┐  │
│  │  When a row is expanded or "View" is clicked:         │  │
│  │                                                       │  │
│  │  Streak Day: 7                                        │  │
│  │  (Weekly milestone day)                               │  │
│  │                                                       │  │
│  │  Rewards:                                             │  │
│  │  • Credits: 0                                         │  │
│  │  • Items:                                             │  │
│  │    - Extra Lives Level 1 x1                          │  │
│  │    - Slow Time Level 1 x1 (alternates weekly)         │  │
│  │  • Tickets: 0                                         │  │
│  │                                                       │  │
│  │  [Edit Rewards] [Delete Reward]                      │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─ Streak Configuration ────────────────────────────────┐  │
│  │  Milestone Days: [7] [14] [30] [Add Day]              │  │
│  │  Grace Period: [1] day (optional)                     │  │
│  │  Cycle Pattern: [7-day cycle] [Custom]               │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Features

1. **Day-Based Organization**
   - Table shows all configured days (1-7, 14, 30, etc.)
   - Visual indicators for milestone days (7, 14, 30)
   - Shows which days are configured vs. missing

2. **Create/Edit Daily Reward**
   - Click "Create New Reward" or "+ Add Daily Reward"
   - Select streak day (1-7, 14, 30, or custom)
   - Configure rewards using Universal Reward UI (Daily Login Mode)
   - Save reward for that day

3. **Streak Configuration**
   - Configure which days are milestone days
   - Set grace period (optional 1-day grace)
   - Configure cycle pattern (7-day cycle or custom)

4. **Reward Preview**
   - Shows what players receive for each day
   - Visual calendar view (optional)
   - Preview escalation pattern

## Sub-Tab 3: Tournament Event Rewards

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Tournament Event Rewards Management                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [Create New Tournament] [+ Add Tournament]                 │
│                                                             │
│  ┌─ Tournament Filter ───────────────────────────────────┐  │
│  │  Status: [All ▼] [Active] [Ended] [Upcoming]          │  │
│  │  Category: [All ▼] [High Score] [Coins] [Streak...]   │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─ Tournaments Table ───────────────────────────────────┐  │
│  │                                                       │  │
│  │  Name        │ Category │ Status │ Prize Pool │ Rewards│  │
│  │  ───────────────────────────────────────────────────  │  │
│  │  Weekly #1   │ High Score│ Active│ $200.00   │ Default│  │
│  │              │           │       │           │ [View] │  │
│  │  Weekly #2   │ Coins     │ Active│ $150.00   │ Custom │  │
│  │              │           │       │           │ [View] │  │
│  │  ...         │  ...     │  ...  │   ...     │ ...   │  │
│  │                                                       │  │
│  │  [Edit] [View Rewards] [Distribute] buttons          │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─ Tournament Rewards Details (Expanded View) ───────────┐  │
│  │  When "View Rewards" is clicked:                      │  │
│  │                                                       │  │
│  │  Tournament: Weekly #2                                │  │
│  │  Status: Active                                       │  │
│  │  Prize Pool: $150.00                                  │  │
│  │  Starting Ante: $50.00                                │  │
│  │                                                       │  │
│  │  Reward Configuration:                                │  │
│  │  • Type: [Custom ▼] (or Default)                      │  │
│  │  • Reward Depth: 10 players                           │  │
│  │  • Pool Depth: 3 players                              │  │
│  │  • Pool Distribution: 50%, 30%, 20%                 │  │
│  │                                                       │  │
│  │  Item Rewards:                                        │  │
│  │  Rank 1: Destroy All x1, Boss Kill x1, Random L1 x1 │  │
│  │  Rank 2: Boss Kill x1, Random L1 x1                  │  │
│  │  Rank 3: Destroy All x1, Random L1 x1                │  │
│  │  Ranks 4-10: Random L1 x1 each                        │  │
│  │                                                       │  │
│  │  [Edit Rewards] [Add to Prize Pool]                   │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─ Default Tournament Rewards ──────────────────────────┐  │
│  │  [Edit Default Configuration]                         │  │
│  │  (Opens Universal Reward UI with default values)      │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Features

1. **Tournament List**
   - Shows all tournaments (active, ended, upcoming)
   - Filter by status and category
   - Shows prize pool and reward type (Default vs Custom)

2. **Tournament Creation**
   - "Create New Tournament" button
   - Opens tournament creation wizard (existing flow)
   - Includes reward configuration step (Universal Reward UI)

3. **Reward Configuration View**
   - Shows whether tournament uses default or custom rewards
   - If custom: Shows full reward configuration
   - If default: Shows "Using default system" with link to edit defaults

4. **Edit Tournament Rewards**
   - Can edit rewards before tournament starts
   - Uses Universal Reward UI (Tournament Mode)
   - Cannot edit after tournament ends (read-only)

5. **Default Tournament Rewards**
   - Separate section for editing default tournament reward configuration
   - Changes affect all new tournaments (unless they use custom config)
   - Uses Universal Reward UI

## Unified Features Across All Sub-Tabs

### 1. Universal Reward UI Integration

All three sub-tabs use the same `UniversalRewardSelector` component:
- **Milestone Mode**: Credits + Items (no pool, no ranks)
- **Daily Login Mode**: Credits + Items + Tickets (no pool, no ranks)
- **Tournament Mode**: Pool rewards + Rank-based items

### 2. Reward Preview

All sub-tabs show:
- What rewards are configured
- Visual preview of items
- Credits/tickets amounts
- For tournaments: Estimated rewards based on current prize pool

### 3. Bulk Operations (Future)

- Export all rewards to CSV
- Import rewards from CSV
- Copy rewards between entities
- Bulk edit thresholds/values

### 4. Search & Filter

- Search by name, category, threshold
- Filter by reward type, status
- Sort by any column

## Component Structure

### Main Component: `RewardsTab.tsx`

```typescript
interface RewardsTabProps {
  isAdminWalletConnected: boolean;
  connectedAddress: string | null;
  styles: AdminStyles;
}

export function RewardsTab({ isAdminWalletConnected, connectedAddress, styles }: RewardsTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<'milestones' | 'dailyLogin' | 'tournaments'>('milestones');
  
  return (
    <div>
      {/* Sub-tab navigation */}
      <div style={{ 
        display: 'flex', 
        gap: '0.5rem', 
        marginBottom: '2rem',
        borderBottom: `2px solid ${styles.border}`
      }}>
        <button
          onClick={() => setActiveSubTab('milestones')}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: activeSubTab === 'milestones' ? styles.buttonPrimary : 'transparent',
            color: activeSubTab === 'milestones' ? 'white' : styles.text,
            border: 'none',
            borderBottom: activeSubTab === 'milestones' ? `3px solid ${styles.buttonPrimary}` : '3px solid transparent',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '1rem',
          }}
        >
          ⭐ Milestones
        </button>
        <button
          onClick={() => setActiveSubTab('dailyLogin')}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: activeSubTab === 'dailyLogin' ? styles.buttonPrimary : 'transparent',
            color: activeSubTab === 'dailyLogin' ? 'white' : styles.text,
            border: 'none',
            borderBottom: activeSubTab === 'dailyLogin' ? `3px solid ${styles.buttonPrimary}` : '3px solid transparent',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '1rem',
          }}
        >
          📅 Daily Login
        </button>
        <button
          onClick={() => setActiveSubTab('tournaments')}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: activeSubTab === 'tournaments' ? styles.buttonPrimary : 'transparent',
            color: activeSubTab === 'tournaments' ? 'white' : styles.text,
            border: 'none',
            borderBottom: activeSubTab === 'tournaments' ? `3px solid ${styles.buttonPrimary}` : '3px solid transparent',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '1rem',
          }}
        >
          🏆 Tournament Events
        </button>
      </div>
      
      {/* Sub-tab content */}
      {activeSubTab === 'milestones' && (
        <MilestoneRewardsSubTab
          isAdminWalletConnected={isAdminWalletConnected}
          connectedAddress={connectedAddress}
          styles={styles}
        />
      )}
      {activeSubTab === 'dailyLogin' && (
        <DailyLoginRewardsSubTab
          isAdminWalletConnected={isAdminWalletConnected}
          connectedAddress={connectedAddress}
          styles={styles}
        />
      )}
      {activeSubTab === 'tournaments' && (
        <TournamentRewardsSubTab
          isAdminWalletConnected={isAdminWalletConnected}
          connectedAddress={connectedAddress}
          styles={styles}
        />
      )}
    </div>
  );
}
```

### Integration with Admin Page

**Add to `backend/app/admin/types.ts`:**
```typescript
export type Tab = 'items' | 'badges' | 'migration' | 'tournaments' | 'rewards' | 'soundTest';
```

**Add to `backend/app/admin/page.tsx`:**
```typescript
import { RewardsTab } from './tabs/RewardsTab';

// In TabNavigation component, add:
{activeTab === 'rewards' && (
  <RewardsTab
    isAdminWalletConnected={isAdminWalletConnected}
    connectedAddress={connectedAddress}
    styles={styles}
  />
)}
```

### Sub-Components

1. **MilestoneRewardsSubTab.tsx**
   - Category filter
   - Milestones table
   - Create/Edit milestone wizard
   - Reward display

2. **DailyLoginRewardsSubTab.tsx**
   - Day filter
   - Daily rewards table
   - Create/Edit daily reward
   - Streak configuration

3. **TournamentRewardsSubTab.tsx**
   - Tournament list
   - Tournament creation wizard
   - Reward configuration view
   - Default rewards editor

## Data Flow

### Loading Rewards

1. **Milestones:**
   - `GET /api/admin/milestones` - Get all milestones
   - Returns: `Array<{ category, level, threshold, credits, items }>`
   - Grouped by category

2. **Daily Login:**
   - `GET /api/admin/daily-login/rewards` - Get all daily login rewards
   - Returns: `Array<{ day, credits, items, tickets }>`
   - Sorted by day

3. **Tournaments:**
   - `GET /api/admin/tournaments` - Get all tournaments
   - Returns: `Array<{ id, name, category, status, prizePool, rewardConfig }>`
   - Filtered by status

### Creating/Editing Rewards

All use the same pattern:
1. Open Universal Reward UI (appropriate mode)
2. Configure rewards
3. Save via API
4. Refresh table

## Key Features Summary

### Unified View
- **Single Tab**: All reward management in one place
- **Sub-Categories**: Easy navigation between reward types
- **Consistent UI**: Same patterns across all reward types

### Milestone Rewards
- View all milestones by category
- See all reward tiers (Level 1, 2, 3, etc.) for each category
- See rewards (credits + items) for each tier
- Create/Edit/Delete milestones
- Category-based organization

### Daily Login Rewards
- View all daily rewards by streak day
- See reward tiers (Day 1, 2, 3... 7, 14, 30)
- See rewards (credits + items + tickets) for each day
- Create/Edit/Delete daily rewards
- Streak configuration

### Tournament Event Rewards
- View all tournaments
- See reward configuration (Default vs Custom)
- See reward tiers (Rank 1-10) and their rewards
- Edit tournament rewards (before start)
- Default tournament rewards editor

## Implementation Priority

1. **Phase 1: Create RewardsTab Component**
   - Add "Rewards" tab to admin navigation
   - Create `RewardsTab.tsx` component
   - Sub-tab navigation structure
   - Placeholder content for each sub-tab

2. **Phase 2: Milestone Rewards Sub-Tab**
   - Milestones table with category filtering
   - Load milestones from API
   - Display all tiers and rewards
   - Create/Edit milestone wizard
   - Integrate Universal Reward UI (Milestone Mode)
   - Delete milestone functionality

3. **Phase 3: Daily Login Rewards Sub-Tab**
   - Daily rewards table (day-based)
   - Load daily rewards from API
   - Display all days and their rewards
   - Create/Edit daily reward
   - Integrate Universal Reward UI (Daily Login Mode)
   - Streak configuration UI

4. **Phase 4: Tournament Rewards Sub-Tab**
   - Tournament list with filters
   - Load tournaments from API
   - Reward configuration view (Default vs Custom)
   - Edit tournament rewards (before start)
   - Integrate Universal Reward UI (Tournament Mode)
   - Default tournament rewards editor

5. **Phase 5: Enhancements**
   - Search & filter across all reward types
   - Bulk operations (export/import)
   - Copy rewards between entities
   - Advanced filtering and sorting
   - Reward analytics dashboard

