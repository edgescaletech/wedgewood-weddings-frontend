import { expect, test } from "../../fixtures/auth.fixture.js";
import { readEnvironment } from "../../environment.js";
import { expectLogin, expectStaffing } from "../../helpers/navigation.js";
test("AUTHN-04 cancel preserves the session and confirmation logs out @live", async ({
  auth,
  page,
  context,
}) => {
  await auth.signIn("mixedRole");
  async function openLogout() {
    await page.getByRole("button", { name: "More options" }).click();
    await page.getByRole("menuitem", { name: "Log out" }).click();
  }
  const dialog = page.getByRole("dialog", {
    name: "Are you sure you want to log out?",
  });
  await openLogout();
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toBeHidden();
  await page.reload();
  await expectStaffing(page);
  const identityURL = new URL("/auth/me", readEnvironment().browserApi).href;
  const identityStatus = async () =>
    (await page.request.get(identityURL, { maxRedirects: 0 })).status();
  expect(await identityStatus()).toBe(200);

  await openLogout();
  const logoutRequested = page.waitForRequest(
    new URL("/auth/logout", identityURL).href,
  );
  const [request] = await Promise.all([
    logoutRequested,
    dialog.getByRole("button", { name: "Log out", exact: true }).click(),
  ]);
  expect(request.method()).toBe("POST");
  await expectLogin(page);
  expect(
    (await context.cookies()).some((cookie) => cookie.name === "session"),
  ).toBe(false);
  expect(await identityStatus()).toBe(401);
  await page.goto("/staffing/");
  await expectLogin(page);
});
