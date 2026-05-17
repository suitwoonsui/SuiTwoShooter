# Tournament System Design

## Overview

Tournament system with ticket-based entry and category-specific competitions. Players purchase tickets to enter tournaments focused on specific goals (e.g., total coins, longest coin streak), with separate leaderboards and rewards for each category.

---

## Core Concept

### Tournament Structure
- **Ticket-Based Entry** - Players purchase tickets to enter tournaments
- **Category-Specific Competitions** - Each tournament focuses on a specific goal/category
- **Separate Leaderboards** - Each category has its own leaderboard
- **Category Winners** - Top players in each category receive rewards
- **Time-Limited** - Tournaments run for specific durations (daily, weekly, monthly)

### Tournament Categories

#### 1. Total Coins Tournament
**Goal:** Collect the most coins during tournament period
- **Metric:** `total_coins` accumulated during tournament
- **Tracking:** Sum of coins from all games played during tournament
- **Leaderboard:** Ranked by total coins collected

#### 2. Longest Coin Streak Tournament
**Goal:** Achieve the longest coin streak during tournament period
- **Metric:** `best_coin_streak` achieved during tournament
- **Tracking:** Highest single-game coin streak during tournament
- **Leaderboard:** Ranked by longest streak
- **Tie-Breaking:** Secondary: total coins, Tertiary: score, Final: timestamp (earliest wins)

#### 3. Score Tournament (Standard)
**Goal:** Achieve the highest score during tournament period
- **Metric:** `best_score` achieved during tournament
- **Tracking:** Highest single-game score during tournament
- **Leaderboard:** Ranked by highest score
- **Tie-Breaking:** Secondary: total coins, Tertiary: distance, Final: timestamp (earliest wins)

#### 4. Distance Tournament
**Goal:** Travel the farthest during tournament period
- **Metric:** `best_distance` achieved during tournament
- **Tracking:** Longest single-game distance during tournament
- **Leaderboard:** Ranked by longest distance
- **Tie-Breaking:** Secondary: score, Tertiary: enemies defeated, Final: timestamp (earliest wins)

#### 5. Bosses Defeated Tournament
**Goal:** Defeat the most bosses during tournament period
- **Metric:** `best_bosses_defeated` achieved during tournament
- **Tracking:** Most bosses defeated in a single game during tournament
- **Leaderboard:** Ranked by most bosses defeated
- **Tie-Breaking:** Secondary: score, Tertiary: enemies defeated, Final: timestamp (earliest wins)

#### 6. Enemies Defeated Tournament
**Goal:** Defeat the most enemies during tournament period
- **Metric:** `best_enemies_defeated` achieved during tournament
- **Tracking:** Most enemies defeated in a single game during tournament
- **Leaderboard:** Ranked by most enemies defeated
- **Tie-Breaking:** Secondary: score, Tertiary: bosses defeated, Final: timestamp (earliest wins)

---

## Tournament Formats

### 1. All vs All (Open Competition)
**Format:** All players compete together in a single leaderboard

**How It Works:**
- All participants compete in the same category
- Single global leaderboard
- Top 10 players win prizes
- No matchmaking or brackets

**Pros:**
- Simple to implement
- True competition - best player wins
- Large prize pools
- Easy to understand

**Cons:**
- New players compete against veterans
- Can feel unfair for beginners
- May discourage participation from lower-skilled players

**Best For:**
- Weekly/Monthly tournaments
- High-stakes competitions
- Players who want to test themselves against everyone

---

### 2. Tier-Based Tournaments
**Format:** Separate tournaments for different skill/badge tiers

**Tier Options:**

**A. Badge Tier-Based:**
- **Standard Tier Tournament** (0-4 games played)
- **Common Tier Tournament** (5-14 games played)
- **Uncommon Tier Tournament** (15-34 games played)
- **Rare Tier Tournament** (35-74 games played)
- **Epic Tier Tournament** (75-149 games played)
- **Legendary Tier Tournament** (150+ games played)

**B. Skill-Based Tiers:**
- **Beginner Tournament** (Average score < 10,000)
- **Intermediate Tournament** (Average score 10,000-50,000)
- **Advanced Tournament** (Average score 50,000-150,000)
- **Expert Tournament** (Average score 150,000+)

**How It Works:**
- Players automatically placed in tier based on badge/performance
- Separate leaderboards per tier
- Each tier has its own prize pool
- Players can only enter their tier's tournament

**Pros:**
- Fair competition - players compete against similar skill levels
- Encourages participation from all players
- Multiple winners across tiers
- Better engagement for beginners

**Cons:**
- More complex to implement
- Prize pools split across tiers
- Need to prevent tier manipulation
- More tournaments to manage

**Best For:**
- Daily tournaments
- Encouraging new player participation
- Fair competition across skill levels

---

### 3. Player vs Player (1v1)
**Format:** Direct matchups between two players

**How It Works:**
- Players are matched against each other
- Both players play the same category goal
- Winner advances, loser eliminated
- Bracket-style progression

**Bracket Types:**

**A. Single Elimination:**
- Lose once, you're out
- 8, 16, 32, 64, or 128 player brackets
- Winner takes all or top 3 get prizes

**B. Double Elimination:**
- Players get a second chance
- Lose twice before elimination
- More games, more engagement

**C. Round Robin:**
- Each player plays every other player
- Most wins = champion
- Fair but requires many games

**Pros:**
- Direct competition - head-to-head
- Exciting matchups
- Clear winner per matchup
- Bracket progression creates narrative

**Cons:**
- Requires matchmaking system
- Players must be online at same time (or async)
- More complex scheduling
- Smaller prize pools per bracket

**Best For:**
- Special events
- Weekend tournaments
- Competitive players who want direct competition

---

