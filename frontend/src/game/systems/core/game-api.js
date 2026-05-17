// ==========================================
// GAME API - Single frontend → game-backend API surface
// ==========================================
// Architecture: shooter-game frontend → shooter-game backend (this app’s /api/*) → Aqueduct
// platform over HTTP from the game server (see backend platform-client). The browser must not
// call the platform REST API for game data; only the wallet UMD bundle may load from the platform
// host (WALLET_MODULE_URL / meta wallet-module-url), which is not JSON API traffic.
// This helper centralizes base URL resolution and rejects accidental platform API bases.
//
// Exposes:
// - window.GameApi.getBaseUrl()
// - window.GameApi.url(pathname)
// - window.GameApi.assertNotPlatformUrl(url)
//
// Note: This is intentionally not an ES module; the game loads scripts via <script> tags.

(function initGameApi() {
  if (typeof window === 'undefined') return;

  function normalizeBase(raw) {
    const s = String(raw || '').trim();
    if (!s) return '';
    // If caller gives "http://host:port" make it "http://host:port/api"
    if (!/\/api\/?$/.test(s)) return s.replace(/\/+$/, '') + '/api';
    return s.replace(/\/+$/, '');
  }

  function assertNotPlatformUrl(url) {
    const u = String(url || '');
    // Guardrail: forbid accidental platform REST bases (dev default platform + deployed Aqueduct API).
    // Wallet script URLs use the same host but path is /wallet-api.umd.cjs (no /api segment as base).
    if (u.includes('localhost:3000/api') || u.includes('127.0.0.1:3000/api')) {
      throw new Error(`Frontend attempted to call platform API directly: ${u}`);
    }
    if (/aqueduct-platform\.vercel\.app\/api/i.test(u)) {
      throw new Error(`GAME_BACKEND_URL must be the shooter-game backend (/api), not the Aqueduct platform: ${u}`);
    }
  }

  function getBaseUrl() {
    const cfg = window.GAME_CONFIG || {};
    const base =
      normalizeBase(cfg.GAME_BACKEND_URL) ||
      normalizeBase(cfg.API_BASE_URL) ||
      'http://localhost:3001/api';

    // Fail fast in dev when misconfigured.
    try {
      assertNotPlatformUrl(base);
    } catch (e) {
      // Prefer hard failure so we stop silently using the wrong backend.
      // eslint-disable-next-line no-console
      console.error('❌ [GAME API] Invalid API base URL', { base });
      throw e;
    }
    return base;
  }

  function url(pathname) {
    const base = getBaseUrl();
    const p = String(pathname || '');
    const full = base.replace(/\/+$/, '') + '/' + p.replace(/^\/+/, '');
    assertNotPlatformUrl(full);
    return full;
  }

  window.GameApi = {
    getBaseUrl,
    url,
    assertNotPlatformUrl,
  };
})();

