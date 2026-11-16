// Vite reads this public setting at startup/build time. An empty value uses the
// current origin, allowing deployment proxies to forward /api and /auth.
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '')
  .trim()
  .replace(/\/+$/, '');