### 4. Team Tournaments
**Format:** Players form teams and compete together

**Team Structure:**

**A. Fixed Teams (3-5 players):**
- Players form teams before tournament
- Team score = sum/average of all team members
- Team leaderboard
- Team prizes split among members

**B. Dynamic Teams:**
- Players join teams during tournament
- Teams compete for team leaderboard
- Individual contributions tracked
- Both team and individual prizes

**How It Works:**
- Players create or join teams
- All team members' scores contribute to team total
- Team leaderboard ranked by team score
- Top teams win prizes (split among members)

**Team Features:**
- Team chat/coordination
- Team leaderboard
- Individual contribution tracking
- Team badges/rewards

**Pros:**
- Social engagement
- Encourages team play
- Larger prize pools (more players per team)
- Community building

**Cons:**
- Requires team management system
- Need to prevent team stacking
- Coordination challenges
- More complex scoring

**Best For:**
- Monthly championships
- Special events
- Community building
- Guild/clan systems

---

### 5. Hybrid Formats

**A. Tier-Based + All vs All:**
- Separate tier tournaments during qualification
- Top players from each tier advance to "Championship" (all vs all)
- Best of both worlds

**B. Team + Individual:**
- Players compete individually AND as teams
- Separate leaderboards
- Prizes for both individual and team performance

**C. Bracket + Category:**
- Bracket-style tournament
- Each round focuses on different category
- Winner must excel in multiple categories

---

## Recommended Tournament Structure

### Daily Tournaments
**Format:** Tier-Based (Badge Tiers)
- **Why:** Fair competition, encourages all players
- **Structure:** Separate tournaments per badge tier
- **Entry:** $1-2 per tier
- **Prize Pool:** $50-200 per tier

### Weekly Tournaments
**Format:** All vs All
- **Why:** True competition, larger prize pools
- **Structure:** Single leaderboard per category
- **Entry:** $2.50-5
- **Prize Pool:** $500-2000 per category

### Monthly Championships
**Format:** Hybrid (Tier Qualification → All vs All Championship)
- **Why:** Fair qualification, exciting finale
- **Structure:** 
  - Week 1-3: Tier-based qualification
  - Week 4: Top players from each tier compete (all vs all)
- **Entry:** $5-10
- **Prize Pool:** $5000-10000 per category

### Special Events
**Format:** Player vs Player (Brackets) OR Team Tournaments
- **Why:** Variety, excitement, special occasions
- **Structure:** Varies by event
- **Entry:** $10-25
- **Prize Pool:** $10000+ per category

---

## Tournament Types (Duration & Frequency)

---

## Ticket System

### Ticket Structure

```move
module suitwo_game::tournament_tickets {
    use sui::object::{Self, UID};
    use sui::table::{Self, Table};
    use sui::event;
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::tx_context::{Self, TxContext};
    
    /// Tournament ticket - allows entry to a specific tournament
    struct TournamentTicket has key, store {
        id: UID,
        player: address,
        tournament_id: u64,
        category: u8,           // 0=coins, 1=streak, 2=score, etc.
        purchased_at: u64,
        used: bool,             // Has ticket been used to enter tournament?
    }
    
    /// Tournament ticket pack - multiple tickets for a discount
    struct TicketPack has key, store {
        id: UID,
        player: address,
        tickets_remaining: u64,
        purchased_at: u64,
    }
}
```

### Ticket Pricing

**Single Ticket:**
- **Daily Tournament:** $1-2 per ticket
- **Weekly Tournament:** $2.50-5 per ticket
- **Monthly Championship:** $5-10 per ticket
- **Special Event:** $10-25 per ticket

**Ticket Packs (Discounts):**
- **5 Tickets:** 10% discount
- **10 Tickets:** 15% discount
- **20 Tickets:** 20% discount

**Badge Discounts (Applied to Tickets):**
- **Standard (0-4 games):** 0% discount
- **Common (5-14 games):** 0% discount
- **Uncommon (15-34 games):** 5% discount
- **Rare (35-74 games):** 10% discount
- **Epic (75-149 games):** 15% discount
- **Legendary (150+ games):** 20% discount

---

## Tournament Structure

### Tournament Definition

```move
module suitwo_game::tournaments {
    use sui::object::{Self, UID};
    use sui::table::{Self, Table};
    use sui::event;
    use sui::clock::{Self, Clock};
    use sui::tx_context::{Self, TxContext};
    
    // Tournament categories
    const CATEGORY_TOTAL_COINS: u8 = 0;
    const CATEGORY_LONGEST_STREAK: u8 = 1;
    const CATEGORY_HIGHEST_SCORE: u8 = 2;
    const CATEGORY_LONGEST_DISTANCE: u8 = 3;
    const CATEGORY_MOST_BOSSES: u8 = 4;
    const CATEGORY_MOST_ENEMIES: u8 = 5;
    
    /// Tournament structure
    struct Tournament has key {
        id: UID,
        tournament_id: u64,
        name: vector<u8>,
        category: u8,                    // Which category this tournament focuses on
        start_time: u64,
        end_time: u64,
        entry_fee: u64,                  // Entry fee in MIST
        prize_pool: u64,                 // Total prize pool in MIST
        participants: Table<address, bool>,  // Players who entered
        leaderboard: Table<address, u64>,    // Player -> score/value for category
        rewards_distributed: bool,
    }
    
    /// Tournament registry
    struct TournamentRegistry has key {
        id: UID,
        tournaments: Table<u64, ID>,     // tournament_id -> Tournament ID
        active_tournaments: vector<u64>, // Currently active tournament IDs
    }
    
    // Events
    struct TournamentCreated has copy, drop {
        tournament_id: u64,
        category: u8,
        start_time: u64,
        end_time: u64,
        entry_fee: u64,
    }
    
    struct TournamentEntered has copy, drop {
        tournament_id: u64,
        player: address,
        timestamp: u64,
    }
    
    struct TournamentScoreUpdated has copy, drop {
        tournament_id: u64,
        player: address,
        player_name: vector<u8>,  // Player name (for leaderboard display)
        category: u8,
        value: u64,  // Score/value for this category
        // Full game stats (for tie-breaking)
        score: u64,
        distance: u64,
        coins: u64,
        bosses_defeated: u64,
        enemies_defeated: u64,
        longest_coin_streak: u64,
        timestamp: u64,
    }
    
    struct TournamentEnded has copy, drop {
        tournament_id: u64,
        winners: vector<address>,
        rewards_distributed: bool,
        timestamp: u64,
    }
}
```

