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
