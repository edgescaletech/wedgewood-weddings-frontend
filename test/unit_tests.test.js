import test from 'node:test';
import assert from 'node:assert/strict';
import { transformTargetsToVenuesData, isAnnualPeriodKey } from '../src/utils/goals-transform.js';

// GM default permissions as defined in the client specification matrix
const GM_PERMISSIONS = {
  view_schedule: true,
  compare_labor_goals: true,
  edit_schedule: true,
  review_approval: true,
  publish_adp: true,
  send_adp_changes: true,
  manage_users: false, // Admin only
  update_labor_goals: false, // Admin only
};

// Scheduler permissions as defined in the client specification matrix
const SCHEDULER_PERMISSIONS = {
  view_schedule: true,
  compare_labor_goals: true,
  edit_schedule: true,
  review_approval: false,
  publish_adp: false,
  send_adp_changes: false,
  manage_users: false,
  update_labor_goals: false,
};

function resolveUserRoleAndPermissions(userData) {
  if (userData && userData.role && userData.role.trim() !== '') {
    const permMap = {};
    if (Array.isArray(userData.permissions)) {
      userData.permissions.forEach(p => { permMap[p] = true; });
    }
    return {
      role: userData.role,
      permissions: permMap,
    };
  }
  // Fallback to General manager (GM)
  return {
    role: 'General manager (GM)',
    permissions: GM_PERMISSIONS,
  };
}

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getMondayFor(dateValue) {
  const date = dateValue ? new Date(`${dateValue}T12:00:00`) : new Date();
  if (Number.isNaN(date.getTime())) return dateKey(new Date());
  const day = date.getDay();
  date.setDate(date.getDate() - ((day + 6) % 7));
  return dateKey(date);
}

function formatWeekRange(weekStart) {
  if (!weekStart) return '';
  const start = new Date(`${weekStart}T12:00:00`);
  if (Number.isNaN(start.getTime())) return '';
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const startLabel = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const endLabel = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return `${startLabel} – ${endLabel}`;
}

test('Auth Role Fallback - defaults to General manager (GM)', () => {
  const resolved = resolveUserRoleAndPermissions(null);
  assert.equal(resolved.role, 'General manager (GM)');
  assert.equal(resolved.permissions.view_schedule, true);
  assert.equal(resolved.permissions.publish_adp, true);
  assert.equal(resolved.permissions.compare_labor_goals, true);
  assert.equal(resolved.permissions.edit_schedule, true);
  assert.equal(resolved.permissions.review_approval, true);
  assert.equal(resolved.permissions.manage_users, false);
  assert.equal(resolved.permissions.update_labor_goals, false);
});

test('Auth Role Fallback - respects user with empty role string', () => {
  const resolved = resolveUserRoleAndPermissions({ id: '123', email: 'gm@wedgewood.com', role: '' });
  assert.equal(resolved.role, 'General manager (GM)');
  assert.equal(resolved.permissions.publish_adp, true);
});

test('Auth Role Matrix - custom server-provided Scheduler permissions', () => {
  const resolved = resolveUserRoleAndPermissions({
    id: '456',
    role: 'Venue scheduler',
    permissions: ['view_schedule', 'compare_labor_goals', 'edit_schedule'],
  });
  assert.equal(resolved.role, 'Venue scheduler');
  assert.equal(resolved.permissions.view_schedule, true);
  assert.equal(Boolean(resolved.permissions.publish_adp), false);
  assert.equal(Boolean(resolved.permissions.review_approval), false);
});

test('Date Helpers - getMondayFor correctly snaps dates to Monday', () => {
  // Friday Nov 20, 2026 -> Monday Nov 16, 2026
  assert.equal(getMondayFor('2026-11-20'), '2026-11-16');
  // Sunday Nov 22, 2026 -> Monday Nov 16, 2026
  assert.equal(getMondayFor('2026-11-22'), '2026-11-16');
  // Monday Nov 16, 2026 -> Monday Nov 16, 2026
  assert.equal(getMondayFor('2026-11-16'), '2026-11-16');
});

test('Date Helpers - formatWeekRange displays start and end correctly', () => {
  assert.equal(formatWeekRange('2026-11-16'), 'Nov 16 – Nov 22, 2026');
});

