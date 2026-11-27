import { readEnvironment } from "../../environment.js";
import {
  adminPermissionKeys,
  apiURL,
  expect,
  get,
  test,
} from "../../fixtures/authorization.fixture.js";
import { expectStaffing } from "../../helpers/navigation.js";
test("AUTHZ-01 Global Admin can open Admin Management and access configured venues @live", async ({
  auth,
  page,
  venues,
}) => {
  await auth.signIn("admin");
  const access = await get(page.request, "/auth/access");
  expect(access.global.roles).toContain("Admin");
  expect(access.global.permissions).toEqual(
    expect.arrayContaining(adminPermissionKeys),
  );
  const directory = await get(page.request, "/api/me/venues");
  for (const venue of Object.values(venues)) {
    expect(directory.some((item) => item.id === venue.id)).toBe(true);
    expect(access.venues[venue.id].permissions).toContain("schedules.view");
  }
  await page.getByRole("button", { name: "More options" }).click();
  await page.getByRole("menuitem", { name: "Admin Dashboard" }).click();
  await expect(
    page.getByRole("heading", { name: "Users & access" }),
  ).toBeVisible();
  await get(page.request, "/api/admin/users");
  await get(page.request, "/api/admin/roles");
  await page.getByRole("link", { name: "Labor efficiency targets" }).click();
  await expect(page).toHaveURL(/\/admin\/labor-targets$/);
  await expect(
    page.getByRole("heading", { name: "Labor efficiency targets" }),
  ).toBeVisible();
});
test("AUTHZ-08 venue-scoped user cannot open Admin Management or call global Admin APIs @live", async ({
  auth,
  page,
}) => {
  await auth.signIn("mixedRole");
  await page.getByRole("button", { name: "More options" }).click();
  await expect(
    page.getByRole("menuitem", { name: "Admin Dashboard" }),
  ).toHaveCount(0);
  for (const [path, heading] of [
    ["/admin/users", "Users & access"],
    ["/admin/labor-targets", "Labor efficiency targets"],
  ]) {
    await page.goto(path);
    await expectStaffing(page);
    await expect(page.getByRole("heading", { name: heading })).toHaveCount(0);
  }
  for (const path of [
    "/api/admin/users",
    "/api/admin/roles",
    "/api/admin/audit",
  ]) {
    const response = await page.request.get(apiURL(path), { maxRedirects: 0 });
    expect(response.status(), `GET ${path} requires a global grant`).toBe(403);
  }
  const { id } = await get(page.request, "/auth/me");
  // An empty body has no role ID, so even an authorization regression cannot assign a role.
  const response = await page.request.post(
    apiURL(`/api/admin/users/${encodeURIComponent(id)}/roles`),
    {
      headers: { Origin: readEnvironment().frontend.origin },
      data: {},
      maxRedirects: 0,
    },
  );
  expect(
    response.status(),
    "Role assignment permission must be checked before the payload",
  ).toBe(403);
  expect(await response.json()).toEqual({ error: "permission denied" });
});
