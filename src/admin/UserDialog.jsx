import React, { useEffect, useRef, useState } from "react";
import {
  prefetchNextVenuePage,
  requestInvitation,
  userPath,
  usersPath,
  venuePageSize,
} from "./api.js";
import { accountStatus, assignmentChanges, saveUser } from "./access-model.js";
import Pager from "./Pager.jsx";

const accountActions = {
  activate: [
    "Activate user",
    "The user can sign in and use their assigned access.",
  ],
  deactivate: [
    "Deactivate user",
    "This ends the user’s current sessions. Their role assignments are retained.",
  ],
  archive: [
    "Archive user",
    "This ends the user’s sessions and prevents future activation.",
  ],
  resend: [
    "Resend invitation",
    "WorkOS will resend the pending invitation or replace it if it expired.",
  ],
};

function VenuePicker({
  loadVenuePage,
  venues,
  scopedRoles,
  draft,
  setDraft,
  defaultRole,
}) {
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [selectedOnly, setSelectedOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [venuePage, setVenuePage] = useState(null);
  const [venueError, setVenueError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const selected = new Set(draft.map(({ venueId }) => venueId).filter(Boolean));
  const selectedVenues = [...venues.values()].filter((venue) =>
    selected.has(venue.id),
  );
  const size = venuePageSize;

  useEffect(() => {
    if (query.trim() === search) return;
    const timer = setTimeout(() => {
      setSearch(query.trim());
      setPage(1);
    }, 200);
    return () => clearTimeout(timer);
  }, [query, search]);

  useEffect(() => {
    if (selectedOnly) return;
    let cancelled = false;
    setVenuePage(null);
    setVenueError("");
    loadVenuePage(page, search)
      .then((result) => {
        if (cancelled) return;
        const lastPage = Math.max(1, Math.ceil(result.total / size));
        if (page > lastPage) {
          setPage(lastPage);
          return;
        }
        setVenuePage(result);
        prefetchNextVenuePage(loadVenuePage, page, result.total, search);
      })
      .catch((error) => {
        if (!cancelled) setVenueError(error.message);
      });
    return () => {
      cancelled = true;
    };
  }, [loadVenuePage, search, page, selectedOnly, attempt, size]);

  const total = selectedOnly ? selectedVenues.length : (venuePage?.total ?? 0);
  const currentPage = selectedOnly
    ? Math.min(page, Math.max(1, Math.ceil(total / size)))
    : page;
  // The selected-only view is a list of unsaved changes in this dialog.
  const results = selectedOnly
    ? selectedVenues.slice((currentPage - 1) * size, currentPage * size)
    : (venuePage?.items ?? []);

  return (
    <section className="ux-picker">
      <div className="ux-section-title">
        <h3>Venue access</h3>
        <button
          type="button"
          className="ux-text-button"
          aria-pressed={selectedOnly}
          onClick={() => {
            setSelectedOnly(!selectedOnly);
            setPage(1);
          }}
        >
          {selectedOnly ? "Back to venue search" : "Show selected"} (
          {selected.size})
        </button>
      </div>
      {!selectedOnly && (
        <div className="ux-form-grid">
          <label>
            Find venues
            <input
              type="search"
              placeholder="Search venue name"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
        </div>
      )}
      {results.map((venue) => {
        const grants = draft.filter(({ venueId }) => venueId === venue.id);
        const currentRole = grants[0] ?? null;
        return (
          <div className="ux-pick-row" key={venue.id}>
            <label>
              <input
                type="checkbox"
                checked={grants.length > 0}
                disabled={
                  !grants.length && (!defaultRole || venue.is_active !== true)
                }
                onChange={(event) =>
                  setDraft(
                    event.target.checked
                      ? [...draft, { roleId: defaultRole, venueId: venue.id }]
                      : draft.filter(({ venueId }) => venueId !== venue.id),
                  )
                }
              />
              <span>
                {venue.name}
                {venue.is_active === false && <small>Suspended</small>}
              </span>
            </label>
            {grants.length > 0 && (
              <select
                aria-label={`Role at ${venue.name}`}
                value={currentRole?.roleId ?? ""}
                disabled={venue.is_active !== true}
                onChange={(event) =>
                  setDraft([
                    ...draft.filter(({ venueId }) => venueId !== venue.id),
                    { roleId: event.target.value, venueId: venue.id },
                  ])
                }
              >
                {currentRole &&
                  !scopedRoles.some(({ id }) => id === currentRole.roleId) && (
                    <option value={currentRole.roleId}>
                      {currentRole.name || "Assigned role"}
                    </option>
                  )}
                {scopedRoles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        );
      })}
      {!selectedOnly && venueError ? (
        <p className="ux-error" role="alert">
          {venueError}{" "}
          <button type="button" onClick={() => setAttempt(attempt + 1)}>
            Try again
          </button>
        </p>
      ) : !selectedOnly && !venuePage ? (
        <p className="ux-empty" role="status">
          Loading venues…
        </p>
      ) : (
        !results.length && <p className="ux-empty">No matching venues.</p>
      )}
      <Pager
        count={total}
        page={currentPage}
        size={size}
        onPage={setPage}
        label="Venue choices"
      />
    </section>
  );
}

export default function UserDialog({
  api,
  loadVenuePage,
  editor,
  ownId,
  venues,
  roles,
  canManage,
  canAssign,
  canManageVenues,
  invitationKeys,
  onClose,
  onChange,
}) {
  const [account, setAccount] = useState(editor.account);
  const inviting = !editor.account;
  const path = account ? userPath(account.id) : usersPath;
  const editable = inviting || (account.id !== ownId && !account.archivedAt);
  const canEditName = editable && canManage;
  const canEditRoles = editable && canAssign;
  const canEditVenues = canEditRoles && canManageVenues;
  const scoped = [...roles.values()].filter((role) => role.scope === "venue");
  const adminRole = [...roles.values()].find(
    (role) => role.scope === "global" && role.name === "Admin",
  );
  const [primary, setPrimary] = useState(() => {
    const globalRole = account?.roles.find((grant) => !grant.venueId)?.roleId;
    const venueRole = account?.roles.find((grant) => grant.venueId)?.roleId;
    return (
      globalRole ??
      venueRole ??
      (inviting && canEditVenues ? (scoped[0]?.id ?? "") : "")
    );
  });
  const [name, setName] = useState(account?.displayName ?? "");
  const [email, setEmail] = useState(account?.email ?? "");
  const [draft, setDraft] = useState(account?.roles ?? []);
  const [stage, setStage] = useState("edit");
  const [action, setAction] = useState("");
  const [busy, setBusy] = useState(false);
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const [error, setError] = useState("");
  const dialogRef = useRef(null);
  const titleRef = useRef(null);
  const changes = assignmentChanges(account?.roles ?? [], draft);
  const dirty =
    name !== (account?.displayName ?? "") ||
    email !== (account?.email ?? "") ||
    changes.added.length > 0 ||
    changes.removed.length > 0;
  const hasGlobal = draft.some((grant) => grant.roleId === adminRole?.id);
  const heading =
    stage === "action"
      ? accountActions[action][0]
      : stage === "review"
        ? inviting
          ? "Confirm invitation"
          : "Confirm changes"
        : inviting
          ? "Invite user"
          : editable && (canEditName || canEditRoles)
            ? "Edit user"
            : "User access";

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog.showModal();
    return () => {
      dialog.close();
      if (editor.trigger.isConnected) editor.trigger.focus();
    };
  }, [editor]);
  useEffect(() => {
    titleRef.current.focus();
  }, [stage]);

  function close() {
    if (!busy && (!dirty || window.confirm("Discard changes to this user?")))
      onClose();
  }

  function review(event) {
    event.preventDefault();
    if (canEditName && !name.trim()) {
      setError("Enter a name.");
      return;
    }
    if (
      inviting &&
      primary &&
      !hasGlobal &&
      !draft.some(({ venueId }) => venueId)
    ) {
      setError("Select at least one venue for the selected role.");
      return;
    }
    if (inviting && draft.length > 50) {
      setError("An invitation accepts up to 50 role assignments.");
      return;
    }
    setError("");
    setStage("review");
  }

  async function submit() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      if (stage === "action") {
        if (action === "resend")
          await requestInvitation(
            api,
            invitationKeys,
            `${path}/invitation/resend`,
          );
        else if (action === "archive")
          await api.request(path, { method: "DELETE" });
        else await api.request(`${path}/${action}`, { method: "POST" });
        onChange(
          {
            activate: "User activated.",
            deactivate: "User deactivated.",
            archive: "User archived.",
            resend: "Invitation sent.",
          }[action],
        );
      } else if (inviting) {
        await requestInvitation(api, invitationKeys, usersPath, {
          displayName: name.trim(),
          email: email.trim().toLowerCase(),
          roles: draft.map(({ roleId, venueId }) => ({
            roleId,
            venueId: venueId ?? null,
          })),
        });
        onChange(
          "Invitation sent. Activate the user after they accept and sign in.",
        );
      } else {
        const latest = await api.request(path);
        const difference = assignmentChanges(latest.roles, account.roles);
        if (
          difference.added.length ||
          difference.removed.length ||
          latest.displayName !== account.displayName ||
          latest.archivedAt !== account.archivedAt
        ) {
          setAccount(latest);
          setDraft(latest.roles);
          setPrimary(
            latest.roles.find((grant) => !grant.venueId)?.roleId ??
              latest.roles.find((grant) => grant.venueId)?.roleId ??
              "",
          );
          setName(latest.displayName);
          setStage("edit");
          setError(
            "This account changed. Review its latest details before editing again.",
          );
          return;
        }
        await saveUser(api, path, account, name.trim(), changes);
        onChange("User updated.");
      }
      onClose();
    } catch (failure) {
      let message = failure.message || "Could not complete the request.";
      if (stage === "review" && !inviting) {
        // A multi-write edit may be partially applied. Re-read before retrying
        // so retries only submit changes that are still missing.
        try {
          const current = await api.request(path);
          setAccount(current);
          const remaining = current.roles.filter(
            (grant) => !changes.removed.some(({ id }) => grant.id === id),
          );
          setDraft([
            ...remaining,
            ...assignmentChanges(remaining, changes.added).added,
          ]);
          if (name === account.displayName) setName(current.displayName);
        } catch {
          setNeedsRefresh(true);
          message +=
            " Close this dialog and reopen the user to load the latest state.";
        }
        onChange();
        message +=
          " Some changes may have been saved. Review the current assignments before retrying.";
        setStage("edit");
      } else if (
        (inviting || action === "resend") &&
        (!failure.status || failure.status === 503)
      ) {
        message += " Try again to retry the same invitation.";
      }
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  function grantLabel(grant) {
    const role = roles.get(grant.roleId)?.name ?? grant.name ?? "Role";
    return `${role} · ${grant.venueId ? (venues.get(grant.venueId)?.name ?? grant.venueId) : "Global"}`;
  }

  const status = account && accountStatus(account);
  return (
    <dialog
      ref={dialogRef}
      className="ux-dialog"
      aria-labelledby="user-dialog-title"
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
    >
      <header>
        <div>
          {stage !== "action" && (canEditName || canEditRoles) && (
            <small>Step {stage === "review" ? "2" : "1"} of 2</small>
          )}
          <h2 ref={titleRef} tabIndex={-1} id="user-dialog-title">
            {heading}
          </h2>
        </div>
        <button
          type="button"
          className="ux-close"
          aria-label="Close dialog"
          disabled={busy}
          onClick={close}
        >
          ×
        </button>
      </header>
      <div className="ux-dialog-body" aria-busy={busy}>
        {stage === "action" && (
          <>
            <h3>{account.displayName || account.email}</h3>
            <p>{accountActions[action][1]}</p>
          </>
        )}
        {stage === "review" && (
          <>
            <div className="ux-person">
              <h3>{name.trim() || email}</h3>
              <p>{email}</p>
            </div>
            {inviting && (
              <p className="ux-impact">
                WorkOS will email an invitation. The user must accept it, sign
                in, and be activated before gaining access.
              </p>
            )}
            <dl className="ux-facts">
              <div>
                <dt>Venue access</dt>
                <dd>
                  {hasGlobal
                    ? "All venues"
                    : `${new Set(draft.map(({ venueId }) => venueId).filter(Boolean)).size} assigned`}
                </dd>
              </div>
            </dl>
            <section className="ux-access-group">
              <h3>Assigned roles</h3>
              {draft.length ? (
                <ul>
                  {draft.map((grant) => {
                    const description = roles.get(grant.roleId)?.description;
                    return (
                      <li key={`${grant.roleId}:${grant.venueId}`}>
                        {grantLabel(grant)}
                        {description && <small>{description}</small>}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p>No roles assigned.</p>
              )}
            </section>
            {!inviting &&
              (changes.added.length > 0 || changes.removed.length > 0) && (
                <section className="ux-change-list">
                  <h3>Changes to access</h3>
                  {changes.added.map((grant) => (
                    <p key={`add:${grant.roleId}:${grant.venueId}`}>
                      <b>Add</b>
                      {grantLabel(grant)}
                    </p>
                  ))}
                  {changes.removed.map((grant) => (
                    <p key={grant.id}>
                      <b>Remove</b>
                      {grantLabel(grant)}
                    </p>
                  ))}
                </section>
              )}
          </>
        )}
        {stage === "edit" && (
          <form id="user-form" onSubmit={review}>
            <div className="ux-form-grid">
              <label>
                Name
                <input
                  type="text"
                  value={name}
                  maxLength={200}
                  required={canEditName}
                  disabled={!canEditName}
                  onChange={(event) => setName(event.target.value)}
                />
              </label>
              <label>
                Email
                <input
                  type="email"
                  value={email}
                  maxLength={254}
                  required={inviting}
                  disabled={!inviting}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>
            </div>
            {canEditRoles && (
              <label className="ux-primary-role">
                Primary role
                <select
                  value={primary}
                  onChange={(event) => {
                    const roleId = event.target.value;
                    const venueGrants = draft.filter(({ venueId }) => venueId);
                    if (
                      roleId === adminRole?.id &&
                      venueGrants.length > 0 &&
                      !window.confirm("Clear the selected venue assignments?")
                    )
                      return;
                    setPrimary(roleId);
                    if (roleId === adminRole?.id) {
                      setDraft([{ roleId, venueId: null }]);
                    } else if (!roleId) {
                      setDraft([]);
                    } else {
                      setDraft(
                        venueGrants.map((grant) => ({ ...grant, roleId })),
                      );
                    }
                  }}
                >
                  <option value="">No role</option>
                  {adminRole && (
                    <option value={adminRole.id}>{adminRole.name}</option>
                  )}
                  {canEditVenues &&
                    scoped.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                </select>
              </label>
            )}
            {hasGlobal && (
              <p className="ux-access-group">
                <strong>All venues</strong>
              </p>
            )}
            {canEditVenues && (!inviting || (primary && !hasGlobal)) && (
              <VenuePicker
                loadVenuePage={loadVenuePage}
                venues={venues}
                scopedRoles={scoped}
                draft={draft}
                setDraft={setDraft}
                defaultRole={primary}
              />
            )}
          </form>
        )}
        {error && (
          <p className="ux-error" role="alert">
            {error}
          </p>
        )}
      </div>
      <footer>
        <div className="ux-secondary">
          {stage === "edit" && !inviting && canEditName && (
            <>
              {status !== "Invited" && (
                <button
                  type="button"
                  className="quiet"
                  onClick={() => {
                    setError("");
                    setAction(account.isActive ? "deactivate" : "activate");
                    setStage("action");
                  }}
                >
                  {account.isActive ? "Deactivate user" : "Activate user"}
                </button>
              )}
              {status === "Invited" && (
                <button
                  type="button"
                  className="quiet"
                  onClick={() => {
                    setError("");
                    setAction("resend");
                    setStage("action");
                  }}
                >
                  Resend invitation
                </button>
              )}
              <button
                type="button"
                className="quiet"
                onClick={() => {
                  setError("");
                  setAction("archive");
                  setStage("action");
                }}
              >
                Archive user
              </button>
            </>
          )}
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={
            stage === "edit"
              ? close
              : () => {
                  setError("");
                  setStage("edit");
                }
          }
        >
          {stage === "edit"
            ? canEditName || canEditRoles
              ? "Cancel"
              : "Close"
            : "Back"}
        </button>
        {stage === "edit" ? (
          (canEditName || canEditRoles) && (
            <button
              type="submit"
              form="user-form"
              className="primary"
              disabled={needsRefresh || (!inviting && !dirty)}
            >
              Next
            </button>
          )
        ) : (
          <button
            type="button"
            className="primary"
            disabled={busy}
            onClick={submit}
          >
            {busy
              ? "Working…"
              : stage === "action"
                ? accountActions[action][0]
                : inviting
                  ? "Create invitation"
                  : "Save changes"}
          </button>
        )}
      </footer>
    </dialog>
  );
}
