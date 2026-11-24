import { signIn } from "../../fixtures/auth.fixture.js";
import {
  apiURL,
  expect,
  get,
  logout,
  test,
} from "../../fixtures/authorization.fixture.js";
import { expectStaffing } from "../../helpers/navigation.js";
test("AUTHZ-09 a new session cannot inherit the previous Admin's access @live", async ({
  auth,
  page,
}) => {
  await auth.signIn("admin");
  const admin = await get(page.request, "/auth/me");
  await page.goto("/admin/");
  await expect(
    page.getByRole("heading", { name: "Users & access" }),
  ).toBeVisible();
  await get(page.request, "/api/admin/users");
  await page.goto("/staffing/");
  await expectStaffing(page);
  await logout(page);
  expect(
    (await page.request.get(apiURL("/auth/me"), { maxRedirects: 0 })).status(),
  ).toBe(401);
  await signIn(page, "mixedRole");
  const mixed = await get(page.request, "/auth/me");
  expect(
    mixed.id === admin.id,
    "The replacement session must identify a different account",
  ).toBe(false);
  const access = await get(page.request, "/auth/access");
  expect(access.global.roles).not.toContain("Admin");
  expect(access.global.permissions).not.toContain("users.view");
  await page.goto("/admin/");
  await expectStaffing(page);
  await expect(
    page.getByRole("heading", { name: "Users & access" }),
  ).toHaveCount(0);
  expect(
    (
      await page.request.get(apiURL("/api/admin/users"), { maxRedirects: 0 })
    ).status(),
  ).toBe(403);
});
