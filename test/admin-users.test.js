import assert from "node:assert/strict";
import { test } from "node:test";
import { adminPageForPath } from "../src/admin/navigation.js";
import {
  createAdminApi,
  createVenuePageLoader,
  directoryPage,
  invitationRetryKeys,
  loadUserPage,
  prefetchMoreVenuePages,
  prefetchNextVenuePage,
  requestInvitation,
} from "../src/admin/api.js";
import {
  accountStatus,
  assignmentChanges,
  emptyFilters,
  groupRoleAssignments,
  primaryRoleAssignment,
  rolePermissionSummary,
  saveUser,
} from "../src/admin/access-model.js";

test("direct links and history paths resolve to the same Admin tabs", () => {
  for (const path of ["/admin", "/admin/", "/admin/users", "/admin/users.html"]) {
    assert.equal(adminPageForPath(path), "users");
  }
  for (const path of ["/admin/labor-targets", "/admin/labor-targets/", "/admin/labor-targets.html"]) {
    assert.equal(adminPageForPath(path), "laborTargets");
  }
  assert.equal(adminPageForPath("/staffing"), null);
});

test("invitation review groups venues under each role and lists capabilities", () => {
  const groups = groupRoleAssignments(
    [
      { roleId: "manager", venueId: "venue-a" },
      { roleId: "scheduler", venueId: "venue-b" },
    ],
    new Map([
      ["manager", { name: "General Manager", permissions: ["schedules.publish"] }],
      ["scheduler", { name: "Venue Scheduler", permissions: ["schedules.edit"] }],
    ]),
    new Map([
      ["venue-a", { name: "Abbey Catering" }],
      ["venue-b", { name: "Alexander Homestead" }],
    ]),
  );

  assert.deepEqual(
    groups.map(({ name, venues }) => [name, venues]),
    [
      ["General Manager", ["Abbey Catering"]],
      ["Venue Scheduler", ["Alexander Homestead"]],
    ],
  );
  assert.equal(
    rolePermissionSummary(groups[0].permissions),
    "publish schedules",
  );
  assert.equal(
    rolePermissionSummary(["schedules.view", "schedules.edit"]),
    "Edit draft schedules",
  );
});

test("invitation and resend carry cookies and reuse the same UUID after 503", async () => {
  const calls = [];
  const api = createAdminApi("/backend", async (path, options) => {
    calls.push({ path, ...options });
    return new Response(null, { status: calls.length === 1 ? 503 : 204 });
  });
  const keys = new Map();
  const key = "123e4567-e89b-42d3-a456-426614174000";
  const nextKey = "123e4567-e89b-42d3-a456-426614174001";
  const body = {
    email: "user@example.test",
    displayName: "Test User",
    roles: [{ roleId: "scheduler", venueId: "venue-a" }],
  };
  await assert.rejects(
    requestInvitation(api, keys, "/api/admin/users", body, () => key),
    { status: 503 },
  );
  await requestInvitation(api, keys, "/api/admin/users", body, () =>
    assert.fail("retry created a new key"),
  );
  await requestInvitation(
    api,
    keys,
    "/api/admin/users/local-id/invitation/resend",
    undefined,
    () => nextKey,
  );
  assert.equal(calls[0].body, JSON.stringify(body));
  assert.equal(calls[0].headers["Content-Type"], "application/json");
  assert.equal(calls[1].headers["Idempotency-Key"], key);
  assert.equal(calls[2].headers["Idempotency-Key"], nextKey);
  assert.equal(
    calls[2].path,
    "/backend/api/admin/users/local-id/invitation/resend",
  );
  assert.ok(calls.every(({ credentials }) => credentials === "include"));
});

