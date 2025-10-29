// ==========================================
// SETTINGS MANAGEMENT (EXACT COPY FROM HTML)
// ==========================================

// Settings management
function loadSettingsToUI() {
  document.getElementById('mouseSensitivity').value = gameSettings.mouseSensitivity;
  document.getElementById('mouseSensitivityValue').textContent = gameSettings.mouseSensitivity;
  
  document.getElementById('particleEffects').checked = gameSettings.particleEffects;
  document.getElementById('screenShake').checked = gameSettings.screenShake;
  document.getElementById('trailEffects').checked = gameSettings.trailEffects;
  
  document.getElementById('masterVolume').value = gameSettings.masterVolume;
  document.getElementById('masterVolumeValue').textContent = gameSettings.masterVolume + '%';
  
  document.getElementById('soundEffectsVolume').value = gameSettings.soundEffectsVolume;
  document.getElementById('soundEffectsVolumeValue').textContent = gameSettings.soundEffectsVolume + '%';
  
  document.getElementById('backgroundMusicVolume').value = gameSettings.backgroundMusicVolume;
  document.getElementById('backgroundMusicVolumeValue').textContent = gameSettings.backgroundMusicVolume + '%';
  
  document.getElementById('soundEffects').checked = gameSettings.soundEffects;
  document.getElementById('backgroundMusic').checked = gameSettings.backgroundMusic;
  
  // Add event listeners for range inputs
  document.getElementById('mouseSensitivity').addEventListener('input', function() {
    gameSettings.mouseSensitivity = parseFloat(this.value);
    document.getElementById('mouseSensitivityValue').textContent = this.value;
  });
  
  document.getElementById('masterVolume').addEventListener('input', function() {
    gameSettings.masterVolume = parseInt(this.value);
    document.getElementById('masterVolumeValue').textContent = this.value + '%';
  });
  
  document.getElementById('soundEffectsVolume').addEventListener('input', function() {
    gameSettings.soundEffectsVolume = parseInt(this.value);
    document.getElementById('soundEffectsVolumeValue').textContent = this.value + '%';
  });
  
  document.getElementById('backgroundMusicVolume').addEventListener('input', function() {
    gameSettings.backgroundMusicVolume = parseInt(this.value);
    document.getElementById('backgroundMusicVolumeValue').textContent = this.value + '%';
  });
  
  // Add event listeners for checkboxes
  document.getElementById('particleEffects').addEventListener('change', function() {
    gameSettings.particleEffects = this.checked;
  });
  
  document.getElementById('screenShake').addEventListener('change', function() {
    gameSettings.screenShake = this.checked;
  });
  
  document.getElementById('trailEffects').addEventListener('change', function() {
    gameSettings.trailEffects = this.checked;
  });
  
  document.getElementById('soundEffects').addEventListener('change', function() {
    gameSettings.soundEffects = this.checked;
  });
  
  document.getElementById('backgroundMusic').addEventListener('change', function() {
    gameSettings.backgroundMusic = this.checked;
  });
}

function saveSettings() {
  saveGameData();
  applySettings();
  hideSettings();
}

function resetSettings() {
  gameSettings = {
    mouseSensitivity: 0.2,
    particleEffects: true,
    screenShake: true,
    trailEffects: true,
    masterVolume: 90,
    soundEffectsVolume: 70,
    backgroundMusicVolume: 80,
    soundEffects: true,
    backgroundMusic: true
  };
  loadSettingsToUI();
}