---

## Category-Specific Tracking

### Total Coins Tournament

**How It Works:**
- Player enters tournament with ticket
- All games played during tournament period count
- Sum all coins collected across all games
- Leaderboard ranked by total coins

**Implementation:**
```typescript
// Track coins per tournament
interface TournamentCoins {
  tournamentId: number;
  playerAddress: string;
  totalCoins: number;  // Sum of coins from all games during tournament
  gamesPlayed: number;  // Number of games played during tournament
  lastUpdated: number;
}

// Update when game ends
async function updateTournamentCoins(
  tournamentId: number,
  playerAddress: string,
  coinsFromGame: number
) {
  const current = await getTournamentCoins(tournamentId, playerAddress);
  await updateTournamentCoins(tournamentId, playerAddress, {
    totalCoins: current.totalCoins + coinsFromGame,
    gamesPlayed: current.gamesPlayed + 1,
    lastUpdated: Date.now()
  });
}
```

### Longest Coin Streak Tournament

**How It Works:**
- Player enters tournament with ticket
- Track `best_coin_streak` from each game during tournament
- Leaderboard ranked by longest streak achieved
- Ties broken by: total coins, then time achieved

**Implementation:**
```typescript
// Track best streak per tournament
interface TournamentStreak {
  tournamentId: number;
  playerAddress: string;
  bestStreak: number;  // Best streak achieved during tournament
  totalCoins: number;  // Total coins (for tie-breaking)
  gameId: string;  // Which game achieved the streak
  timestamp: number;  // When streak was achieved
}

// Update when game ends
async function updateTournamentStreak(
  tournamentId: number,
  playerAddress: string,
  gameStreak: number,
  totalCoins: number
) {
  const current = await getTournamentStreak(tournamentId, playerAddress);
  if (gameStreak > current.bestStreak) {
    await updateTournamentStreak(tournamentId, playerAddress, {
      bestStreak: gameStreak,
      totalCoins: totalCoins,
      timestamp: Date.now()
    });
  }
}
```

### Other Categories

Similar tracking for:
- **Score:** Track `best_score` during tournament
- **Distance:** Track `best_distance` during tournament
- **Bosses:** Track `best_bosses_defeated` during tournament
- **Enemies:** Track `best_enemies_defeated` during tournament

---

## Prize Pool Distribution

### Per Category

Each category has its own prize pool, distributed among top players:

**Top 10 Distribution:**
- **1st Place:** 30% of category prize pool
- **2nd Place:** 20% of category prize pool
- **3rd Place:** 15% of category prize pool
- **4th-10th Place:** 35% split evenly (5% each)

**Example (Total Coins Tournament, $1000 prize pool):**
- 1st: $300
- 2nd: $200
- 3rd: $150
- 4th-10th: $50 each

### Prize Pool Sources

**From Ticket Sales:**
- 50% → Player rewards (distributed to winners)
- 25% → Token burning
- 25% → Operations/team

**Example (100 players @ $5 entry = $500 pool):**
- Player rewards: $250 (50%)
- Token burn: $125 (25%)
- Operations: $125 (25%)

---

## Implementation Plan

### Phase 1: Smart Contract

#### 1.1 Tournament Contract

```move
// tournaments.move

/// Create a new tournament
public entry fun create_tournament(
    registry: &mut TournamentRegistry,
    name: vector<u8>,
    category: u8,
    start_time: u64,
    end_time: u64,
    entry_fee: u64,
    clock: &Clock,
    ctx: &mut TxContext
) {
    // Create tournament
    // Add to registry
    // Emit TournamentCreated event
}

/// Enter tournament with ticket
public entry fun enter_tournament(
    tournament: &mut Tournament,
    ticket: TournamentTicket,
    clock: &Clock,
    ctx: &mut TxContext
) {
    // Validate ticket
    // Add player to participants
    // Mark ticket as used
    // Emit TournamentEntered event
}

/// Update tournament score (called by backend after each game)
public entry fun update_tournament_score(
    _admin_cap: &AdminCapability,
    tournament: &mut Tournament,
    player: address,
    value: u64,  // Score/value for this category
    clock: &Clock,
    ctx: &mut TxContext
) {
    // Update leaderboard
    // Emit TournamentScoreUpdated event
}

/// End tournament and distribute rewards
public entry fun end_tournament(
    _admin_cap: &AdminCapability,
    tournament: &mut Tournament,
    clock: &Clock,
    ctx: &mut TxContext
) {
    // Calculate winners
    // Distribute rewards
    // Mark as ended
    // Emit TournamentEnded event
}
```

### Phase 2: Backend Service

#### 2.1 Tournament Service

