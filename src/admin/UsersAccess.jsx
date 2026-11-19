import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { API_BASE_URL } from "../config.js";
import {
  createAdminApi,
  createVenuePageLoader,
  loadUserPage,
  prefetchMoreVenuePages,
  userPath,
} from "./api.js";
import {
  accountStatus,
  emptyFilters,
  hasAllVenues,
  predefinedRoles,
  scopedRoles,
} from "./access-model.js";
import Pager from "./Pager.jsx";
import UserDialog from "./UserDialog.jsx";
import "./users-access.css";

const api = createAdminApi(API_BASE_URL);
const pageSize = 25;

export default function UsersAccess() {
  const { user, access, accessError, loading } = useAuth();
  const globalPermissions = access?.global?.permissions ?? [];
  const globalRoles = access?.global?.roles ?? [];
  const identitySubtitle = globalRoles.includes("Admin")
    ? ["Regional Manager", ...globalRoles].join(" · ")
    : globalRoles.join(", ");
  const canView = globalPermissions.includes("users.view");
  const canManage = globalPermissions.includes("users.manage");
  const canReadRoles = globalPermissions.includes("roles.view");
  const canManageVenues = globalPermissions.includes("venues.manage_access");
  const canAssign = globalPermissions.includes("roles.assign") && canReadRoles;
  const [directory, setDirectory] = useState(null);
  const [userPage, setUserPage] = useState(null);
  const [pageError, setPageError] = useState("");
  const [loadingPage, setLoadingPage] = useState(false);
  const [directoryError, setDirectoryError] = useState("");
  const [revision, setRevision] = useState(0);
  const [filters, setFilters] = useState(emptyFilters);
  const [page, setPage] = useState(1);
  const [editor, setEditor] = useState(null);
  const [notice, setNotice] = useState("");
  const [toast, setToast] = useState("");
  const [invitationKeys] = useState(() => new Map());

  useEffect(() => {
    if (!toast) return undefined;

    const timeout = window.setTimeout(() => setToast(""), 6500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const loadVenuePage = useMemo(() => createVenuePageLoader(api), [user?.id]);
  const canBrowseVenues = canView && canAssign && canManageVenues;

  useEffect(() => {
    if (canBrowseVenues) loadVenuePage(1).catch(() => {});
  }, [canBrowseVenues, loadVenuePage]);

  useEffect(() => {
    if (!canView || !user?.id) return;
    const controller = new AbortController();
    const { signal } = controller;
    setDirectoryError("");
    Promise.all([
      api.request(userPath(user.id), { signal }),
      api.request("/api/me/venues", { signal }),
      canManageVenues ? api.list("/api/admin/venues", signal) : [],
      canReadRoles ? api.request("/api/admin/roles", { signal }) : [],
    ])
      .then(([identity, myVenues, adminVenues, roles]) => {
        if (signal.aborted) return;
        const allVenues = new Map(
          myVenues.map((venue) => [venue.id, { ...venue, is_active: true }]),
        );
        adminVenues.forEach((venue) => allVenues.set(venue.id, venue));
        const venues = [...allVenues.values()].sort((a, b) =>
          a.name.localeCompare(b.name),
        );
        setDirectory({
          displayName: identity.displayName,
          venues,
          roles: roles.filter((role) => predefinedRoles.includes(role.name)),
        });
      })
      .catch((error) => {
        if (!signal.aborted) {
          if (error.status === 403) {
            setDirectory(null);
            setEditor(null);
          }
          setDirectoryError(error.message || "Unable to load users.");
        }
      });
    return () => controller.abort();
  }, [canView, canManageVenues, canReadRoles, user?.id, revision]);

  const venues = useMemo(
    () => new Map(directory?.venues.map((venue) => [venue.id, venue])),
    [directory],
  );
  const roles = useMemo(
    () => new Map(directory?.roles.map((role) => [role.id, role])),
    [directory],
  );
  useEffect(() => {
    if (!canView) return;
    const controller = new AbortController();
    const { signal } = controller;
    setLoadingPage(true);
    setUserPage(null);
    setPageError("");
    // Wait briefly for typed searches and cancel responses for outdated filters.
    const timer = setTimeout(() => {
      loadUserPage(api, page, pageSize, filters, signal)
        .then((result) => {
          if (signal.aborted) return;
          const lastPage = Math.max(1, Math.ceil(result.total / pageSize));
          if (page > lastPage) setPage(lastPage);
          else setUserPage(result);
        })
        .catch((error) => {
          if (!signal.aborted) setPageError(error.message);
        })
        .finally(() => {
          if (!signal.aborted) setLoadingPage(false);
        });
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [canView, page, filters, revision]);

  const { items: visible = [], total = 0 } = userPage ?? {};
  const first = (page - 1) * pageSize;
  const roleLabel = filters.venue
    ? `Role at ${venues.get(filters.venue)?.name ?? filters.venue}`
    : "Role";

  function updateFilter(field, value) {
    setFilters((previous) => ({
      ...previous,
      [field]: value,
      ...(field === "venue" ? { publish: false } : {}),
    }));
    setPage(1);
  }

  function refresh(message, { toast: showToast = false } = {}) {
    if (message && showToast) setToast(message);
    else if (message) setNotice(message);
    setRevision((current) => current + 1);
  }

  function openEditor(event, account) {
    setNotice("");
    if (canBrowseVenues) prefetchMoreVenuePages(loadVenuePage).catch(() => {});
    setEditor({ account, trigger: event.currentTarget });
  }

  return (
    <div className="users-access">
      <header className="rm-shellbar">
        <a className="rm-brand" href="/staffing/">
          <span className="rm-monogram" aria-hidden="true">
            W
          </span>
          <span>
            Wedgewood <b>Scheduling</b>
          </span>
        </a>
        {canView && (
          <nav aria-label="App navigation">
            <a className="selected" aria-current="page" href="/admin/users">
              Users &amp; access
            </a>
          </nav>
        )}
        {user && (
          <div className="rm-identity">
            <strong>{directory?.displayName || user.email}</strong>
            {identitySubtitle && <span>{identitySubtitle}</span>}
          </div>
        )}
      </header>
      <main id="workspace" className="rm-page ux-page">
        <header className="rm-heading">
          <h1>Users &amp; access</h1>
          {canView && canManage && directory && (
            <button
              className="primary"
              onClick={(event) => openEditor(event, null)}
            >
              Invite user
            </button>
          )}
        </header>
        {notice && (
          <div className="ux-notice" role="status">
            {notice} <button onClick={() => setNotice("")}>Dismiss</button>
          </div>
        )}
        {loading && <p role="status">Checking access…</p>}
        {!loading && (accessError || !user) && (
          <p role="alert">
            Unable to check your access.{" "}
            <button onClick={() => window.location.reload()}>Try again</button>
          </p>
        )}
        {!loading && user && access && !canView && (
          <p role="alert">
            You do not have permission to view Users &amp; access.
          </p>
        )}
        {canView && !directory && !directoryError && (
          <p role="status">Loading users…</p>
        )}
        {canView && directoryError && (
          <p className="ux-error" role="alert">
            {directoryError}{" "}
            <button onClick={() => refresh()}>Try again</button>
          </p>
        )}
        {canView && directory && (
          <>
            <div className="ux-filters">
              <label>
                Search users
                <input
                  type="search"
                  placeholder="Name or email"
                  value={filters.query}
                  onChange={(event) =>
                    updateFilter("query", event.target.value)
                  }
                />
              </label>
              <label>
                {roleLabel}
                <select
                  value={filters.role}
                  onChange={(event) => updateFilter("role", event.target.value)}
                >
                  <option value="">All roles</option>
                  {predefinedRoles.map((role) => (
                    <option key={role}>{role}</option>
                  ))}
                </select>
              </label>
              <label>
                Status
                <select
                  value={filters.status}
                  onChange={(event) =>
                    updateFilter("status", event.target.value)
                  }
                >
                  <option value="">All statuses</option>
                  {["Active", "Invited", "Deactivated", "Archived"].map(
                    (status) => (
                      <option key={status}>{status}</option>
                    ),
                  )}
                </select>
              </label>
              <label>
                Venue
                <select
                  value={filters.venue}
                  onChange={(event) =>
                    updateFilter("venue", event.target.value)
                  }
                >
                  <option value="">All venues</option>
                  {directory.venues.map((venue) => (
                    <option key={venue.id} value={venue.id}>
                      {venue.name}
                    </option>
                  ))}
                </select>
              </label>
              {filters.venue && canReadRoles && (
                <label className="ux-publish-filter">
                  <input
                    type="checkbox"
                    checked={filters.publish}
                    onChange={(event) =>
                      updateFilter("publish", event.target.checked)
                    }
                  />{" "}
                  Can publish at this venue
                </label>
              )}
              {Object.values(filters).some(Boolean) && (
                <button
                  className="quiet"
                  onClick={() => {
                    setFilters(emptyFilters);
                    setPage(1);
                  }}
                >
                  Clear filters
                </button>
              )}
            </div>
            <div className="ux-table-head" aria-live="polite">
              <b>
                {total.toLocaleString()} {total === 1 ? "user" : "users"}
              </b>
              <span>
                {visible.length > 0 &&
                  `${first + 1}–${first + visible.length} shown`}
              </span>
            </div>
            <div className="ux-table-wrap">
              <table className="rm-table ux-users">
                <thead>
                  <tr>
                    <th scope="col">User</th>
                    <th scope="col">{roleLabel}</th>
                    <th scope="col">Venues</th>
                    <th scope="col">Status</th>
                    <th scope="col">
                      <span className="ux-sr-only">Action</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((account) => {
                    const status = accountStatus(account);
                    const names = [
                      ...new Set(
                        account.roles.flatMap(({ venueId }) =>
                          venueId ? [venues.get(venueId)?.name ?? venueId] : [],
                        ),
                      ),
                    ].sort();
                    const roleNames = [
                      ...new Set(
                        scopedRoles(account, filters.venue).map(
                          ({ name }) => name,
                        ),
                      ),
                    ];
                    const own = account.id === user.id;
                    const deactivated = status === "Deactivated";
                    const accountAction = deactivated ? "Reactivate user" : "Edit user";
                    const canOpenAccount = deactivated
                      ? canManage
                      : status !== "Archived" && (canManage || canAssign);
                    return (
                      <tr key={account.id}>
                        <td>
                          <b>{account.displayName || account.email}</b>
                          <small>{account.email}</small>
                        </td>
                        <td>
                          {roleNames.join(", ") || "None assigned"}
                          {filters.venue && canReadRoles && (
                            <small>
                              {account.canPublish
                                ? "Can publish"
                                : "Cannot publish"}
                            </small>
                          )}
                        </td>
                        <td>
                          {hasAllVenues(account)
                            ? "All venues"
                            : names.slice(0, 2).join(", ") ||
                              "None assigned"}{" "}
                          {!hasAllVenues(account) && names.length > 2 && (
                            <span className="ux-more">+{names.length - 2}</span>
                          )}
                        </td>
                        <td>
                          <span
                            className={`rm-badge ${status === "Active" ? "good" : "neutral"}`}
                          >
                            {status}
                          </span>
                        </td>
                        <td>
                          {own ? (
                            <small>Your account</small>
                          ) : canOpenAccount ? (
                            <button
                              aria-label={`${accountAction} ${account.displayName || account.email}`}
                              onClick={(event) => openEditor(event, account)}
                            >
                              {accountAction}
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                  {!visible.length && (
                    <tr className="ux-empty-row">
                      <td colSpan={5} className="ux-empty">
                        {loadingPage ? (
                          <span role="status">Loading users…</span>
                        ) : pageError ? (
                          <span role="alert">
                            {pageError}{" "}
                            <button onClick={() => refresh()}>Try again</button>
                          </span>
                        ) : Object.values(filters).some(Boolean) ? (
                          "No users match these filters."
                        ) : (
                          "No users yet."
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <Pager
              count={total}
              size={pageSize}
              page={page}
              onPage={setPage}
              label="User pages"
            />
          </>
        )}
        {editor && (
          <UserDialog
            api={api}
            loadVenuePage={loadVenuePage}
            editor={editor}
            ownId={user.id}
            venues={venues}
            roles={roles}
            canManage={canManage}
            canAssign={canAssign}
            canManageVenues={canManageVenues}
            invitationKeys={invitationKeys}
            onClose={() => setEditor(null)}
            onChange={refresh}
          />
        )}
      </main>
      {toast && (
        <div className="ux-toast" role="status" aria-live="polite">
          {toast}
        </div>
      )}
    </div>
  );
}