// Venues Dashboard Helper Tests
function formatDateISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getMonday(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

test('Venues Dashboard - formatDateISO formats accurately', () => {
  const d = new Date(2026, 10, 23); // Nov 23, 2026
  assert.equal(formatDateISO(d), '2026-11-23');
});

test('Venues Dashboard - getMonday calculates Monday correctly for any day of week', () => {
  // Wednesday Nov 25, 2026 -> Monday Nov 23, 2026
  const wed = new Date(2026, 10, 25);
  assert.equal(formatDateISO(getMonday(wed)), '2026-11-23');

  // Sunday Nov 29, 2026 -> Monday Nov 23, 2026
  const sun = new Date(2026, 10, 29);
  assert.equal(formatDateISO(getMonday(sun)), '2026-11-23');

  // Monday Nov 23, 2026 -> Monday Nov 23, 2026
  const mon = new Date(2026, 10, 23);
  assert.equal(formatDateISO(getMonday(mon)), '2026-11-23');
});

test('Venues Dashboard - client-side filter helper logic', () => {
  const sampleVenues = [
    { venueName: 'Clayton House', region: 'Arizona' },
    { venueName: 'Colby Falls', region: 'Arizona' },
    { venueName: 'Almond Grove', region: 'California Central' },
  ];

  const filterVenues = (list, region, query) => {
    return list.filter(v => {
      const matchRegion = !region || region === 'All regions' || v.region === region;
      const matchQuery = !query || v.venueName.toLowerCase().includes(query.toLowerCase());
      return matchRegion && matchQuery;
    });
  };

  // Filter by region
  const azOnly = filterVenues(sampleVenues, 'Arizona', '');
  assert.equal(azOnly.length, 2);

  // Filter by search query
  const searchResult = filterVenues(sampleVenues, 'All regions', 'clayton');
  assert.equal(searchResult.length, 1);
  assert.equal(searchResult[0].venueName, 'Clayton House');

  // Filter with no match
  const noMatch = filterVenues(sampleVenues, 'Arizona', 'Grove');
  assert.equal(noMatch.length, 0);
});

test('Labor Goals - Annual Period Key Recognition', () => {
  assert.equal(isAnnualPeriodKey('2027', 2027), true);
  assert.equal(isAnnualPeriodKey('2027-FY', 2027), true);
  assert.equal(isAnnualPeriodKey('Full Year', 2027), true);
  assert.equal(isAnnualPeriodKey('Annual', 2027), true);
  assert.equal(isAnnualPeriodKey('fy', 2027), true);

  // Monthly keys are NOT annual
  assert.equal(isAnnualPeriodKey('2027-01', 2027), false);
  assert.equal(isAnnualPeriodKey('2027-02', 2027), false);
  assert.equal(isAnnualPeriodKey('2027-12', 2027), false);
});

test('Labor Goals - Application Logic: Targets, Annual Separation, and Unavailable Actuals', () => {
  const dbTargets = [
    // January: both targets present
    { venueId: 'v1', venueName: 'Boulder Ridge', periodKey: '2027-01', fohTarget: 2.50, bohTarget: 4.10 },
    // February: only FOH present, BOH blank (null)
    { venueId: 'v1', venueName: 'Boulder Ridge', periodKey: '2027-02', fohTarget: 2.75, bohTarget: null },
    // March: both blank (null)
    { venueId: 'v1', venueName: 'Boulder Ridge', periodKey: '2027-03', fohTarget: null, bohTarget: null },
    // April: zero target (0.00)
    { venueId: 'v1', venueName: 'Boulder Ridge', periodKey: '2027-04', fohTarget: 0.0, bohTarget: 3.50 },
    // Annual row: 2027-FY (MUST NOT overwrite January 2027-01!)
    { venueId: 'v1', venueName: 'Boulder Ridge', periodKey: '2027-FY', fohTarget: 2.80, bohTarget: 4.25 },
  ];

  const venues = transformTargetsToVenuesData(dbTargets, 2027);
  assert.equal(venues.length, 1);
  const venue = venues[0];

  // 1. Annual row separated properly and excluded from monthly mapping
  assert.equal(venue.annualFOHTarget, 2.80);
  assert.equal(venue.annualBOHTarget, 4.25);
  assert.equal(venue.fohTargetAvg, 2.80);
  assert.equal(venue.bohTargetAvg, 4.25);

  // 2. January target NOT overwritten by 2027-FY
  const janPeriod = venue.periodDetailsRows.find(r => r.monthNum === 1);
  assert.equal(janPeriod.fohTarget, 2.50);
  assert.equal(janPeriod.bohTarget, 4.10);

  // 3. February: only FOH present
  const febPeriod = venue.periodDetailsRows.find(r => r.monthNum === 2);
  assert.equal(febPeriod.fohTarget, 2.75);
  assert.equal(febPeriod.bohTarget, null);

  // 4. March: both blank
  const marPeriod = venue.periodDetailsRows.find(r => r.monthNum === 3);
  assert.equal(marPeriod.fohTarget, null);
  assert.equal(marPeriod.bohTarget, null);

  // 5. April: zero target preserved as 0, not null
  const aprPeriod = venue.periodDetailsRows.find(r => r.monthNum === 4);
  assert.equal(aprPeriod.fohTarget, 0.0);
  assert.equal(aprPeriod.bohTarget, 3.50);

  // 6. Actuals remain unavailable and gaps remain null
  assert.equal(venue.fohActualStr, 'Not available');
  assert.equal(venue.bohActualStr, 'Not available');
  for (const r of venue.periodDetailsRows) {
    assert.equal(r.fohResult, null);
    assert.equal(r.bohResult, null);
    assert.equal(r.fohGap, null);
    assert.equal(r.bohGap, null);
  }
});

test('Labor Goals - Region Normalization to Ungrouped', () => {
  const dbTargets = [
    // Venue 1: null region -> Ungrouped
    { venueId: 'v1', venueName: 'Venue 1', region: null, periodKey: '2027-01', fohTarget: 2.0 },
    // Venue 2: empty string -> Ungrouped
    { venueId: 'v2', venueName: 'Venue 2', region: '', periodKey: '2027-01', fohTarget: 2.0 },
    // Venue 3: whitespace-only -> Ungrouped
    { venueId: 'v3', venueName: 'Venue 3', region: '   ', periodKey: '2027-01', fohTarget: 2.0 },
    // Venue 4: explicit ungrouped -> Ungrouped
    { venueId: 'v4', venueName: 'Venue 4', region: 'ungrouped', periodKey: '2027-01', fohTarget: 2.0 },
    // Venue 5: legitimate region preserved
    { venueId: 'v5', venueName: 'Venue 5', region: 'Bay Area', periodKey: '2027-01', fohTarget: 2.0 },
  ];

  const venues = transformTargetsToVenuesData(dbTargets, 2027);
  assert.equal(venues.find(v => v.id === 'v1').region, 'Ungrouped');
  assert.equal(venues.find(v => v.id === 'v2').region, 'Ungrouped');
  assert.equal(venues.find(v => v.id === 'v3').region, 'Ungrouped');
  assert.equal(venues.find(v => v.id === 'v4').region, 'Ungrouped');
  assert.equal(venues.find(v => v.id === 'v5').region, 'Bay Area');
});

test('Labor Goals - Strict Month and Year Validation', () => {
  const dbTargets = [
    // Valid 2027-01
    { venueId: 'v1', venueName: 'Venue 1', periodKey: '2027-01', fohTarget: 2.50 },
    // Malformed month with trailing text: '01abc' -> must NOT become January
    { venueId: 'v1', venueName: 'Venue 1', periodKey: '2027-01abc', fohTarget: 9.99 },
    // Invalid month numbers (00, 13)
    { venueId: 'v1', venueName: 'Venue 1', periodKey: '2027-00', fohTarget: 9.99 },
    { venueId: 'v1', venueName: 'Venue 1', periodKey: '2027-13', fohTarget: 9.99 },
    // Wrong year (2026 when selected is 2027) -> must NOT map to 2027 month
    { venueId: 'v1', venueName: 'Venue 1', periodKey: '2026-02', fohTarget: 9.99 },
    // Valid 2027-02
    { venueId: 'v1', venueName: 'Venue 1', periodKey: '2027-02', fohTarget: 3.10 },
  ];

  const venues = transformTargetsToVenuesData(dbTargets, 2027);
  const v = venues[0];

  const jan = v.periodDetailsRows.find(r => r.monthNum === 1);
  const feb = v.periodDetailsRows.find(r => r.monthNum === 2);

  // January should remain 2.50, not overwritten by '2027-01abc'
  assert.equal(jan.fohTarget, 2.50);
  // February should be 3.10, not 2026-02's 9.99
  assert.equal(feb.fohTarget, 3.10);
});
