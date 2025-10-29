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
  
  updateMenuStats();
  applySettings();
}

// Save settings and stats to localStorage
function saveGameData() {
  localStorage.setItem('gameSettings', JSON.stringify(gameSettings));
  localStorage.setItem('gameStats', JSON.stringify(gameStats));
}

// Update menu statistics display
function updateMenuStats() {
  const bestScoreElement = document.getElementById('bestScoreDisplay');
  const gamesPlayedElement = document.getElementById('gamesPlayedDisplay');
  
  if (bestScoreElement) {
    bestScoreElement.textContent = gameStats.bestScore.toLocaleString();
  }
  if (gamesPlayedElement) {
    gamesPlayedElement.textContent = gameStats.gamesPlayed;
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
