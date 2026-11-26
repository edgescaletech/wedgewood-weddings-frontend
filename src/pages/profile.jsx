import React, { useEffect, useRef, useState } from "react";
import { primaryRoleAssignment } from "../admin/access-model.js";
import LogoutDialog from "../components/LogoutDialog.jsx";
import { API_BASE_URL } from "../config.js";
import { useAuth } from "../context/AuthContext.jsx";
import "./profile.css";

function ProfileLogout() {
  const button = useRef(null);
  const dialog = useRef(null);

  return (
    <>
      <button
        ref={button}
        className="profile-action profile-action-logout"
        type="button"
        onClick={() => dialog.current.showModal()}
      >
        Log out
      </button>
      <LogoutDialog dialogRef={dialog} onClose={() => button.current?.focus()} />
    </>
  );
}

function RoleList({ roles, emptyLabel }) {
  if (!roles?.length) return <span>{emptyLabel}</span>;

  return (
    <ul className="profile-role-list">
      {roles.map(role => <li key={role}>{role}</li>)}
    </ul>
  );
}

function VenueList({ venues }) {
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const roles = [...new Set(venues.flatMap(venue => venue.roles ?? []))]
    .sort((first, second) => first.localeCompare(second));
  const terms = search.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const visibleVenues = venues.filter(venue => {
    const venueRoles = venue.roles ?? [];
    const searchableText = [venue.name, ...venueRoles].join(" ").toLocaleLowerCase();
    return (!role || venueRoles.includes(role)) &&
      terms.every(term => searchableText.includes(term));
  });

  return (
    <>
      <div className="profile-venue-filters">
        <label>
          Search venues or roles
          <input
            type="search"
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Venue name or role"
          />
        </label>
        <label>
          Filter by role
          <select value={role} onChange={event => setRole(event.target.value)}>
            <option value="">All roles</option>
            {roles.map(name => <option key={name}>{name}</option>)}
          </select>
        </label>
      </div>
      {visibleVenues.length === 0 ? (
        <div className="profile-venue-status">
          <p role="status">No venues match your filters.</p>
          <button className="profile-retry" type="button" onClick={() => {
            setSearch("");
            setRole("");
          }}>
            Clear filters
          </button>
        </div>
      ) : (
        <table>
          <thead><tr><th scope="col">Venue</th><th scope="col">Role</th></tr></thead>
          <tbody>
            {visibleVenues.map(venue => (
              <tr key={venue.id}>
                <th scope="row">{venue.name}</th>
                <td><RoleList roles={venue.roles} emptyLabel="No venue role" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

export default function Profile() {
  const { user, access, accessError, loading, reloadAccess } = useAuth();
  const [venueResult, setVenueResult] = useState(null);
  const currentResult = venueResult?.access === access ? venueResult : null;
  const globalRoles = access?.global?.roles ?? [];
  const scopedRoles = Object.values(access?.venues ?? {}).flatMap(venue => venue.roles ?? []);
  const primaryRole = primaryRoleAssignment([
    ...globalRoles.map(name => ({ name, scope: "global" })),
    ...scopedRoles.map(name => ({ name, scope: "venue" })),
  ])?.name;
  const hasGlobalVenueAccess = globalRoles.includes("Admin");
  const showVenueList = !hasGlobalVenueAccess || scopedRoles.length > 0;
  const displayName = user?.displayName?.trim();
  const initials = (displayName || user?.email || "")
    .split(/\s+/)
    .slice(0, 2)
    .map(part => Array.from(part)[0])
    .join("")
    .toLocaleUpperCase();

  useEffect(() => {
    if (!access || !showVenueList) return;
    const controller = new AbortController();

    async function loadVenues() {
      try {
        const response = await fetch(`${API_BASE_URL}/api/me/venues`, {
          credentials: "include",
          cache: "no-store",
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        if (response.status === 401 || response.status === 403) {
          window.location.replace("/login");
          return;
        }
        if (!response.ok) throw new Error("Venues unavailable");
        const venues = await response.json();
        if (!controller.signal.aborted) {
          setVenueResult({
            access,
            venues: venues.filter(({ id }) =>
              Object.hasOwn(access.venues, id) &&
              (!hasGlobalVenueAccess || access.venues[id].roles?.length > 0),
            ),
          });
        }
      } catch {
        if (!controller.signal.aborted) setVenueResult({ access, error: true });
      }
    }

    loadVenues();
    return () => controller.abort();
  }, [access, hasGlobalVenueAccess, showVenueList]);

  return (
    <div className="profile-shell">
      <header className="profile-header">
        <div className="profile-header-inner">
          <div className="profile-brand">
            <span className="brand-logo" aria-hidden="true">W</span>
            <span>Wedgewood Scheduling</span>
          </div>
          <a className="profile-action" href="/staffing/">
            <span aria-hidden="true">←</span> Back to Staffing
          </a>
        </div>
      </header>
      <main className="profile-page" aria-label="My profile">
        {accessError ? (
          <div className="profile-card" role="alert">
            <p>Couldn’t load your profile.</p>
            <button className="profile-retry" type="button" onClick={() => reloadAccess()}>
              Try again
            </button>
          </div>
        ) : loading || !user ? (
          <p role="status">Loading your profile…</p>
        ) : (
          <>
            <section className="profile-identity" aria-label="Your account">
              <div className="profile-person">
                <span className="profile-avatar" aria-hidden="true">{initials}</span>
                <div className="profile-person-details">
                  <h1>{displayName || "Name not set"}</h1>
                  <p>{user.email}</p>
                </div>
              </div>
              <dl className="profile-account-roles">
                <dt>Primary role</dt>
                <dd><RoleList roles={primaryRole ? [primaryRole] : []} emptyLabel="No roles assigned" /></dd>
              </dl>
            </section>
            <section className="profile-card profile-venues" aria-labelledby="profile-venues-heading">
              <h2 id="profile-venues-heading">Venue access</h2>
              {hasGlobalVenueAccess && (
                <div className="profile-global-access">
                  <strong>All venues</strong>
                  <p>Access through your global Admin role.</p>
                </div>
              )}
              {!showVenueList ? null : currentResult?.error ? (
                <div className="profile-venue-status" role="alert">
                  <p>Couldn’t load your venues.</p>
                  <button className="profile-retry" type="button" onClick={() => reloadAccess()}>
                    Try again
                  </button>
                </div>
              ) : !currentResult ? (
                <p className="profile-venue-status" role="status">Loading your venues…</p>
              ) : currentResult.venues.length === 0 ? (
                !hasGlobalVenueAccess && (
                  <p className="profile-venue-status">You don’t have access to any venues.</p>
                )
              ) : (
                <VenueList venues={currentResult.venues} />
              )}
            </section>
          </>
        )}
        <section className="profile-card profile-session" aria-labelledby="profile-session-heading">
          <h2 id="profile-session-heading">Session</h2>
          <ProfileLogout />
        </section>
      </main>
    </div>
  );
}
