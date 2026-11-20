import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  prefetchNextVenuePage,
  requestInvitation,
  userPath,
  usersPath,
  venuePageSize,
} from "./api.js";
import {
  accountStatus,
  assignmentChanges,
  groupRoleAssignments,
  primaryRoleAssignment,
  rolePermissionSummary,
  saveUser,
} from "./access-model.js";
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

function publishingVenues(assignments, roles, venues) {
  const publishingGrants = assignments.filter(({ roleId }) =>
    roles.get(roleId)?.permissions?.includes("schedules.publish"),
  );
  const global = publishingGrants.some(({ venueId }) => !venueId);
  const venueIds = global
    ? [...venues.keys()]
    : publishingGrants.map(({ venueId }) => venueId);
  const activeVenues = new Set(
    venueIds.filter((venueId) => venues.get(venueId)?.is_active === true),
  );
  return { global, activeVenues };
}

function PublishingImpact({ before, after, venues, inviting }) {
  const gained = [...after.activeVenues].filter(
    (id) => !before.activeVenues.has(id),
  );
  const lost = [...before.activeVenues].filter(
    (id) => !after.activeVenues.has(id),
  );
  const gainedEverywhere =
    after.global && !before.global && !before.activeVenues.size;
  const lostEverywhere =
    before.global && !after.global && !after.activeVenues.size;

  function describe(label, ids, allVenues) {
    if (allVenues) {
      return <p><b>{label}</b> all venues</p>;
    }
    if (!ids.length) return null;

    const names = ids
      .map((id) => venues.get(id)?.name ?? id)
      .sort((left, right) => left.localeCompare(right))
      .join(", ");
    if (ids.length <= 6) return <p><b>{label}</b> {names}</p>;

    return (
      <details>
        <summary><b>{label}</b> {ids.length} venues</summary>
        <p>{names}</p>
      </details>
    );
  }

  if (!gained.length && !lost.length && !gainedEverywhere && !lostEverywhere) {
    return null;
  }

  const gainLabel = inviting
    ? "Can publish after activation at"
    : "Gains publishing at";

  return (
    <section className="ux-change-list" aria-label="Publishing changes">
      {describe(gainLabel, gained, gainedEverywhere)}
      {describe("Loses publishing at", lost, lostEverywhere)}
    </section>
  );
}

