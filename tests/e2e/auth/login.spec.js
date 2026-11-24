import { randomUUID } from "node:crypto";
import { readEnvironment } from "../../environment.js";
import {
  expect,
  submitCredentials,
  test,
} from "../../fixtures/auth.fixture.js";
import { apiPath, matchesResponse, stubIdentity } from "../../helpers/api.js";
import {
  expectLogin,
  expectStaffing,
  loginURL,
} from "../../helpers/navigation.js";
const signInScenarios = [
  { name: "Admin", account: "admin" },
  { name: "General Manager", account: "mixedRole", role: "General Manager" },
  { name: "Venue Scheduler", account: "mixedRole", role: "Venue Scheduler" },
];
for (const scenario of signInScenarios) {
  test(`AUTHN-01 ${scenario.name} can sign in and reuse the session @live`, async ({
    auth,
    page,
    context,
  }) => {
    await auth.signIn(scenario.account);
    if ("role" in scenario) {
      const response = await context.request.get(
        new URL("/auth/access", readEnvironment().browserApi).href,
      );
      expect(
        response.status(),
        "The signed-in account should return its access profile",
      ).toBe(200);
      const access = await response.json();
      expect(
        Object.values(access.venues).some((venue) =>
          venue.roles.includes(scenario.role),
        ),
        `The mixed-role fixture must have the ${scenario.role} role at a test venue`,
      ).toBe(true);
    }
    await page.reload();
    await expectStaffing(page);
    const secondTab = await context.newPage();
    await secondTab.goto("/staffing/");
    await expectStaffing(secondTab);
  });
}
test("AUTHN-02 invalid credentials do not create a session @live", async ({
  auth,
  page,
  context,
}) => {
  const { email } = auth.credentials("mixedRole");
  await page.goto("/login");
  await expectLogin(page);
  const response = await submitCredentials(page, {
    email,
    password: randomUUID(),
  });
  expect(response.status()).toBe(401);
  await expect(page.getByRole("alert")).toHaveText(
    /unable to sign in.*check your credentials/i,
  );
  expect(
    (await context.cookies()).some((cookie) => cookie.name === "session"),
  ).toBe(false);
  await page.goto("/staffing/");
  await expectLogin(page);
});
test("AUTHN-06 an inactive linked account cannot sign in @live", async ({
  auth,
  page,
  context,
}) => {
  const credentials = auth.credentials("inactive");
  await page.goto("/login");
  await expectLogin(page);
  const deniedIdentity = page.waitForResponse(
    (response) =>
      matchesResponse("/auth/me")(response) && response.status() === 403,
  );
  const response = await submitCredentials(page, credentials);
  // WorkOS accepts the credentials. The local session guard denies application access.
  expect(response.status()).toBe(204);
  expect((await deniedIdentity).status()).toBe(403);
  const activationMessage = page.getByText(
    "Your account is awaiting activation.",
    { exact: true },
  );
  await expect(activationMessage).toBeVisible();
  const protectedData = await context.request.get(
    new URL("/api/events", response.url()).href,
  );
  expect(protectedData.status()).toBe(403);
  await page.goto("/staffing/");
  await expect(page).toHaveURL(loginURL);
  await expect(activationMessage).toBeVisible();
  await expect(page.getByRole("button", { name: "More options" })).toHaveCount(
    0,
  );
});
test("AUTHN-07 sign-in reports a temporary authentication failure", async ({
  page,
}) => {
  await stubIdentity(page, 401);
  await page.route(apiPath("/auth/password"), (route) =>
    route.fulfill({
      status: 503,
      json: { error: "authentication unavailable" },
    }),
  );
  await page.goto("/login");
  await expectLogin(page);
  const response = await submitCredentials(page, {
    email: "scheduler@example.test",
    password: "synthetic-fixture",
  });
  expect(response.status()).toBe(503);
  await expect(page.getByRole("alert")).toHaveText(
    "authentication unavailable",
  );
  await expect(
    page.getByRole("button", { name: "Sign in", exact: true }),
  ).toBeEnabled();
});
