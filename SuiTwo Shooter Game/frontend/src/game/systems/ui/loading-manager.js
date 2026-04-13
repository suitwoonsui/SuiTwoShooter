// ==========================================
// LOADING MANAGER
// ==========================================
// Centralized loading modal management

console.log('✅ [LOADING] LoadingManager module loaded - NEW REFACTORED SYSTEM ACTIVE');

const LoadingManager = {
  currentMessage: null,
  isVisible: false,
  modalId: 'gameDataLoadingModal',
  
  /**
   * Show loading modal with message
   * @param {string} message - Loading message
   */
  show(message) {
    if (this.isVisible && this.currentMessage === message) {
      // Already showing this message, no need to update
      return;
    }
    
    this.currentMessage = message;
    this.isVisible = true;
    
    if (typeof showLoadingModal === 'function') {
      showLoadingModal(message, this.modalId);
    } else {
      console.warn('⚠️ [LOADING] showLoadingModal function not available');
    }
  },
  
  /**
   * Update loading message (if modal is already visible)
   * @param {string} message - New loading message
   */
  update(message) {
    if (!this.isVisible) {
      // Not visible, show it instead
      this.show(message);
      return;
    }
    
    if (this.currentMessage === message) {
      // Same message, no need to update
      return;
    }
    
    this.currentMessage = message;
    
    if (typeof updateLoadingModalMessage === 'function') {
      updateLoadingModalMessage(message, this.modalId);
    } else if (typeof showLoadingModal === 'function') {
      // Fallback: hide and show again
      this.hide();
      this.show(message);
    } else {
      console.warn('⚠️ [LOADING] updateLoadingModalMessage function not available');
    }
  },
  
  /**
   * Hide loading modal
   */
  hide() {
    if (!this.isVisible) {
      return;
    }
    
    this.isVisible = false;
    this.currentMessage = null;
    
    if (typeof hideLoadingModal === 'function') {
      hideLoadingModal(this.modalId);
    } else {
      console.warn('⚠️ [LOADING] hideLoadingModal function not available');
    }
  },
  
  /**
   * Check if loading modal is currently visible
   * @returns {boolean}
   */
  isShowing() {
    return this.isVisible;
  },
  
  /**
   * Get current message
   * @returns {string|null}
   */
  getCurrentMessage() {
    return this.currentMessage;
  },
  
  /**
   * Reset loading state (for cleanup)
   */
  reset() {
    this.hide();
    this.currentMessage = null;
    this.isVisible = false;
  }
};

// Expose to window for debugging
if (typeof window !== 'undefined') {
  window.LoadingManager = LoadingManager;
}

