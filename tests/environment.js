import { accountNames, credentialsFor } from "./fixtures/users.js";
function origin(value, name) {
  let url;
  try {
    url = new URL(value);
  }
  catch {
    throw new Error(`${name} must be a valid HTTP(S) origin.`);
  }
  if (!["http:", "https:"].includes(url.protocol) || url.href !== `${url.origin}/`) {
    throw new Error(`${name} must be an HTTP(S) origin without credentials, paths, or query strings.`);
  }
  return url;
}
export function readEnvironment() {
  const selection = process.env.E2E_ENV;
  const staging = selection === "staging";
  const live = process.env.E2E_LIVE_AUTH === "1";
  const go = live || process.env.E2E_GO_AUTH === "1";
  if (go && selection !== "local" && !staging) {
    throw new Error("Use test:e2e:local or test:e2e:staging to explicitly select a backend environment.");
  }
  if (staging && (!process.env.E2E_BASE_URL || !process.env.E2E_API_URL)) {
    throw new Error("Set E2E_BASE_URL and E2E_API_URL in .env.e2e.staging.");
  }
  const frontend = origin(process.env.E2E_BASE_URL || "http://localhost:4175", "E2E_BASE_URL");
  const backend = origin(process.env.E2E_API_URL || "http://localhost:8080", "E2E_API_URL");
  const apiMode = process.env.E2E_API_MODE || "proxy";
  if (apiMode !== "proxy" && apiMode !== "direct") {
    throw new Error("E2E_API_MODE must be proxy or direct.");
  }
  if (staging) {
    const approved = (process.env.E2E_STAGING_ALLOWED_ORIGINS || "").split(",").map(value => value.trim());
    for (const url of [frontend, backend]) {
      if (url.protocol !== "https:" || !approved.includes(url.origin)) {
        throw new Error("Both staging origins must use HTTPS and match E2E_STAGING_ALLOWED_ORIGINS.");
      }
    }
    if (go && process.env.E2E_STAGING_ISOLATED !== "1") {
      throw new Error("Confirm the staging deployment uses an isolated PostgreSQL database and test WorkOS environment with E2E_STAGING_ISOLATED=1.");
    }
  }
  else if (![frontend, backend].every(url => ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))) {
    throw new Error("The local environment accepts loopback frontend and API origins only.");
  }
  if (go && !process.env.E2E_BASE_URL && apiMode === "proxy" && backend.origin !== "http://localhost:8080") {
    throw new Error("The managed Vite proxy targets http://localhost:8080. For a custom API, use direct mode or set E2E_BASE_URL to a frontend with its own proxy.");
  }
  if (live) {
    const missing = accountNames.map(credentialsFor).filter(account => !account.credentials);
    if (missing.length)
      throw new Error(missing.map(account => account.missingMessage).join(" "));
  }
  return { frontend, backend, browserApi: apiMode === "proxy" ? frontend : backend, apiMode, staging, live, go };
}
