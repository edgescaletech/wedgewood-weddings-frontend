import { readEnvironment } from "../../environment.js";
import {
  apiURL,
  authzConfiguration,
  expect,
  expectRoleUI,
  expectVenue,
  get,
  getEvents,
  gmRole,
  roleAssignments,
  staffingPath,
  test,
  venuePicker,
} from "../../fixtures/authorization.fixture.js";
test("AUTHZ-07 a revoked venue disappears from the active session and the original grant is restored @live", async ({
  auth,
  page,
  adminPage,
  venues,
}) => {
  test.setTimeout(90_000);
  test.skip(
    process.env.E2E_AUTHZ_MUTATIONS !== "1",
    "Set E2E_AUTHZ_MUTATIONS=1 only for disposable test accounts and isolated infrastructure.",
  );
  const { staging, frontend } = readEnvironment();
  if (staging && process.env.E2E_STAGING_ISOLATED !== "1")
    throw new Error("Revocation requires confirmed staging isolation.");
  await auth.signIn("mixedRole");
  const mixed = await get(page.request, "/auth/me");
  const admin = await get(adminPage.request, "/auth/me");
  expect(
    mixed.id === admin.id,
    "The mutation target must be distinct from Admin",
  ).toBe(false);
  const userRoles = `/api/admin/users/${encodeURIComponent(mixed.id)}/roles`;
  const roles = await get(adminPage.request, "/api/admin/roles");
  const gm = roles.find((role) => role.name === gmRole);
  expect(
    Boolean(gm),
    "Fixture prerequisite: the General Manager role must exist",
  ).toBe(true);
  const initial = await roleAssignments(adminPage.request, mixed.id);
  const b = initial.find((grant) => grant.venue_id === venues.b.id);
  expect(
    Boolean(b),
    "Fixture prerequisite: Venue B must already be assigned; this test never changes it",
  ).toBe(true);
  expect(
    initial.some(
      (grant) => grant.venue_id === venues.c.id || grant.venue_id === null,
    ),
    "Fixture prerequisite: no Venue C or global role assignment",
  ).toBe(false);
  const { week } = authzConfiguration();
  const aEvents = await getEvents(adminPage.request, week, venues.a.id);
  const forbidden = await page.request.get(
    apiURL("/api/events", { week, venueId: venues.c.id }),
    { maxRedirects: 0 },
  );
  expect(
    forbidden.status(),
    "Use the venue-authorized Go backend before changing fixture assignments",
  ).toBe(403);
  async function restoreManager() {
    const current = await roleAssignments(adminPage.request, mixed.id);
    const assignment = current.find((grant) => grant.venue_id === venues.a.id);
    const options = { headers: { Origin: frontend.origin }, maxRedirects: 0 };
    if (!assignment) {
      const restored = await adminPage.request.post(apiURL(userRoles), {
        ...options,
        data: { venueId: venues.a.id, roleId: gm.id },
      });
      expect(restored.status(), "Restore the General Manager assignment").toBe(
        204,
      );
    } else if (assignment.role_id !== gm.id) {
      const restored = await adminPage.request.put(
        apiURL(`${userRoles}/${assignment.id}`),
        {
          ...options,
          data: { roleId: gm.id },
        },
      );
      expect(
        restored.status(),
        "Reset Venue A to the General Manager fixture",
      ).toBe(204);
    }
    const verified = await roleAssignments(adminPage.request, mixed.id);
    expect(verified.find((grant) => grant.venue_id === venues.b.id)).toEqual(b);
    const manager = verified.find((grant) => grant.venue_id === venues.a.id);
    expect(manager?.role_id, "Verify Venue A restoration").toBe(gm.id);
    return manager;
  }
  try {
    const assignment = await restoreManager();
    await page.goto(staffingPath(week, venues.a.id));
    await expect(
      venuePicker(page).getByRole("option", {
        name: venues.b.name,
        exact: true,
      }),
    ).toHaveCount(1);
    await expectRoleUI(page, true);
    await expect(
      page.getByText(aEvents[0].name, { exact: true }).first(),
    ).toBeVisible();
    const removed = await adminPage.request.delete(
      apiURL(`${userRoles}/${assignment.id}`),
      {
        headers: { Origin: frontend.origin },
        maxRedirects: 0,
      },
    );
    expect(removed.status(), "Revoke only the Venue A assignment").toBe(204);
    await page.bringToFront();
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await expectVenue(page, venues.b);
    await expectRoleUI(page, false);
    for (const event of aEvents)
      await expect(page.getByText(event.name, { exact: true })).toHaveCount(0);
    const directory = await get(page.request, "/api/me/venues");
    expect(directory.map((venue) => venue.id)).not.toContain(venues.a.id);
    const access = await get(page.request, "/auth/access");
    expect(access.venues[venues.a.id]).toBeUndefined();
    const denied = await page.request.get(
      apiURL("/api/events", { week, venueId: venues.a.id }),
      { maxRedirects: 0 },
    );
    expect(denied.status()).toBe(403);
    await getEvents(page.request, week, venues.b.id);
  } finally {
    try {
      await restoreManager();
    } catch (error) {
      throw new Error(
        "AUTHZ-07 fixture cleanup failed. Restore Venue A General Manager for the mixed-role test account before running again.",
        { cause: error },
      );
    }
  }
});
