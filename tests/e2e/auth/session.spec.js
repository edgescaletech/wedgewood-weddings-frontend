import { expect, test } from "../../fixtures/auth.fixture.js";
import { apiPath, matchesResponse, stubIdentity } from "../../helpers/api.js";
import { expectLogin, expectStaffing } from "../../helpers/navigation.js";
const protectedRoutes = ["/staffing/", "/goals/", "/admin/users", "/admin/labor-targets"];
for (const path of protectedRoutes) {
  test(`AUTHN-03 signed-out users cannot open ${path} @go`, async ({
    page,
  }) => {
    test.skip(
      process.env.E2E_GO_AUTH !== "1" && process.env.E2E_LIVE_AUTH !== "1",
      "Set E2E_GO_AUTH=1 to run against the dedicated Go backend.",
    );
    const identity = page.waitForResponse(matchesResponse("/auth/me"));
    await page.goto(path);
    expect((await identity).status()).toBe(401);
    await expectLogin(page);
  });
  test(`AUTHN-03 ${path} redirects after an unauthorized session response`, async ({
    page,
  }) => {
    await stubIdentity(page, 401);
    const protectedRequests = [];
    await page.route(
      (url) => url.pathname.startsWith("/api/"),
      (route) => {
        protectedRequests.push(new URL(route.request().url()).pathname);
        return route.abort();
      },
    );
    await page.goto(path);
    await expectLogin(page);
    expect(protectedRequests).toEqual([]);
  });
}
test("AUTHN-05 invalidating the browser session locks protected pages @live", async ({
  auth,
  page,
  context,
}) => {
  await auth.signIn("mixedRole");
  const session = (await context.cookies()).find(
    (cookie) => cookie.name === "session",
  );
  expect(session, "Expected an authenticated session cookie").toBeDefined();
  // Replace only the local browser credential. The real Go API must reject it.
  await context.addCookies([{ ...session, value: "invalid-e2e-session" }]);
  const unauthorized = page.waitForResponse(matchesResponse("/auth/me"));
  await page.reload();
  expect((await unauthorized).status()).toBe(401);
  await expectLogin(page);
  for (const path of protectedRoutes.slice(1)) {
    await page.goto(path);
    await expectLogin(page);
  }
});
test("AUTHN-05 an open Staffing page returns to login when its session expires", async ({
  page,
}) => {
  let sessionStatus = 200;
  await stubIdentity(page, () => sessionStatus);
  await stubStaffingData(page);
  await page.goto("/staffing/");
  await expectStaffing(page);
  sessionStatus = 401;
  await page.reload();
  await expectLogin(page);
});
async function stubStaffingData(page) {
  await page.route(apiPath("/auth/access"), (route) =>
    route.fulfill({
      json: { global: { roles: [], permissions: [] }, venues: {} },
    }),
  );
  await page.route(apiPath("/api/me/venues"), (route) =>
    route.fulfill({ json: [] }),
  );
  await page.route(apiPath("/api/events"), (route) =>
    route.fulfill({ json: { events: [] } }),
  );
}
test("AUTHN-07 retry rechecks the session after a temporary outage", async ({
  page,
}) => {
  let status = 503;
  await stubIdentity(page, () => status);
  await stubStaffingData(page);
  await page.goto("/staffing/");
  await expect(page.getByRole("alert")).toContainText(
    "Unable to check your session.",
  );
  await expect(page.getByRole("button", { name: "More options" })).toHaveCount(
    0,
  );
  status = 200;
  await page.getByRole("button", { name: "Try again" }).click();
  await expectStaffing(page);
});

test("AUTHN-05 tab focus rechecks access without remounting an unchanged session", async ({ page }) => {
  await stubIdentity(page, 200);
  await stubStaffingData(page);
  await page.goto("/staffing/");
  await expect(page.getByText("No venues are available for scheduling.")).toBeVisible();
  await page.getByRole("button", { name: "More options" }).click();
  const menu = page.getByRole("menu");
  await expect(menu).toBeVisible();

  let finishAccessCheck;
  const pendingAccess = new Promise(resolve => { finishAccessCheck = resolve; });
  await page.route(apiPath("/auth/access"), async route => {
    await pendingAccess;
    await route.fulfill({ json: { global: { roles: [], permissions: [] }, venues: {} } });
  });

  try {
    const accessRequested = page.waitForRequest(request => apiPath("/auth/access")(new URL(request.url())));
    const accessResponse = page.waitForResponse(matchesResponse("/auth/access"));
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await accessRequested;
    await expect(menu).toBeVisible();
    await expect(page.getByText("Checking your session…")).toHaveCount(0);

    finishAccessCheck();
    expect((await accessResponse).status()).toBe(200);
    await expect(menu).toBeVisible();
  } finally {
    finishAccessCheck();
  }
});

test("AUTHN-05 tab focus redirects after the session expires", async ({ page }) => {
  let sessionStatus = 200;
  await stubIdentity(page, () => sessionStatus);
  await stubStaffingData(page);
  await page.goto("/staffing/");
  await expect(page.getByText("No venues are available for scheduling.")).toBeVisible();

  sessionStatus = 401;
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expectLogin(page);
});
