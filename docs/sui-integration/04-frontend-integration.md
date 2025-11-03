# Frontend Integration

## 📦 Phase 3: Frontend Integration (Week 2-3)

This phase covers integrating wallet connection and API clients into your frontend game.

---

## Step 3.1: Install Frontend Dependencies

**Important:** Your game uses vanilla JavaScript (no build step). You have two options:

### Option A: Vanilla JS with Sui Wallet (Recommended for MVP)
No npm packages needed! Use Sui Wallet browser extension directly via window injection:

```html
<!-- Add to index.html <head> -->
<script>
  // Sui Wallet will inject itself into window.suiWallet
  // No build step required!
</script>
```

### Option B: Use Build System (If you want to use @mysten/dapp-kit)
If you want to use the full SDK, you'll need to add a build step:

```bash
# Install dependencies
npm install @mysten/wallet-adapter-base @mysten/dapp-kit

# Set up a bundler (Vite, Webpack, etc.)
npm install -D vite
```

**For MVP, we recommend Option A (vanilla JS)** - simpler, no build step!

---

## Step 3.2: Create Wallet Connection Module (Vanilla JS)

**`src/game/blockchain/wallet-connection.js`:**

```javascript
// ==========================================
// SUI WALLET CONNECTION MODULE (VANILLA JS)
// ==========================================

let connectedWallet = null;
let connectedAddress = null;

/**
 * Check if Sui Wallet extension is available
 * @returns {boolean}
 */
function isSuiWalletAvailable() {
  return typeof window !== 'undefined' && window.suiWallet !== undefined;
}

/**
 * Initialize wallet connection system
 */
function initializeWalletConnection() {
  if (!isSuiWalletAvailable()) {
    console.warn('⚠️ Sui Wallet extension not detected');
    return {
      success: false,
      error: 'Please install Sui Wallet extension',
      wallets: []
    };
  }

  console.log('✅ Sui Wallet extension detected');
  return {
    success: true,
    wallets: [{ name: 'Sui Wallet', available: true }]
  };
}

/**
 * Connect to Sui Wallet
 * @returns {Promise<Object>} Connection result
 */
async function connectWallet() {
  try {
    if (!isSuiWalletAvailable()) {
      return {
        success: false,
        error: 'Sui Wallet extension not found. Please install it first.'
      };
    }

    // Request connection
    const response = await window.suiWallet.requestPermissions();
    
    if (response && response.accounts && response.accounts.length > 0) {
      connectedAddress = response.accounts[0].address;
      connectedWallet = window.suiWallet;
      
      console.log('✅ Wallet connected:', connectedAddress);
      
      return {
        success: true,
        address: connectedAddress,
        wallet: 'Sui Wallet'
      };
    } else {
      return {
        success: false,
        error: 'User rejected wallet connection'
      };
    }
  } catch (error) {
    console.error('Error connecting wallet:', error);
    return {
      success: false,
      error: error.message || 'Failed to connect wallet'
    };
  }
}

/**
 * Disconnect wallet
 */
async function disconnectWallet() {
  try {
    if (connectedWallet) {
      await connectedWallet.disconnect();
    }
    connectedWallet = null;
    connectedAddress = null;
    return { success: true };
  } catch (error) {
    console.error('Error disconnecting wallet:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get current wallet address
 * @returns {string|null} Wallet address
 */
function getWalletAddress() {
  return connectedAddress;
}

/**
 * Check if wallet is connected
 * @returns {boolean}
 */
function isWalletConnected() {
  return connectedWallet !== null && connectedAddress !== null;
}

/**
 * Sign and execute a transaction
 * @param {TransactionBlock} tx - Transaction block to sign
 * @returns {Promise<Object>} Transaction result
 */
async function signAndExecuteTransaction(tx) {
  try {
    if (!isWalletConnected()) {
      throw new Error('Wallet not connected');
    }

    // Serialize transaction
    const txBytes = await tx.serialize();
    
    // Sign and execute via wallet
    const result = await connectedWallet.signAndExecuteTransactionBlock({
      transactionBlock: txBytes,
      options: {
        showEffects: true,
        showEvents: true
      }
    });

    return {
      success: true,
      digest: result.digest,
      effects: result.effects
    };
  } catch (error) {
    console.error('Error executing transaction:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Export to global scope (since we're using vanilla JS)
window.WalletConnection = {
  initializeWalletConnection,
  connectWallet,
  disconnectWallet,
  getWalletAddress,
  isWalletConnected,
  signAndExecuteTransaction,
  isSuiWalletAvailable
};
```