```typescript
// services/tournament-service.ts

export class TournamentService {
  /**
   * Create a new tournament
   */
  async createTournament(config: {
    name: string;
    category: 'totalCoins' | 'longestStreak' | 'highestScore' | 'longestDistance' | 'mostBosses' | 'mostEnemies';
    startTime: number;
    endTime: number;
    entryFee: number;
  }): Promise<Tournament>;

  /**
   * Get active tournaments
   */
  async getActiveTournaments(): Promise<Tournament[]>;

  /**
   * Enter tournament with ticket
   */
  async enterTournament(
    playerAddress: string,
    tournamentId: number,
    ticketId: string
  ): Promise<{ success: boolean; error?: string }>;

  /**
   * Update tournament score after game ends
   */
  async updateTournamentScore(
    tournamentId: number,
    playerAddress: string,
    gameStats: {
      score?: number;
      distance?: number;
      coins?: number;
      bossesDefeated?: number;
      enemiesDefeated?: number;
      longestCoinStreak?: number;
    }
  ): Promise<void>;

  /**
   * Get tournament leaderboard
   */
  async getTournamentLeaderboard(
    tournamentId: number,
    limit?: number
  ): Promise<LeaderboardEntry[]>;

  /**
   * End tournament and distribute rewards
   */
  async endTournament(tournamentId: number): Promise<{
    winners: Array<{ rank: number; player: string; reward: number }>;
    success: boolean;
  }>;
}
```

#### 2.2 Category-Specific Tracking

```typescript
// services/tournament-tracking-service.ts

export class TournamentTrackingService {
  /**
   * Track total coins for tournament
   */
  async trackTotalCoins(
    tournamentId: number,
    playerAddress: string,
    coinsFromGame: number
  ): Promise<void> {
    // Get current total
    const current = await db.tournamentCoins.findOne({
      tournamentId,
      playerAddress
    });
    
    // Update total
    await db.tournamentCoins.upsert({
      tournamentId,
      playerAddress,
      totalCoins: (current?.totalCoins || 0) + coinsFromGame,
      gamesPlayed: (current?.gamesPlayed || 0) + 1,
      lastUpdated: Date.now()
    });
    
    // Update leaderboard
    await this.updateLeaderboard(tournamentId, 'totalCoins');
  }
  
  /**
   * Track longest streak for tournament
   */
  async trackLongestStreak(
    tournamentId: number,
    playerAddress: string,
    gameStreak: number,
    totalCoins: number
  ): Promise<void> {
    const current = await db.tournamentStreaks.findOne({
      tournamentId,
      playerAddress
    });
    
    // Only update if new streak is longer
    if (!current || gameStreak > current.bestStreak) {
      await db.tournamentStreaks.upsert({
        tournamentId,
        playerAddress,
        bestStreak: gameStreak,
        totalCoins: totalCoins,  // For tie-breaking
        timestamp: Date.now()
      });
      
      // Update leaderboard
      await this.updateLeaderboard(tournamentId, 'longestStreak');
    }
  }
  
  /**
   * Update leaderboard for tournament category
   */
  private async updateLeaderboard(
    tournamentId: number,
    category: string
  ): Promise<void> {
    // Query top players for this category
    // Update leaderboard in database
    // Emit event if rank changed
  }
}
```

### Phase 3: Integration with Game

#### 3.1 Update After Game Ends

```javascript
// In game-over handler or score submission

async function submitGameResults(gameStats) {
  // Submit score to blockchain (existing)
  await submitScoreToBlockchain(gameStats);
  
  // Check if player is in any active tournaments
  const activeTournaments = await getActiveTournamentsForPlayer(playerAddress);
  
  for (const tournament of activeTournaments) {
    // Update tournament score based on category
    switch (tournament.category) {
      case 'totalCoins':
        await updateTournamentCoins(
          tournament.id,
          playerAddress,
          gameStats.coins
        );
        break;
        
      case 'longestStreak':
        await updateTournamentStreak(
          tournament.id,
          playerAddress,
          gameStats.longestCoinStreak,
          gameStats.coins
        );
        break;
        
      case 'highestScore':
        await updateTournamentScore(
          tournament.id,
          playerAddress,
          gameStats.score
        );
        break;
        
      // ... other categories
    }
  }
}
```

### Phase 4: Frontend UI

#### 4.1 Tournament List Component

```typescript
// components/TournamentList.tsx

interface Tournament {
  id: number;
  name: string;
  category: string;
  startTime: number;
  endTime: number;
  entryFee: number;
  prizePool: number;
  participants: number;
  timeRemaining: number;
}

export const TournamentList: React.FC = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  
  return (
    <div className="tournament-list">
      <h2>Active Tournaments</h2>
      
      {tournaments.map(tournament => (
        <TournamentCard
          key={tournament.id}
          tournament={tournament}
          onEnter={handleEnterTournament}
        />
      ))}
    </div>
  );
};
```

#### 4.2 Tournament Card Component

```typescript
// components/TournamentCard.tsx

export const TournamentCard: React.FC<{
  tournament: Tournament;
  onEnter: (tournamentId: number) => void;
}> = ({ tournament, onEnter }) => {
  return (
    <div className="tournament-card">
      <div className="tournament-header">
        <h3>{tournament.name}</h3>
        <span className="category-badge">
          {getCategoryName(tournament.category)}
        </span>
      </div>
      
      <div className="tournament-info">
        <div>Entry Fee: {tournament.entryFee} SUI</div>
        <div>Prize Pool: {tournament.prizePool} SUI</div>
        <div>Participants: {tournament.participants}</div>
        <div>Time Remaining: {formatTimeRemaining(tournament.timeRemaining)}</div>
      </div>
      
      <button onClick={() => onEnter(tournament.id)}>
        Enter Tournament
      </button>
    </div>
  );
};
```

#### 4.3 Tournament Leaderboard Component

