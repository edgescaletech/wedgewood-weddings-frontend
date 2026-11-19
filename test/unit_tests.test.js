import test from "node:test";
import assert from "node:assert/strict";

import { resolveIdentityPermissions } from "../src/context/identity-permissions.js";

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getMondayFor(dateValue) {
  const date = dateValue ? new Date(`${dateValue}T12:00:00`) : new Date();
  if (Number.isNaN(date.getTime())) return dateKey(new Date());
  const day = date.getDay();
  date.setDate(date.getDate() - ((day + 6) % 7));
  return dateKey(date);
}

function formatWeekRange(weekStart) {
  if (!weekStart) return "";
  const start = new Date(`${weekStart}T12:00:00`);
  if (Number.isNaN(start.getTime())) return "";
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const startLabel = start.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const endLabel = end.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${startLabel} – ${endLabel}`;
}

test("Auth permissions are empty when the server supplies no role", () => {
  for (const identity of [
    null,
    { id: "123" },
    { role: "", permissions: ["publish_adp"] },
  ]) {
    const resolved = resolveIdentityPermissions(identity);
    assert.equal(resolved.role, "");
    assert.deepEqual(Object.keys(resolved.permissions), []);
    assert.equal(resolved.permissions.publish_adp, undefined);
  }
});

test("A role alone does not grant permissions", () => {
  const resolved = resolveIdentityPermissions({ role: "General Manager" });
  assert.deepEqual(Object.keys(resolved.permissions), []);
  assert.equal(resolved.permissions.toString, undefined);
});

test("Auth Role Matrix - custom server-provided Scheduler permissions", () => {
  const resolved = resolveIdentityPermissions({
    id: "456",
    role: "Venue scheduler",
    permissions: ["view_schedule", "compare_labor_goals", "edit_schedule"],
  });
  assert.equal(resolved.role, "Venue scheduler");
  assert.equal(resolved.permissions.view_schedule, true);
  assert.equal(Boolean(resolved.permissions.publish_adp), false);
  assert.equal(Boolean(resolved.permissions.review_approval), false);
});

test("Date Helpers - getMondayFor correctly snaps dates to Monday", () => {
  // Friday Nov 20, 2026 -> Monday Nov 16, 2026
  assert.equal(getMondayFor("2026-11-20"), "2026-11-16");
  // Sunday Nov 22, 2026 -> Monday Nov 16, 2026
  assert.equal(getMondayFor("2026-11-22"), "2026-11-16");
  // Monday Nov 16, 2026 -> Monday Nov 16, 2026
  assert.equal(getMondayFor("2026-11-16"), "2026-11-16");
});

test("Date Helpers - formatWeekRange displays start and end correctly", () => {
  assert.equal(formatWeekRange("2026-11-16"), "Nov 16 – Nov 22, 2026");
});
