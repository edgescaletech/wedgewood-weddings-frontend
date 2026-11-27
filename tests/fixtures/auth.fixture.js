import { expect, test as base } from "@playwright/test";
import { matchesResponse } from "../helpers/api.js";
import { expectLogin, expectStaffing } from "../helpers/navigation.js";
import { credentialsFor } from "./users.js";
import { readEnvironment } from "../environment.js";
export async function submitCredentials(page, credentials) {
  await page.getByLabel("Email address", { exact: true }).fill(credentials.email);
  await page.getByLabel("Password", { exact: true }).fill(credentials.password);
  const submitted = page.waitForResponse(matchesResponse("/auth/password", "POST"));
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  return submitted;
}
export function requireCredentials(account) {
  base.skip(process.env.E2E_LIVE_AUTH !== "1", "Set E2E_LIVE_AUTH=1 for the dedicated test environment.");
  const { credentials, missingMessage } = credentialsFor(account);
  if (!credentials)
    throw new Error(missingMessage);
  return credentials;
}
export const test = base.extend({
  page: async ({ page, context }, use, testInfo) => {
    if (testInfo.project.name !== "chromium") {
      const { browserApi } = readEnvironment();
      await context.route(url => /^\/(auth|api)\//.test(url.pathname) && url.origin !== browserApi.origin, async (route) => {
        await route.abort("blockedbyclient");
        throw new Error("The frontend contacted an unexpected API origin. Check E2E_API_MODE and the frontend configuration.");
      });
    }
    await use(page);
  },
  auth: async ({ page }, use) => {
    await use({
      credentials: requireCredentials,
      signIn: account => signIn(page, account),
    });
  },
});
export async function signIn(page, account) {
  const credentials = requireCredentials(account);
  await page.goto("/login");
  await expectLogin(page);
  const response = await submitCredentials(page, credentials);
  expect(response.status(), "Password sign-in should create a session").toBe(204);
  const cookies = await page.context().cookies(response.url());
  const session = cookies.find(cookie => cookie.name === "session");
  expect(Boolean(session), "The browser must receive the application session cookie").toBe(true);
  expect(session?.httpOnly).toBe(true);
  expect(session?.sameSite).toBe("Lax");
  expect(session?.secure).toBe(new URL(response.url()).protocol === "https:");
  await expectStaffing(page);
}
export { expect };
