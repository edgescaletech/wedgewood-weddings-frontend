import React, { createContext, useContext, useState, useEffect } from "react";
import { API_BASE_URL } from "../config.js";

import { resolveIdentityPermissions } from "./identity-permissions.js";

const AuthContext = createContext({
  user: null,
  access: null,
  accessError: false,
  ...resolveIdentityPermissions(null),
  hasPermission: () => false,
  isRole: () => false,
  loading: true,
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [access, setAccess] = useState(null);
  const [accessError, setAccessError] = useState(false);
  const [loading, setLoading] = useState(true);

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
        setUser(identity);
        if (!identity) return;

        const accessResponse = await fetch(`${API_BASE_URL}/auth/access`, {
          credentials: "include",
          cache: "no-store",
          signal: controller.signal,
        });
        if (accessResponse.status === 401) {
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
  }, []);

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
