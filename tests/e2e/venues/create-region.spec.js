import { expect, test } from "@playwright/test";

test("Create region can open, close, and reopen without crashing Venues", async ({ page }) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route(url => /^\/(auth|api)\//.test(url.pathname), async route => {
    const path = new URL(route.request().url()).pathname;
    const responses = {
      "/auth/me": { id: "modal-test-admin", email: "admin@example.test", isActive: true },
      "/auth/access": { global: { roles: ["Admin"], permissions: ["labor_goals.manage"] }, venues: {} },
      "/api/venues": { venues: [{ id: "venue-a", name: "Test venue", venueNumber: "101", region: "Arizona" }] },
      "/api/admin/regions": { regions: [{ name: "Arizona", venueCount: 1 }] },
      "/api/admin/venues-overview": { venues: [] },
    };
    if (!(path in responses)) throw new Error(`Unexpected API request: ${path}`);
    await route.fulfill({ json: responses[path] });
  });

  await page.goto("/venues");
  const venuesHeading = page.getByRole("heading", { name: "Venues", exact: true });
  await expect(venuesHeading).toBeVisible();
  await page.getByRole("button", { name: "Manage regions", exact: true }).click();

  for (let attempt = 0; attempt < 2; attempt++) {
    await page.getByRole("button", { name: "Create region", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Create region", exact: true })).toBeVisible();
    await expect(page.getByText("Test venue", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Create region", exact: true })).toHaveCount(0);
    await expect(venuesHeading).toBeVisible();
  }
  expect(errors).toEqual([]);
});
