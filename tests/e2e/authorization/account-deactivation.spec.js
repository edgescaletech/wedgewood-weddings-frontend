import { readEnvironment } from "../../environment.js";
import { apiURL, expect, get, test } from "../../fixtures/authorization.fixture.js";
import { matchesResponse } from "../../helpers/api.js";
import { expectLogin } from "../../helpers/navigation.js";

test("AUTHZ-11 deactivating a signed-in user blocks their existing session @live", async ({
  auth,
  page,
  adminPage,
}) => {
  test.setTimeout(90_000);
  test.skip(
    process.env.E2E_AUTHZ_MUTATIONS !== "1",
    "Set E2E_AUTHZ_MUTATIONS=1 only for disposable test accounts and isolated infrastructure.",
  );

  await auth.signIn("mixedRole");
  const user = await get(page.request, "/auth/me");
  const admin = await get(adminPage.request, "/auth/me");
  const access = await get(page.request, "/auth/access");
  expect(user.id === admin.id, "The fixture user must be distinct from the Admin").toBe(false);
  expect(access.global.roles).not.toContain("Admin");
  expect(Object.keys(access.venues).length).toBeGreaterThan(0);

  const userPath = `/api/admin/users/${encodeURIComponent(user.id)}`;
  const options = {
    headers: { Origin: readEnvironment().frontend.origin },
    maxRedirects: 0,
  };
  expect((await get(adminPage.request, userPath)).isActive).toBe(true);

  async function deactivateAndRevalidate() {
    const deactivated = await adminPage.request.post(apiURL(`${userPath}/deactivate`), options);
    expect(deactivated.status(), "Deactivate the signed-in fixture user").toBe(204);

    // The open tab may already be redirecting after a protected request.
    await page.evaluate(() => {
      setTimeout(() => window.dispatchEvent(new Event("focus")), 0);
    }).catch(error => {
      if (!error.message.includes("Execution context was destroyed")) throw error;
    });
  }

  try {
    await Promise.all([
      page.waitForResponse(
        response => matchesResponse("/auth/me")(response) && response.status() === 401,
      ),
      deactivateAndRevalidate(),
    ]);
    await expectLogin(page);

    const protectedResponse = await page.request.get(apiURL("/auth/access"), { maxRedirects: 0 });
    expect(protectedResponse.status()).toBe(401);
    expect(await protectedResponse.json()).toEqual({ error: "authentication required" });
  } finally {
    try {
      if (!(await get(adminPage.request, userPath)).isActive) {
        const activated = await adminPage.request.post(apiURL(`${userPath}/activate`), options);
        expect(activated.status(), "Reactivate the fixture user").toBe(204);
      }
      expect((await get(adminPage.request, userPath)).isActive, "Verify account restoration").toBe(true);
    } catch (error) {
      throw new Error("AUTHZ-11 fixture cleanup failed. Reactivate the mixed-role test account before running again.", {
        cause: error,
      });
    }
  }
});
