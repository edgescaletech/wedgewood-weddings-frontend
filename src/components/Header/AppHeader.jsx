import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import { hasAdminDashboardAccess, hasLaborTargetsAccess } from "../../context/identity-permissions.js";
import LogoutDialog from "../LogoutDialog.jsx";

export default function AppHeader({
  venues = [],
  currentVenue = null,
  onVenueChange,
  weekStart,
  weekRangeLabel,
  weekRangeMonth,
  onPrevWeek,
  onNextWeek,
  onThisWeek,
  onDateChange,
  isBeoView = false,
  onBackToSchedule,
}) {
  const { user, hasVenuePermission, access } = useAuth();
  const canPublishADP = hasVenuePermission(currentVenue?.id, "schedules.publish");
  const canViewGoals = hasVenuePermission(currentVenue?.id, "labor_goals.view");
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const moreMenuRef = useRef(null);
  const moreButtonRef = useRef(null);
  const logoutDialogRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target)) {
        setShowMoreMenu(false);
      }
    }
    if (showMoreMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showMoreMenu]);

  return (
    <header className="app-header">
      <div className="header-left">
        <div className="brand-logo" title="Wedgewood Scheduling">
          W
        </div>
        <div className="venue-picker-header">
          {venues.length > 1 ? (
            <select
              className="venue-select-dropdown"
              value={currentVenue?.id || ""}
              onChange={(e) => {
                const selected = venues.find((v) => v.id === e.target.value);
                if (selected && onVenueChange) onVenueChange(selected);
              }}
              aria-label="Select venue"
            >
              {!currentVenue && <option value="" disabled>Select venue</option>}
              {venues.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          ) : (
            <span className="venue-title" id="active-venue-name">
              {currentVenue?.name || venues[0]?.name || "Staffing"}
            </span>
          )}
          <span className="venue-sub">
            {currentVenue?.timezone
              ? `Schedule · ${currentVenue.timezone.replace("_", " ")}`
              : "Schedule · Central Time"}
          </span>
        </div>
        {isBeoView && (
          <button
            type="button"
            className="btn-header-back-schedule"
            onClick={onBackToSchedule}
          >
            ‹ Back to schedule
          </button>
        )}
      </div>

      {!isBeoView ? (
        <div className="week-controls-header" aria-label="Planning week controls">
          <button
            className="week-header-arrow"
            id="prev-week"
            onClick={onPrevWeek}
            aria-label="Previous week"
            type="button"
          >
            ‹
          </button>
          <label className="week-range-control" htmlFor="week-picker">
            <span className="week-range-label" id="week-range-label">
              {weekRangeLabel || 'Selected week'}
            </span>
            <span className="week-range-month" id="week-range-month">
              {weekRangeMonth}
            </span>
            <input
              type="date"
              id="week-picker"
              value={weekStart || ''}
              onChange={(e) => onDateChange && onDateChange(e.target.value)}
              aria-label="Choose a date to view its week"
            />
          </label>
          <button
            className="week-header-arrow"
            id="next-week"
            onClick={onNextWeek}
            aria-label="Next week"
            type="button"
          >
            ›
          </button>
          <button
            className="this-week-button"
            id="this-week-button"
            onClick={onThisWeek}
            type="button"
          >
            This week
          </button>
        </div>
      ) : (
        <div className="header-center-spacer" />
      )}

      <div className="header-right">
        <div className="simulation-tag">
          <span className="draft-saved-text" style={{ color: '#dc2626' }}>Draft saved</span>
          <span className="simulation-sub" style={{ color: '#dc2626' }}>{isBeoView ? 'Draft - not sent to ADP' : 'All shift changes sent (simulation)'}</span>
        </div>
        {!isBeoView && (
          <button
            className={`btn-adp-synced ${canPublishADP ? 'active' : 'disabled'}`}
            id="btn-publish-adp"
            type="button"
            disabled={!canPublishADP}
            title={canPublishADP ? 'Schedule synced to ADP' : 'Permission required to publish to ADP'}
          >
            <span className="check-icon" aria-hidden="true">✓</span> Schedule synced to ADP
          </button>
        )}
        <div className="more-menu-container" ref={moreMenuRef}>
          <button
            ref={moreButtonRef}
            className={`btn-more-options ${showMoreMenu ? "active" : ""}`}
            type="button"
            aria-label="More options"
            aria-expanded={showMoreMenu}
            onClick={() => setShowMoreMenu((prev) => !prev)}
          >
            More ···
          </button>
          {showMoreMenu && (
            <div className="more-dropdown-menu" role="menu">
              {hasAdminDashboardAccess(access) ? (
                <a href="/admin/users" className="more-menu-item" role="menuitem">
                  <span>Admin Dashboard</span>
                  <span className="menu-arrow">›</span>
                </a>
              ) : hasLaborTargetsAccess(access) ? (
                <a href="/admin/labor-targets" className="more-menu-item" role="menuitem">
                  <span>Labor efficiency targets</span>
                  <span className="menu-arrow">›</span>
                </a>
              ) : null}
              {canViewGoals && <a
                href={`/goals?venueId=${encodeURIComponent(currentVenue.id)}`}
                className="more-menu-item"
                role="menuitem"
                onClick={() => setShowMoreMenu(false)}
              >
                <span>Goals & budgets</span>
                <span className="menu-arrow">›</span>
              </a>}
              <button
                type="button"
                className="more-menu-item"
                role="menuitem"
                onClick={() => {
                  setShowMoreMenu(false);
                  alert(
                    "Help, history & sync (simulated prototype documentation)",
                  );
                }}
              >
                <span style={{ color: "#dc2626" }}>Help, history & sync</span>
                <span className="menu-arrow">›</span>
              </button>
              <button
                type="button"
                className="more-menu-item"
                role="menuitem"
                onClick={() => {
                  setShowMoreMenu(false);
                  alert("Prototype controls (simulated demo options)");
                }}
              >
                <span style={{ color: "#dc2626" }}>Prototype controls</span>
                <span className="menu-arrow">›</span>
              </button>
              <a href="/about/" className="more-menu-item" role="menuitem">
                <span className="menu-account-name">
                  {user?.displayName?.trim() || user?.email || "My profile"}
                </span>
                <span className="menu-arrow" aria-hidden="true">›</span>
              </a>
              <button
                type="button"
                className="more-menu-item"
                role="menuitem"
                onClick={() => {
                  setShowMoreMenu(false);
                  logoutDialogRef.current.showModal();
                }}
              >
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
      <LogoutDialog dialogRef={logoutDialogRef} onClose={() => moreButtonRef.current?.focus()} />
    </header>
  );
}
