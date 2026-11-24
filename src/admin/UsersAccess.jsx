import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { API_BASE_URL } from "../config.js";
import {
  createAdminApi,
  createVenuePageLoader,
  invitationRetryKeys,
  loadUserPage,
  prefetchMoreVenuePages,
} from "./api.js";
import {
  accountStatus,
  emptyFilters,
  hasAllVenues,
  predefinedRoles,
  primaryRoleAssignment,
  scopedRoles,
} from "./access-model.js";
import Pager from "./Pager.jsx";
import UserDialog from "./UserDialog.jsx";

const api = createAdminApi(API_BASE_URL);
const pageSize = 25;
const auditPageSize = 50;

const auditActionLabels = {
  "user.activate": "User activated",
  "user.deactivate": "User deactivated",
  "user.invite": "Invitation sent",
  "user.invite.resend": "Invitation resent",
  "user.invitation.accept": "Invitation accepted",
  "user.update": "User updated",
  "role.assign": "Role assigned",
  "role.remove": "Role removed",
  "role.permissions.update": "Role permissions updated",
};

function auditActionLabel(action) {
  return (
    auditActionLabels[action] ??
    action.replaceAll(".", " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
  );
}

function auditDetails(entry, venues) {
  const changedFields = entry.metadata?.fields;
  if (Array.isArray(changedFields) && changedFields.length > 0) {
    const fieldNames = changedFields.map((field) =>
      field === "displayName" ? "display name" : field,
    );
    return `Changed ${fieldNames.join(", ")}.`;
  }
  if (entry.resourceExternalId) {
    return (
      (entry.resourceType === "venue" &&
        venues.get(entry.resourceExternalId)?.name) ||
      entry.resourceExternalId
    );
  }
  return "";
}

const auditDateFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export default function UsersAccess() {
  const { user, access, accessError, loading } = useAuth();
  const globalPermissions = access?.global?.permissions ?? [];
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
  const [toast, setToast] = useState(null);
  const [auditPage, setAuditPage] = useState({ items: [], total: 0 });
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState("");
  const [auditRevision, setAuditRevision] = useState(0);
  const invitationKeys = useMemo(() => invitationRetryKeys(user?.id), [user?.id]);

  useEffect(() => {
    if (!toast) return undefined;

    const timeout = window.setTimeout(() => setToast(null), 6500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const loadVenuePage = useMemo(() => createVenuePageLoader(api), [user?.id]);
  const canBrowseVenues = canView && canAssign && canManageVenues;

  useEffect(() => {
    if (canBrowseVenues) loadVenuePage(1).catch(() => {});
  }, [canBrowseVenues, loadVenuePage]);

  useEffect(() => {
    if (!canManage) return undefined;

    const controller = new AbortController();
    setAuditLoading(true);
    setAuditError("");
    api
      .request(`/api/admin/audit?limit=${auditPageSize}&offset=0`, {
        signal: controller.signal,
      })
      .then((pageData) => setAuditPage(pageData))
      .catch((error) => {
        if (!controller.signal.aborted) setAuditError(error.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setAuditLoading(false);
      });

    return () => controller.abort();
  }, [canManage, auditRevision]);

  useEffect(() => {
    if (!canView || !user?.id) return;
    const controller = new AbortController();
    const { signal } = controller;
    setDirectoryError("");
    Promise.all([
      api.request("/api/me/venues", { signal }),
      canManageVenues ? api.list("/api/admin/venues", signal) : [],
      canReadRoles ? api.request("/api/admin/roles", { signal }) : [],
    ])
      .then(([myVenues, adminVenues, roles]) => {
        if (signal.aborted) return;
        const allVenues = new Map(
          myVenues.map((venue) => [venue.id, { ...venue, is_active: true }]),
        );
        adminVenues.forEach((venue) => allVenues.set(venue.id, venue));
        const venues = [...allVenues.values()].sort((a, b) =>
          a.name.localeCompare(b.name),
        );
        setDirectory({
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
    : "Primary role";

  function updateFilter(field, value) {
    setFilters((previous) => ({
      ...previous,
      [field]: value,
      ...(field === "venue" ? { publish: false } : {}),
    }));
    setPage(1);
  }

  function refresh(message) {
    if (message) setToast({ message });
    setRevision((current) => current + 1);
    setAuditRevision((current) => current + 1);
  }

  async function loadMoreAudit() {
    if (auditLoading || auditPage.items.length >= auditPage.total) return;
    setAuditLoading(true);
    setAuditError("");
    try {
      const nextPage = await api.request(
        `/api/admin/audit?limit=${auditPageSize}&offset=${auditPage.items.length}`,
      );
      setAuditPage((current) => ({
        ...nextPage,
        items: [...current.items, ...nextPage.items],
      }));
    } catch (error) {
      setAuditError(error.message);
    } finally {
      setAuditLoading(false);
    }
  }

  function openEditor(event, account) {
    if (canBrowseVenues) prefetchMoreVenuePages(loadVenuePage).catch(() => {});
    setEditor({ account, trigger: event.currentTarget });
  }

  return (
    <>
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
                  {["Active", "Invited", "Deactivated"].map(
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
                    const canOpenAccount = deactivated
                      ? canManage
                      : canManage || canAssign;
                    return (
                      <tr key={account.id}>
                        <td>
                          <b>{account.displayName || account.email}</b>
                          <small>{account.email}</small>
                        </td>
                        <td>
                          {(filters.venue
                            ? roleNames.join(", ")
                            : primaryRoleAssignment(account.roles)?.name) ||
                            "None assigned"}
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
                            <span className="ux-own-account">Your account</span>
                          ) : canOpenAccount ? (
                            <button
                              aria-label={`Edit user ${account.displayName || account.email}`}
                              onClick={(event) => openEditor(event, account)}
                            >
                              Edit user
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
        {canManage && (
          <details className="ux-audit">
            <summary>Account and target activity ({auditPage.total})</summary>
            {auditLoading && auditPage.items.length === 0 ? (
              <p role="status">Loading activity…</p>
            ) : auditError ? (
              <p role="alert">
                {auditError}{" "}
                <button onClick={() => setAuditRevision((value) => value + 1)}>
                  Try again
                </button>
              </p>
            ) : auditPage.items.length === 0 ? (
              <p>No administrative activity yet.</p>
            ) : (
              <>
                {auditPage.items.map((entry) => {
                  const detail = auditDetails(entry, venues);
                  const timestamp = new Date(entry.createdAt);
                  return (
                    <article className="ux-audit-entry" key={entry.id}>
                      <p>
                        <strong>{auditActionLabel(entry.action)}</strong>
                        {entry.targetName && ` · ${entry.targetName}`}
                        {detail && ` · ${detail}`}
                      </p>
                      <small>
                        {entry.actorName}
                        {!Number.isNaN(timestamp.getTime()) &&
                          ` · ${auditDateFormat.format(timestamp)}`}
                      </small>
                    </article>
                  );
                })}
                {auditPage.items.length < auditPage.total && (
                  <button
                    type="button"
                    disabled={auditLoading}
                    onClick={loadMoreAudit}
                  >
                    {auditLoading ? "Loading…" : "Load more activity"}
                  </button>
                )}
              </>
            )}
          </details>
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
          {toast.message}
        </div>
      )}
    </>
  );
}
