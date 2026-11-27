// A role and its permissions must come from the authenticated identity response.
export function resolveIdentityPermissions(identity) {
  const role = typeof identity?.role === 'string' ? identity.role.trim() : '';
  const permissions = Object.create(null);
  if (role && Array.isArray(identity.permissions)) {
    for (const permission of identity.permissions) {
      if (typeof permission === 'string') permissions[permission] = true;
    }
  }
  return { role, permissions };
}

export function hasAdminDashboardAccess(access) {
  return (
    access?.global?.roles?.includes("Admin") === true &&
    access?.global?.permissions?.includes("users.view") === true
  );
}

export function hasLaborTargetsAccess(access) {
  return access?.global?.permissions?.includes("labor_goals.manage") === true;
}

export function hasVenuePermission(access, venueId, permission) {
  if (!venueId || !permission) return false;
  const venue = access?.venues?.[venueId];
  if (!venue) return false;
  return venue.permissions?.includes(permission) === true ||
    access.global?.permissions?.includes(permission) === true;
}
