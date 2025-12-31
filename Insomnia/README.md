# 🎮 **INSOMNIA GAME**

> **A modern, production-ready blockchain gaming application built with Next.js 15, TypeScript, and Sui blockchain integration.**

## 📋 **PROJECT OVERVIEW**

Insomnia Game is a **fast-paced, blockchain-powered clicker game** that tests players' reflexes and endurance. Built with enterprise-grade architecture, the game features progressive difficulty, NFT-based game passes, and seamless blockchain integration on the Sui network.

## 🏗️ **ARCHITECTURE HIGHLIGHTS**

- **🎯 Modular Design**: Clean separation of concerns with service-based architecture
- **⚡ Performance Optimized**: Web Workers, code splitting, and real-time monitoring
- **♿ Accessibility First**: WCAG 2.1 AA compliant with full keyboard navigation
- **📱 Mobile-First**: PWA support with touch optimization and responsive design
- **🔐 Security Focused**: Multi-layer security with input validation and rate limiting
- **🌐 SSR Safe**: Server-side rendering compatible with proper hydration
- **📊 Production Ready**: Comprehensive error handling, monitoring, and analytics ready

## 🚀 **QUICK START**

### **Prerequisites**
- Node.js 18+
- npm or yarn
- Sui wallet extension (SlushWallet, Sui Wallet, etc.)

### **Installation**
```bash
# Clone the repository
git clone <repository-url>
cd Insomnia

# Install dependencies
npm install

# Set up environment variables
cp .env.local.example .env.local
# Edit .env.local with your configuration

# Start development server
npm run dev
```

### **Build & Deploy**
```bash
# Build for production
npm run build

# Start production server
npm start

# Analyze bundle size
ANALYZE=true npm run build
```

## 📁 **PROJECT STRUCTURE**

```
Insomnia/
├── 📁 src/                    # Source code (Next.js App Router)
├── 📁 public/                 # Static assets and PWA config
├── 📁 backend/                # Node.js/Express backend service
├── 📁 contracts/              # Sui Move smart contracts
├── 📄 PROJECT_ARCHITECTURE.md # System architecture overview
├── 📄 FILE_SYSTEM_GUIDE.md    # Comprehensive file system guide
├── 📄 REFACTORING_PLAN.md     # Development roadmap
└── 📄 COMPREHENSIVE_AUDIT_REPORT.md # Security & compliance audit
```

**📖 [View Complete File System Guide](FILE_SYSTEM_GUIDE.md)**
**🏗️ [View Project Architecture](PROJECT_ARCHITECTURE.md)**

## 🎮 **GAME FEATURES**

### **Core Gameplay**
- **5x5 Grid**: Mobile-optimized layout with smooth block spawning
- **Progressive Difficulty**: Speed increases every 30 seconds
- **Smart Game Start**: First block stays visible until clicked
- **Real-Time Feedback**: Live performance monitoring and visual indicators

### **Blockchain Integration**
- **Sui Network**: High-performance Layer 1 blockchain
- **Game Pass NFTs**: Three tiers (Basic, Premium, Unlimited)
- **Credit System**: Automatic credit consumption with game owner gas payment
- **Wallet Support**: SlushWallet, Sui Wallet, and other compatible wallets

### **User Experience**
- **Theme System**: 4 beautiful themes with different atmospheres
- **Mobile-First Design**: Optimized touch targets and responsive layouts
- **PWA Support**: Installable on mobile devices
- **Accessibility**: Full keyboard navigation and screen reader support

## 🔧 **TECHNOLOGY STACK**

### **Frontend**
- **Next.js 15**: React framework with SSR/SSG support
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first CSS framework
- **React Query**: Server state management

### **Blockchain**
- **Sui Blockchain**: High-performance Layer 1
- **@mysten/sui**: Official Sui SDK
- **@mysten/dapp-kit**: Wallet connection and transaction signing

### **Performance & Monitoring**
- **Web Workers**: Background processing
- **Performance API**: Real-time metrics
- **Error Boundaries**: Graceful error handling
- **Bundle Analyzer**: Build optimization

## 📊 **PERFORMANCE METRICS**

### **Bundle Analysis**
```
Route (app)                    Size      First Load JS
┌ ○ /                         156 B     316 kB ⚡
├ ○ /_not-found              183 B     305 kB ⚡  
└ ○ /game                    2.8 kB    323 kB ⚡
+ First Load JS shared       305 kB
```

### **Core Web Vitals Targets**
- **LCP (Largest Contentful Paint)**: < 2.5s ⚡
- **FID (First Input Delay)**: < 100ms ⚡
- **CLS (Cumulative Layout Shift)**: < 0.1 ⚡

## 🛡️ **SECURITY & COMPLIANCE**

### **Security Features**
- ✅ **Input Validation**: Comprehensive sanitization and validation
- ✅ **Security Headers**: Content Security Policy, XSS protection
- ✅ **Rate Limiting**: API protection and abuse prevention
- ✅ **Private Key Protection**: Backend-only storage
- ✅ **HTTPS Enforcement**: Production security headers

### **Compliance Status**
- ✅ **WCAG 2.1 AA**: Accessibility guidelines
- ✅ **OWASP**: Security best practices
- ✅ **Core Web Vitals**: Performance standards
- ✅ **PWA Standards**: Progressive Web App criteria

