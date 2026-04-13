// ==========================================
// LOADING MODAL SYSTEM
// ==========================================
// Reusable loading modal component for displaying "loading... please wait" messages
// Can be used throughout the game for various loading states

/**
 * Show loading modal with optional custom message
 * @param {string} message - Optional custom message (default: "Loading... Please wait")
 * @param {string} id - Optional custom modal ID (default: "loadingModal")
 * @returns {HTMLElement} The modal element
 */
function showLoadingModal(message = 'Loading... Please wait', id = 'loadingModal') {
  console.log(`⏳ [LOADING MODAL] Showing loading modal: ${message}`);

  // Check if modal already exists
  let modal = document.getElementById(id);
  if (modal) {
    // Update message if provided
    const messageElement = modal.querySelector('.loading-modal-message');
    if (messageElement && message !== 'Loading... Please wait') {
      messageElement.textContent = message;
    }
    modal.classList.add('loading-modal-visible');
    modal.classList.remove('loading-modal-hidden');
    return modal;
  }

  // Create modal
  modal = document.createElement('div');
  modal.className = 'loading-modal loading-modal-visible';
  modal.id = id;

  modal.innerHTML = `
    <div class="loading-modal-content">
      <div class="loading-spinner-container">
        <div class="loading-spinner"></div>
      </div>
      <div class="loading-modal-message">${message}</div>
    </div>
  `;

  // Append to viewport container or body
  const viewportContainer = document.querySelector('.viewport-container');
  if (viewportContainer) {
    viewportContainer.appendChild(modal);
  } else {
    document.body.appendChild(modal);
  }

  return modal;
}

/**
 * Hide loading modal
 * @param {string} id - Optional modal ID to hide (default: "loadingModal")
 */
function hideLoadingModal(id = 'loadingModal') {
  console.log(`✅ [LOADING MODAL] Hiding loading modal: ${id}`);

  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.add('loading-modal-hidden');
    modal.classList.remove('loading-modal-visible');
  }
}

/**
 * Remove loading modal from DOM (use when you're sure it won't be needed again)
 * @param {string} id - Optional modal ID to remove (default: "loadingModal")
 */
function removeLoadingModal(id = 'loadingModal') {
  console.log(`🗑️ [LOADING MODAL] Removing loading modal from DOM: ${id}`);

  const modal = document.getElementById(id);
  if (modal) {
    modal.remove();
  }
}

/**
 * Update loading modal message
 * @param {string} message - New message to display
 * @param {string} id - Optional modal ID (default: "loadingModal")
 */
function updateLoadingModalMessage(message, id = 'loadingModal') {
  const modal = document.getElementById(id);
  if (modal) {
    const messageElement = modal.querySelector('.loading-modal-message');
    if (messageElement) {
      messageElement.textContent = message;
    }
  }
}

// Expose functions globally for use throughout the game
if (typeof window !== 'undefined') {
  window.showLoadingModal = showLoadingModal;
  window.hideLoadingModal = hideLoadingModal;
  window.removeLoadingModal = removeLoadingModal;
  window.updateLoadingModalMessage = updateLoadingModalMessage;
}

