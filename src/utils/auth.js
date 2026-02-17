// Auth storage helpers
//
// This module centralizes where auth tokens and user info are stored.
// We use `sessionStorage` by design so data is kept only for the lifetime
// of the browser tab/window. Closing the tab/window clears the session
// automatically (browser behavior). We keep simple, single-purpose helpers
// to read/write/clear the token and user data.

export const TOKEN_KEY = 'authToken';
export const USER_KEY = 'authUser';

/**
 * Save the raw token to sessionStorage.
 * Use session storage so the token is cleared when the tab/window is closed.
 */
export function saveToken(token) {
  try {
    sessionStorage.setItem(TOKEN_KEY, token);
  } catch (e) {
    console.error('saveToken error', e);
  }
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
  return sessionStorage.getItem(TOKEN_KEY);
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
    sessionStorage.clear();
  } catch (e) {
    console.error('clearSession error', e);
  }
}

/**
 * Logout helper: clear session and reload the page so the app shows
 * the landing/login screen. This is used by the idle timer to force
 * a full reload after clearing auth state.
 */
export function logoutAndReload() {
  clearSession();
  // Ensure we return to the landing/login route. Use a full navigation to
  // `/` so the router renders the public LandingPage instead of reloading
  // the current protected route (which may still be in the URL).
  try {
    window.location.href = '/';
  } catch (e) {
    // fallback to reload if assigning href fails for some reason
    window.location.reload();
  }
}
