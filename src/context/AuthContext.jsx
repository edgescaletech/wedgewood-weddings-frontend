import React, { createContext, useCallback, useContext, useRef, useState, useEffect } from "react";
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
  const identityID = useRef(null);
  const [accessRequest, setAccessRequest] = useState({ background: false });
  const reloadAccess = useCallback(({ background = false } = {}) => {
    if (!background) {
      setAccess(null);
      setAccessError(false);
      setLoading(true);
    }
    setAccessRequest({ background });
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

        if (controller.signal.aborted) return;
        if (response.status === 401 || response.status === 403) {
          setUser(null);
          setAccess(null);
          if (identityID.current !== null || accessRequest.background) {
            window.location.replace("/login");
          }
          return;
        }
        if (!response.ok) throw new Error("Identity unavailable");
        const identity = await response.json();
        if (controller.signal.aborted) return;
        if (identityID.current !== null && identityID.current !== identity.id) {
          setAccess(null);
          setLoading(true);
        }

        const accessResponse = await fetch(`${API_BASE_URL}/auth/access`, {
          credentials: "include",
          cache: "no-store",
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        if (accessResponse.status === 401 || accessResponse.status === 403) {
          setUser(null);
          setAccess(null);
          window.location.replace("/login");
          return;
        }
        if (!accessResponse.ok) throw new Error("Access unavailable");
        const userAccess = await accessResponse.json();
        if (controller.signal.aborted) return;

        const sameIdentity = identityID.current === identity.id;
        identityID.current = identity.id;
        setUser(identity);
        setAccessError(false);
        // Go returns permissions in a stable order. Retain the existing snapshot
        // when it matches so dependent views do not refetch their data.
        setAccess(previous => accessRequest.background && sameIdentity &&
          JSON.stringify(previous) === JSON.stringify(userAccess) ? previous : userAccess);
      } catch {
        if (!controller.signal.aborted) {
          setAccess(null);
          setAccessError(true);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadIdentity();
    return () => controller.abort();
  }, [accessRequest]);

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
