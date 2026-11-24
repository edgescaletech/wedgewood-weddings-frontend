import { expect, test } from "../../fixtures/auth.fixture.js";
import { matchesResponse } from "../../helpers/api.js";
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
  await openLogout();
  const loggedOut = page.waitForResponse(
    matchesResponse("/auth/logout", "POST"),
  );
  await dialog.getByRole("button", { name: "Log out", exact: true }).click();
  expect((await loggedOut).status()).toBe(204);
  await expectLogin(page);
  expect(
    (await context.cookies()).some((cookie) => cookie.name === "session"),
  ).toBe(false);
  await page.goto("/staffing/");
  await expectLogin(page);
});
