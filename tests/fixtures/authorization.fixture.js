import { readEnvironment } from "../environment.js";
import { expect, signIn, test as authTest } from "./auth.fixture.js";
import { expectLogin } from "../helpers/navigation.js";
export const adminPermissionKeys = [
  "users.view", "users.manage", "roles.view", "roles.assign", "venues.manage_access",
  "schedules.view", "schedules.edit", "schedules.approve", "schedules.publish",
  "labor_goals.view", "labor_goals.manage",
];
export const gmRole = "General Manager";
export const schedulerRole = "Venue Scheduler";
export function authzConfiguration() {
  const week = process.env.E2E_AUTHZ_WEEK ?? "";
  const date = new Date(week + "T00:00:00Z");
  expect(/^\d{4}-\d\d-\d\d$/.test(week) && date.getUTCDay() === 1 && date.toISOString().startsWith(week), "Authorization fixture requires E2E_AUTHZ_WEEK set to a Monday with existing events in all three venues").toBe(true);
  return {
    week,
    names: {
      a: process.env.E2E_AUTHZ_VENUE_A || "Hofmann Ranch",
      b: process.env.E2E_AUTHZ_VENUE_B || "Tapestry House",
      c: process.env.E2E_AUTHZ_VENUE_C || "Abbey Catering",
    },
  };
}
export function apiURL(path, params = {}) {
  const url = new URL(path, readEnvironment().browserApi);
  url.search = new URLSearchParams(params).toString();
  return url.href;
}
export async function get(request, path, params) {
  const response = await request.get(apiURL(path, params), { maxRedirects: 0 });
  expect(response.status(), `GET ${path} should succeed`).toBe(200);
  return await response.json();
}
export function roleAssignments(request, userId) {
  return get(request, `/api/admin/users/${encodeURIComponent(userId)}/roles`);
}
export function findVenue(venues, name) {
  const matches = venues.filter(venue => venue.name === name);
  expect(matches.length, `Expected exactly one accessible venue named ${name}`).toBe(1);
  return matches[0];
}
export async function getEvents(request, week, venueId) {
  const params = venueId ? { week, venueId } : { week };
  const { events } = await get(request, "/api/events", params);
  if (venueId) {
    expect(events.length, `Seed an event for venue ${venueId} in week ${week}`).toBeGreaterThan(0);
    expect(events.every(event => event.venueId === venueId), "Scoped event list must contain only the requested venue").toBe(true);
  }
  return events;
}
export function staffingPath(week, venueId, eventId) {
  const query = new URLSearchParams({ week, venueId });
  if (eventId)
    query.set("eventId", eventId);
  return `/staffing/?${query}`;
}
export function venuePicker(page) {
  return page.getByRole("combobox", { name: "Select venue" });
}
export async function expectVenue(page, venue) {
  await expect.poll(() => new URL(page.url()).searchParams.get("venueId")).toBe(venue.id);
}
export async function expectRoleUI(page, canPublish) {
  await expect(page.getByRole("link", { name: "Goals & budgets" }).first()).toBeVisible();
  await expect(page.getByRole("combobox", { name: /^Role for / }).first()).toBeEnabled();
  const publish = page.getByRole("button", { name: /Schedule synced to ADP/ });
  if (canPublish)
    await expect(publish).toBeEnabled();
  else
    await expect(publish).toBeDisabled();
}
export async function logout(page) {
  await page.getByRole("button", { name: "More options" }).click();
  await page.getByRole("menuitem", { name: "Log out" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Log out" }).click();
  await expectLogin(page);
}
export const test = authTest.extend({
  adminPage: async ({ browser, baseURL }, use) => {
    const context = await browser.newContext({ baseURL });
    const { browserApi } = readEnvironment();
    await context.route(url => /^\/(auth|api)\//.test(url.pathname) && url.origin !== browserApi.origin, route => route.abort("blockedbyclient"));
    try {
      const page = await context.newPage();
      await signIn(page, "admin");
      await use(page);
    }
    finally {
      await context.close();
    }
  },
  venues: async ({ adminPage }, use) => {
    const { names } = authzConfiguration();
    const directory = await get(adminPage.request, "/api/me/venues");
    const a = findVenue(directory, names.a);
    const b = findVenue(directory, names.b);
    const c = findVenue(directory, names.c);
    expect(new Set([a.id, b.id, c.id]).size, "Configure three distinct venues").toBe(3);
    await use({ a, b, c });
  },
});
test.beforeEach(() => {
  test.skip(process.env.E2E_LIVE_AUTH !== "1", "Enable E2E_LIVE_AUTH for real authorization tests.");
});
export { expect };
