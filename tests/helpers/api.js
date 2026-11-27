export function apiPath(path) {
  return (url) => url.pathname === path;
}
export function matchesResponse(path, method = "GET") {
  return (response) => apiPath(path)(new URL(response.url())) && response.request().method() === method;
}
export async function stubIdentity(page, status) {
  await page.route(apiPath("/auth/me"), async (route) => {
    const code = typeof status === "function" ? status() : status;
    const json = code === 200
      ? { id: "e2e-user", workosId: "user_e2e", email: "scheduler@example.test", isActive: true }
      : { error: code === 503 ? "authentication unavailable" : "authentication required" };
    await route.fulfill({ status: code, json });
  });
}
