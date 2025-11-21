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
  try {
    const API_BASE_URL = window.GAME_CONFIG?.API_BASE_URL || 'http://localhost:3000/api';
    const response = await fetch(`${API_BASE_URL}/stats/${walletAddress}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        // Update display with blockchain stats (show 0 if no stats)
        if (bestScoreElement) {
          bestScoreElement.textContent = (data.bestScore || 0).toLocaleString();
        }
        if (gamesPlayedElement) {
          gamesPlayedElement.textContent = data.totalGames || 0;
        }
        console.log('✅ [MENU] Stats updated from blockchain:', { bestScore: data.bestScore, totalGames: data.totalGames });
        return;
      }
    }
    
    // API call failed or returned error, show 0
    console.warn('⚠️ [MENU] Failed to fetch stats from blockchain');
    if (bestScoreElement) {
      bestScoreElement.textContent = '0';
    }
    if (gamesPlayedElement) {
      gamesPlayedElement.textContent = '0';
    }
  } catch (error) {
    console.warn('⚠️ [MENU] Error fetching stats from blockchain:', error);
    // Show 0 on error
    if (bestScoreElement) {
      bestScoreElement.textContent = '0';
    }
    if (gamesPlayedElement) {
      gamesPlayedElement.textContent = '0';
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