test("an interrupted invitation reuses its key after reload and reordered venue selection", async () => {
  const entries = new Map();
  const storage = () => ({
    getItem: (key) => entries.get(key),
    setItem: (key, value) => entries.set(key, value),
    removeItem: (key) => entries.delete(key),
  });
  const calls = [];
  const api = createAdminApi("", async (path, options) => {
    calls.push(options);
    return new Response(null, { status: calls.length === 1 ? 503 : 204 });
  });
  const body = {
    displayName: "Test User",
    email: "user@example.test",
    roles: [
      { roleId: "scheduler", venueId: "venue-b" },
      { roleId: "manager", venueId: "venue-a" },
    ],
  };
  const endpoint = "/api/admin/users";
  const key = "123e4567-e89b-42d3-a456-426614174000";
  const keys = invitationRetryKeys("admin-1", storage);
  await assert.rejects(requestInvitation(api, keys, endpoint, body, () => key));
  assert.deepEqual([...entries.values()], [key]);
  assert.match([...entries.keys()][0], /^wedgewood:admin-invitation:admin-1:[a-f0-9]{64}$/);
  await requestInvitation(
    api,
    invitationRetryKeys("admin-1", storage),
    endpoint,
    { ...body, roles: [...body.roles].reverse() },
    () => assert.fail("reload created a new operation"),
  );
  assert.equal(calls[1].body, calls[0].body);
  assert.equal(calls[1].headers["Idempotency-Key"], key);
  assert.equal(entries.size, 0);
});

test("confirmation derives the primary role from the final venue assignments", () => {
  const roles = new Map([
    ["manager", { name: "General Manager", scope: "venue" }],
    ["scheduler", { name: "Venue Scheduler", scope: "venue" }],
  ]);
  const scheduler = { roleId: "scheduler", venueId: "venue-a" };
  const manager = { roleId: "manager", venueId: "venue-b" };
  assert.equal(primaryRoleAssignment([scheduler], roles).name, "Venue Scheduler");
  assert.equal(primaryRoleAssignment([scheduler, manager], roles).name, "General Manager");
  assert.equal(primaryRoleAssignment([], roles), undefined);
});

test("venue role changes replace the assignment atomically and keep unrelated grants", async () => {
  const scheduler = { id: "old", roleId: "scheduler", venueId: "venue-a" };
  const otherVenue = { id: "keep", roleId: "scheduler", venueId: "venue-b" };
  const manager = { roleId: "manager", venueId: "venue-a" };
  const changes = assignmentChanges(
    [scheduler, otherVenue],
    [manager, otherVenue],
  );
  assert.deepEqual(changes, { added: [manager], removed: [scheduler] });
  const calls = [];
  await saveUser(
    { request: async (path, request) => calls.push([path, request]) },
    "/api/admin/users/id",
    { displayName: "Old" },
    "New",
    changes,
  );
  assert.deepEqual(calls, [
    [
      "/api/admin/users/id/roles/old",
      { method: "PUT", body: { roleId: "manager" } },
    ],
    ["/api/admin/users/id", { method: "PATCH", body: { displayName: "New" } }],
  ]);

  const failedCalls = [];
  await assert.rejects(
    saveUser(
      {
        request: async (path) => {
          failedCalls.push(path);
          throw Error("grant refused");
        },
      },
      "/api/admin/users/id",
      { displayName: "Old" },
      "New",
      changes,
    ),
    /grant refused/,
  );
  assert.deepEqual(failedCalls, ["/api/admin/users/id/roles/old"]);
});

test("account status distinguishes active, invited, and inactive", () => {
  assert.equal(accountStatus({ isActive: true }), "Active");
  assert.equal(accountStatus({ workosId: null }), "Invited");
  assert.equal(accountStatus({ workosId: "linked" }), "Deactivated");
});