// Render the same access summary when reviewing edits, invites, or reactivation.
function ReviewRoleGroups({ groups }) {
  if (!groups.length) return <p>No roles assigned.</p>;

  return (
    <div className="ux-review-roles">
      {groups.map((group) => {
        const isAdmin = group.name === "Admin";
        return (
          <section className="ux-access-group" key={group.id}>
            <h3>
              {isAdmin ? "Admin permissions" : group.name}
              {!isAdmin && <span> · {group.venues.length}</span>}
            </h3>
            <p>{rolePermissionSummary(group.permissions)}</p>
            {!isAdmin && (
              <ul>
                {[...group.venues].sort((a, b) => a.localeCompare(b)).map(
                  (venue, index) => <li key={index}>{venue}</li>,
                )}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}

function VenuePicker({
  loadVenuePage,
  venues,
  onVenuesLoaded,
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
        onVenuesLoaded(result.items);
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
  }, [
    loadVenuePage,
    onVenuesLoaded,
    search,
    page,
    selectedOnly,
    attempt,
    size,
  ]);

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
  const status = account && accountStatus(account);
  const deactivated = status === "Deactivated";
  const editable = inviting || (account.id !== ownId && !account.archivedAt);
  const canReactivate = deactivated && editable && canManage;
  const canEditName = editable && !deactivated && canManage;
  const canEditRoles = editable && !deactivated && canAssign;
  const canEditVenues = canEditRoles && canManageVenues;
  const [loadedVenues, setLoadedVenues] = useState(() => new Map());
  const rememberVenuePage = useCallback((pageVenues) => {
    setLoadedVenues((current) => {
      const next = new Map(current);
      pageVenues.forEach((venue) => next.set(venue.id, venue));
      return next;
    });
  }, []);
  const allVenues = useMemo(
    () => new Map([...venues, ...loadedVenues]),
    [venues, loadedVenues],
  );
  const scoped = [...roles.values()].filter((role) => role.scope === "venue");
  const adminRole = [...roles.values()].find(
    (role) => role.scope === "global" && role.name === "Admin",
  );
  const [primary, setPrimary] = useState(() => {
    return (
      primaryRoleAssignment(account?.roles ?? [])?.roleId ??
      (inviting && canEditVenues ? (scoped[0]?.id ?? "") : "")
    );
  });
  const [name, setName] = useState(account?.displayName ?? "");
  const [email, setEmail] = useState(account?.email ?? "");
  const [draft, setDraft] = useState(account?.roles ?? []);
  const [stage, setStage] = useState("edit");
  const [action, setAction] = useState("");
  const [confirmation, setConfirmation] = useState("");
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
  const hasVenueAssignment = draft.some((grant) => grant.venueId);
  const validInviteDetails =
    name.trim().length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const activationReview = stage === "action" && action === "activate";
  // Reactivation uses saved assignments, independent of anything in the draft.
  const reviewGrants = activationReview ? account.roles : draft;
  const reviewHasGlobal = reviewGrants.some(
    (grant) => grant.roleId === adminRole?.id,
  );
  const activationPrimary = primaryRoleAssignment(account?.roles ?? []);
  const roleGroups = groupRoleAssignments(reviewGrants, roles, allVenues);
  const venueCount = new Set(
    reviewGrants.map(({ venueId }) => venueId).filter(Boolean),
  ).size;
  const publishingBefore = publishingVenues(
    activationReview ? [] : (account?.roles ?? []),
    roles,
    allVenues,
  );
  const publishingAfter = publishingVenues(reviewGrants, roles, allVenues);
  const heading =
    stage === "action"
      ? activationReview
        ? "Confirm changes"
        : accountActions[action][0]
      : stage === "review"
        ? inviting
          ? "Confirm invitation"
          : "Confirm changes"
        : inviting
          ? "Invite user"
          : editable && (canEditName || canEditRoles)
            ? "Edit user"
            : deactivated
              ? "Deactivated account"
              : "User access";

  const discarding = confirmation === "discard";
  const confirmationTitle = discarding
    ? "Discard unsaved changes?"
    : "Clear venue assignments?";

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
  }, [stage, confirmation]);

  function close() {
    if (busy) return;
    if (confirmation) setConfirmation("");
    else if (dirty) setConfirmation("discard");
    else onClose();
  }

  function selectPrimaryRole(roleId) {
    const venueGrants = draft.filter(({ venueId }) => venueId);
    setPrimary(roleId);
    setDraft(
      roleId === adminRole?.id
        ? [{ roleId, venueId: null }]
        : venueGrants.map((grant) => ({ ...grant, roleId })),
    );
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
        const userName = account.displayName || account.email;
        onChange(
          {
            activate: `${userName}’s account is now active.`,
            deactivate: `Deactivated ${userName}’s account.`,
            archive: `Archived ${userName}’s account.`,
            resend: `Resent the invitation to ${userName}.`,
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
        onChange(`Sent an invitation to ${name.trim()}.`);
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
            primaryRoleAssignment(latest.roles)?.roleId ?? "",
          );
          setName(latest.displayName);
          setStage("edit");
          setError(
            "This account changed. Review its latest details before editing again.",
          );
          return;
        }
        await saveUser(api, path, account, name.trim(), changes);
        onChange(`Saved changes to ${name.trim()}’s account.`);
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
          {!confirmation &&
            ((stage !== "action" &&
              (canEditName || canEditRoles || canReactivate)) ||
              activationReview) && (
            <small>
              Step {stage === "review" || activationReview ? "2" : "1"} of 2
            </small>
          )}
          <h2 ref={titleRef} tabIndex={-1} id="user-dialog-title">
            {confirmation ? confirmationTitle : heading}
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
        {confirmation && (
          <p>
            {discarding
              ? "Your unsaved changes will be lost."
              : "Selecting Admin replaces the selected venue assignments with global access."}
          </p>
        )}
        {!confirmation && stage === "action" && (
          activationReview ? (
            <>
              <div className="ux-person">
                <h3>{account.displayName || account.email}</h3>
                <p>{account.email}</p>
              </div>
              <PublishingImpact
                before={publishingBefore}
                after={publishingAfter}
                venues={allVenues}
              />
              <dl className="ux-facts">
                <div>
                  <dt>Primary role</dt>
                  <dd>
                    {activationPrimary?.name ??
                      roles.get(activationPrimary?.roleId)?.name ??
                      "None assigned"}
                  </dd>
                </div>
                <div>
                  <dt>Venue access</dt>
                  <dd>
                    {reviewHasGlobal ? "All active venues" : `${venueCount} assigned`}
                  </dd>
                </div>
              </dl>
              <ReviewRoleGroups groups={roleGroups} />
              <p className="ux-impact">
                Reactivating this account restores access at active venues.
                Suspended venues remain unavailable until they reopen.
              </p>
            </>
          ) : (
            <>
              <h3>{account.displayName || account.email}</h3>
              <p>{accountActions[action][1]}</p>
            </>
          )
        )}
        {!confirmation && stage === "review" && (
          <>
            <div className="ux-person">
              <h3>{name.trim() || email}</h3>
              <p>{email}</p>
            </div>
            <PublishingImpact
              before={publishingBefore}
              after={publishingAfter}
              venues={allVenues}
              inviting={inviting || status === "Invited"}
            />
            <dl className="ux-facts">
              <div>
                <dt>Primary role</dt>
                <dd>{roles.get(primary)?.name ?? "None assigned"}</dd>
              </div>
              <div>
                <dt>Venue access</dt>
                <dd>{hasGlobal ? "All venues" : `${venueCount} assigned`}</dd>
              </div>
            </dl>
            <ReviewRoleGroups groups={roleGroups} />
            {!inviting &&
              (changes.added.length > 0 || changes.removed.length > 0) && (
                <section className="ux-change-list">
                  <h3>Changes to venue access</h3>
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
        {!confirmation && stage === "edit" && deactivated && (
          <div className="ux-person">
            <h3>{account.displayName || account.email}</h3>
            <p>{account.email}</p>
          </div>
        )}
        {stage === "edit" && !deactivated && (
          <form id="user-form" onSubmit={review} hidden={Boolean(confirmation)}>
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
                    if (
                      roleId === adminRole?.id &&
                      hasVenueAssignment
                    ) {
                      setConfirmation("clear-venues");
                      return;
                    }
                    selectPrimaryRole(roleId);
                  }}
                >
                  {!primary && <option value="" disabled>Select a role</option>}
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
                venues={allVenues}
                onVenuesLoaded={rememberVenuePage}
                scopedRoles={scoped}
                draft={draft}
                setDraft={setDraft}
                defaultRole={primary}
              />
            )}
          </form>
        )}
        {!confirmation && error && (
          <p className="ux-error" role="alert">
            {error}
          </p>
        )}
      </div>
      {confirmation ? (
        <footer>
          <div className="ux-secondary" />
          <button type="button" onClick={() => setConfirmation("")}>
            {discarding ? "Keep editing" : "Cancel"}
          </button>
          <button
            type="button"
            className="primary danger"
            onClick={() => {
              if (discarding) onClose();
              else {
                selectPrimaryRole(adminRole.id);
                setConfirmation("");
              }
            }}
          >
            {discarding ? "Discard changes" : "Clear venue assignments"}
          </button>
        </footer>
      ) : (
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
                      setAction("deactivate");
                      setStage("action");
                    }}
                  >
                    Deactivate user
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
                  className="quiet danger"
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
            canReactivate ? (
              <button
                type="button"
                className="primary"
                onClick={() => {
                  setError("");
                  setAction("activate");
                  setStage("action");
                }}
              >
                Reactivate user
              </button>
            ) : (canEditName || canEditRoles) && (
              <button
                type="submit"
                form="user-form"
                className="primary"
                disabled={
                  needsRefresh ||
                  (inviting &&
                    (!validInviteDetails ||
                      (!hasGlobal && !hasVenueAssignment))) ||
                  (!inviting && !dirty)
                }
              >
                Next
              </button>
            )
          ) : (
            <button
              type="button"
              className={
                stage === "action" && action === "archive"
                  ? "primary danger"
                  : "primary"
              }
              disabled={busy}
              onClick={submit}
            >
              {busy
                ? "Working…"
                : stage === "action"
                  ? activationReview
                    ? "Reactivate user"
                    : accountActions[action][0]
                  : inviting
                    ? "Create invitation"
                    : "Save changes"}
            </button>
          )}
        </footer>
      )}
    </dialog>
  );
}
