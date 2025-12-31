# Recent Updates

## 2025-12-11 - Tournament Leaderboard Player Names & Contract Deployments

### Tournament Leaderboard Enhancements

#### Player Name Display
- **Feature Added:** Tournament leaderboards now display player names when available
- **Implementation:**
  - Backend queries `ScoreSubmitted` events to fetch player names for leaderboard entries
  - Names are displayed prominently above the wallet address when available
  - If no name is provided, only the wallet address is shown (as before)
- **Files Modified:**
  - `backend/lib/sui/tournament-service.ts` - Added `playerName` field to `LeaderboardEntry` interface and name fetching logic
  - `src/game/systems/ui/tournament-modal.js` - Updated leaderboard display to show names
  - `src/game/rendering/responsive/shared/shared-panels.css` - Added styles for name display

#### Display Format
- **With Name:** 
  - Player name displayed in white, bold text
  - Wallet address shown below in smaller, gray text
- **Without Name:**
  - Only wallet address displayed (as before)

### Contract Deployments

#### Latest Deployment
- **Package ID:** `0xe8bc9213d60bb1f451498c2c910f04cf188265ffc1c9cf907277d74e2836e8c0`
- **Transaction:** `AiKuw31Dcwyudu4SLritFartHkhHAZTmsjqVxeJur99Y`
- **Date:** 2025-12-11

#### Key Objects Deployed
- **Session Registry:** `0x5232ae1d6a15ff3fa29880ef98aac40d87c3c3bbe9a19abb6b247170c0afed6c`
- **Statistics Registry:** `0x6e58a94a903b66b5d937f661dd4255db1555683e49b6d903f56349908b923db7`
- **Premium Store:** `0x7942b8a2ff7808b5b866f6e87f7ea57914f25d791d9a3f419fa8819424f8d5d7`
- **Game Pass System:** `0x008cbe985709e5dd56bd24ee9a602f3458b876d964547dfb70881e7cf55f5621`
- **Tournament Registry:** `0xb4cf713bb42b434c107b287c1b03e51763413e54abded2fe65d11665bbdae6b4`
- **Badge Registry:** `0x2e625b20b0f5285dbcbac12d095f13c9d7861ef26fd15fb2577fbc31edb7f250`
- **Badge Publisher:** `0x4b4147bc9b78b966ea1931bba0d1e7d593e9f4fb1c5728cc70b2ee9987997a85`

#### Admin Capabilities
- **Score Submission Admin Cap:** `0xa099e47815aae6a7cc7b9700cb1c4cf49b80e1dac4ba56a72f4aeaec378eff02`
- **Premium Store Admin Cap:** `0x7962a7229d14994728286a6a7fff5255b07634a0f8b332ea83104761c351289b`
- **Tournament Admin Cap:** `0xe1cbfdc439592c4a177f46e641a631887e2d32bb195b7d7890db31b488cb3e46`

### Contract Fixes

#### TournamentEntry Struct Update
- **Issue:** `TournamentEntry` struct needed `drop` ability for table mutations
- **Fix:** Added `drop` ability to `TournamentEntry` struct in `tournaments.move`
- **Impact:** Allows players to re-enter tournaments with new tickets (updates existing entry)

### Deployment Management

#### OLD Variable Preservation
- **Strategy:** Keep original OLD_ variables unchanged when deploying new contracts
- **Rationale:** Maintains historical reference to previous deployments
- **Implementation:** Only current variables are updated; OLD_ variables remain from original deployment

### Documentation Updates
- Updated `DEPLOYMENT_IDS.md` with latest deployment information
- All object IDs and transaction links documented
- Deployment history maintained for reference

---

## Previous Updates

### Tournament Ticket System Improvements
- **Ticket Count Tracking:** Accurate ticket count tracking in `GamePass` struct
- **Migration Support:** Enhanced migration to preserve actual ticket counts
- **Admin Functions:** Added admin functions for ticket management:
  - `admin_add_tickets` - Grant tickets to players
  - `admin_set_ticket_count` - Manually correct ticket counts
  - `admin_remove_ticket` - Remove specific tickets
  - `get_ticket_info` - View ticket details

### Backend API Enhancements
- **Ticket Verification:** `/api/admin/tournaments/verify-tickets` - Verify ticket count accuracy
- **Ticket Fixing:** `/api/admin/tournaments/fix-tickets` - Fix ticket count discrepancies
- **Ticket Addition:** `/api/admin/tournaments/add-tickets` - Add tickets via admin panel
- **Ticket Info:** `/api/admin/tournaments/ticket-info` - View detailed ticket information

### Frontend Admin Panel
- **Ticket Management Section:** Added comprehensive ticket management UI
- **Verification Tools:** Verify and fix ticket counts for players
- **Ticket Addition:** Add tickets with specified USD value
- **Ticket Viewing:** View all tickets for a player with details

---

## Technical Notes

### Name Fetching Optimization
- Player names are fetched from `ScoreSubmitted` events in a single query
- Names are matched to leaderboard entries by player address
- Most recent name for each player is used
- Graceful fallback if name fetching fails (address still displayed)

### Gas Budget Improvements
- Increased gas budgets for recursive ticket creation operations
- Dynamic gas calculation based on ticket quantity
- Prevents "InsufficientGas" errors during admin ticket operations

### Dynamic Field Queries
- Improved efficiency by querying dynamic fields directly
- Replaced sequential `devInspectTransactionBlock` calls with direct field queries
- Better error handling and logging for ticket information retrieval

---

## Next Steps
- Continue monitoring tournament leaderboard performance
- Consider caching player names for improved performance
- Monitor gas usage patterns for ticket operations
- Gather user feedback on name display feature

