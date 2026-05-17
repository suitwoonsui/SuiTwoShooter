// ==========================================
// IMAGE PRELOADER - Centralized Image Loading System
// ==========================================
// Handles preloading, progress tracking, and error handling for game images
// ==========================================

// Use FrontendLogger if available, fallback to console
var log = (typeof window !== 'undefined' && window.FrontendLogger) 
  ? {
      debug: (cat, msg, data) => window.FrontendLogger.debug(cat, msg, data),
      info: (cat, msg, data) => window.FrontendLogger.info(cat, msg, data),
      warn: (cat, msg, data) => window.FrontendLogger.warn(cat, msg, data),
      error: (cat, msg, data) => window.FrontendLogger.error(cat, msg, data),
    }
  : {
      debug: () => {},
      info: (cat, msg, data) => console.log(`[${cat}] ${msg}`, data || ''),
      warn: (cat, msg, data) => console.warn(`[${cat}] ${msg}`, data || ''),
      error: (cat, msg, data) => console.error(`[${cat}] ${msg}`, data || ''),
    };

/**
 * Image Preloader Class
 * Manages loading, progress tracking, and error handling for game images
 */
class ImagePreloader {
  constructor() {
    this.images = new Map(); // Map<key, {image, loaded, error, promise}>
    this.loadingProgress = {
      total: 0,
      loaded: 0,
      failed: 0
    };
    this.onProgressCallback = null;
    this.onCompleteCallback = null;
  }

  /**
   * Register an image for preloading
   * @param {string} key - Unique identifier for the image
   * @param {string} src - Image source path
   * @param {boolean} critical - If true, image must load before game starts
   * @returns {Promise<Image>} Promise that resolves when image is loaded
   */
  register(key, src, critical = true) {
    // If already registered, return existing promise
    if (this.images.has(key)) {
      return this.images.get(key).promise;
    }

    const image = new Image();
    let resolve, reject;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });

    const imageData = {
      image,
      src,
      critical,
      loaded: false,
      error: null,
      promise
    };

    // Set up load handlers
    image.onload = () => {
      imageData.loaded = true;
      this.loadingProgress.loaded++;
      log.debug('IMAGE PRELOADER', `Image loaded: ${key}`, { src });
      this._updateProgress();
      resolve(image);
    };

    image.onerror = (error) => {
      imageData.error = error;
      this.loadingProgress.failed++;
      log.error('IMAGE PRELOADER', `Image failed to load: ${key}`, { src, error });
      this._updateProgress();
      reject(new Error(`Failed to load image: ${src}`));
    };

    // Start loading
    image.src = src;
    this.images.set(key, imageData);
    this.loadingProgress.total++;

    return promise;
  }

  /**
   * Register multiple images at once
   * @param {Array<{key: string, src: string, critical?: boolean}>} imageList - Array of image definitions
   * @returns {Promise<Map<string, Image>>} Promise that resolves when all images are loaded
   */
  async registerBatch(imageList) {
    const promises = imageList.map(({ key, src, critical = true }) => 
      this.register(key, src, critical)
    );
    
    try {
      await Promise.all(promises);
      const result = new Map();
      for (const { key } of imageList) {
        const imageData = this.images.get(key);
        if (imageData && imageData.loaded) {
          result.set(key, imageData.image);
        }
      }
      return result;
    } catch (error) {
      log.warn('IMAGE PRELOADER', 'Some images failed to load in batch', { error });
      // Return what we have
      const result = new Map();
      for (const { key } of imageList) {
        const imageData = this.images.get(key);
        if (imageData && imageData.loaded) {
          result.set(key, imageData.image);
        }
      }
      return result;
    }
  }

  /**
   * Get an image by key (returns null if not loaded)
   * @param {string} key - Image key
   * @returns {Image|null} Loaded image or null
   */
  get(key) {
    const imageData = this.images.get(key);
    return imageData && imageData.loaded ? imageData.image : null;
  }

  /**
   * Check if an image is loaded
   * @param {string} key - Image key
   * @returns {boolean} True if loaded
   */
  isLoaded(key) {
    const imageData = this.images.get(key);
    return imageData ? imageData.loaded : false;
  }

  /**
   * Get loading progress (0-1)
   * @returns {number} Progress from 0 to 1
   */
  getProgress() {
    if (this.loadingProgress.total === 0) return 1;
    return this.loadingProgress.loaded / this.loadingProgress.total;
  }

  /**
   * Get loading status
   * @returns {Object} Status object with total, loaded, failed, progress
   */
  getStatus() {
    return {
      ...this.loadingProgress,
      progress: this.getProgress()
    };
  }

  /**
   * Set progress callback
   * @param {Function} callback - Called with (progress, status) on each image load
   */
  onProgress(callback) {
    this.onProgressCallback = callback;
  }

  /**
   * Set completion callback
   * @param {Function} callback - Called when all critical images are loaded
   */
  onComplete(callback) {
    this.onCompleteCallback = callback;
  }

  /**
   * Wait for all critical images to load
   * @returns {Promise<void>} Resolves when all critical images are loaded
   */
  async waitForCritical() {
    const criticalImages = Array.from(this.images.values())
      .filter(img => img.critical && !img.loaded);
    
    if (criticalImages.length === 0) {
      return;
    }

    const promises = criticalImages.map(img => img.promise);
    await Promise.allSettled(promises);
  }

  /**
   * Wait for all images to load
   * @returns {Promise<void>} Resolves when all images are loaded
   */
  async waitForAll() {
    const allImages = Array.from(this.images.values())
      .filter(img => !img.loaded);
    
    if (allImages.length === 0) {
      return;
    }

    const promises = allImages.map(img => img.promise);
    await Promise.allSettled(promises);
  }

  /**
   * Update progress and call callbacks
   * @private
   */
  _updateProgress() {
    const progress = this.getProgress();
    const status = this.getStatus();

    if (this.onProgressCallback) {
      this.onProgressCallback(progress, status);
    }

    // Check if all critical images are loaded
    const criticalImages = Array.from(this.images.values())
      .filter(img => img.critical);
    const allCriticalLoaded = criticalImages.every(img => img.loaded || img.error);

    if (allCriticalLoaded && this.onCompleteCallback) {
      this.onCompleteCallback(status);
    }
  }

  /**
   * Clear all registered images (for cleanup)
   */
  clear() {
    this.images.clear();
    this.loadingProgress = {
      total: 0,
      loaded: 0,
      failed: 0
    };
  }
}

// Create singleton instance
const imagePreloader = new ImagePreloader();

// Expose globally
if (typeof window !== 'undefined') {
  window.ImagePreloader = imagePreloader;
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = imagePreloader;
}

log.info('IMAGE PRELOADER', 'Image preloader module loaded');

