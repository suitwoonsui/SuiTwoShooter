// ==========================================
// AUDIO SETTINGS MANAGER - VOLUME AND ENABLE/DISABLE CONTROLS
// ==========================================

class AudioSettingsManager {
  constructor() {
    this.masterVolume = 0.9; // Default volume (90%)
    this.soundEffectsVolume = 0.7; // Default sound effects volume (70%)
    this.backgroundMusicVolume = 0.8; // Default background music volume (80%)
    this.soundEffectsEnabled = true;
    this.backgroundMusicEnabled = true;
  }
  
  // Set master volume
  setMasterVolume(volume) {
    this.masterVolume = Math.max(0, Math.min(1, volume));
  }
  
  // Set sound effects volume
  setSoundEffectsVolume(volume) {
    this.soundEffectsVolume = Math.max(0, Math.min(1, volume));
  }
  
  // Set background music volume
  setBackgroundMusicVolume(volume) {
    this.backgroundMusicVolume = Math.max(0, Math.min(1, volume));
  }
  
  // Enable/disable sound effects
  setSoundEffectsEnabled(enabled) {
    this.soundEffectsEnabled = enabled;
  }
  
  // Enable/disable background music
  setBackgroundMusicEnabled(enabled) {
    this.backgroundMusicEnabled = enabled;
  }
  
  // Get final volume for sound effects
  getSoundEffectsVolume(volumeMultiplier = 1.0) {
    return volumeMultiplier * this.masterVolume * this.soundEffectsVolume;
  }
  
  // Get final volume for background music
  getBackgroundMusicVolume(volumeMultiplier = 1.0) {
    return volumeMultiplier * this.masterVolume * this.backgroundMusicVolume;
  }
  
  // Check if sound effects are enabled
  isSoundEffectsEnabled() {
    return this.soundEffectsEnabled;
  }
  
  // Check if background music is enabled
  isBackgroundMusicEnabled() {
    return this.backgroundMusicEnabled;
  }
  
  // Get all settings as an object
  getAllSettings() {
    return {
      masterVolume: this.masterVolume,
      soundEffectsVolume: this.soundEffectsVolume,
      backgroundMusicVolume: this.backgroundMusicVolume,
      soundEffectsEnabled: this.soundEffectsEnabled,
      backgroundMusicEnabled: this.backgroundMusicEnabled
    };
  }
  
  // Set all settings from an object
  setAllSettings(settings) {
    if (settings.masterVolume !== undefined) {
      this.setMasterVolume(settings.masterVolume);
    }
    if (settings.soundEffectsVolume !== undefined) {
      this.setSoundEffectsVolume(settings.soundEffectsVolume);
    }
    if (settings.backgroundMusicVolume !== undefined) {
      this.setBackgroundMusicVolume(settings.backgroundMusicVolume);
    }
    if (settings.soundEffectsEnabled !== undefined) {
      this.setSoundEffectsEnabled(settings.soundEffectsEnabled);
    }
    if (settings.backgroundMusicEnabled !== undefined) {
      this.setBackgroundMusicEnabled(settings.backgroundMusicEnabled);
    }
  }
  
  // Get statistics for debugging
  getStats() {
    return this.getAllSettings();
  }
}
