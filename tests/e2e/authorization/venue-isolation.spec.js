import { randomUUID } from "node:crypto";
import {
  apiURL,
  authzConfiguration,
  expect,
  expectVenue,
  get,
  getEvents,
  staffingPath,
  test,
  venuePicker,
} from "../../fixtures/authorization.fixture.js";
test("AUTHZ-04 Venue C is absent and a direct deep link falls back to an allowed venue @live", async ({
  auth,
  page,
  adminPage,
  venues,
}) => {
  const { week } = authzConfiguration();
  const deniedEvents = await getEvents(adminPage.request, week, venues.c.id);
  await auth.signIn("mixedRole");
  const directory = await get(page.request, "/api/me/venues");
  expect(directory.map((venue) => venue.id)).toEqual(
    expect.arrayContaining([venues.a.id, venues.b.id]),
  );
  expect(directory.map((venue) => venue.id)).not.toContain(venues.c.id);
  await page.goto(staffingPath(week, venues.c.id, deniedEvents[0].id));
  await expect(
    venuePicker(page).getByRole("option", { name: venues.c.name, exact: true }),
  ).toHaveCount(0);
  await expect
    .poll(() => {
      const selected = new URL(page.url()).searchParams.get("venueId");
      return selected === venues.a.id || selected === venues.b.id;
    })
    .toBe(true);
  await expect(venuePicker(page)).toBeVisible();
  const selected = directory.find(
    (venue) => venue.id === new URL(page.url()).searchParams.get("venueId"),
  );
  await expectVenue(page, selected);
  await expect(
    page.getByRole("button", { name: "Event details" }),
  ).toBeVisible();
  for (const event of deniedEvents)
    await expect(page.getByText(event.name, { exact: true })).toHaveCount(0);
});
test("AUTHZ-05 real event and labor APIs deny unassigned venue access @live", async ({
  auth,
  page,
  adminPage,
  venues,
}) => {
  const { week } = authzConfiguration();
  const [denied] = await getEvents(adminPage.request, week, venues.c.id);
  const detailPath = `/api/events/${encodeURIComponent(denied.id)}`;
  await get(adminPage.request, detailPath);
  await auth.signIn("mixedRole");
  const access = await get(page.request, "/auth/access");
  expect(access.venues[venues.c.id]).toBeUndefined();
  for (const path of [
    "/api/events",
    "/api/labor-goals/summary",
    "/api/labor-goals/targets",
  ]) {
    const response = await page.request.get(
      apiURL(path, { week, venueId: venues.c.id }),
      { maxRedirects: 0 },
    );
    expect(
      response.status(),
      `GET ${path} must enforce venue access on the Go backend`,
    ).toBe(403);
  }
  const forbidden = await page.request.get(apiURL(detailPath), {
    maxRedirects: 0,
  });
  const missing = await page.request.get(
    apiURL(`/api/events/e2e-missing-${randomUUID()}`),
    { maxRedirects: 0 },
  );
  expect(forbidden.status()).toBe(404);
  expect(missing.status()).toBe(404);
  expect(await forbidden.json()).toEqual({ error: "event not found" });
  expect(await missing.json()).toEqual(await forbidden.json());
  const all = await getEvents(page.request, week);
  const allowed = Object.entries(access.venues)
    .filter(([, grant]) => grant.permissions.includes("schedules.view"))
    .map(([id]) => id);
  expect(all.map((event) => event.venueId)).toEqual(
    expect.arrayContaining([venues.a.id, venues.b.id]),
  );
  expect(all.every((event) => allowed.includes(event.venueId))).toBe(true);
  expect(all.some((event) => event.id === denied.id)).toBe(false);
});
test("AUTHZ-10 labor endpoints require a session and permission at the requested venue @live", async ({
  auth,
  page,
  playwright,
  venues,
}) => {
  const { week } = authzConfiguration();
  const endpoints = [
    { path: "/api/labor-goals/summary", params: { week } },
    { path: "/api/labor-goals/targets", params: { year: week.slice(0, 4) } },
  ];
  const signedOut = await playwright.request.newContext();
  try {
    for (const { path, params } of endpoints) {
      for (const venue of Object.values(venues)) {
        const response = await signedOut.get(
          apiURL(path, { ...params, venueId: venue.id }),
          { maxRedirects: 0 },
        );
        expect(
          response.status(),
          `GET ${path} at ${venue.name} requires authentication`,
        ).toBe(401);
      }
    }
  } finally {
    await signedOut.dispose();
  }
  await auth.signIn("mixedRole");
  for (const { path, params } of endpoints) {
    for (const [venue, status] of [
      [venues.a, 200],
      [venues.b, 200],
      [venues.c, 403],
    ]) {
      const response = await page.request.get(
        apiURL(path, { ...params, venueId: venue.id }),
        { maxRedirects: 0 },
      );
      expect(
        response.status(),
        `GET ${path} at ${venue.name} must enforce the user's venue grant`,
      ).toBe(status);
    }
  }
});
