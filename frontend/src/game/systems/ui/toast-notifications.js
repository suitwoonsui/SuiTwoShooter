/**
 * Toast Notification System
 * Simple, lightweight toast notifications for user feedback
 */

// Toast container element
let toastContainer = null;

/**
 * Initialize toast container if it doesn't exist
 */
function initToastContainer() {
  if (toastContainer) return;
  
  // Create toast container
  toastContainer = document.createElement('div');
  toastContainer.id = 'toast-container';
  toastContainer.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 10000;
    display: flex;
    flex-direction: column;
    gap: 10px;
    pointer-events: none;
  `;
  document.body.appendChild(toastContainer);
}

/**
 * Show a toast notification
 * @param {string} message - Message to display
 * @param {string} type - Type of toast: 'success', 'error', 'warning', 'info'
 * @param {number} duration - Duration in milliseconds (default: 3000)
 */
function showToast(message, type = 'info', duration = 3000) {
  initToastContainer();
  
  // Create toast element
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  // Set colors based on type
  const colors = {
    success: { bg: '#10b981', border: '#059669', text: '#ffffff' },
    error: { bg: '#ef4444', border: '#dc2626', text: '#ffffff' },
    warning: { bg: '#f59e0b', border: '#d97706', text: '#ffffff' },
    info: { bg: '#3b82f6', border: '#2563eb', text: '#ffffff' }
  };
  
  const color = colors[type] || colors.info;
  
  toast.style.cssText = `
    background: ${color.bg};
    border: 2px solid ${color.border};
    color: ${color.text};
    padding: 12px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    font-size: 14px;
    font-weight: 500;
    min-width: 250px;
    max-width: 400px;
    pointer-events: auto;
    animation: toastSlideIn 0.3s ease-out;
    word-wrap: break-word;
  `;
  
  toast.textContent = message;
  
  // Add to container
  toastContainer.appendChild(toast);
  
  // Remove after duration
  setTimeout(() => {
    toast.style.animation = 'toastSlideOut 0.3s ease-in';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, duration);
  
  // Allow manual dismissal on click
  toast.addEventListener('click', () => {
    toast.style.animation = 'toastSlideOut 0.3s ease-in';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  });
}

// Add CSS animations if not already in document
if (!document.getElementById('toast-animations')) {
  const style = document.createElement('style');
  style.id = 'toast-animations';
  style.textContent = `
    @keyframes toastSlideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    
    @keyframes toastSlideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(100%);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);
}

// Export for use (as window property, not ES module)
if (typeof window !== 'undefined') {
  window.showToast = showToast;
}

