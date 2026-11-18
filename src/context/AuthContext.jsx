import React, { createContext, useContext, useState, useEffect } from 'react';
import { API_BASE_URL } from '../config.js';

import { resolveIdentityPermissions } from './identity-permissions.js';

const AuthContext = createContext({
  user: null,
  ...resolveIdentityPermissions(null),
  hasPermission: () => false,
  isRole: () => false,
  loading: true,
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadIdentity() {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
          credentials: 'include',
          cache: 'no-store',
        });

        const identity = response.ok ? await response.json() : null;
        if (!cancelled) setUser(identity);
      } catch (err) {
        if (!cancelled) {
          setUser(null);
          console.warn('Unable to load user session:', err);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadIdentity();
    return () => { cancelled = true; };
  }, []);

  const { role, permissions } = resolveIdentityPermissions(user);

  const hasPermission = (permissionKey) => {
    return Boolean(permissions[permissionKey]);
  };

  const isRole = (roleName) => {
    return Boolean(role) && role.toLowerCase() === roleName.toLowerCase();
  };

  return (
    <AuthContext.Provider value={{ user, role, permissions, hasPermission, isRole, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