test("directory requests only the filtered backend page", async () => {
  const calls = [];
  const payload = { items: [{ id: "one", roles: [] }], total: 33 };
  const api = createAdminApi("", async (path) => {
    calls.push(path);
    return Response.json(payload);
  });
  assert.deepEqual(
    await loadUserPage(api, 2, 25, {
      ...emptyFilters,
      query: " Jane ",
      status: "Active",
      role: "General Manager",
      venue: "venue-a",
      publish: true,
    }),
    payload,
  );
  assert.deepEqual(
    await directoryPage(api, "/api/admin/venues", 3, 6, {
      search: "oak",
      active: "true",
    }),
    payload,
  );
  assert.deepEqual(calls, [
    "/api/admin/users?view=directory&limit=25&offset=25&search=Jane&role=General+Manager&status=active&venueId=venue-a&canPublish=true",
    "/api/admin/venues?view=directory&limit=6&offset=12&search=oak&active=true",
  ]);
});

test("an older API array reports a directory error instead of an empty directory", async () => {
  const api = createAdminApi("", async () =>
    Response.json([{ id: "existing-user" }]),
  );
  await assert.rejects(
    loadUserPage(api, 1, 25, emptyFilters),
    /did not return a directory page/,
  );
});

test("venue preload shares page one and fetches pages two and three on open", async () => {
  const calls = [];
  const api = createAdminApi("", async (path) => {
    const params = new URL(path, "http://localhost").searchParams;
    calls.push([params.get("offset"), params.get("search")]);
    return Response.json({ items: [], total: 24 });
  });
  const loadVenuePage = createVenuePageLoader(api);
  const preload = loadVenuePage(1);
  assert.deepEqual(calls, [["0", null]]);
  const onOpen = prefetchMoreVenuePages(loadVenuePage);
  assert.equal(loadVenuePage(1), preload);
  await onOpen;
  await loadVenuePage(2);
  await loadVenuePage(1, "forest");
  assert.deepEqual(calls, [
    ["0", null],
    ["6", null],
    ["12", null],
    ["0", "forest"],
  ]);
});

test("venue preload retries failures and skips pages beyond the total", async () => {
  const offsets = [];
  const api = createAdminApi("", async (path) => {
    offsets.push(new URL(path, "http://localhost").searchParams.get("offset"));
    if (offsets.length === 1) return new Response(null, { status: 503 });
    return Response.json({ items: [], total: 7 });
  });
  const loadVenuePage = createVenuePageLoader(api);
  await assert.rejects(loadVenuePage(1), { status: 503 });
  await prefetchMoreVenuePages(loadVenuePage);
  assert.deepEqual(offsets, ["0", "0", "6"]);
});

test("venue picker keeps preloading the next page for the current search", async () => {
  const requests = [];
  const api = createAdminApi("", async (path) => {
    const params = new URL(path, "http://localhost").searchParams;
    requests.push([params.get("offset"), params.get("search")]);
    return Response.json({ items: [], total: 36 });
  });
  const loadVenuePage = createVenuePageLoader(api);
  for (const page of [3, 4, 5, 6]) {
    const { total } = await loadVenuePage(page, "oak");
    await prefetchNextVenuePage(loadVenuePage, page, total, "oak");
  }
  assert.deepEqual(requests, [
    ["12", "oak"],
    ["18", "oak"],
    ["24", "oak"],
    ["30", "oak"],
  ]);
});

test("venue paging and preloading keep region filters in separate caches", async () => {
  const requests = [];
  const api = createAdminApi("", async (path) => {
    const params = new URL(path, "http://localhost").searchParams;
    requests.push([params.get("offset"), params.get("search"), params.get("region")]);
    return Response.json({ items: [], total: 12, regions: ["Bay Area", "Southern California"] });
  });
  const loadVenuePage = createVenuePageLoader(api);
  const { regions, total } = await loadVenuePage(1, "oak", "Bay Area");
  await prefetchNextVenuePage(loadVenuePage, 1, total, "oak", "Bay Area");
  await loadVenuePage(1, "oak", "Southern California");
  await loadVenuePage(1, "oak", "Bay Area");
  assert.deepEqual(regions, ["Bay Area", "Southern California"]);
  assert.deepEqual(requests, [
    ["0", "oak", "Bay Area"],
    ["6", "oak", "Bay Area"],
    ["0", "oak", "Southern California"],
  ]);
});