---

## Step 3.3: Create API Client Module (Vanilla JS)

**`src/game/blockchain/api-client.js`:**

```javascript
// ==========================================
// BACKEND API CLIENT (VANILLA JS)
// ==========================================

// Get API URL from script tag data attribute or use default
const API_BASE_URL = (() => {
  const script = document.querySelector('script[data-api-base-url]');
  return script 
    ? script.getAttribute('data-api-base-url') 
    : 'http://localhost:3000/api';
})();

/**
 * Submit game score to backend (verify transaction hash)
 * @param {string} transactionHash - Transaction hash from wallet
 * @returns {Promise<Object>} Verification result
 */
async function verifyScoreSubmission(transactionHash) {
  try {
    const response = await fetch(`${API_BASE_URL}/scores/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ transactionHash }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error verifying score:', error);
    throw error;
  }
}

/**
 * Fetch leaderboard from backend (blockchain)
 * @param {number} limit - Number of entries to fetch
 * @returns {Promise<Array>} Leaderboard entries
 */
async function fetchLeaderboard(limit = 100) {
  try {
    const response = await fetch(
      `${API_BASE_URL}/leaderboard?limit=${limit}`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.leaderboard || [];
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    // Fallback to localStorage leaderboard
    return getLocalLeaderboard();
  }
}

/**
 * Get player scores from blockchain
 * @param {string} walletAddress - Player wallet address
 * @returns {Promise<Array>} Player's scores
 */
async function getPlayerScores(walletAddress) {
  try {
    const response = await fetch(`${API_BASE_URL}/scores/${walletAddress}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.scores || [];
  } catch (error) {
    console.error('Error fetching player scores:', error);
    return [];
  }
}

/**
 * Check token balance for gatekeeping
 * @param {string} walletAddress - Wallet address to check
 * @returns {Promise<Object>} Balance info
 */
async function checkTokenBalance(walletAddress) {
  try {
    const response = await fetch(`${API_BASE_URL}/tokens/balance/${walletAddress}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error checking token balance:', error);
    return { hasMinimumBalance: false, canPlay: false };
  }
}

/**
 * Fallback: Get local leaderboard from localStorage
 */
function getLocalLeaderboard() {
  try {
    const leaderboard = JSON.parse(localStorage.getItem('gameLeaderboard')) || [];
    return leaderboard.map((entry, index) => ({
      rank: index + 1,
      nickname: entry.name,
      score: entry.score,
      timestamp: entry.date,
    }));
  } catch (error) {
    console.error('Error reading local leaderboard:', error);
    return [];
  }
}

// Export to global scope (vanilla JS)
window.APIClient = {
  verifyScoreSubmission,
  fetchLeaderboard,
  getPlayerScores,
  checkTokenBalance
};
```

---

## Step 3.4: Integrate with Existing Leaderboard System

**Modify `src/game/systems/ui/leaderboard-system.js`:**

Add these modifications (no imports needed - vanilla JS):

```javascript
// Modify saveScore function to submit to backend
// Note: api-client.js and wallet-connection.js should be loaded before this file
async function saveScore() {
  console.log('🟣 [UI FLOW] saveScore() called');
  
  const name = document.getElementById('playerNameInput').value.trim();
  
  if (!name) {
    alert('Please enter your name!');
    hideNameInput();
    showMainMenu();
    return;
  }

  const score = currentGameScore;
  console.log("Saving score:", score, "for player:", name);

  // Check if wallet is connected
  const walletAddress = window.WalletConnection 
    ? window.WalletConnection.getWalletAddress() 
    : null;
  
  if (walletAddress) {
    // Submit to blockchain-enabled backend
    try {
      // Get game state data (you'll need to pass this from gameOver)
      const gameData = {
        walletAddress,
        nickname: name,
        score: score,
        distance: game.distance,
        coins: game.coins,
        bossesDefeated: game.bossesDefeated,
        tier: game.currentTier,
        gameData: {
          lives: game.lives,
          projectileLevel: game.projectileLevel,
        },
      };

      const result = await window.APIClient 
        ? window.APIClient.submitScore(gameData)
        : null;
      
      console.log('✅ Score submitted to backend:', result);
      
      // Still save locally as backup
      leaderboard.push({ 
        name, 
        score, 
        date: new Date().toLocaleDateString(),
        transactionHash: result.transactionHash,
        verified: result.verified,
      });
    } catch (error) {
      console.error('❌ Error submitting to backend:', error);
      // Fallback to local storage only
      leaderboard.push({ name, score, date: new Date().toLocaleDateString() });
    }
  } else {
    // No wallet connected, save locally only
    leaderboard.push({ name, score, date: new Date().toLocaleDateString() });
  }

  // Sort and keep only top 10 locally
  leaderboard.sort((a, b) => b.score - a.score);
  leaderboard = leaderboard.slice(0, 10);
  localStorage.setItem('gameLeaderboard', JSON.stringify(leaderboard));

  // Update display
  displayLeaderboard();
  displayLeaderboardModal();
  
  hideNameInput();
  showMainMenu();
}

// Modify displayLeaderboard to fetch from backend
async function displayLeaderboard() {
  const list = document.getElementById('leaderboardList');
  if (!list) return;
  
  list.innerHTML = '<li style="text-align: center; color: #888; padding: 20px;">Loading leaderboard...</li>';
  
  try {
    // Fetch from backend
    const backendLeaderboard = window.APIClient
      ? await window.APIClient.fetchLeaderboard(10, 0)
      : [];
    
    if (backendLeaderboard.length > 0) {
      list.innerHTML = '';
      backendLeaderboard.forEach((entry) => {
        const li = document.createElement('li');
        li.className = 'leaderboard-item';
        li.innerHTML = `
          <div style="display: flex; align-items: center;">
            <div class="rank">${entry.rank}</div>
            <div class="player-name">${entry.nickname || entry.walletAddress?.slice(0, 8)}</div>
            ${entry.verified ? '<span style="color: #4CAF50; font-size: 0.8em;">✓</span>' : ''}
          </div>
          <div class="player-score">${entry.score.toLocaleString()}</div>
        `;
        list.appendChild(li);
      });
    } else {
      // Fallback to local leaderboard
      const sortedScores = leaderboard.sort((a, b) => b.score - a.score).slice(0, 10);
      if (sortedScores.length === 0) {
        list.innerHTML = '<li style="text-align: center; color: #888; padding: 20px;">No scores yet!<br>Be the first to play!</li>';
      } else {
        list.innerHTML = '';
        sortedScores.forEach((entry, index) => {
          const li = document.createElement('li');
          li.className = 'leaderboard-item';
          li.innerHTML = `
            <div style="display: flex; align-items: center;">
              <div class="rank">${index + 1}</div>
              <div class="player-name">${entry.name}</div>
            </div>
            <div class="player-score">${entry.score.toLocaleString()}</div>
          `;
          list.appendChild(li);
        });
      }
    }
  } catch (error) {
    console.error('Error loading leaderboard:', error);
    // Fallback to local
    const sortedScores = leaderboard.sort((a, b) => b.score - a.score).slice(0, 10);
    // ... display local scores
  }
}
```

---

## Step 3.5: Add Wallet Connection UI to Main Menu

**User Flow:**
1. Front Page → Click "Enter Game" → Main Menu appears
2. Main Menu → User connects wallet
3. Main Menu → Check token balance (500,000 $Mews)
4. Main Menu → "Start Game" button enabled/disabled based on balance

### Add Wallet Connection Button to Main Menu HTML

Modify `index.html` - add wallet UI to the main menu section:

```html
<!-- Main Menu Overlay -->
<div class="main-menu-overlay main-menu-overlay-hidden" id="mainMenuOverlay">
  <div class="main-menu-content">
    <div class="game-title">
      <h1><img src="assets/SuiTwo_Profile.webp" alt="SuiTwo"> SuiTwo</h1>
      <div class="version-badge">Alpha v0.1</div>
    </div>
    
    <!-- Wallet Connection Status -->
    <div class="wallet-status-section" id="walletStatusSection">
      <div class="wallet-status-disconnected" id="walletStatusDisconnected">
        <p>🔒 Connect your wallet to play</p>
        <button class="menu-btn primary" onclick="connectWalletPrompt()">
          <span class="btn-icon">💼</span>
          Connect Wallet
        </button>
        <p class="wallet-note">Requires 500,000 $Mews to play</p>
      </div>
      
      <div class="wallet-status-connected wallet-status-hidden" id="walletStatusConnected">
        <p>✅ Wallet Connected</p>
        <p class="wallet-address" id="walletAddressDisplay">0x...</p>
        <div class="token-balance" id="tokenBalanceDisplay">
          <span>Balance: </span>
          <span id="tokenBalanceAmount">Checking...</span>
        </div>
        <button class="menu-btn" onclick="disconnectWalletPrompt()">
          <span class="btn-icon">🔌</span>
          Disconnect
        </button>
      </div>
      
      <div class="wallet-status-insufficient wallet-status-hidden" id="walletStatusInsufficient">
        <p>⚠️ Insufficient Balance</p>
        <p class="balance-info">You need 500,000 $Mews to play</p>
        <p class="balance-info">Current: <span id="currentBalance">0</span> $Mews</p>
        <button class="menu-btn" onclick="showGetTokensLink()">
          <span class="btn-icon">🛒</span>
          Get $Mews Tokens
        </button>
      </div>
    </div>
    
    <div class="menu-buttons">
      <!-- Start Game button - disabled until wallet connected and balance sufficient -->
      <button class="menu-btn primary" id="startGameBtn" 
              onclick="startGame()" 
              onmouseover="playMenuHoverSound()"
              disabled>
        <span class="btn-icon">▶️</span>
        Start Game
      </button>
      
      <!-- Rest of menu buttons... -->
      <button class="menu-btn" onclick="showSettings()">
        <span class="btn-icon">⚙️</span>
        Settings
      </button>
      <!-- etc. -->
    </div>
  </div>
</div>
```

### Update Main Menu System (`src/game/systems/ui/menu-system.js`)

Add wallet connection handling:

```javascript
// Add after existing menu functions

/**
 * Initialize wallet connection on main menu load
 */
async function initializeWalletOnMenu() {
  // Check if wallet was previously connected
  const savedAddress = localStorage.getItem('connectedWalletAddress');
  
  if (savedAddress && window.WalletConnection) {
    // Try to restore connection
    const isConnected = window.WalletConnection.isWalletConnected();
    if (!isConnected) {
      // Try to reconnect
      const result = await window.WalletConnection.connectWallet();
      if (result.success) {
        await checkTokenBalanceAndUpdateUI(result.address);
      }
    } else {
      // Already connected, just check balance
      const address = window.WalletConnection.getWalletAddress();
      await checkTokenBalanceAndUpdateUI(address);
    }
  } else {
    // Show disconnected state
    showWalletDisconnectedState();
  }
}

/**
 * Connect wallet prompt (called from button)
 */
async function connectWalletPrompt() {
  if (!window.WalletConnection) {
    alert('Wallet system not loaded. Please refresh the page.');
    return;
  }

  const isAvailable = window.WalletConnection.isSuiWalletAvailable();
  if (!isAvailable) {
    alert('Sui Wallet extension not found. Please install Sui Wallet browser extension.');
    // Could redirect to wallet install page
    window.open('https://chrome.google.com/webstore/detail/sui-wallet/opcgpfmipidbgpenhmajoajpbobppdil', '_blank');
    return;
  }

  try {
    const result = await window.WalletConnection.connectWallet();
    
    if (result.success) {
      // Save connection
      localStorage.setItem('connectedWalletAddress', result.address);
      
      // Check token balance
      await checkTokenBalanceAndUpdateUI(result.address);
    } else {
      alert('Failed to connect wallet: ' + result.error);
    }
  } catch (error) {
    console.error('Error connecting wallet:', error);
    alert('Error connecting wallet. Please try again.');
  }
}

/**
 * Check token balance and update UI accordingly
 */
async function checkTokenBalanceAndUpdateUI(walletAddress) {
  if (!window.APIClient) {
    console.error('API client not loaded');
    return;
  }

  try {
    // Show loading state
    document.getElementById('tokenBalanceAmount').textContent = 'Checking...';
    
    // Check balance via backend
    const balanceInfo = await window.APIClient.checkTokenBalance(walletAddress);
    
    // Update wallet address display
    document.getElementById('walletAddressDisplay').textContent = 
      walletAddress.slice(0, 6) + '...' + walletAddress.slice(-4);
    
    // Update balance display
    const balanceFormatted = formatTokenBalance(balanceInfo.balance);
    document.getElementById('tokenBalanceAmount').textContent = balanceFormatted + ' $Mews';
    document.getElementById('currentBalance').textContent = balanceFormatted;
    
    // Show appropriate state
    if (balanceInfo.hasMinimumBalance && balanceInfo.canPlay) {
      // Sufficient balance - enable Start Game button
      showWalletConnectedState();
      document.getElementById('startGameBtn').disabled = false;
      document.getElementById('startGameBtn').classList.remove('disabled');
    } else {
      // Insufficient balance
      showWalletInsufficientState();
      document.getElementById('startGameBtn').disabled = true;
      document.getElementById('startGameBtn').classList.add('disabled');
    }
  } catch (error) {
    console.error('Error checking token balance:', error);
    alert('Error checking token balance. Please try again.');
    showWalletDisconnectedState();
  }
}

/**
 * Show wallet disconnected state
 */
function showWalletDisconnectedState() {
  document.getElementById('walletStatusDisconnected').classList.remove('wallet-status-hidden');
  document.getElementById('walletStatusConnected').classList.add('wallet-status-hidden');
  document.getElementById('walletStatusInsufficient').classList.add('wallet-status-hidden');
  document.getElementById('startGameBtn').disabled = true;
}

/**
 * Show wallet connected state
 */
function showWalletConnectedState() {
  document.getElementById('walletStatusDisconnected').classList.add('wallet-status-hidden');
  document.getElementById('walletStatusConnected').classList.remove('wallet-status-hidden');
  document.getElementById('walletStatusInsufficient').classList.add('wallet-status-hidden');
}

/**
 * Show insufficient balance state
 */
function showWalletInsufficientState() {
  document.getElementById('walletStatusDisconnected').classList.add('wallet-status-hidden');
  document.getElementById('walletStatusConnected').classList.add('wallet-status-hidden');
  document.getElementById('walletStatusInsufficient').classList.remove('wallet-status-hidden');
}

/**
 * Format token balance for display
 */
function formatTokenBalance(balance) {
  // Assuming 9 decimals (like SUI)
  const balanceNum = parseFloat(balance) / 1_000_000_000;
  return balanceNum.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

/**
 * Disconnect wallet
 */
async function disconnectWalletPrompt() {
  if (confirm('Disconnect wallet? You will need to reconnect to play.')) {
    if (window.WalletConnection) {
      await window.WalletConnection.disconnectWallet();
    }
    localStorage.removeItem('connectedWalletAddress');
    showWalletDisconnectedState();
    document.getElementById('startGameBtn').disabled = true;
  }
}

/**
 * Modify existing startGame() function to verify wallet connection first
 */
function startGame() {
  // Check wallet connection before starting
  if (!window.WalletConnection || !window.WalletConnection.isWalletConnected()) {
    alert('Please connect your wallet first!');
    return;
  }

  // Double-check token balance
  const walletAddress = window.WalletConnection.getWalletAddress();
  if (!walletAddress) {
    alert('Wallet not connected. Please connect your wallet.');
    return;
  }

  // Rest of existing startGame() logic...
  console.log('🎮 startGame() called');
  // ... existing code ...
}
```

### Update Menu Initialization

Modify `src/game/systems/ui/ui-initialization.js` to call wallet initialization:

```javascript
// In the function that shows the main menu, add:
function showMainMenu() {
  // ... existing code to show menu ...
  
  // Initialize wallet connection check
  initializeWalletOnMenu();
}
```

---

## Step 3.6: Update Start Game Flow

**Important Flow:**
1. User clicks "Enter Game" from front page → Main Menu appears
2. Main Menu shows wallet connection UI
3. User clicks "Connect Wallet"
4. System checks token balance (500,000 $Mews minimum)
5. "Start Game" button enabled only if:
   - Wallet is connected ✅
   - Token balance is sufficient ✅
6. User clicks "Start Game" → Game starts

**Modify `src/game/main.js` or `src/game/systems/ui/menu-system.js`:**

```javascript
// Wrap existing startGame() logic
function startGame() {
  // Step 1: Verify wallet connection
  if (!window.WalletConnection || !window.WalletConnection.isWalletConnected()) {
    alert('🔒 Please connect your wallet to play!');
    showMainMenu(); // Return to menu
    return;
  }

  const walletAddress = window.WalletConnection.getWalletAddress();
  
  // Step 2: Final token balance check (double-check before starting)
  checkTokenBalanceAndUpdateUI(walletAddress).then(() => {
    const startBtn = document.getElementById('startGameBtn');
    if (startBtn && startBtn.disabled) {
      alert('⚠️ Insufficient $Mews balance. You need 500,000 $Mews to play.');
      return;
    }

    // Step 3: All checks passed - start the game
    console.log('✅ Wallet connected, balance sufficient - starting game');
    
    // Your existing startGame() logic continues here...
    gameState.isMenuVisible = false;
    gameState.isGameRunning = true;
    // ... rest of existing code ...
  });
}
```

---

## ✅ Checklist

- [ ] Frontend dependencies installed (vanilla JS - no npm needed)
- [ ] Wallet connection module created (`src/game/blockchain/wallet-connection.js`)
- [ ] API client module created (`src/game/blockchain/api-client.js`)
- [ ] Wallet UI added to main menu HTML
- [ ] Wallet connection functions added to menu-system.js
- [ ] Token balance check integrated
- [ ] Start Game button disabled until wallet connected + sufficient balance
- [ ] Leaderboard system updated to fetch from blockchain
- [ ] Error handling implemented (graceful fallbacks)
- [ ] localStorage fallback working for offline mode
- [ ] User flow: Front Page → Main Menu → Connect Wallet → Start Game

---

## 🔄 Next Steps

- [05. Smart Contracts](./05-smart-contracts.md) - Deploy Move contracts (optional)
- [07. Token Gatekeeping](./07-token-gatekeeping.md) - Add access control (if needed)
- [06. Testing & Deployment](./06-testing-deployment.md) - Test and deploy

---

**Related Documents:**
- [Sui SDK Integration](./03-sui-sdk-integration.md)
- [Token Gatekeeping](./07-token-gatekeeping.md)

