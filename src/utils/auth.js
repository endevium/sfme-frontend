// Auth storage helpers
//
// This module centralizes where auth tokens and user info are stored.
// We use `sessionStorage` by design so data is kept only for the lifetime
// of the browser tab/window. Closing the tab/window clears the session
// automatically (browser behavior). We keep simple, single-purpose helpers
// to read/write/clear the token and user data.

export const TOKEN_KEY = 'authToken';
export const USER_KEY = 'authUser';

export const ACCESS_TOKEN_KEY = 'authAccessToken';
export const REFRESH_TOKEN_KEY = 'authRefreshToken';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const hasWindow = typeof window !== 'undefined';

const readFromStorage = (storage, key) => {
  try {
    return storage?.getItem(key) || null;
  } catch {
    return null;
  }
};

const writeToStorage = (storage, key, value) => {
  try {
    if (!storage) return;
    if (value == null) {
      storage.removeItem(key);
      return;
    }
    storage.setItem(key, value);
  } catch {
    // no-op
  }
};

const decodeJwtPayload = (token) => {
  try {
    const payload = token?.split('.')?.[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4 || 4)) % 4);
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
};

const decodeJwtExp = (token) => Number(decodeJwtPayload(token)?.exp) || null;

const chooseBestToken = (...tokens) => {
  const now = Math.floor(Date.now() / 1000);
  const candidates = tokens.filter(Boolean).map((token) => ({ token, exp: decodeJwtExp(token) }));
  const valid = candidates.filter((item) => item.exp && item.exp > now).sort((a, b) => (b.exp || 0) - (a.exp || 0));
  if (valid.length > 0) return valid[0].token;
  return candidates[0]?.token || null;
};

const syncTokenAcrossStorages = (token, key) => {
  if (!hasWindow || !token) return;
  writeToStorage(window.sessionStorage, key, token);
  writeToStorage(window.localStorage, key, token);
};

/**
 * Save access/refresh tokens.
 * Also sets TOKEN_KEY for backward compatibility (access == token).
 */
export function saveTokens({ access, refresh }) {
  try {
    if (access) {
      sessionStorage.setItem(ACCESS_TOKEN_KEY, access);
      sessionStorage.setItem(TOKEN_KEY, access); // backward compat
      localStorage.setItem(ACCESS_TOKEN_KEY, access);
      localStorage.setItem(TOKEN_KEY, access);
    }
    if (refresh) {
      sessionStorage.setItem(REFRESH_TOKEN_KEY, refresh);
      localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
    }
  } catch (e) {
    console.error('saveTokens error', e);
  }
}

/** 
* Save the raw token to sessionStorage (legacy).
* Keep for existing code paths that still pass `token`.
*/
export function saveToken(token) {
 try {
   sessionStorage.setItem(TOKEN_KEY, token);
   sessionStorage.setItem(ACCESS_TOKEN_KEY, token); // treat legacy token as access
   localStorage.setItem(TOKEN_KEY, token);
   localStorage.setItem(ACCESS_TOKEN_KEY, token);
 } catch (e) {
   console.error('saveToken error', e);
 }
}

export function getAccessToken() {
 if (!hasWindow) return null;
 const token = chooseBestToken(
   readFromStorage(window.sessionStorage, ACCESS_TOKEN_KEY),
   readFromStorage(window.sessionStorage, TOKEN_KEY),
   readFromStorage(window.localStorage, ACCESS_TOKEN_KEY),
   readFromStorage(window.localStorage, TOKEN_KEY)
 );

 if (token) {
   syncTokenAcrossStorages(token, ACCESS_TOKEN_KEY);
   syncTokenAcrossStorages(token, TOKEN_KEY);
 }

 return token;
}

export function getRefreshToken() {
 if (!hasWindow) return null;
 const token = chooseBestToken(
   readFromStorage(window.sessionStorage, REFRESH_TOKEN_KEY),
   readFromStorage(window.localStorage, REFRESH_TOKEN_KEY)
 );
 if (token) {
   syncTokenAcrossStorages(token, REFRESH_TOKEN_KEY);
 }
 return token;
}

/**
 * Save the user object (serialized) to sessionStorage.
 * Stored value is JSON.stringify(userObj). Use `getUser()` to read it back.
 */
export function saveUser(userObj) {
  try {
    sessionStorage.setItem(USER_KEY, JSON.stringify(userObj));
  } catch (e) {
    console.error('saveUser error', e);
  }
}

/**
 * Return the token string from sessionStorage, or null if not found.
 */
export function getToken() {
  return getAccessToken();
}

/**
 * Return the parsed user object from sessionStorage, or null on parse/error.
 */
export function getUser() {
  try {
    return JSON.parse(sessionStorage.getItem(USER_KEY) || 'null');
  } catch {
    return null;
  }
}

/**
 * Clear all sessionStorage values for this tab.
 * Note: this clears the entire sessionStorage for the origin. Keep it
 * simple for now but if you need to preserve unrelated keys, change to
 * removeItem(TOKEN_KEY) / removeItem(USER_KEY) instead.
 */
export function clearSession() {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    sessionStorage.removeItem(REFRESH_TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch (e) {
    console.error('clearSession error', e);
  }
}

async function recordUserLogout() {
  const token = getAccessToken();
  const role = decodeJwtPayload(token)?.role || getUser()?.user_type;

  if (!token || !role) {
    return;
  }

  const endpointByRole = {
    student: '/students/logout/',
    faculty: '/faculty/logout/',
  };

  const endpoint = endpointByRole[role];
  if (!endpoint) return;

  try {
    await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  } catch {
    // best-effort only; logout should continue
  }
}

/**
 * Logout helper: clear session and reload the page so the app shows
 * the landing/login screen. This is used by the idle timer to force
 * a full reload after clearing auth state.
 */
export async function logoutAndReload(redirectPath = '/') {
  await recordUserLogout();
  clearSession();
  // Ensure we return to the landing/login route. Use a full navigation to
  // `/` so the router renders the public LandingPage instead of reloading
  // the current protected route (which may still be in the URL).
  try {
    window.location.href = redirectPath;
  } catch  {
    // fallback to reload if assigning href fails for some reason
    window.location.reload();
  }
}