```typescript
// components/TournamentLeaderboard.tsx

export const TournamentLeaderboard: React.FC<{
  tournamentId: number;
  category: string;
}> = ({ tournamentId, category }) => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  
  return (
    <div className="tournament-leaderboard">
      <h3>{getCategoryName(category)} Leaderboard</h3>
      
      <table>
        <thead>
          <tr>
            <th>Rank</th>
            <th>Player</th>
            <th>{getCategoryMetric(category)}</th>
            <th>Prize</th>
          </tr>
        </thead>
        <tbody>
          {leaderboard.map((entry, index) => (
            <tr key={entry.playerAddress}>
              <td>{index + 1}</td>
              <td>{formatAddress(entry.playerAddress)}</td>
              <td>{formatValue(entry.value, category)}</td>
              <td>{calculatePrize(entry.rank, prizePool)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
```

---

## Tournament Format Implementation Details

### Tier-Based Tournament Implementation

#### Badge Tier Detection
```typescript
// Determine player's badge tier based on games played
function getBadgeTier(gamesPlayed: number): BadgeTier {
  if (gamesPlayed >= 150) return 'Legendary';
  if (gamesPlayed >= 75) return 'Epic';
  if (gamesPlayed >= 35) return 'Rare';
  if (gamesPlayed >= 15) return 'Uncommon';
  if (gamesPlayed >= 5) return 'Common';
  return 'Standard';
}

// Get tournament for player's tier
async function getTierTournament(
  category: string,
  playerAddress: string
): Promise<Tournament> {
  const playerStats = await getPlayerStats(playerAddress);
  const tier = getBadgeTier(playerStats.totalGames);
  
  return await getTournamentByTierAndCategory(tier, category);
}
```

#### Tier-Based Tournament Structure
```sql
CREATE TABLE tier_tournaments (
  id SERIAL PRIMARY KEY,
  tournament_id BIGINT NOT NULL,
  tier VARCHAR(20) NOT NULL,  -- 'Standard', 'Common', 'Uncommon', etc.
  category VARCHAR(50) NOT NULL,
  start_time BIGINT NOT NULL,
  end_time BIGINT NOT NULL,
  entry_fee BIGINT NOT NULL,
  prize_pool BIGINT NOT NULL,
  participants_count INT DEFAULT 0,
  FOREIGN KEY (tournament_id) REFERENCES tournaments(tournament_id),
  UNIQUE(tier, category, start_time)
);
```

### Player vs Player (1v1) Implementation

#### Bracket Structure
```typescript
interface BracketMatch {
  matchId: string;
  tournamentId: number;
  round: number;  // 1 = first round, 2 = second round, etc.
  player1: string;
  player2: string;
  player1Score: number | null;
  player2Score: number | null;
  winner: string | null;
  status: 'pending' | 'in_progress' | 'completed';
  deadline: number;  // When match must be completed
}

interface TournamentBracket {
  tournamentId: number;
  bracketSize: number;  // 8, 16, 32, 64, 128
  matches: BracketMatch[];
  currentRound: number;
  status: 'registration' | 'in_progress' | 'completed';
}
```

#### Matchmaking Logic
```typescript
// Create bracket from registered players
async function createBracket(
  tournamentId: number,
  players: string[]
): Promise<TournamentBracket> {
  // Shuffle players for random seeding
  const shuffled = shuffleArray(players);
  
  // Create matches for first round
  const matches: BracketMatch[] = [];
  for (let i = 0; i < shuffled.length; i += 2) {
    matches.push({
      matchId: generateMatchId(),
      tournamentId,
      round: 1,
      player1: shuffled[i],
      player2: shuffled[i + 1] || null,  // Bye if odd number
      player1Score: null,
      player2Score: null,
      winner: null,
      status: 'pending',
      deadline: Date.now() + (24 * 60 * 60 * 1000)  // 24 hours
    });
  }
  
  return {
    tournamentId,
    bracketSize: shuffled.length,
    matches,
    currentRound: 1,
    status: 'in_progress'
  };
}

// Advance winners to next round
async function advanceRound(bracket: TournamentBracket): Promise<void> {
  const currentRoundMatches = bracket.matches.filter(m => m.round === bracket.currentRound);
  const winners = currentRoundMatches.map(m => m.winner).filter(Boolean);
  
  if (winners.length <= 1) {
    // Tournament complete
    bracket.status = 'completed';
    return;
  }
  
  // Create next round matches
  const nextRound = bracket.currentRound + 1;
  for (let i = 0; i < winners.length; i += 2) {
    bracket.matches.push({
      matchId: generateMatchId(),
      tournamentId: bracket.tournamentId,
      round: nextRound,
      player1: winners[i],
      player2: winners[i + 1] || null,
      player1Score: null,
      player2Score: null,
      winner: null,
      status: 'pending',
      deadline: Date.now() + (24 * 60 * 60 * 1000)
    });
  }
  
  bracket.currentRound = nextRound;
}
```

#### Async Match Resolution
```typescript
// Players don't need to play at same time
// Each player submits their best score during match period
async function submitMatchScore(
  matchId: string,
  playerAddress: string,
  score: number
): Promise<void> {
  const match = await getMatch(matchId);
  
  if (match.player1 === playerAddress) {
    match.player1Score = score;
  } else if (match.player2 === playerAddress) {
    match.player2Score = score;
  }
  
  // Check if both players have submitted
  if (match.player1Score !== null && match.player2Score !== null) {
    match.winner = match.player1Score > match.player2Score 
      ? match.player1 
      : match.player2;
    match.status = 'completed';
    
    // Advance bracket if needed
    await checkAndAdvanceRound(match.tournamentId);
  }
}
```

### Team Tournament Implementation

#### Team Structure
```typescript
interface Team {
  teamId: string;
  name: string;
  captain: string;  // Team creator
  members: string[];  // Array of player addresses
  maxMembers: number;  // 3, 4, or 5
  tournamentId: number | null;  // Which tournament they're in
  totalScore: number;  // Sum of all members' scores
  createdAt: number;
}

interface TeamTournamentEntry {
  tournamentId: number;
  teamId: string;
  category: string;
  teamScore: number;  // Sum/average of all team members
  rank: number | null;
}
```

