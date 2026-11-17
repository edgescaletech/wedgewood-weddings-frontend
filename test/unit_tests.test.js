import test from 'node:test';
import assert from 'node:assert/strict';

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
