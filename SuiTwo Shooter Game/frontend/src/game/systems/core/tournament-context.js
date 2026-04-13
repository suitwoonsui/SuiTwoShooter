// ==========================================
// TOURNAMENT CONTEXT - Single source of truth
// ==========================================
// Golden path for tournaments:
// Enter Tournament (modal) -> ticket check -> tournament-entry loadout (same tabs as regular-entry; gold chrome)
//   -> create anchor session -> item modal -> consume ticket + Station enter -> play -> submit-score
//
// Persist minimal state so score submission never "forgets" the tournament.
(function initTournamentContext() {
  if (typeof window === 'undefined') return;

  const KEY = '__tournamentContextV1';

  function safeParse(raw) {
    try {
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function load() {
    const mem = window.__tournamentContext;
    if (mem && typeof mem === 'object') return mem;
    const stored = safeParse(window?.sessionStorage?.getItem(KEY));
    if (stored && typeof stored === 'object') {
      window.__tournamentContext = stored;
      return stored;
    }
    return null;
  }

  function save(ctx) {
    const next = ctx && typeof ctx === 'object' ? ctx : null;
    window.__tournamentContext = next;
    try {
      if (next) window.sessionStorage.setItem(KEY, JSON.stringify(next));
      else window.sessionStorage.removeItem(KEY);
    } catch {
      // ignore
    }
  }

  function set(partial) {
    const prev = load() || {};
    const next = { ...prev, ...(partial || {}), updatedAt: Date.now() };
    save(next);
    // Keep legacy field for older callers (can be removed later).
    if (typeof next.anchorSessionId === 'number') {
      window.__tournamentAnchorSessionId = next.anchorSessionId;
    }
    return next;
  }

  function clear() {
    save(null);
    try {
      window.__tournamentAnchorSessionId = null;
    } catch {
      // ignore
    }
  }

  window.TournamentContext = { load, set, clear };
})();