#### Team Management
```typescript
// Create team
async function createTeam(
  captain: string,
  teamName: string,
  maxMembers: number = 5
): Promise<Team> {
  const team: Team = {
    teamId: generateTeamId(),
    name: teamName,
    captain,
    members: [captain],
    maxMembers,
    tournamentId: null,
    totalScore: 0,
    createdAt: Date.now()
  };
  
  await db.teams.insert(team);
  return team;
}

// Join team
async function joinTeam(
  teamId: string,
  playerAddress: string
): Promise<void> {
  const team = await getTeam(teamId);
  
  if (team.members.length >= team.maxMembers) {
    throw new Error('Team is full');
  }
  
  if (team.members.includes(playerAddress)) {
    throw new Error('Already in team');
  }
  
  team.members.push(playerAddress);
  await db.teams.update(team);
}

// Calculate team score
async function calculateTeamScore(
  tournamentId: number,
  teamId: string,
  category: string
): Promise<number> {
  const team = await getTeam(teamId);
  const tournament = await getTournament(tournamentId);
  
  // Get all team members' scores for this category
  const memberScores = await Promise.all(
    team.members.map(member => 
      getPlayerTournamentScore(tournamentId, member, category)
    )
  );
  
  // Sum all scores (or average, depending on tournament rules)
  return memberScores.reduce((sum, score) => sum + score, 0);
}

// Update team leaderboard
async function updateTeamLeaderboard(
  tournamentId: number,
  category: string
): Promise<void> {
  const teams = await getTournamentTeams(tournamentId);
  
  // Calculate scores for all teams
  const teamScores = await Promise.all(
    teams.map(async team => ({
      teamId: team.teamId,
      score: await calculateTeamScore(tournamentId, team.teamId, category)
    }))
  );
  
  // Sort by score
  teamScores.sort((a, b) => b.score - a.score);
  
  // Update ranks
  for (let i = 0; i < teamScores.length; i++) {
    await updateTeamRank(
      tournamentId,
      teamScores[i].teamId,
      i + 1,
      teamScores[i].score
    );
  }
}
```

---

## Database Schema

### Tournament Tables

```sql
CREATE TABLE tournaments (
  id SERIAL PRIMARY KEY,
  tournament_id BIGINT UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL,  -- 'totalCoins', 'longestStreak', etc.
  start_time BIGINT NOT NULL,
  end_time BIGINT NOT NULL,
  entry_fee BIGINT NOT NULL,  -- In MIST
  prize_pool BIGINT NOT NULL,  -- In MIST
  participants_count INT DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active',  -- 'active', 'ended', 'cancelled'
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE tournament_participants (
  id SERIAL PRIMARY KEY,
  tournament_id BIGINT NOT NULL,
  player_address VARCHAR(66) NOT NULL,
  ticket_id VARCHAR(255),
  entered_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tournament_id, player_address),
  FOREIGN KEY (tournament_id) REFERENCES tournaments(tournament_id)
);

-- Category-specific tracking tables
CREATE TABLE tournament_coins (
  id SERIAL PRIMARY KEY,
  tournament_id BIGINT NOT NULL,
  player_address VARCHAR(66) NOT NULL,
  total_coins BIGINT DEFAULT 0,
  games_played INT DEFAULT 0,
  last_updated TIMESTAMP DEFAULT NOW(),
  UNIQUE(tournament_id, player_address),
  FOREIGN KEY (tournament_id) REFERENCES tournaments(tournament_id)
);

CREATE TABLE tournament_streaks (
  id SERIAL PRIMARY KEY,
  tournament_id BIGINT NOT NULL,
  player_address VARCHAR(66) NOT NULL,
  best_streak INT DEFAULT 0,
  total_coins BIGINT DEFAULT 0,  -- For tie-breaking
  game_id VARCHAR(255),  -- Which game achieved the streak
  achieved_at TIMESTAMP,
  UNIQUE(tournament_id, player_address),
  FOREIGN KEY (tournament_id) REFERENCES tournaments(tournament_id)
);

CREATE TABLE tournament_scores (
  id SERIAL PRIMARY KEY,
  tournament_id BIGINT NOT NULL,
  player_address VARCHAR(66) NOT NULL,
  best_score BIGINT DEFAULT 0,
  last_updated TIMESTAMP DEFAULT NOW(),
  UNIQUE(tournament_id, player_address),
  FOREIGN KEY (tournament_id) REFERENCES tournaments(tournament_id)
);

-- Similar tables for distance, bosses, enemies

CREATE INDEX idx_tournament_coins_leaderboard ON tournament_coins(tournament_id, total_coins DESC);
CREATE INDEX idx_tournament_streaks_leaderboard ON tournament_streaks(tournament_id, best_streak DESC, total_coins DESC);
CREATE INDEX idx_tournament_scores_leaderboard ON tournament_scores(tournament_id, best_score DESC);

-- Tier-based tournament tables
CREATE TABLE tier_tournaments (
  id SERIAL PRIMARY KEY,
  tournament_id BIGINT NOT NULL,
  tier VARCHAR(20) NOT NULL,  -- 'Standard', 'Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'
  category VARCHAR(50) NOT NULL,
  start_time BIGINT NOT NULL,
  end_time BIGINT NOT NULL,
  entry_fee BIGINT NOT NULL,
  prize_pool BIGINT NOT NULL,
  participants_count INT DEFAULT 0,
  FOREIGN KEY (tournament_id) REFERENCES tournaments(tournament_id),
  UNIQUE(tier, category, start_time)
);

-- Player vs Player (1v1) bracket tables
CREATE TABLE tournament_brackets (
  id SERIAL PRIMARY KEY,
  tournament_id BIGINT NOT NULL,
  bracket_size INT NOT NULL,  -- 8, 16, 32, 64, 128
  current_round INT DEFAULT 1,
  status VARCHAR(20) DEFAULT 'registration',  -- 'registration', 'in_progress', 'completed'
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (tournament_id) REFERENCES tournaments(tournament_id)
);

CREATE TABLE bracket_matches (
  id SERIAL PRIMARY KEY,
  match_id VARCHAR(255) UNIQUE NOT NULL,
  bracket_id INT NOT NULL,
  tournament_id BIGINT NOT NULL,
  round INT NOT NULL,
  player1_address VARCHAR(66),
  player2_address VARCHAR(66),
  player1_score BIGINT,
  player2_score BIGINT,
  winner_address VARCHAR(66),
  status VARCHAR(20) DEFAULT 'pending',  -- 'pending', 'in_progress', 'completed'
  deadline BIGINT,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (bracket_id) REFERENCES tournament_brackets(id),
  FOREIGN KEY (tournament_id) REFERENCES tournaments(tournament_id)
);

-- Team tournament tables
CREATE TABLE teams (
  id SERIAL PRIMARY KEY,
  team_id VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  captain_address VARCHAR(66) NOT NULL,
  max_members INT DEFAULT 5,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE team_members (
  id SERIAL PRIMARY KEY,
  team_id VARCHAR(255) NOT NULL,
  player_address VARCHAR(66) NOT NULL,
  joined_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(team_id, player_address),
  FOREIGN KEY (team_id) REFERENCES teams(team_id)
);

CREATE TABLE team_tournament_entries (
  id SERIAL PRIMARY KEY,
  tournament_id BIGINT NOT NULL,
  team_id VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL,
  team_score BIGINT DEFAULT 0,
  rank INT,
  last_updated TIMESTAMP DEFAULT NOW(),
  UNIQUE(tournament_id, team_id, category),
  FOREIGN KEY (tournament_id) REFERENCES tournaments(tournament_id),
  FOREIGN KEY (team_id) REFERENCES teams(team_id)
);

CREATE INDEX idx_team_tournament_leaderboard ON team_tournament_entries(tournament_id, category, team_score DESC);
CREATE INDEX idx_bracket_matches_round ON bracket_matches(tournament_id, round, status);
```

