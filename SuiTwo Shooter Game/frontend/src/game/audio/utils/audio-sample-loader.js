// ==========================================
// AUDIO SAMPLE LOADER - Pre-recorded Audio Files
// ==========================================

/**
 * Audio Sample Loader - Loads and plays pre-recorded audio files (WAV/MP3/OGG)
 * This provides realistic sounds for high-impact moments
 */

class AudioSampleLoader {
  constructor(audioContext) {
    this.audioContext = audioContext;
    this.sampleCache = {}; // Cache loaded audio buffers
    this.loadingPromises = {}; // Track ongoing loads to avoid duplicates
  }

  /**
   * Load an audio file and convert it to an AudioBuffer
   * @param {string} url - Path to the audio file
   * @returns {Promise<AudioBuffer>}
   */
  async loadSample(url) {
    // Return cached buffer if already loaded
    if (this.sampleCache[url]) {
      return this.sampleCache[url];
    }

    // Return existing promise if already loading
    if (this.loadingPromises[url]) {
      return this.loadingPromises[url];
    }

    // Create new load promise
    const loadPromise = this._fetchAndDecode(url);
    this.loadingPromises[url] = loadPromise;

    try {
      const buffer = await loadPromise;
      this.sampleCache[url] = buffer;
      delete this.loadingPromises[url];
      return buffer;
    } catch (error) {
      delete this.loadingPromises[url];
      // 404 is handled in _fetchAndDecode (returns null); other errors still log and throw
      console.error(`Failed to load audio sample: ${url}`, error);
      throw error;
    }
  }

  /**
   * Internal method to fetch and decode audio file.
   * On 404 (file missing), returns null and logs at debug so fallback (oscillator/buffer) can be used.
   * @private
   */
  async _fetchAndDecode(url) {
    try {
      const response = await fetch(url);
      if (response.status === 404) {
        if (typeof console !== 'undefined' && console.debug) {
          console.debug(`Audio sample not found (404), will use fallback: ${url}`);
        }
        return null;
      }
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      return audioBuffer;
    } catch (error) {
      console.error(`Error loading audio sample from ${url}:`, error);
      throw error;
    }
  }

  /**
   * Preload multiple audio samples
   * @param {Array<string>} urls - Array of audio file paths
   * @returns {Promise<Object>} - Object mapping URLs to AudioBuffers
   */
  async preloadSamples(urls) {
    const promises = urls.map(url => 
      this.loadSample(url).catch(error => {
        console.warn(`Failed to preload ${url}:`, error);
        return null; // Return null for failed loads
      })
    );

    const buffers = await Promise.all(promises);
    const result = {};
    urls.forEach((url, index) => {
      if (buffers[index]) {
        result[url] = buffers[index];
      }
    });
    return result;
  }

  /**
   * Play an audio sample
   * @param {string|AudioBuffer} sample - URL or AudioBuffer to play
   * @param {number} volume - Volume level (0.0 to 1.0)
   * @param {number} playbackRate - Playback speed (1.0 = normal)
   * @param {number} startOffset - Start time offset in seconds
   * @returns {AudioBufferSourceNode}
   */
  async playSample(sample, volume = 1.0, playbackRate = 1.0, startOffset = 0) {
    if (!this.audioContext || this.audioContext.state === 'closed') {
      console.warn('Audio context not available or closed');
      return null;
    }

    // Resume audio context if suspended
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    let buffer;
    
    // If sample is a URL string, load it first
    if (typeof sample === 'string') {
      try {
        buffer = await this.loadSample(sample);
      } catch (error) {
        console.error(`Failed to load sample: ${sample}`, error);
        return null;
      }
    } else {
      // Assume it's already an AudioBuffer
      buffer = sample;
    }

    if (!buffer) {
      console.warn('No buffer available to play');
      return null;
    }

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = playbackRate;

    const gainNode = this.audioContext.createGain();
    const currentTime = this.audioContext.currentTime;
    gainNode.gain.setValueAtTime(volume, currentTime);

    source.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    source.start(currentTime, startOffset);
    return source;
  }

  /**
   * Play a sample synchronously (if already loaded)
   * @param {string|AudioBuffer} sample - URL or AudioBuffer to play
   * @param {number} volume - Volume level (0.0 to 1.0)
   * @param {number} playbackRate - Playback speed (1.0 = normal)
   * @returns {AudioBufferSourceNode|null}
   */
  playSampleSync(sample, volume = 1.0, playbackRate = 1.0) {
    if (!this.audioContext || this.audioContext.state === 'closed') {
      return null;
    }

    // Resume audio context if suspended
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    let buffer;
    
    // If sample is a URL string, check cache
    if (typeof sample === 'string') {
      buffer = this.sampleCache[sample];
      if (!buffer) {
        console.warn(`Sample not loaded yet: ${sample}. Use playSample() for async loading.`);
        return null;
      }
    } else {
      buffer = sample;
    }

    if (!buffer) {
      return null;
    }

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = playbackRate;

    const gainNode = this.audioContext.createGain();
    const currentTime = this.audioContext.currentTime;
    gainNode.gain.setValueAtTime(volume, currentTime);

    source.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    source.start(currentTime);
    return source;
  }

  /**
   * Check if a sample is loaded
   * @param {string} url - URL of the audio file
   * @returns {boolean}
   */
  isSampleLoaded(url) {
    return !!this.sampleCache[url];
  }

  /**
   * Get a loaded sample buffer
   * @param {string} url - URL of the audio file
   * @returns {AudioBuffer|null}
   */
  getSample(url) {
    return this.sampleCache[url] || null;
  }

  /**
   * Clear the sample cache (useful for memory management)
   */
  clearCache() {
    this.sampleCache = {};
    this.loadingPromises = {};
  }

  /**
   * Get cache statistics
   * @returns {Object}
   */
  getCacheStats() {
    const urls = Object.keys(this.sampleCache);
    let totalSize = 0;
    urls.forEach(url => {
      const buffer = this.sampleCache[url];
      if (buffer) {
        // Approximate size: channels * length * 4 bytes (32-bit float)
        totalSize += buffer.numberOfChannels * buffer.length * 4;
      }
    });

    return {
      loadedSamples: urls.length,
      totalSizeBytes: totalSize,
      totalSizeKB: Math.round(totalSize / 1024),
      urls: urls
    };
  }
}
