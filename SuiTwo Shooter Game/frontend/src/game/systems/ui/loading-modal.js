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

/**
 * Build a checklist-style step list under the main message (e.g. store load phases).
 * @param {string} modalId
 * @param {Array<{ id: string, label: string }>} steps
 */
function initLoadingModalStepList(modalId, steps) {
  const modal = document.getElementById(modalId);
  if (!modal || !Array.isArray(steps) || steps.length === 0) return;

  const content = modal.querySelector('.loading-modal-content');
  if (!content) return;

  modal._loadingSteps = steps.slice();

  const existing = content.querySelector('.loading-modal-steps');
  if (existing) existing.remove();

  const wrap = document.createElement('div');
  wrap.className = 'loading-modal-steps';
  wrap.setAttribute('aria-label', 'Loading progress');

  const ul = document.createElement('ul');
  ul.className = 'loading-modal-step-list';

  for (const s of steps) {
    const li = document.createElement('li');
    li.className = 'loading-modal-step loading-modal-step--pending';
    li.dataset.stepId = s.id;

    const marker = document.createElement('span');
    marker.className = 'loading-modal-step-marker';
    marker.setAttribute('aria-hidden', 'true');
    marker.textContent = '○';

    const label = document.createElement('span');
    label.className = 'loading-modal-step-label';
    label.textContent = s.label;

    li.appendChild(marker);
    li.appendChild(label);
    ul.appendChild(li);
  }

  wrap.appendChild(ul);
  content.appendChild(wrap);
}

/**
 * Highlight one step as active; previous steps in the list show done, later ones pending.
 * Updates the headline to match the active step. No-op if step id is not in the list.
 * @param {string} modalId
 * @param {string} activeStepId
 */
function setLoadingModalActiveStep(modalId, activeStepId) {
  const modal = document.getElementById(modalId);
  if (!modal || !modal._loadingSteps || !activeStepId) return;

  const order = modal._loadingSteps.map((x) => x.id);
  const activeIdx = order.indexOf(activeStepId);
  if (activeIdx < 0) return;

  const activeMeta = modal._loadingSteps[activeIdx];
  const messageEl = modal.querySelector('.loading-modal-message');
  if (messageEl && activeMeta && activeMeta.label) {
    messageEl.textContent = `${activeMeta.label}…`;
  }

  const items = modal.querySelectorAll('.loading-modal-step');
  items.forEach((li, i) => {
    const marker = li.querySelector('.loading-modal-step-marker');
    li.classList.remove('loading-modal-step--pending', 'loading-modal-step--active', 'loading-modal-step--done');
    if (i < activeIdx) {
      li.classList.add('loading-modal-step--done');
      if (marker) marker.textContent = '✓';
    } else if (i === activeIdx) {
      li.classList.add('loading-modal-step--active');
      if (marker) marker.textContent = '⏳';
    } else {
      li.classList.add('loading-modal-step--pending');
      if (marker) marker.textContent = '○';
    }
  });
}

/** Short step list when re-opening an already-built store (inventory + balance + UI). */
function initStoreRefreshLoadingStepList() {
  const id = typeof window !== 'undefined' && window.MENU_PANEL_LOADING_MODAL_ID
    ? window.MENU_PANEL_LOADING_MODAL_ID
    : 'menuPanelLoadingModal';
  initLoadingModalStepList(id, [
    { id: 'refresh-inventory', label: 'Refreshing inventory' },
    { id: 'refresh-balance', label: 'Updating wallet balance' },
    { id: 'refresh-ui', label: 'Updating prices and cart' },
  ]);
  setLoadingModalActiveStep(id, 'refresh-inventory');
}

// Expose functions globally for use throughout the game
if (typeof window !== 'undefined') {
  window.showLoadingModal = showLoadingModal;
  window.hideLoadingModal = hideLoadingModal;
  window.removeLoadingModal = removeLoadingModal;
  window.updateLoadingModalMessage = updateLoadingModalMessage;
  window.initLoadingModalStepList = initLoadingModalStepList;
  window.setLoadingModalActiveStep = setLoadingModalActiveStep;
  window.initStoreRefreshLoadingStepList = initStoreRefreshLoadingStepList;
}

