import React from 'react';

/**
 * Reusable top header for Wedgewood Admin / Regional Manager screens.
 * Used across Venues Overview and Labor Efficiency Targets.
 *
 * @param {string} activeTab - 'venues' | 'users' | 'labor_targets'
 * @param {React.ReactNode} [rightControls] - Optional elements rendered on the right side of the header.
 */
export default function AdminHeader({ activeTab = 'venues', rightControls = null }) {
  return (
    <header className="admin-header">
      <div className="admin-header-left">
        <div className="brand-wrapper">
          <div className="admin-brand-logo">W</div>
          <div className="brand-text-block">
            <span className="brand-title-main">Wedgewood</span>
            <span className="brand-sub-scheduling">Scheduling</span>
          </div>
        </div>

        <nav className="admin-nav-tabs">
          <a
            href="/venues"
            className={`admin-nav-item ${activeTab === 'venues' ? 'active' : ''}`}
          >
            Venues
          </a>
          <span
            className={`admin-nav-item ${activeTab === 'users' ? 'active' : ''}`}
            style={{ cursor: 'not-allowed', opacity: 0.7 }}
            title="Coming soon"
          >
            Users &amp; access
          </span>
          <a
            href="/admin-goals"
            className={`admin-nav-item ${activeTab === 'labor_targets' ? 'active' : ''}`}
          >
            Labor efficiency targets
          </a>
        </nav>
      </div>

      <div className="admin-header-right">
        {rightControls && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {rightControls}
          </div>
        )}
        <div className="user-profile-block">
          <div className="user-name">Dana Scully</div>
          <div className="user-role-label">Regional Manager · Admin</div>
        </div>
      </div>
    </header>
  );
}
