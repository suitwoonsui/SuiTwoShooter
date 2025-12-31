# 🎯 **INSOMNIA GAME - STATISTICS SYSTEM DOCUMENTATION**

## 📋 **OVERVIEW**

The Insomnia Game features a comprehensive, blockchain-integrated statistics system that tracks player performance across all game sessions. This system provides real-time data from the Sui blockchain, ensuring data integrity and persistence.

## 🏗️ **SYSTEM ARCHITECTURE**

### **Data Flow**
```
Game Session → Backend API → Sui Blockchain → Statistics Service → UI Display
```

### **Key Components**
- **Blockchain Service** (`src/lib/services/blockchain/base.ts`)
- **Statistics Modal** (`src/components/modals/StatisticsModal.tsx`)
- **Cached Data Hook** (`src/hooks/useCachedBlockchainData.ts`)
- **Blockchain Context** (`src/contexts/BlockchainContext.tsx`)

## 🔗 **BLOCKCHAIN INTEGRATION**

### **Smart Contract Integration**
- **ScoreSystem Contract**: Stores player statistics in a shared table
- **PlayerStats Table**: `Table<address, PlayerStats>` structure
- **Real-time Updates**: Stats refresh automatically after each game

### **Data Structure**
```typescript
interface PlayerStats {
  // Core Performance
  totalGames: number;
  highestScore: number;
  averageScore: number;
  
  // Endurance Metrics
  highestTimeElapsed: number;  // Longest survival time
  averageTimeElapsed: number;  // Average survival time
  
  // Click Performance
  highestClicks: number;       // Best clicks in single game
  averageClicks: number;       // Average clicks per game
  
  // Advanced Stats
  currentSkillTier: number;
  highestEnduranceLevel: number;
  lastPlayed: number;
}
```

## 📊 **STATISTICS DISPLAY**

### **Main Overview (4 Cards)**
1. **Games Played** - Total number of completed games
2. **Best Score** - Personal best score in a single game
3. **Average Score** - Average performance across all games
4. **Avg Efficiency** - Performance efficiency metric

### **Detailed Performance Metrics (3 Cards)**
1. **Best Clicks** - Personal best clicks in a single game
2. **Longest Survival** - Personal best endurance time (formatted as MM:SS)
3. **Avg Clicks** - Average clicks per game

### **Blockchain Information**
- **Network**: Sui Testnet
- **Wallet Address**: Truncated display for privacy
- **Skill Tier**: Current player skill level
- **Last Updated**: Timestamp of most recent game

## 🕐 **TIME FORMATTING**

### **Display Format**
- **Input**: Milliseconds from blockchain
- **Output**: Human-readable MM:SS format
- **Examples**: 
  - 785ms → "0:01"
  - 2704ms → "0:03"
  - 3928ms → "0:04"

### **Formatting Function**
```typescript
private formatTime(ms: number): string {
  if (ms === 0) return '0:00';
  
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
```

## 🔄 **DATA REFRESH MECHANISM**

### **Automatic Refresh**
- **Post-Game Update**: Stats refresh 2 seconds after score submission
- **Blockchain Sync**: Ensures latest data from smart contract
- **User-Triggered**: Manual refresh button available

### **Caching Strategy**
- **React Query**: Efficient data caching and background updates
- **Stale Data Handling**: Automatic revalidation
- **Error Recovery**: Graceful fallback to cached data

## 🎮 **GAME INTEGRATION**

### **Score Submission**
```typescript
// After each game completion
const result = await submitScore(
  playerAddress,
  finalScore,
  enduranceLevel,
  clicks,
  timeElapsed
);

// Stats automatically refresh after successful submission
if (result.success) {
  setTimeout(() => {
    refreshPlayerStats();
  }, 2000);
}
```

### **Real-time Updates**
- **Immediate Display**: Current game session data
- **Blockchain Sync**: Historical data from smart contract
- **Performance Metrics**: Endurance, clicks, and efficiency tracking

## 🛠️ **DEVELOPMENT FEATURES**

### **Debug Information**
- **Raw Blockchain Data**: Complete data structure display
- **Console Logging**: Detailed extraction process logging
- **Error Handling**: Graceful fallbacks for missing data

### **Error States**
- **Wallet Not Connected**: Clear connection instructions
- **Loading State**: Progress indicators during data fetch
- **Error Recovery**: Retry mechanisms and user guidance

## 📱 **RESPONSIVE DESIGN**

### **Mobile Optimization**
- **Grid Layout**: Responsive card grid (2-4 columns)
- **Touch Friendly**: Optimized for mobile interaction
- **Readable Text**: Appropriate sizing for all devices

### **Accessibility**
- **Screen Reader Support**: Proper ARIA labels
- **Keyboard Navigation**: Full keyboard accessibility
- **High Contrast**: Theme-aware color schemes

## 🔧 **CONFIGURATION**

### **Environment Variables**
```bash
NEXT_PUBLIC_SCORE_SYSTEM_ID=0xf829db9e54b991e8774a082d6313f59378b4ed8b75436c72579514e1fdb51cb3
```

### **Network Configuration**
- **Default**: Sui Testnet
- **Configurable**: Network switching support
- **Contract IDs**: Environment-based configuration

## 🚀 **FUTURE ENHANCEMENTS**

### **Planned Features**
- **Recent Games**: Individual game session history
- **Achievement System**: Milestone tracking and rewards
- **Leaderboards**: Global and friend-based rankings
- **Performance Analytics**: Trend analysis and insights

### **Data Expansion**
- **Session Details**: Individual game breakdowns
- **Performance Trends**: Improvement tracking over time
- **Social Features**: Friend comparisons and challenges

## 📚 **RELATED DOCUMENTATION**

- **[PROJECT_ARCHITECTURE.md](PROJECT_ARCHITECTURE.md)** - System architecture overview
- **[DEVELOPMENT_GUIDE.md](DEVELOPMENT_GUIDE.md)** - Development standards
- **[SMART_CONTRACT_SUMMARY.md](SMART_CONTRACT_SUMMARY.md)** - Smart contract details

## 🎯 **QUICK REFERENCE**

### **Key Files**
- `src/components/modals/StatisticsModal.tsx` - Main statistics display
- `src/lib/services/blockchain/base.ts` - Blockchain data service
- `src/hooks/useCachedBlockchainData.ts` - Data caching hook

### **Common Operations**
- **View Stats**: Open Statistics Modal from header
- **Refresh Data**: Click refresh button or complete a game
- **Debug Info**: Check console logs for detailed extraction process

---

*Last Updated: January 2025*
*Version: 2.0 - Blockchain Integration*

