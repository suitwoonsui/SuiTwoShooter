// ==========================================
// MENU PANEL LOADING — single overlay for main-menu panels
// ==========================================
// Settings, How to Play, Leaderboard, Tournaments, Store, Sound Test share one
// loading-modal instance (distinct from LoadingManager.gameDataLoadingModal and
// game start loading).

const MENU_PANEL_LOADING_MODAL_ID = 'menuPanelLoadingModal';

const MenuPanelLoading = {
  /**
   * @param {string} message
   */
  show(message = 'Loading... Please wait') {
    if (typeof showLoadingModal === 'function') {
      showLoadingModal(message, MENU_PANEL_LOADING_MODAL_ID);
    }
  },

  hide() {
    if (typeof hideLoadingModal === 'function') {
      hideLoadingModal(MENU_PANEL_LOADING_MODAL_ID);
    }
  },

  /**
   * @param {string} message
   */
  update(message) {
    if (typeof updateLoadingModalMessage === 'function') {
      updateLoadingModalMessage(message, MENU_PANEL_LOADING_MODAL_ID);
    }
  },
};

if (typeof window !== 'undefined') {
  window.MenuPanelLoading = MenuPanelLoading;
  window.MENU_PANEL_LOADING_MODAL_ID = MENU_PANEL_LOADING_MODAL_ID;
}
