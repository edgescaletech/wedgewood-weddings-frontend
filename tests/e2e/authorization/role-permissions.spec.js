import { authzConfiguration, expect, expectRoleUI, expectVenue, get, getEvents, gmRole, schedulerRole, staffingPath, test, venuePicker, } from "../../fixtures/authorization.fixture.js";
const shared = ["schedules.view", "schedules.edit", "labor_goals.view"];
const managerOnly = ["schedules.approve", "schedules.publish"];
for (const [slot, role, id] of [
  ["a", gmRole, "AUTHZ-02"],
  ["b", schedulerRole, "AUTHZ-03"],
]) {
  test(`${id} mixed-role user receives the ${role} grants at the assigned venue @live`, async ({ auth, page, venues, }) => {
    await auth.signIn("mixedRole");
    const { week } = authzConfiguration();
    const venue = venues[slot];
    const access = await get(page.request, "/auth/access");
    expect(access.venues[venue.id]?.roles).toEqual([role]);
    expect(access.venues[venue.id].permissions).toEqual(expect.arrayContaining(shared));
    for (const permission of managerOnly) {
      if (slot === "a")
        expect(access.venues[venue.id].permissions).toContain(permission);
      else
        expect(access.venues[venue.id].permissions).not.toContain(permission);
    }
    await get(page.request, "/api/labor-goals/summary", {
      week,
      venueId: venue.id,
    });
    await page.goto(staffingPath(week, venue.id));
    await expectVenue(page, venue);
    await expectRoleUI(page, slot === "a");
    await page.getByRole("button", { name: "More options" }).click();
    await expect(page.getByRole("menuitem", { name: "Admin Dashboard" })).toHaveCount(0);
  });
}
test("AUTHZ-06 switching venues replaces the role affordances and events @live", async ({ auth, page, venues, }) => {
  await auth.signIn("mixedRole");
  const { week } = authzConfiguration();
  const aEvents = await getEvents(page.request, week, venues.a.id);
  const bEvents = await getEvents(page.request, week, venues.b.id);
  expect(new Set([...aEvents, ...bEvents].map((event) => event.name)).size, "Fixture event names should be distinct so the UI isolation assertion is meaningful").toBe(aEvents.length + bEvents.length);
  await page.goto(staffingPath(week, venues.a.id));
  await expectVenue(page, venues.a);
  for (const [venue, visible, hidden, canPublish] of [
    [venues.a, aEvents, bEvents, true],
    [venues.b, bEvents, aEvents, false],
    [venues.a, aEvents, bEvents, true],
  ]) {
    await venuePicker(page).selectOption(venue.id);
    await expectVenue(page, venue);
    await expectRoleUI(page, canPublish);
    await expect(page.getByText(visible[0].name, { exact: true }).first()).toBeVisible();
    for (const event of hidden)
      await expect(page.getByText(event.name, { exact: true })).toHaveCount(0);
  }
});
