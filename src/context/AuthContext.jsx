import React, { createContext, useContext, useState, useEffect } from 'react';
import { API_BASE_URL } from '../config.js';

// Default permissions for General Manager (GM) based on client role matrix
const GM_PERMISSIONS = {
  view_schedule: true,
  compare_labor_goals: true,
  edit_schedule: true,
  review_approval: true,
  publish_adp: true,
  send_adp_changes: true,
  manage_users: false, // Admin only
  update_labor_goals: false, // Admin only
};

const AuthContext = createContext({
  user: null,
  role: 'General manager (GM)',
  permissions: GM_PERMISSIONS,
  hasPermission: () => true,
  isRole: () => true,
  loading: true,
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState('General manager (GM)');
  const [permissions, setPermissions] = useState(GM_PERMISSIONS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadIdentity() {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
          credentials: 'include',
          cache: 'no-store',
        });

        if (response.status === 401 || response.status === 403) {
          setUser(null);
          return;
        }

        if (response.ok) {
          const data = await response.json();
          if (cancelled) return;
          setUser(data);

          // If role/permissions are returned by the backend, use them.
          // Otherwise fall back to General manager (GM) as per client specification.
          if (data.role && data.role.trim() !== '') {
            setRole(data.role);
            if (data.permissions && Array.isArray(data.permissions)) {
              const permMap = {};
              data.permissions.forEach(p => { permMap[p] = true; });
              setPermissions(permMap);
            }
          } else {
            // Default to General manager (GM)
            setRole('General manager (GM)');
            setPermissions(GM_PERMISSIONS);
          }
        }
      } catch (err) {
        console.warn('Unable to load user session, continuing with GM defaults:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadIdentity();
    return () => { cancelled = true; };
  }, []);

  const hasPermission = (permissionKey) => {
    return Boolean(permissions[permissionKey]);
  };

  const isRole = (roleName) => {
    return role.toLowerCase() === roleName.toLowerCase();
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
