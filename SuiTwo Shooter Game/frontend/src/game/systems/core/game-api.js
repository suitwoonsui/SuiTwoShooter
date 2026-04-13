// ==========================================
// GAME API - Single frontend → game-backend API surface
// ==========================================
// Frontend must only talk to the game backend. The game backend proxies the platform as needed.
// This helper centralizes base URL resolution and prevents accidental calls to the platform backend.
//
// Exposes:
// - window.GameApi.getBaseUrl()
// - window.GameApi.url(pathname)
// - window.GameApi.assertNotPlatformUrl(url)
//
// Note: This is intentionally not an ES module; the game loads scripts via <script> tags.
+
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
    // Guardrail: forbid accidental platform API calls from frontend.
    // Keep the wallet bundle (wallet-api.umd.cjs) separate; this helper is for API calls only.
    if (u.includes('localhost:3000/api') || u.includes('127.0.0.1:3000/api')) {
      throw new Error(`Frontend attempted to call platform API directly: ${u}`);
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

