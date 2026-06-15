// Identitaet = player.token (UUID) im localStorage. Kein Supabase-Auth.
const KEY = "wm_token";

export function getToken() {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setToken(token) {
  try {
    localStorage.setItem(KEY, token);
  } catch {
    /* localStorage nicht verfuegbar (z. B. Private Mode) — Token bleibt nur im RAM */
  }
}

export function clearToken() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
