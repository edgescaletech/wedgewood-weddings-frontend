// A new visit must start from an email link. Only a reload can resume a reset.
const storageKey = "wedgewood.passwordReset";
const resumeWindow = 10 * 60 * 1000;

export function resumeResetToken(linkToken, isReload, browser = window, now = Date.now()) {
  try {
    const storage = browser.sessionStorage;
    if (linkToken) {
      storage.setItem(storageKey, JSON.stringify({ token: linkToken, expiresAt: now + resumeWindow }));
    } else if (isReload) {
      const saved = JSON.parse(storage.getItem(storageKey));
      if (typeof saved?.token === "string" && saved.expiresAt > now) return saved.token;
    }
    if (!linkToken) storage.removeItem(storageKey);
  } catch {
    clearResetToken(browser);
  }
  return linkToken;
}

export function clearResetToken(browser = window) {
  try {
    browser.sessionStorage.removeItem(storageKey);
  } catch {
    // An email link also works with browser storage disabled.
  }
}
