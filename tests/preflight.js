import { readEnvironment } from "./environment.js";
async function probe(url, label, expected, init) {
  let response;
  try {
    response = await fetch(url, { ...init, redirect: "error", signal: AbortSignal.timeout(15_000) });
  }
  catch {
    throw new Error(`E2E preflight: ${label} at ${url.origin}${url.pathname} is unreachable or redirected.`);
  }
  if (response.status !== expected) {
    throw new Error(`E2E preflight: ${label} at ${url.origin}${url.pathname} returned ${response.status}; expected ${expected}.`);
  }
  return response;
}
export default async function preflight() {
  const { frontend, backend, browserApi, go, live } = readEnvironment();
  await probe(new URL("/login/", frontend), "frontend login page", 200);
  if (!go)
    return;
  await probe(new URL("/healthz", backend), "Go health endpoint", 200);
  for (const target of new Set([backend.origin, browserApi.origin])) {
    const identity = await probe(new URL("/auth/me", target), "signed-out identity endpoint", 401);
    const body = await identity.json().catch(() => null);
    if (body?.error !== "authentication required") {
      throw new Error(`E2E preflight: ${target}/auth/me did not return the Go authentication response. Check the API mapping.`);
    }
  }
  if (!live)
    return;
  // Empty JSON exercises the origin guard without authenticating or sending credentials.
  const password = await probe(new URL("/auth/password", browserApi), "password endpoint origin check", 400, {
    method: "POST",
    headers: { Origin: frontend.origin, "Content-Type": "application/json" },
    body: "{}",
  });
  if (browserApi.origin !== frontend.origin &&
    (password.headers.get("Access-Control-Allow-Origin") !== frontend.origin ||
      password.headers.get("Access-Control-Allow-Credentials") !== "true")) {
    throw new Error("E2E preflight: the direct Go API must allow credentialed requests from the selected frontend origin.");
  }
}