## 📱 **MOBILE & PWA FEATURES**

### **Progressive Web App**
- **Installable**: Add to home screen on mobile devices
- **Offline Support**: Basic offline functionality
- **App-Like Experience**: Native-like navigation and interactions

### **Mobile Optimizations**
- **Touch Targets**: 44px minimum size for accessibility
- **Haptic Feedback**: Vibration support for touch interactions
- **Viewport Management**: Safe area handling for notches
- **Orientation Support**: Portrait and landscape modes

## 🚀 **DEPLOYMENT**

### **Platforms**
- **Vercel**: Optimal for Next.js (recommended)
- **Netlify**: Good alternative with CDN
- **AWS/GCP/Azure**: Enterprise scalability

### **Environment Setup**
```bash
# Production environment variables
NEXT_PUBLIC_BACKEND_URL=https://api.insomnia-game.com
NODE_ENV=production
```

### **Pre-Deployment Checklist**
- ✅ Environment variables configured
- ✅ Security headers implemented
- ✅ Error monitoring setup
- ✅ Performance monitoring ready
- ✅ Analytics integration prepared

## 🧪 **DEVELOPMENT**

### **Available Scripts**
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # TypeScript type checking
```

### **Code Quality**
- **ESLint**: Code linting and style enforcement
- **TypeScript**: Strict type checking
- **Prettier**: Code formatting
- **Husky**: Git hooks for quality assurance

### **Development Workflow**
1. **Feature Development**: Modular feature implementation
2. **Testing Strategy**: Unit, integration, and E2E tests
3. **Code Quality**: Automated linting and type checking
4. **Performance Monitoring**: Development-time metrics

## 📈 **ROADMAP**

### **Phase 1: Core Infrastructure** ✅ COMPLETED
- ✅ Core game mechanics and UI
- ✅ Theme system and mobile optimization
- ✅ Sui wallet integration
- ✅ Smart contract deployment
- ✅ Freemium business model
- ✅ Game pass system

### **Phase 2: Enhanced Features** 🚧 IN PROGRESS
- ✅ **🏆 Global Leaderboards**: Fully implemented with blockchain integration
- 🎯 Achievement tracking system
- 🎯 Blockchain rewards distribution
- 🎯 Tournament entry system

### **Phase 3: Advanced Features** 📋 PLANNED
- Multiple grid sizes and difficulty modes
- Power-ups and special effects
- Social features and friend challenges
- Advanced reward systems

## 📚 **DOCUMENTATION**

- **📁 [File System Guide](FILE_SYSTEM_GUIDE.md)**: Comprehensive file organization guide
- **🏗️ [Project Architecture](PROJECT_ARCHITECTURE.md)**: System architecture overview
- **📋 [Refactoring Plan](REFACTORING_PLAN.md)**: Development roadmap and phases
- **🔍 [Audit Report](COMPREHENSIVE_AUDIT_REPORT.md)**: Security and compliance audit
- **📖 [Backend README](backend/README.md)**: Backend service documentation

## 🤝 **CONTRIBUTING**

### **Development Setup**
1. Fork the repository
2. Create a feature branch
3. Follow the established code style
4. Add tests for new features
5. Submit a pull request

### **Code Standards**
- **TypeScript**: Strict mode enabled
- **React**: Functional components with hooks
- **Styling**: Tailwind CSS with custom properties
- **Testing**: Jest and React Testing Library

## 📄 **LICENSE**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 **SUPPORT**

### **Issues & Questions**
- **GitHub Issues**: [Create an issue](https://github.com/your-repo/issues)
- **Documentation**: Check the comprehensive guides above
- **Discord**: Join our community for real-time support

### **Common Issues**
- **Wallet Connection**: Ensure you have a compatible Sui wallet
- **Build Errors**: Check Node.js version (18+ required)
- **Performance Issues**: Use the performance monitoring tools

---

## 🏆 **PROJECT STATUS**

**🎯 Current Status**: **PRODUCTION READY** ✅

**🚀 Deployment Confidence**: **HIGH** - All major considerations addressed

**📊 Audit Status**: **FULLY COMPLIANT** - Security, accessibility, and performance optimized

---

*Insomnia Game represents a modern, enterprise-grade approach to blockchain gaming with a focus on user experience, performance, and maintainability.*

## Current Status

✅ **Core Game Mechanics**: Complete and working perfectly
✅ **Block Spawning**: Random block generation on 5x5 grid
✅ **Click Detection**: Accurate click handling with visual feedback
✅ **Scoring System**: Real-time score tracking and progression
✅ **Audio System**: 3 procedurally generated sound effects
✅ **Progressive Difficulty**: Speed increases every 30 seconds with real-time feedback
✅ **Visual Feedback**: Smooth animations and click effects
✅ **Mobile Optimized**: Responsive design for all devices
✅ **Game Flow Logic**: First block starts game, wrong clicks handled properly
✅ **Game Over System**: Timeout and wrong click detection with restart
✅ **Enhanced UI/UX**: Modern design with multiple themes and improved controls
✅ **Theme System**: 4 beautiful themes with different atmospheres
✅ **Game Over Modal**: Professional modal interface for game results
✅ **Mobile-First Design**: Optimized touch targets and responsive layouts
✅ **Timer System**: Fixed and working with real-time speed progression display
✅ **Speed Progression**: Visual indicators showing difficulty increases every 30 seconds
✅ **Debug System**: Console logging for speed changes and game progression
✅ **Sui Wallet Integration**: Fully functional wallet connection and blockchain integration
✅ **Blockchain Features**: Wallet connection, balance display, and network detection working
✅ **Freemium Business Model**: Complete implementation with free demo and premium tiers
✅ **Smart Contract Deployment**: All contracts deployed and functional on Sui Testnet
✅ **Game Pass System**: NFT-based premium access system implemented
✅ **Frontend UI**: Compact, mobile-first design with proper button sizing and alignment
✅ **GamePass Purchase Flow**: Working purchase system with SUI payments
✅ **Credit Management**: Real-time credit balance display and consumption
✅ **Add Games Functionality**: Users can add more games to existing passes
✅ **Smart Contract Integration**: Direct blockchain queries working properly
✅ **🏆 Global Leaderboard System**: Fully functional blockchain-based leaderboards with real-time data

## How to Play

1. **Connect Wallet**: Connect your Sui wallet (SlushWallet, Sui Wallet, etc.)
2. **Choose Theme**: Select from 4 different visual themes to match your mood
3. **Start Game**: Click the "Start Game" button
4. **First Block**: First block appears with NO timeout (take your time!)
5. **Explore Safely**: Click wrong tiles - nothing happens before game starts
6. **Start Playing**: Click the first block to officially begin the game
7. **Beat the Clock**: Subsequent blocks disappear if not clicked in time
8. **Increase Speed**: Every 30 seconds, blocks become faster
9. **Survive**: Try to achieve the highest score possible

## Game Features

- **5x5 Grid**: Mobile-optimized layout with smooth block spawning
- **Smart Game Start**: First block stays visible until clicked
- **Progressive Difficulty**: 
  - 0-30s: 1 second block visibility
  - 30-60s: 0.8 second visibility
  - 60-90s: 0.6 second visibility
  - 90-120s: 0.4 second visibility
  - 120s+: 0.3 second visibility (minimum)
- **Real-Time Speed Display**: 
  - Speed card shows current block visibility time
  - Level card shows current difficulty level
  - Both update in real-time as game progresses
- **Enhanced Visual Design**: 
  - Beautiful gradient buttons with hover effects
  - Smooth animations and transitions
  - Professional shadows and glows
  - Mobile-optimized touch targets
- **Theme System**: 
  - **Midnight Neon**: High energy, addictive gaming atmosphere
- **Aurora Nights**: Calming, focused late-night study mood
- **Neon Sunset**: Warm, inviting cozy gaming experience
- **Cyber Dawn**: Futuristic, mysterious sci-fi late night
- **Visual Feedback**: 
  - Theme-colored pulsing blocks when active
  - Green flash effect when successfully clicked
  - Smooth animations and transitions
  - Theme-specific color schemes
- **Audio Effects**: 3 unique procedurally generated sounds
- **Real-time Stats**: Live score, time tracking, and difficulty level
- **Game Over Modal**: Professional modal with performance analysis and restart
- **Debug & Monitoring**: 
  - Console logging for speed level changes
  - Real-time speed progression tracking
  - Performance monitoring and optimization
  - Speed threshold detection and logging
- **Web3 Integration**: 
  - Sui wallet connection (SlushWallet, Sui Wallet, etc.)
  - Real-time balance display
  - Network detection (Testnet/Mainnet)
  - Blockchain-ready architecture

## Game Flow

### **Phase 1: Wallet Connection**
- Connect your Sui wallet
- View your SUI balance and network
- Prepare for blockchain integration

### **Phase 2: Game Setup**
- Choose your preferred visual theme
- Click "Start Game" button
- First block appears (no timeout)
- Players can explore and click wrong tiles safely

### **Phase 3: Game Start**
- Click the first block to officially start
- Timer begins counting immediately
- Game state changes to active

### **Phase 4: Active Gameplay**
- New blocks spawn with timeouts
- Wrong clicks end the game
- Speed increases every 30 seconds
- Score accumulates with each successful click

### **Phase 5: Game Over**
- Block timeout OR wrong click
- Professional modal displays final results
- Performance analysis and encouragement
- "Play Again" button to restart

## Timer & Speed Progression System

### **How It Works**
The game features a sophisticated timer system that tracks game progression and automatically increases difficulty:

1. **Timer Start**: Begins counting immediately when "Start Game" is clicked
2. **Real-Time Updates**: Updates every 16ms (60 FPS) for smooth progression
3. **Speed Thresholds**: Automatically detects when to increase difficulty
4. **Visual Feedback**: Multiple indicators show current speed and level

### **Speed Levels & Timing**
- **Beginner (0-30s)**: Blocks visible for 1.0 seconds
- **Intermediate (30-60s)**: Blocks visible for 0.8 seconds  
- **Advanced (60-90s)**: Blocks visible for 0.6 seconds
- **Expert (90-120s)**: Blocks visible for 0.4 seconds
- **Master (120s+)**: Blocks visible for 0.3 seconds (minimum)

### **Monitoring Speed Changes**
Players can monitor speed progression through multiple visual indicators:

1. **Speed Card**: Shows current block visibility time (e.g., "0.8s")
2. **Level Card**: Displays current difficulty level (e.g., "Intermediate")
3. **Time Card**: Real-time countdown showing game duration
4. **Console Logs**: Detailed speed change notifications (F12 → Console)

### **Debug Console Output**
Open browser console (F12) to see detailed speed progression:
```
🎯 SPEED CHANGE: Intermediate (0.8s) - Block visibility: 800ms at 30.0s
🎯 SPEED CHANGE: Advanced (0.6s) - Block visibility: 600ms at 60.0s
🎯 SPEED CHANGE: Expert (0.4s) - Block visibility: 400ms at 90.0s
🎯 SPEED CHANGE: Master (0.3s) - Block visibility: 300ms at 120.0s
```

## Web3 Integration

### **Supported Wallets**
- **SlushWallet**: Fully tested and working
- **Sui Wallet**: Compatible with Sui DApp Kit
- **Other Sui Wallets**: Any wallet compatible with @mysten/dapp-kit

### **Blockchain Features**
- **Wallet Connection**: Secure connection to Sui wallets
- **Balance Display**: Real-time SUI balance in your wallet
- **Network Detection**: Automatic detection of Testnet/Mainnet
- **Account Management**: Support for multiple wallet accounts
- **Transaction Ready**: Prepared for future blockchain features

### **Technical Implementation**
- **Sui DApp Kit**: Latest version (0.17.3) for optimal compatibility
- **React Context**: Custom WalletContext for state management
- **Provider Architecture**: Clean separation of concerns
- **Error Handling**: Graceful fallbacks and user feedback

## Development

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Sui wallet extension (SlushWallet, Sui Wallet, etc.)

### Installation
```bash
npm install
```

### Development Server
```bash
npm run dev
```

### Build
```bash
npm run build
```

### Testing
1. Open http://localhost:3000 in your browser
2. **Connect Wallet**: Click "Connect Sui Wallet" and approve connection
3. **Verify Connection**: Check that your wallet address and balance are displayed
4. **Test the theme system** by switching between different themes
5. **Click "Start Game"** to begin
6. **Test the new game flow**:
   - First block has no timeout
   - Wrong clicks before game start are ignored
   - Game only starts after clicking the first block
   - Subsequent blocks have timeouts
   - Wrong clicks after game start end the game
7. **Verify progressive difficulty**:
   - Watch the Speed card change from 1.0s → 0.8s → 0.6s → 0.4s → 0.3s
   - Check the Level card progression: Beginner → Intermediate → Advanced → Expert → Master
   - Monitor console logs (F12) for speed change notifications every 30 seconds
8. **Check mobile responsiveness** and touch targets
9. **Test the game over modal** functionality
10. **Verify timer accuracy** and smooth progression
11. **Test wallet disconnect** and reconnect functionality

## Technical Architecture

- **Frontend**: React 19 + TypeScript + Next.js 15
- **Styling**: Tailwind CSS v4 with CSS custom properties
- **State Management**: React hooks with proper cleanup
- **Audio**: Web Audio API with procedural sound generation
- **Performance**: 60 FPS gameplay with requestAnimationFrame
- **Responsive**: Mobile-first design with touch support
- **Game Logic**: Clean timeout management and state tracking
- **Theme System**: Dynamic CSS custom properties with smooth transitions
- **UI Components**: Modular, reusable components with consistent styling
- **Web3 Layer**: Sui DApp Kit with custom WalletContext
- **Blockchain**: Sui network integration with wallet management

## Technical Requirements

### Performance ✅ ACHIEVED
- 60 FPS gameplay ✅
- Responsive touch input ✅
- Smooth animations ✅
- Efficient audio playback ✅
- Optimized timer system ✅
- Real-time speed progression ✅
- Efficient speed change detection ✅

### Compatibility
- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile devices (iOS Safari, Chrome Mobile)
- Desktop browsers
- Progressive Web App capabilities
- Sui wallet extensions

### Security
- Secure wallet connections ✅
- Protected token transactions (ready for implementation)
- Input validation ✅
- Anti-cheat measures (ready for implementation)

## Recent UI/UX Improvements

✅ **Enhanced Theme System**: 4 beautiful themes with different atmospheres
✅ **Improved Game Controls**: Gradient buttons with hover effects and animations
✅ **Game Over Modal**: Professional modal interface with performance analysis
✅ **Mobile-First Design**: Optimized touch targets (44px minimum) and responsive layouts
✅ **Enhanced Visual Design**: Better gradients, shadows, and visual feedback
✅ **Improved Accessibility**: Better contrast and touch targets
✅ **Smooth Animations**: Enhanced transitions and hover effects
✅ **Responsive Layout**: Optimized for all screen sizes and devices
✅ **Wallet Integration**: Professional wallet connection interface with balance display
✅ **Header Dropdown Menu System**: Complete modal-based navigation with Profile, Statistics, Leaderboard, and Settings
✅ **Enhanced UI Contrast**: Fixed all accent color background sections for optimal text readability
✅ **GamePass Purchase Modal**: Streamlined purchase interface with clean benefits section and simplified options

## Header Dropdown Menu System - FULLY IMPLEMENTED! 🎯

✅ **Complete Modal-Based Navigation**: Professional dropdown menu with 4 essential sections
✅ **Seamless User Experience**: No page reloads, instant access to all features
✅ **Theme Integration**: Fully integrated with the existing theme system
✅ **Mobile Optimized**: Responsive design with touch-friendly interactions
✅ **Click-Outside-to-Close**: Intuitive modal dismissal behavior
✅ **Perfect Centering**: All modals positioned exactly in the center of the screen

### **Menu Items & Features**

#### **👤 Profile Modal**
- **Wallet Information**: Display wallet address, balance, and network
- **Game Pass Status**: Show current pass tier and remaining credits
- **Account Overview**: Complete user profile information
- **Theme Integration**: Consistent with current theme colors

#### **📊 Statistics Modal - Blockchain Integrated**
- **Real-Time Blockchain Data**: Live statistics from Sui smart contract
- **Core Performance**: Games played, best score, average score, efficiency
- **Endurance Metrics**: Longest survival time, average survival time
- **Click Performance**: Best clicks, average clicks per game
- **Advanced Stats**: Skill tier, endurance level, last played
- **Performance Tips**: Actionable advice for improvement
- **Enhanced Contrast**: Dark text on bright accent backgrounds for readability

#### **🏆 Leaderboard Modal - FULLY FUNCTIONAL! 🎉**
- **Global Rankings**: Real-time leaderboard with live blockchain data
- **Multiple Categories**: Best Score, Best Time, Best Clicks, Best Efficiency, and more
- **Skill Tier Filtering**: Filter players by skill level (Overall, Beginner, Intermediate, Advanced, Expert, Master)
- **Real-Time Data**: Live updates from Sui smart contract with refresh functionality
- **Player Statistics**: Complete player profiles with scores, times, efficiency, and game counts
- **Navigation System**: Carousel-style category switching with left/right arrows
- **Mobile Optimized**: Tall navigation arrows for better mobile usability
- **How Rankings Work**: Clear explanation of scoring system and competition rules
- **Enhanced Contrast**: Dark text on bright accent backgrounds for readability

#### **⚙️ Settings Modal**
- **Theme Selection**: Choose from 4 beautiful themes with live preview
- **Game Preferences**: Customize game settings and controls
- **Accessibility Options**: High contrast, keyboard navigation, screen reader support
- **WCAG Compliance**: Accessibility standards information
- **Enhanced Contrast**: Dark text on bright accent backgrounds for readability

### **Technical Implementation**
- **Modal Architecture**: React-based modal system with lazy loading
- **Positioning System**: Absolute positioning with transform for perfect centering
- **Click-Outside Logic**: Event handling for intuitive modal dismissal
- **Theme Integration**: CSS custom properties for dynamic theming
- **Performance Optimization**: Lazy loading with Suspense fallbacks
- **Accessibility**: ARIA labels, keyboard navigation, and screen reader support

### **User Experience Impact**
- **Faster Navigation**: No page reloads, instant access to features
- **Better Organization**: Logical grouping of related functionality
- **Improved Accessibility**: Clear navigation structure and contrast
- **Professional Appearance**: Modern, polished interface design
- **Mobile Friendly**: Touch-optimized for all device types

## Enhanced UI Contrast & Accessibility - COMPLETE! ♿

✅ **All Accent Color Sections Fixed**: Perfect text readability across the entire application
✅ **Professional Appearance**: Dark text on bright backgrounds for excellent contrast
✅ **Accessibility Compliance**: WCAG 2.1 AA standards for color contrast
✅ **Consistent Design**: Unified approach to all accent-colored sections

### **What Was Fixed**

#### **📊 Statistics Modal - Performance Tips Section**
- **Background**: Bright accent color gradient (removed opacity)
- **Text**: Changed to dark text (`var(--color-background)`) for readability
- **Icon**: Dark icon for visibility against bright background

#### **🏆 Leaderboard Modal - How Rankings Work Section**
- **Background**: Bright accent color gradient (removed opacity)
- **Text**: Dark text for excellent contrast
- **Icon**: Dark icon for visibility

#### **⚙️ Settings Modal - WCAG Compliance Section**
- **Background**: Bright accent color gradient (removed opacity)
- **Text**: Dark text for accessibility compliance
- **Icon**: Dark icon for visibility

### **Technical Solution**
- **Removed `bg-opacity-10`**: Made accent backgrounds fully opaque for strong contrast
- **Applied `text-[var(--color-background)]`**: Dark text on bright backgrounds
- **Consistent Implementation**: Same approach across all similar sections
- **Theme Integration**: Uses theme variables for dynamic color management

### **User Experience Impact**
- **Perfect Readability**: No more unreadable text on accent backgrounds
- **Professional Appearance**: Clean, polished interface design
- **Accessibility**: Better experience for all users, including those with visual impairments
- **Consistency**: Unified design language throughout the application

## 🏆 Global Leaderboard System - FULLY IMPLEMENTED! 🎉

✅ **Blockchain-Based Leaderboards**: Real-time rankings from Sui smart contract
✅ **Multiple Ranking Categories**: 10 different leaderboard types (Best Score, Best Time, etc.)
✅ **Skill Tier Filtering**: Filter players by skill level with interactive tier cycling
✅ **Carousel Navigation**: Smooth category switching with left/right arrow navigation
✅ **Real-Time Data**: Live updates with refresh functionality and timestamp tracking
✅ **Mobile Optimized**: Responsive design with tall navigation arrows for touch devices
✅ **Professional UI**: Clean, modern interface with proper data visualization
✅ **Data Persistence**: All player statistics stored on-chain with anti-cheat protection

### **Leaderboard Categories Available**
The system supports 10 different ranking categories:

1. **🏆 Best Score**: Highest single game score achieved
2. **⏱️ Best Time**: Longest survival time in a single game
3. **🖱️ Best Clicks**: Most clicks achieved in one game
4. **⚡ Best Efficiency**: Best clicks/second ratio achieved
5. **📊 Average Score**: Consistent scoring ability over multiple games
6. **🕐 Average Time**: Consistent survival ability across games
7. **🖱️ Average Clicks**: Consistent clicking performance
8. **⚡ Average Efficiency**: Consistent efficiency over time
9. **🎯 Skill Tier**: Rankings by current skill level
10. **🌟 Overall**: Combined performance ranking

### **Skill Tier Filtering System**
Players can filter the leaderboard by skill tier using an interactive "Tiers" card:

- **Overall (Default)**: No filtering, shows all players
- **Beginner (Tier 0)**: New players starting their journey
- **Intermediate (Tier 1)**: Players with some experience
- **Advanced (Tier 2)**: Skilled players with good performance
- **Expert (Tier 3)**: High-performing players
- **Master (Tier 4)**: Elite players with exceptional skills

**How It Works**: Click the Tiers card to cycle through skill levels, automatically filtering the leaderboard data.

### **Technical Implementation**

#### **Backend Architecture**
- **Express.js Server**: RESTful API endpoints for leaderboard data
- **Sui Blockchain Integration**: Direct smart contract queries using `@mysten/sui`
- **Dynamic Field Queries**: Efficient data retrieval from `player_stats_table`
- **Real-Time Processing**: Live data extraction and formatting
- **Error Handling**: Comprehensive error handling with fallback responses

#### **Frontend Components**
- **LeaderboardModal**: Main modal container with header and content
- **Leaderboard**: Core component handling data display and navigation
- **Category Navigation**: Left/right arrow system for category switching
- **Tier Filtering**: Interactive tier selection with visual feedback
- **Data Visualization**: Clean table layout with player statistics

#### **Data Flow**
1. **Smart Contract**: Player statistics stored in `ScoreSystem.player_stats_table`
2. **Backend Query**: Express server queries Sui blockchain for live data
3. **Data Processing**: Raw blockchain data converted to frontend format
4. **API Response**: Structured JSON response sent to frontend
5. **Frontend Display**: React components render live leaderboard data

### **User Experience Features**

#### **Navigation & Interaction**
- **Category Switching**: Smooth transitions between different ranking types
- **Tier Filtering**: One-click filtering by skill level
- **Refresh Functionality**: Manual refresh button in modal header
- **Responsive Design**: Optimized for all device sizes
- **Touch Support**: Mobile-optimized navigation arrows

#### **Data Display**
- **Player Rankings**: Clear position indicators with medal icons
- **Performance Metrics**: Comprehensive player statistics display
- **Real-Time Updates**: Live data with "Last updated" timestamps
- **Loading States**: Smooth loading animations during data fetch
- **Error Handling**: Graceful error display with retry options

#### **Visual Design**
- **Professional Layout**: Clean, organized data presentation
- **Theme Integration**: Consistent with overall application theming
- **Accessibility**: High contrast text and proper color usage
- **Mobile Optimization**: Touch-friendly interface elements
- **Smooth Animations**: Professional transitions and hover effects

### **Performance & Scalability**
- **Efficient Queries**: Optimized blockchain data retrieval
- **Caching Strategy**: Smart caching for frequently accessed data
- **Real-Time Updates**: Live data without unnecessary API calls
- **Mobile Performance**: Optimized for mobile device capabilities
- **Error Resilience**: Graceful degradation during network issues

## GamePass Purchase Modal - Streamlined & Professional! 💎

✅ **Clean Purchase Interface**: Simplified modal with focused user experience
✅ **Perfect Modal Positioning**: Centered on screen with click-outside-to-close functionality
✅ **Clear Benefits Section**: Single section explaining what ALL game passes provide
✅ **Simplified Purchase Options**: Clean cards with just name, price, and games (no feature lists)
✅ **Professional Appearance**: Compact size and consistent styling with other modals

### **What Was Improved**

#### **🎯 Modal Structure & Positioning**
- **Before**: Off-center positioning, no click-outside-to-close
- **After**: Perfect centering using `transform: translate(-50%, -50%)`
- **Before**: Complex backdrop and modal structure
- **After**: Same working approach as header dropdown modals

#### **🎯 Purchase Options Simplification**
- **Before**: Each option had confusing feature lists
- **After**: Clean cards with just essential info (name, price, games)
- **Before**: Future features like "VIP status" and "NFT rewards"
- **After**: Focus on actual implemented features only

#### **🎯 Benefits Communication**
- **Before**: Benefits scattered across individual options
- **After**: Single, clear benefits section explaining what ALL passes provide
- **Before**: Demo mode messaging cluttering the interface
- **After**: Clean, focused purchase experience

### **Technical Implementation**
- **Modal Architecture**: Applied exact same working structure from ProfileModal
- **Positioning System**: Absolute positioning with transform for perfect centering
- **Click-Outside Logic**: Event handling for intuitive modal dismissal
- **Responsive Design**: Mobile-optimized with proper overflow handling
- **Theme Integration**: Consistent with existing theme system

### **User Experience Impact**
- **Clearer Decision Making**: Users understand benefits before seeing options
- **Simplified Choices**: Purchase options focus on quantity, not confusing features
- **Professional Interface**: Clean, modern design matching other modals
- **Better Conversion**: Streamlined flow from benefits understanding to purchase

## Freemium Business Model Implementation

✅ **Complete Freemium System**: Implemented free demo and premium blockchain features
✅ **Game Pass NFT System**: Smart contract-based game passes for premium access
✅ **Tier Management**: Clear distinction between free and premium user experiences
✅ **Local vs Blockchain Separation**: Clean separation of local gameplay from blockchain features
✅ **Purchase Flow**: Complete game pass purchase system using Sui blockchain
✅ **UI Improvements**: Compact, mobile-first front page with proper button sizing and centered bullet points

### **Freemium Model Overview**
The game now operates on a **freemium business model** that provides:

- **🆓 Free Demo Tier**: 
  - Full game experience without wallet connection
  - Score display at game end (no persistence)
  - No blockchain interaction required
  - Zero friction entry for new users

- **💎 Premium Tier**: 
  - Everything from free tier
  - Global leaderboards and achievement tracking
  - Blockchain rewards and tournament entry
  - Data persistence and progress tracking
  - Requires wallet connection and game pass purchase

### **GamePass System Features**
- **Purchase GamePasses**: Buy Basic (10 games), Premium (50 games), or Unlimited (999,999 games)
- **Credit Management**: Real-time display of remaining game credits
- **Add More Games**: Purchase additional credits for existing passes
- **Automatic Updates**: Credit balance updates automatically after transactions
- **Smart Contract Integration**: All data comes directly from Sui blockchain

### **Smart Contract Architecture**
- **GameCore.move**: Core game logic and session management
- **ScoreSystem.move**: Player statistics and anti-cheat measures
- **AdminSystem.move**: Game parameter management
- **GamePass.move**: NFT-based game pass system with different tiers

### **Frontend Implementation**
- **Compact Layout**: Clean, organized sections with proper spacing
- **Button Constraints**: Reasonably sized buttons (max 20rem) instead of full-width
- **Centered Content**: Proper alignment of titles, bullet points, and buttons
- **Mobile Optimization**: Responsive design that works on all screen sizes
- **Theme Integration**: Consistent theming throughout the interface
- **GamePass UI**: Professional purchase modal and credit display
- **Header Integration**: Global header with wallet status and game pass management
- **Credit Display**: Clean credit balance showing in header with automatic updates

### **User Experience Flow**
1. **Landing Page**: Clean layout with wallet connection at top
2. **Game Title**: Prominent "INSOMNIA" branding with subtitle
3. **Blockchain Status**: Compact status display
4. **Game Options**: Two distinct sections for Free Demo and Premium Features
5. **Clear Call-to-Action**: Prominent buttons for each tier

### **GamePass Purchase Flow**
1. **Connect Wallet**: User connects Sui wallet to access premium features
2. **View Credits**: Header displays current credit balance (if user has active pass)
3. **Purchase/Add Games**: 
   - New users see "💎 Upgrade" button
   - Existing users see "➕ Add Games" button
4. **Select Tier**: Choose Basic (10 games), Premium (50 games), or Unlimited
5. **Complete Transaction**: Pay with SUI, receive GamePass NFT
6. **Start Playing**: Credits consumed on first block click, game owner pays gas

### **Technical Improvements**
- **Button Sizing**: Constrained button widths for better visual balance
- **Bullet Point Alignment**: Centered feature lists with consistent spacing
- **Layout Spacing**: Reduced margins and padding for compact design
- **Component Organization**: Clean separation of concerns and responsibilities
- **Responsive Design**: Mobile-first approach with proper touch targets
- **Blockchain Integration**: Direct smart contract queries for real-time data
- **Credit System**: Automatic credit consumption and balance updates
- **Purchase Flow**: Seamless integration between UI and blockchain

## Recent Fixes Implemented

✅ **Fixed Block Timeout Logic**: First block has no timeout, subsequent blocks do
✅ **Fixed Wrong Click Logic**: Wrong clicks only matter after game starts
✅ **Fixed Game State Management**: Proper cleanup and restart functionality
✅ **Fixed Circular Dependencies**: Clean function organization
✅ **Added Comprehensive Debugging**: Console logging for troubleshooting
✅ **Improved User Experience**: Gentle learning curve for new players
✅ **Fixed Timer System**: Resolved infinite loop and maximum update depth errors
✅ **Enhanced Speed Progression**: Real-time visual indicators for difficulty changes
✅ **Added Speed Monitoring**: New Speed card showing current block visibility time
✅ **Improved Performance**: Optimized game loop and speed change detection
✅ **Implemented Sui Wallet Integration**: Full wallet connection and blockchain integration
✅ **Updated Dependencies**: Latest @mysten/dapp-kit (0.17.3) and @mysten/sui (1.37.2)
✅ **Fixed Wallet Compatibility**: Resolved SlushWallet integration issues
✅ **Added Wallet Context**: Custom React context for wallet state management
✅ **GamePass System Working**: Complete purchase flow and credit management
✅ **Credit Display Fixed**: Real-time credit balance showing properly
✅ **Add Games Functionality**: Users can purchase additional credits for existing passes
✅ **Smart Contract Integration**: Direct blockchain queries working without events
✅ **Header Dropdown Menu System**: Complete modal-based navigation system with Profile, Statistics, Leaderboard, and Settings
✅ **Enhanced UI Contrast**: Fixed all accent color background sections for optimal text readability
✅ **Landing Page Conditional Buttons**: Dynamic button display based on wallet connection status (Play Premium vs Connect Wallet)
✅ **🏆 Global Leaderboard System**: Complete blockchain-based leaderboard implementation with real-time data, multiple categories, and skill tier filtering

## Smart Contract Deployment Status

✅ **Contracts Deployed**: All smart contracts successfully deployed to Sui Testnet
✅ **GameCore**: Core game logic and session management deployed
✅ **ScoreSystem**: Player statistics and anti-cheat system deployed  
✅ **AdminSystem**: Game parameter management deployed
✅ **GamePass**: NFT-based game pass system deployed

### **Deployed Contract Addresses**
- **Package ID**: `0x21d99e...d87f3c` (Sui Testnet)
- **Network**: Sui Testnet (for development and testing)
- **Status**: All contracts verified and functional

### **Smart Contract Features**
- **Game Session Management**: Secure blockchain-based game sessions
- **Score Tracking**: Anti-cheat protected player statistics
- **Game Pass NFTs**: Three tiers (Basic, Premium, Unlimited)
- **Admin Controls**: Configurable game parameters
- **Gas Optimization**: Batch transaction support for cost efficiency

## Next Steps

1. **User Testing**: Test core gameplay mechanics and wallet integration with real players
2. **Performance Validation**: Verify 60 FPS on various devices
3. **Mobile Testing**: Test touch responsiveness and wallet connection
4. **Blockchain Features**: Implement score storage and leaderboards on Sui
5. **Challenge System**: Implement skill-based challenges
6. **Leaderboards**: Add competitive features with blockchain verification
7. **Additional Themes**: Create more theme variations
8. **Customization**: Allow users to create custom themes

## Game Loop

1. **Connect**: User connects Sui wallet
2. **Start**: User selects theme and clicks start button
3. **Spawn First**: First block appears (no timeout)
4. **Game Start**: User clicks first block, timer begins
5. **Spawn Timed**: New blocks spawn with timeouts
6. **Click or Timeout**: Must click before block disappears
7. **Repeat**: Continue until failure
8. **End**: Professional modal displays final score and restart option

## Current Development Priorities

### **Phase 1: Core Infrastructure** ✅ COMPLETED
- ✅ Core game mechanics and UI
- ✅ Theme system and mobile optimization
- ✅ Sui wallet integration
- ✅ Smart contract deployment
- ✅ Freemium business model
- ✅ Game pass system

### **Phase 2: Premium Features** 🚧 IN PROGRESS
- 🎯 Global leaderboards implementation
- 🎯 Achievement tracking system
- 🎯 Blockchain rewards distribution
- 🎯 Tournament entry system
- 🎯 Score persistence and verification

### **Phase 3: Advanced Features** 📋 PLANNED
- Multiple grid sizes and difficulty modes
- Power-ups and special effects
- Social features and friend challenges
- Advanced reward systems
- Custom theme creation tools
- Advanced animation effects
- Cross-chain integration possibilities

## Future Considerations

### Post-MVP Features
- Multiple grid sizes
- Different block types
- Power-ups and special effects
- Social features and leaderboards
- Advanced reward systems
- Custom theme creation
- Advanced animation effects
- Blockchain score verification
- Token-based rewards

### Scalability
- User growth handling
- Blockchain performance
- Server infrastructure
- Analytics and monitoring
- Theme marketplace
- Cross-chain integration

## Success Metrics

### Engagement
- Daily active users
- Session length
- Retention rates
- Click-through rates
- Theme usage patterns
- Wallet connection rates

### Technical
- Performance benchmarks (60 FPS achieved)
- Error rates
- Load times
- Compatibility scores
- Mobile performance
- Wallet connection success rate

### Business
- Token usage (when implemented)
- User acquisition
- Revenue generation
- Community growth
- Theme adoption rates
- Blockchain transaction volume

---

*This document serves as the foundation for the Insomnia game development. The core game mechanics are now complete and working perfectly, with enhanced UI/UX features including a beautiful theme system, mobile-first design, and fully functional Sui wallet integration.*
