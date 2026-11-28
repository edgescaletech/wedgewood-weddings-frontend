import { expect, test } from '@playwright/test';

async function schedule(page, { unknownTime = false, denied = false } = {}) {
  let resolved = false;
  const event = () => ({
    id: '006000000000001AAA', name: 'Unconfirmed wedding', venueId: 'venue-a',
    eventDate: '2026-11-27', startTime: '16:00', endTime: '22:00', guestCount: 60,
    syncStatus: resolved ? 'cached' : 'unverified',
    ...(unknownTime ? {} : { lastSyncedAt: '2026-11-26T10:30:00Z' }),
  });
  await page.route(url => /^\/(auth|api)\//.test(url.pathname), async route => {
    const path = new URL(route.request().url()).pathname;
    const responses = {
      '/auth/me': { id: 'test-user', email: 'user@example.test', isActive: true },
      '/auth/access': { global: { roles: [], permissions: [] }, venues: {
        'venue-a': { roles: ['General Manager'], permissions: ['schedules.view'] },
      } },
      '/api/me/venues': [{ id: 'venue-a', name: 'Test venue', timezone: 'America/Denver' }],
      '/api/events': { events: [event()] },
    };
    if (path === '/api/events/006000000000001AAA') {
      if (denied) return route.fulfill({ status: 404, json: { error: 'event not found' } });
      // Older detail responses may omit metadata: the list warning must survive.
      const { syncStatus, lastSyncedAt, ...detail } = event();
      return route.fulfill({ json: detail });
    }
    if (!(path in responses)) throw new Error(`Unexpected API request: ${path}`);
    await route.fulfill({ json: responses[path] });
  });
  await page.goto('/staffing?week=2026-11-23&venueId=venue-a');
  return () => { resolved = true; };
}

test('Unverified event warnings survive detail loading, week view and BEO view', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const resolve = await schedule(page);
  await expect(page.locator('.event-sync-warning')).toContainText('These details may be outdated');
  await expect(page.locator('.event-sync-warning')).toContainText('2026');
  await expect(page.locator('#week-ribbon-container .sync-unverified-badge')).toHaveText('Unverified sync');
  await page.getByRole('button', { name: 'Event details', exact: true }).click();
  await expect(page.locator('#event-details-container .event-sync-warning')).toContainText('could not be verified');
  await page.getByRole('button', { name: 'Hide details', exact: true }).click();
  await page.getByRole('button', { name: 'Week view', exact: true }).click();
  await expect(page.locator('.week-matrix-table .sync-unverified-badge')).toHaveText('Unverified sync');
  await page.getByRole('button', { name: 'Day view', exact: true }).click();
  await page.getByRole('button', { name: 'BEO PDF', exact: true }).click();
  await expect(page.locator('.beo-page-container .event-sync-warning')).toContainText('could not be verified');
  resolve();
  await page.goto('/staffing?week=2026-11-23&venueId=venue-a');
  await expect(page.getByText('Scheduling Unconfirmed wedding', { exact: false })).toBeVisible();
  await expect(page.locator('.event-sync-warning')).toHaveCount(0);
  await expect(page.locator('.sync-unverified-badge')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('Legacy events show unknown sync time instead of an invented timestamp', async ({ page }) => {
  await schedule(page, { unknownTime: true });
  await expect(page.locator('.event-sync-warning')).toContainText('last successful sync time unknown');
});

test('A warning never bypasses denied event access', async ({ page }) => {
  await schedule(page, { denied: true });
  await expect(page.getByText('This event is no longer available.', { exact: true })).toBeVisible();
  await expect(page.locator('.event-sync-warning')).toHaveCount(0);
  await expect(page.locator('#event-details-container')).toHaveCount(0);
});
