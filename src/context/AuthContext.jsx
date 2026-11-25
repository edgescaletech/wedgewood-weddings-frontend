import React, { createContext, useCallback, useContext, useState, useEffect } from "react";
import { API_BASE_URL } from "../config.js";

import { hasVenuePermission, resolveIdentityPermissions } from "./identity-permissions.js";

const AuthContext = createContext({
  user: null,
  access: null,
  accessError: false,
  ...resolveIdentityPermissions(null),
  hasPermission: () => false,
  hasVenuePermission: () => false,
  reloadAccess: () => {},
  isRole: () => false,
  loading: true,
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [access, setAccess] = useState(null);
  const [accessError, setAccessError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [accessRevision, setAccessRevision] = useState(0);
  const reloadAccess = useCallback(() => {
    setUser(null);
    setAccess(null);
    setAccessError(false);
    setLoading(true);
    setAccessRevision(revision => revision + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadIdentity() {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
          credentials: "include",
          cache: "no-store",
          signal: controller.signal,
        });

        const identity = response.ok ? await response.json() : null;
        if (controller.signal.aborted) return;
        if (accessRevision > 0 && (response.status === 401 || response.status === 403)) {
          window.location.replace("/login");
          return;
        }
        setUser(identity);
        if (!identity) return;

        const accessResponse = await fetch(`${API_BASE_URL}/auth/access`, {
          credentials: "include",
          cache: "no-store",
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        if (accessResponse.status === 401 || accessResponse.status === 403) {
          window.location.replace("/login");
          return;
        }
        if (!accessResponse.ok) throw new Error("Access unavailable");
        const userAccess = await accessResponse.json();
        if (!controller.signal.aborted) setAccess(userAccess);
      } catch {
        if (!controller.signal.aborted) setAccessError(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadIdentity();
    return () => controller.abort();
  }, [accessRevision]);

  const { role, permissions } = resolveIdentityPermissions(user);

  const hasPermission = (permissionKey) => {
    return Boolean(permissions[permissionKey]);
  };

  const isRole = (roleName) => {
    return Boolean(role) && role.toLowerCase() === roleName.toLowerCase();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        access,
        accessError,
        role,
        permissions,
        hasPermission,
        hasVenuePermission: (venueId, permission) => hasVenuePermission(access, venueId, permission),
        reloadAccess,
        isRole,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
