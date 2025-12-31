// ==========================================
// GAME DATA FLOW UI - UI Updates
// ==========================================

console.log('✅ [GAME DATA FLOW UI] Game data flow UI module loaded');

/**
 * Update balance UI from game data flow
 * @param {Object} balanceResult - Balance check result
 */
function updateBalanceUIFromFlow(balanceResult) {
  // Call the global updateBalanceUI function from menu-system.js
  // This function expects (balance, hasMinimum) format
  if (typeof window.updateBalanceUI === 'function') {
    window.updateBalanceUI(balanceResult.formattedBalance, balanceResult.hasMinimumBalance);
  } else if (typeof window.WalletService?.updateBalanceUI === 'function') {
    // Fallback to WalletService if available
    window.WalletService.updateBalanceUI(balanceResult.formattedBalance, balanceResult.hasMinimumBalance);
  }
  
  if (typeof updateWalletRequirementsUI === 'function') {
    updateWalletRequirementsUI(true, balanceResult.hasMinimumBalance);
  }
}

// Expose globally
if (typeof window !== 'undefined') {
  window.updateBalanceUIFromFlow = updateBalanceUIFromFlow;
}