---

## User Experience Flow

### Entering a Tournament

```
1. Player navigates to Tournament section
   ↓
2. Player sees active tournaments with:
   - Category (e.g., "Total Coins", "Longest Streak")
   - Entry fee
   - Prize pool
   - Time remaining
   - Current leaderboard preview
   ↓
3. Player selects tournament
   ↓
4. Player clicks "Enter Tournament"
   ↓
5. System checks:
   - Does player have a ticket?
   - If NO: Show ticket purchase modal
   - If YES: Use ticket to enter
   ↓
6. Player enters tournament
   ↓
7. All games played during tournament period count toward category goal
   ↓
8. Player can view leaderboard anytime
   ↓
9. Tournament ends
   ↓
10. Winners announced, rewards distributed
```

### Playing During Tournament

```
1. Player enters tournament (has active ticket)
   ↓
2. Player plays games normally
   ↓
3. After each game ends:
   - Game stats submitted to blockchain
   - Tournament score updated based on category
   - Leaderboard refreshed
   ↓
4. Player can check their rank anytime
   ↓
5. Player sees progress toward category goal
```

---

## Category-Specific Features

### Total Coins Tournament

**Display:**
- Current total coins collected
- Rank on leaderboard
- Coins needed to reach next rank
- Games played during tournament

**Example UI:**
```
Total Coins Tournament
━━━━━━━━━━━━━━━━━━━━━━
Your Total: 1,247 coins
Your Rank: #15
Next Rank: #14 (1,250 coins needed)
Games Played: 8
```

### Longest Coin Streak Tournament

**Display:**
- Best streak achieved
- Rank on leaderboard
- Streak needed to reach next rank
- Total coins (for tie-breaking info)

**Example UI:**
```
Longest Coin Streak Tournament
━━━━━━━━━━━━━━━━━━━━━━
Your Best Streak: 42
Your Rank: #8
Next Rank: #7 (45 streak needed)
Total Coins: 1,247 (tie-breaker)
```

---

## Reward Distribution

### Automatic Distribution

```typescript
// After tournament ends
async function distributeTournamentRewards(tournamentId: number) {
  const tournament = await getTournament(tournamentId);
  const leaderboard = await getTournamentLeaderboard(tournamentId, 10);
  
  const prizeDistribution = [0.30, 0.20, 0.15, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05];
  
  for (let i = 0; i < leaderboard.length; i++) {
    const rank = i + 1;
    const player = leaderboard[i].playerAddress;
    const reward = tournament.prizePool * prizeDistribution[i];
    
    // Distribute reward
    await distributeReward(player, reward, tournamentId, rank);
    
    // Emit event
    await emitRewardDistributed(tournamentId, player, rank, reward);
  }
}
```

---

## Implementation Timeline

### Week 1: Smart Contract
- Create tournament contract
- Implement ticket system
- Implement category tracking
- Test contract functions

### Week 2: Backend Service
- Create tournament service
- Implement category-specific tracking
- Create API endpoints
- Database schema and migrations

### Week 3: Frontend UI
- Tournament list component
- Tournament card component
- Leaderboard component
- Entry flow

### Week 4: Integration & Testing
- Integrate with game (update scores after games)
- Test all categories
- Test reward distribution
- UI/UX polish

---

## Next Steps

