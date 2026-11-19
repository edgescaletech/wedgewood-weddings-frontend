export const predefinedRoles = ["Admin", "General Manager", "Venue Scheduler"];

export const emptyFilters = {
  query: "",
  role: "",
  status: "",
  venue: "",
  publish: false,
};

export function accountStatus(user) {
  if (user.archivedAt) return "Archived";
  if (user.isActive) return "Active";
  if (!user.workosId) return "Invited";
  return "Deactivated";
}

export function hasAllVenues(user) {
  return user.roles.some(
    (role) => role.scope === "global" && role.name === "Admin",
  );
}

// The API stores assignments per scope, so derive the displayed primary role.
export function primaryRoleAssignment(assignments) {
  return (
    assignments.find(({ scope }) => scope === "global") ??
    assignments.find(({ name }) => name === "General Manager") ??
    assignments[0]
  );
}

export function scopedRoles(user, venueId) {
  return user.roles.filter(
    (role) =>
      !venueId ||
      role.venueId === venueId ||
      (role.scope === "global" && role.name === "Admin"),
  );
}

export function groupRoleAssignments(assignments, roles, venues) {
  const groups = new Map();

  for (const assignment of assignments) {
    let group = groups.get(assignment.roleId);
    if (!group) {
      const role = roles.get(assignment.roleId);
      group = {
        id: assignment.roleId,
        name: role?.name ?? assignment.name ?? "Role",
        permissions: role?.permissions ?? [],
        venues: [],
      };
      groups.set(assignment.roleId, group);
    }

    group.venues.push(
      assignment.venueId
        ? (venues.get(assignment.venueId)?.name ?? assignment.venueId)
        : "All venues",
    );
  }

  return [...groups.values()];
}

export function rolePermissionSummary(permissions) {
  const permissionKeys = new Set(permissions ?? []);
  const summary = [];
  const permissionLabels = {
    "labor_goals.manage": "Manage labor goals",
    "roles.assign": "Assign roles",
    "roles.manage": "Manage role permissions",
    "roles.view": "View roles",
    "users.manage": "Manage users",
    "users.view": "View users",
    "venues.manage_access": "Manage venue access",
  };
  const knownKeys = new Set([
    ...Object.keys(permissionLabels),
    "schedules.view",
    "schedules.create",
    "schedules.edit",
    "schedules.approve",
    "schedules.publish",
    "schedules.cancel",
    "labor_goals.view",
  ]);

  if (permissionKeys.has("schedules.create") || permissionKeys.has("schedules.edit")) {
    summary.push("Edit draft schedules");
  } else if (permissionKeys.has("schedules.view")) {
    summary.push("View schedules");
  }

  const scheduleActions = [
    ["schedules.approve", "approve"],
    ["schedules.publish", "publish"],
    ["schedules.cancel", "cancel"],
  ]
    .filter(([key]) => permissionKeys.has(key))
    .map(([, label]) => label);
  if (scheduleActions.length) {
    summary.push(`${scheduleActions.join(", ")} schedules`);
  }

  if (permissionKeys.has("labor_goals.view")) {
    summary.push("View labor goals");
  }

  summary.push(
    ...[...permissionKeys]
      .filter((permission) => permissionLabels[permission])
      .map((permission) => permissionLabels[permission]),
  );

  const unlistedPermissions = [...permissionKeys].filter(
    (permission) => !knownKeys.has(permission),
  );
  summary.push(...unlistedPermissions);

  return summary.join("; ") || "No permissions configured";
}

function sameGrant(first, second) {
  return (
    first.roleId === second.roleId &&
    (first.venueId ?? null) === (second.venueId ?? null)
  );
}

export function assignmentChanges(original, draft) {
  return {
    added: draft.filter(
      (grant) => !original.some((role) => sameGrant(role, grant)),
    ),
    removed: original.filter(
      (role) => !draft.some((grant) => sameGrant(role, grant)),
    ),
  };
}

export async function saveUser(api, path, user, name, changes) {
  // A venue role change is atomic on the server. Independent additions and
  // removals still use the existing assignment endpoints.
  const removedByVenue = new Map(
    changes.removed
      .filter(({ venueId }) => venueId)
      .map((grant) => [grant.venueId, grant]),
  );
  const replaced = new Set();
  for (const grant of changes.added) {
    const previous = removedByVenue.get(grant.venueId);
    if (previous) {
      await api.request(`${path}/roles/${encodeURIComponent(previous.id)}`, {
        method: "PUT",
        body: { roleId: grant.roleId },
      });
      replaced.add(previous.id);
    } else {
      await api.request(`${path}/roles`, {
        method: "POST",
        body: { roleId: grant.roleId, venueId: grant.venueId ?? null },
      });
    }
  }
  for (const grant of changes.removed) {
    if (replaced.has(grant.id)) continue;
    await api.request(`${path}/roles/${encodeURIComponent(grant.id)}`, {
      method: "DELETE",
    });
  }
  if (name !== user.displayName) {
    await api.request(path, { method: "PATCH", body: { displayName: name } });
  }
}
