import React, { useEffect, useState } from "react";
import { API_BASE_URL } from "../config.js";
import { useAuth } from "../context/AuthContext.jsx";
import { hasAdminDashboardAccess, hasLaborTargetsAccess } from "../context/identity-permissions.js";
import AdminHeader from "./AdminHeader.jsx";
import LaborTargets from "./LaborTargets.jsx";
import UsersAccess from "./UsersAccess.jsx";
import { createAdminApi, userPath } from "./api.js";
import { adminPageForPath } from "./navigation.js";

const api = createAdminApi(API_BASE_URL);

export default function AdminDashboard({ initialPage }) {
  const { user, access } = useAuth();
  const canViewUsers = hasAdminDashboardAccess(access);
  const canViewTargets = hasLaborTargetsAccess(access);
  const canReadProfile = access?.global?.permissions?.includes("users.view") === true;
  const [page, setPage] = useState(initialPage);
  const [visited, setVisited] = useState(() => new Set([initialPage]));
  const [identity, setIdentity] = useState(null);

  function showPage(next) {
    setPage(next);
    setVisited((previous) => previous.has(next) ? previous : new Set([...previous, next]));
  }

  useEffect(() => {
    function restorePage() {
      const next = adminPageForPath(window.location.pathname);
      if (next) showPage(next);
    }
    window.addEventListener("popstate", restorePage);
    return () => window.removeEventListener("popstate", restorePage);
  }, []);

  useEffect(() => {
    if (!user?.id || !canReadProfile) return undefined;
    const controller = new AbortController();
    api.request(userPath(user.id), { signal: controller.signal })
      .then((profile) => {
        if (!controller.signal.aborted) setIdentity({ id: user.id, name: profile.displayName });
      })
      .catch(() => {});
    return () => controller.abort();
  }, [user?.id, canReadProfile]);

  useEffect(() => {
    document.title = page === "laborTargets"
      ? "Wedgewood Weddings · Labor Efficiency Targets"
      : "Wedgewood Weddings · Users & Access";
  }, [page]);

  function navigate(event, next, path) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (next === page) return;
    window.history.pushState(null, "", path);
    showPage(next);
    window.scrollTo(0, 0);
  }

  return (
    <div className="users-access">
      <AdminHeader page={page} displayName={identity?.id === user?.id ? identity?.name : ""} onNavigate={navigate} />
      {canViewUsers && visited.has("users") && (
        <div hidden={page !== "users"}><UsersAccess /></div>
      )}
      {canViewTargets && visited.has("laborTargets") && (
        <div hidden={page !== "laborTargets"}><LaborTargets /></div>
      )}
      {((page === "users" && !canViewUsers) || (page === "laborTargets" && !canViewTargets)) && (
        <main className="ux-page"><p role="alert">You do not have access to this section.</p></main>
      )}
    </div>
  );
}
