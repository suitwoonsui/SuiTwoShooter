// ==========================================
// GAME STATE MANAGEMENT (EXACT COPY FROM HTML)
// ==========================================

// Game state management
let gameState = {
  isMenuVisible: true,
  isGameRunning: false,
  isPaused: false,
  isGameOver: false
};

// Game settings
let gameSettings = {
  mouseSensitivity: 0.2,
  particleEffects: true,
  screenShake: true,
  trailEffects: true,
  masterVolume: 70,
  soundEffectsVolume: 80,
  backgroundMusicVolume: 60,
  soundEffects: true,
  backgroundMusic: true
};

// Game statistics
let gameStats = {
  bestScore: 0,
  gamesPlayed: 0,
  totalCoins: 0,
  bossesDefeated: 0
};

// Load settings and stats from localStorage
function loadGameData() {
  const savedSettings = localStorage.getItem('gameSettings');
  if (savedSettings) {
    gameSettings = { ...gameSettings, ...JSON.parse(savedSettings) };
  }
  
  const savedStats = localStorage.getItem('gameStats');
  if (savedStats) {
    gameStats = { ...gameStats, ...JSON.parse(savedStats) };
  }
  
  // updateMenuStats is now async, but we don't need to await it here
  // It will update the UI when stats are fetched
  updateMenuStats().catch(err => console.warn('Failed to update menu stats:', err));
  applySettings();
}

// Save settings and stats to localStorage
function saveGameData() {
  localStorage.setItem('gameSettings', JSON.stringify(gameSettings));
  localStorage.setItem('gameStats', JSON.stringify(gameStats));
}

// Update menu statistics display
async function updateMenuStats() {
  const bestScoreElement = document.getElementById('bestScoreDisplay');
  const gamesPlayedElement = document.getElementById('gamesPlayedDisplay');
  
  // Get wallet address if connected
  let walletAddress = null;
  if (window.walletAPIInstance && window.walletAPIInstance.isConnected()) {
    walletAddress = window.walletAPIInstance.getAddress();
  }
  
  // If no wallet is connected, show "--"
  if (!walletAddress) {
    if (bestScoreElement) {
      bestScoreElement.textContent = '--';
    }
    if (gamesPlayedElement) {
      gamesPlayedElement.textContent = '--';
    }
    return;
  }
  
  // Wallet is connected, fetch stats from blockchain
  // Add retry logic with exponential backoff for indexing delays
  const maxRetries = 3;
  const baseDelay = 2000; // Start with 2 seconds
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const delay = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff: 2s, 4s, 8s
        console.log(`📊 [MENU] Stats query attempt ${attempt + 1}/${maxRetries}, waiting ${delay}ms for indexing...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      const API_BASE_URL = window.GAME_CONFIG?.API_BASE_URL || 'http://localhost:3000/api';
      const response = await fetch(`${API_BASE_URL}/stats/${walletAddress}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`📊 [MENU] Stats API response (attempt ${attempt + 1}):`, data);
        
        if (data.success) {
          // If stats found, update display and return
          if (data.hasStats && data.totalGames > 0) {
            if (bestScoreElement) {
              bestScoreElement.textContent = (data.bestScore || 0).toLocaleString();
            }
            if (gamesPlayedElement) {
              gamesPlayedElement.textContent = data.totalGames || 0;
            }
            console.log('✅ [MENU] Stats updated from blockchain:', { 
              bestScore: data.bestScore, 
              totalGames: data.totalGames,
              hasStats: data.hasStats,
              attempt: attempt + 1,
              fullResponse: data
            });
            return;
          }
          
          // If no stats found but this is not the last attempt, retry
          if (attempt < maxRetries - 1) {
            console.log(`📊 [MENU] No stats found yet (hasStats: ${data.hasStats}, totalGames: ${data.totalGames}), will retry...`);
            continue;
          }
          
          // Last attempt and still no stats, show 0
          console.warn('⚠️ [MENU] No stats found after all retries (may be indexing delay)');
          if (bestScoreElement) {
            bestScoreElement.textContent = (data.bestScore || 0).toLocaleString();
          }
          if (gamesPlayedElement) {
            gamesPlayedElement.textContent = data.totalGames || 0;
          }
          return;
        }
      }
      
      // API call failed, retry if attempts remaining
      if (attempt < maxRetries - 1) {
        console.warn(`⚠️ [MENU] Stats API call failed (attempt ${attempt + 1}), will retry...`);
        continue;
      }
      
      // All retries exhausted, show 0
      console.warn('⚠️ [MENU] Failed to fetch stats from blockchain after all retries');
      if (bestScoreElement) {
        bestScoreElement.textContent = '0';
      }
      if (gamesPlayedElement) {
        gamesPlayedElement.textContent = '0';
      }
      return;
    } catch (error) {
      // Error occurred, retry if attempts remaining
      if (attempt < maxRetries - 1) {
        console.warn(`⚠️ [MENU] Error fetching stats (attempt ${attempt + 1}), will retry:`, error);
        continue;
      }
      
      // All retries exhausted, show 0
      console.warn('⚠️ [MENU] Error fetching stats from blockchain after all retries:', error);
      if (bestScoreElement) {
        bestScoreElement.textContent = '0';
      }
      if (gamesPlayedElement) {
        gamesPlayedElement.textContent = '0';
      }
      return;
    }
  }
}

// Apply settings to the game
function applySettings() {
  if (typeof game !== 'undefined') {
    if (player) {
      player.moveSpeed = gameSettings.mouseSensitivity;
    }
  }
  
  // Apply audio settings
  if (typeof updateAudioSettings === 'function') {
    updateAudioSettings();
  }
}
