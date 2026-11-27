import React, { createContext, useCallback, useContext, useRef, useState, useEffect } from "react";
import { API_BASE_URL } from "../config.js";

import { hasVenuePermission, resolveIdentityPermissions } from "./identity-permissions.js";

const AuthContext = createContext({
  user: null,
  sessionStatus: "checking",
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
  const [sessionStatus, setSessionStatus] = useState("checking");
  const [access, setAccess] = useState(null);
  const [accessError, setAccessError] = useState(false);
  const [loading, setLoading] = useState(true);
  const identityID = useRef(null);
  const requestInFlight = useRef(false);
  const [accessRequest, setAccessRequest] = useState({ background: false });
  const reloadAccess = useCallback(({ background = false } = {}) => {
    if (background && requestInFlight.current) return;
    if (!background) {
      setAccess(null);
      setAccessError(false);
      setLoading(true);
      setSessionStatus(current => current === "unavailable" ? "checking" : current);
    }
    setAccessRequest({ background });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    requestInFlight.current = true;

    function redirectToLogin() {
      setUser(null);
      setAccess(null);
      setSessionStatus("redirecting");
      window.location.replace("/login");
    }

    async function loadIdentity() {
      let identityLoaded = false;
      try {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
          credentials: "include",
          cache: "no-store",
          signal: controller.signal,
        });

        if (controller.signal.aborted) return;
        if (response.status === 401 || response.status === 403) {
          redirectToLogin();
          return;
        }
        if (!response.ok) throw new Error("Identity unavailable");
        const identity = await response.json();
        if (controller.signal.aborted) return;
        const sameIdentity = identityID.current === identity.id;
        if (!sameIdentity) {
          setAccess(null);
          setLoading(true);
        }
        identityID.current = identity.id;
        identityLoaded = true;
        setUser(identity);
        setSessionStatus("authenticated");

        const accessResponse = await fetch(`${API_BASE_URL}/auth/access`, {
          credentials: "include",
          cache: "no-store",
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        if (accessResponse.status === 401 || accessResponse.status === 403) {
          redirectToLogin();
          return;
        }
        if (!accessResponse.ok) throw new Error("Access unavailable");
        const userAccess = await accessResponse.json();
        if (controller.signal.aborted) return;

        setAccessError(false);
        // Go returns permissions in a stable order. Retain the existing snapshot
        // when it matches so dependent views do not refetch their data.
        setAccess(previous => accessRequest.background && sameIdentity &&
          JSON.stringify(previous) === JSON.stringify(userAccess) ? previous : userAccess);
      } catch {
        if (!controller.signal.aborted) {
          setAccess(null);
          setAccessError(true);
          if (!identityLoaded) {
            setUser(null);
            setSessionStatus("unavailable");
          }
        }
      } finally {
        if (!controller.signal.aborted) {
          requestInFlight.current = false;
          setLoading(false);
        }
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
        sessionStatus,
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
