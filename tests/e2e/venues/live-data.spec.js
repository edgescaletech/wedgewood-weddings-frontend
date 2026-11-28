import { expect, test } from "@playwright/test";

const target = (year, name = "Live venue") => ({
  venueId: "live-venue", venueName: name, region: "Arizona",
  periodKey: `${year}-01`, fohTarget: 2.5, bohTarget: 4.1,
});
const overview = name => ({ venues: [{
  id: name, name, region: "Arizona", weeklyPlan: {}, monthlyPlan: {},
}] });

async function stubAPIs(page, handlers = {}) {
  await page.route(url => /^\/(auth|api)\//.test(url.pathname), async route => {
    const url = new URL(route.request().url());
    if (handlers[url.pathname]) return handlers[url.pathname](route, url);
    const responses = {
      "/auth/me": { id: "live-data-admin", email: "admin@example.test", isActive: true },
      "/auth/access": { global: { roles: ["Admin"], permissions: ["labor_goals.manage"] }, venues: {} },
      "/api/venues": { venues: [] },
      "/api/labor-goals/targets": { targets: [] },
      "/api/admin/regions": { regions: [{ name: "Arizona" }, { name: "East" }] },
      "/api/admin/venues-overview": { venues: [] },
    };
    if (!(url.pathname in responses)) throw new Error(`Unexpected API request: ${url.pathname}`);
    await route.fulfill({ json: responses[url.pathname] });
  });
}

for (const failure of ["HTTP error", "malformed response"]) {
  test(`Live targets show ${failure} and Retry without sample cards`, async ({ page }) => {
    let attempts = 0;
    await stubAPIs(page, {
      "/api/labor-goals/targets": async (route, url) => {
        if (++attempts === 1) {
          await route.fulfill(failure === "HTTP error"
            ? { status: 400, json: { error: "year required" } }
            : { json: {} });
        } else {
          await route.fulfill({ json: { targets: [target(url.searchParams.get("year"))] } });
        }
      },
    });
    await page.goto("/admin/labor-targets");
    await expect(page.getByRole("alert")).toContainText("Could not load labor targets");
    await expect(page.locator(".venue-card")).toHaveCount(0);
    await expect(page.getByText("No labor targets available", { exact: false })).toHaveCount(0);
    await page.getByRole("button", { name: "Retry", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Live venue", exact: true })).toBeVisible();
    await expect(page.locator(".venue-card")).toHaveCount(1);
    await expect(page.getByRole("alert")).toHaveCount(0);
  });
}

test("Empty live targets show an empty state without sample cards", async ({ page }) => {
  await stubAPIs(page);
  await page.goto("/admin/labor-targets");
  await expect(page.getByRole("status")).toContainText("No labor targets available");
  await expect(page.locator(".venue-card")).toHaveCount(0);
  await expect(page.getByRole("alert")).toHaveCount(0);
});

// Ignore AbortSignal in this test so cancellation alone cannot hide a missing
// latest-response guard. This simulates a response already queued for delivery.
async function ignoreOverviewAbort(page) {
  await page.addInitScript(() => {
    const fetch = window.fetch.bind(window);
    window.fetch = (input, options = {}) => {
      if (String(input).includes("/api/admin/venues-overview")) {
        const { signal, ...rest } = options;
        return fetch(input, rest);
      }
      return fetch(input, options);
    };
  });
}

for (const change of ["search", "region", "week"]) {
  test(`An older venues response cannot overwrite a newer ${change} selection`, async ({ page }) => {
    await ignoreOverviewAbort(page);
    let releaseOld;
    let markOldStarted;
    const oldStarted = new Promise(resolve => { markOldStarted = resolve; });
    let requests = 0;
    await stubAPIs(page, {
      "/api/admin/venues-overview": async route => {
        if (++requests === 1) {
          markOldStarted();
          await new Promise(resolve => { releaseOld = resolve; });
          await route.fulfill({ json: overview("Older venue") });
        } else await route.fulfill({ json: overview("Latest venue") });
      },
    });
    await page.goto("/venues");
    await oldStarted;
    if (change === "search") await page.getByLabel("Venue name", { exact: true }).fill("Latest");
    if (change === "region") await page.getByLabel("Region", { exact: true }).selectOption("East");
    if (change === "week") await page.getByRole("button", { name: "Next week", exact: true }).click();
    await expect(page.getByRole("link", { name: "Latest venue", exact: true })).toBeVisible();
    const oldResponse = page.waitForResponse(response => response.url().includes("/api/admin/venues-overview"));
    releaseOld();
    await (await oldResponse).finished();
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await expect(page.getByRole("link", { name: "Latest venue", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Older venue", exact: true })).toHaveCount(0);
  });
}

test("An outdated venues failure cannot set an error or end the latest loading state", async ({ page }) => {
  await ignoreOverviewAbort(page);
  let releaseOld, releaseLatest, markOldStarted, markLatestStarted;
  const oldStarted = new Promise(resolve => { markOldStarted = resolve; });
  const latestStarted = new Promise(resolve => { markLatestStarted = resolve; });
  let requests = 0;
  await stubAPIs(page, {
    "/api/admin/venues-overview": async route => {
      if (++requests === 1) {
        markOldStarted();
        await new Promise(resolve => { releaseOld = resolve; });
        await route.fulfill({ status: 500, body: "Outdated error" });
      } else {
        markLatestStarted();
        await new Promise(resolve => { releaseLatest = resolve; });
        await route.fulfill({ json: overview("Latest venue") });
      }
    },
  });
  await page.goto("/venues");
  await oldStarted;
  await page.getByLabel("Venue name", { exact: true }).fill("Latest");
  await latestStarted;
  const oldResponse = page.waitForResponse(response => response.status() === 500);
  releaseOld();
  await (await oldResponse).finished();
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await expect(page.getByText("Loading venues…", { exact: true })).toBeVisible();
  await expect(page.getByText(/Outdated error/)).toHaveCount(0);
  releaseLatest();
  await expect(page.getByRole("link", { name: "Latest venue", exact: true })).toBeVisible();
});

for (const [today, monday, nextMonday] of [
  ["2026-11-28T12:00:00", "2026-11-23", "2026-11-30"],
  ["2027-01-03T12:00:00", "2026-12-28", "2027-01-04"],
]) {
  test(`Venues defaults to the current week and all regions on ${today.slice(0, 10)}`, async ({ page }) => {
    await page.clock.setFixedTime(new Date(today));
    await stubAPIs(page, {
      "/api/admin/regions": route => route.fulfill({ json: { regions: [{ name: "East", venueCount: 1 }] } }),
    });
    const initialRequest = page.waitForRequest(request => new URL(request.url()).pathname === "/api/admin/venues-overview");
    await page.goto("/venues");
    const initial = new URL((await initialRequest).url());
    expect(initial.searchParams.get("week")).toBe(monday);
    expect(initial.searchParams.has("region")).toBe(false);
    await expect(page.getByLabel("Region", { exact: true })).toHaveValue("All regions");
    const nextRequest = page.waitForRequest(request => new URL(request.url()).pathname === "/api/admin/venues-overview");
    await page.getByRole("button", { name: "Next week", exact: true }).click();
    expect(new URL((await nextRequest).url()).searchParams.get("week")).toBe(nextMonday);
  });
}
