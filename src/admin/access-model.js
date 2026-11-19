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
  return "Inactive";
}

export function hasAllVenues(user) {
  return user.roles.some(
    (role) => role.scope === "global" && role.name === "Admin",
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