1. **Review category selection** - Confirm total coins and longest streak are the primary categories
2. **Review ticket pricing** - Confirm entry fees are appropriate
3. **Review prize distribution** - Confirm reward split is fair
4. **Implement smart contract** - Start with tournament and ticket contracts
5. **Build backend tracking** - Implement category-specific tracking
6. **Create frontend** - Build tournament UI components

---

## Recent Implementation Updates (2025-12-11)

### ✅ Completed Features

#### Tournament System Core
- ✅ Smart contract deployed and verified on testnet
- ✅ Tournament registry and management (on-chain)
- ✅ Entry system with tournament tickets (GamePass integration)
- ✅ **Multiple Entries Per Tournament** - Players can enter multiple times (each entry consumes a ticket)
  - Players can improve their score by entering again
  - Each entry adds to the prize pool
  - Best score is preserved in leaderboard
- ✅ Category-specific leaderboards (Total Coins, Longest Streak, Highest Score, Distance, Bosses, Enemies)
- ✅ Real-time leaderboard updates via events
- ✅ Tournament isolation (each tournament has separate leaderboard)
- ✅ Score submission validation and tracking
- ✅ Prize pool tracking (USD-based)

#### Leaderboard Enhancements
- ✅ **Player Name Display** - Tournament leaderboards now display player names
  - Names stored directly in `TournamentScoreUpdated` events (not from ScoreSubmitted)
  - Ensures names match tournament game submissions
  - Displayed prominently above wallet address
  - Graceful fallback to address-only display if no name
- ✅ **Category-Specific Tie-Breaking System** - Multi-level tie-breaking based on tournament category
  - **Longest Streak:** Primary: streak, Secondary: total coins, Tertiary: score
  - **Total Coins:** Primary: coins, Secondary: score, Tertiary: distance
  - **Highest Score:** Primary: score, Secondary: coins, Tertiary: distance
  - **Longest Distance:** Primary: distance, Secondary: score, Tertiary: enemies defeated
  - **Most Bosses:** Primary: bosses, Secondary: score, Tertiary: enemies defeated
  - **Most Enemies:** Primary: enemies, Secondary: score, Tertiary: bosses defeated
  - Final tie-breaker: timestamp (earliest achievement wins)
- ✅ Optimized name fetching (from tournament events)
- ✅ Enhanced UI with name/address formatting

#### Game Experience Enhancements
- ✅ **Gold Canvas Border** - Tournament games display gold border (#FFD700) instead of blue
  - Visual indicator that player is in tournament mode
  - Matches tournament modal styling
  - Applied automatically when tournament game starts

#### Ticket Management
- ✅ Accurate ticket count tracking in `GamePass` struct
- ✅ Enhanced migration to preserve actual ticket counts
- ✅ Admin functions for ticket management:
  - `admin_add_tickets` - Grant tickets to players
  - `admin_set_ticket_count` - Manually correct ticket counts
  - `admin_remove_ticket` - Remove specific tickets
  - `get_ticket_info` - View ticket details
- ✅ Admin panel UI for ticket management
- ✅ Ticket verification and fixing tools

#### Contract Improvements
- ✅ Fixed `TournamentEntry` struct (added `drop` ability for table mutations)
- ✅ Improved gas budget calculations for ticket operations
- ✅ Enhanced error handling and validation

#### Backend API
- ✅ `/api/tournaments` - List tournaments
- ✅ `/api/tournaments/[id]/leaderboard` - Get tournament leaderboard
- ✅ `/api/tournaments/enter` - Enter tournament
- ✅ `/api/tournaments/[id]/submit-score` - Submit tournament score
- ✅ `/api/admin/tournaments/*` - Admin endpoints for tournament management

### 📝 Documentation
- ✅ `docs/TOURNAMENT_DESIGN_VERIFICATION.md` - Design verification and flow documentation
- ✅ `docs/TOURNAMENT_SCORE_SUBMISSION_VERIFICATION.md` - Score submission validation
- ✅ `docs/RECENT_UPDATES.md` - Comprehensive update log
- ✅ `docs/PROJECT_STATUS.md` - Updated project status

### 🔧 Technical Details

#### Latest Deployment
- **Package ID:** `0xe8bc9213d60bb1f451498c2c910f04cf188265ffc1c9cf907277d74e2836e8c0`
- **Transaction:** `AiKuw31Dcwyudu4SLritFartHkhHAZTmsjqVxeJur99Y`
- See `contracts/suitwo_game/DEPLOYMENT_IDS.md` for complete object IDs

#### Performance Optimizations
- Single query for player names (not per-player)
- Direct dynamic field queries for ticket information
- Event query optimization with proper filtering
- Caching where appropriate (30-second TTL for leaderboards)

---

## Implementation Status

**Current Status:** ✅ **Fully Implemented and Deployed**

The tournament system is fully functional with all core features implemented, tested, and deployed to testnet. The system supports:
- Multiple tournament categories
- Ticket-based entry (players can enter multiple times)
- Real-time leaderboards with player names
- Category-specific tie-breaking (secondary and tertiary stats)
- Admin management tools
- Score submission and validation
- Prize pool tracking
- Gold canvas border for tournament games

**Key Features:**
- **Multiple Entries:** Players can enter tournaments multiple times (each entry consumes a ticket and adds to prize pool)
- **Best Score Tracking:** Leaderboard preserves best score, but players can improve by entering again
- **Tie-Breaking:** Category-specific multi-level tie-breaking ensures fair rankings
- **Player Names:** Names stored in tournament events, ensuring accurate leaderboard display
- **Visual Indicators:** Gold canvas border during tournament games

**Next Enhancements:**
- Performance monitoring and optimization
- User experience improvements based on feedback
- Additional tournament formats (as designed)
- Prize distribution automation
- Real-time leaderboard updates (WebSocket/polling)

