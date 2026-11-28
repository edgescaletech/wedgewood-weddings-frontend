import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { API_BASE_URL } from '../config.js';
import CreateRegionModal from '../components/Schedule/CreateRegionModal.jsx';
import './venues.css';


const apiBase = API_BASE_URL || '';
const VENUES_OVERVIEW_URL = `${apiBase}/api/admin/venues-overview`;
const REGIONS_URL = `${apiBase}/api/admin/regions`;
const VENUES_LIST_URL = `${apiBase}/api/venues`;

// Helper: formats Date object to YYYY-MM-DD
function formatDateISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Helper: returns Monday of the week containing the given date
function getMonday(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

export default function Venues() {
  // Keep the current Monday–Sunday planning week in every year.
  const [currentWeekDate, setCurrentWeekDate] = useState(() => getMonday(new Date()));

  const [selectedRegion, setSelectedRegion] = useState('All regions');
  const [searchQuery, setSearchQuery] = useState('');
  const [showRegionSettings, setShowRegionSettings] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [savingRegion, setSavingRegion] = useState(false);

  // Data states
  const [overviewData, setOverviewData] = useState(null);
  const [regions, setRegions] = useState([]);
  const [allVenues, setAllVenues] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const overviewRequest = useRef(null);

  const weekISO = useMemo(() => formatDateISO(currentWeekDate), [currentWeekDate]);

  // Load Regions list for pills and filter dropdown
  const fetchRegions = useCallback(async () => {
    try {
      const res = await fetch(REGIONS_URL, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        if (data.regions && Array.isArray(data.regions)) {
          setRegions(data.regions);
        }
      }
    } catch (err) {
      console.warn('Failed to load regions:', err);
    }
  }, []);

  // Load all venues for the modal
  const fetchAllVenues = useCallback(async () => {
    try {
      const res = await fetch(VENUES_LIST_URL, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        if (data.venues && Array.isArray(data.venues)) {
          setAllVenues(data.venues);
        }
      }
    } catch (err) {
      console.warn('Failed to load all venues:', err);
    }
  }, []);

  // Load overview table data
  const fetchOverview = useCallback(async () => {
    overviewRequest.current?.abort();
    const controller = new AbortController();
    overviewRequest.current = controller;
    const isCurrent = () => overviewRequest.current === controller && !controller.signal.aborted;
    setOverviewData(null);
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        week: weekISO,
      });
      if (selectedRegion && selectedRegion !== 'All regions') {
        params.set('region', selectedRegion);
      }
      if (searchQuery.trim()) {
        params.set('search', searchQuery.trim());
      }

      const res = await fetch(`${VENUES_OVERVIEW_URL}?${params.toString()}`, { credentials: 'include', signal: controller.signal });
      if (res.ok) {
        const data = await res.json();
        if (isCurrent()) setOverviewData(data);
      } else {
        const errText = await res.text();
        if (isCurrent()) setError(`Failed to load venues (${res.status}): ${errText}`);
      }
    } catch (err) {
      if (isCurrent()) setError(`Network error: ${err.message}`);
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, [weekISO, selectedRegion, searchQuery]);

  useEffect(() => {
    fetchRegions();
    fetchAllVenues();
  }, [fetchRegions, fetchAllVenues]);

  useEffect(() => {
    fetchOverview();
    return () => overviewRequest.current?.abort();
  }, [fetchOverview]);

  // Navigation handlers
  const handlePrevWeek = () => {
    setCurrentWeekDate(prev => {
      const next = new Date(prev);
      next.setDate(next.getDate() - 7);
      return next;
    });
  };

  const handleNextWeek = () => {
    setCurrentWeekDate(prev => {
      const next = new Date(prev);
      next.setDate(next.getDate() + 7);
      return next;
    });
  };

  // Region save handler
  const handleSaveRegion = async (regionName, venueIds) => {
    setSavingRegion(true);
    try {
      const res = await fetch(REGIONS_URL, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          regionName,
          venueIds,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP ${res.status}`);
      }

      // Refresh data
      await Promise.all([fetchRegions(), fetchAllVenues(), fetchOverview()]);
      setSelectedRegion(regionName);
    } finally {
      setSavingRegion(false);
    }
  };

  // Unique region options for dropdown
  const regionDropdownOptions = useMemo(() => {
    const list = ['All regions'];
    regions.forEach(r => {
      if (r.name && !list.includes(r.name)) {
        list.push(r.name);
      }
    });
    return list;
  }, [regions]);

  const venuesList = overviewData?.venues || [];
  const weekDatesLabel = overviewData?.weekDates || 'Selected week';
  const monthLabel = overviewData?.monthLabel || 'Current month';

  return (
    <div className="venues-page-body admin-goals-body">

      <main className="venues-container">
        {/* Top Page Row: Title on Left, Week Navigator on Right */}
        <div className="venues-top-row">
          <h1 className="venues-title">Venues</h1>

          <div className="week-nav-widget">
            <button
              type="button"
              className="btn-week-arrow"
              onClick={handlePrevWeek}
              aria-label="Previous week"
            >
              ‹
            </button>
            <div className="week-nav-center">
              <span className="week-nav-dates">{weekDatesLabel}</span>
              <span className="week-nav-sub">Planning week</span>
            </div>
            <button
              type="button"
              className="btn-week-arrow"
              onClick={handleNextWeek}
              aria-label="Next week"
            >
              ›
            </button>
          </div>
        </div>

        {/* Filter Card */}
        <section className="venues-filter-card">
          <div className="filter-group">
            <label htmlFor="region-filter-select">Region</label>
            <select
              id="region-filter-select"
              className="filter-select"
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
            >
              {regionDropdownOptions.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="venue-search-input">Venue name</label>
            <input
              id="venue-search-input"
              type="text"
              className="filter-input"
              placeholder="Search venue name"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </section>

        {/* Subheader info line */}
        <div className="venues-subhead-row">
          <span className="venues-count-text">
            {selectedRegion} · {venuesList.length} venue{venuesList.length !== 1 ? 's' : ''}
          </span>
          <span className="venues-explanation-text">
            Example schedules · Guests per planned labor hour
          </span>
        </div>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#991b1b', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>
            {error}
          </div>
        )}

        {/* Venues Table */}
        <div className="venues-table-wrapper">
          <table className="venues-table">
            <thead>
              <tr>
                <th rowSpan="2" style={{ verticalAlign: 'bottom', width: '220px' }}>Venue</th>
                <th colSpan="2" style={{ textAlign: 'center', borderRight: '1px solid #dbe6dc' }}>
                  Weekly Plan
                  <span className="th-group-dates">{weekDatesLabel}</span>
                </th>
                <th colSpan="2" style={{ textAlign: 'center', borderRight: '1px solid #dbe6dc' }}>
                  Monthly Plan
                  <span className="th-group-dates">{monthLabel}</span>
                </th>
                <th rowSpan="2" style={{ verticalAlign: 'bottom', textAlign: 'right', width: '180px' }}>
                  GM Workspace
                </th>
              </tr>
              <tr>
                <th className="th-subhead">FOH LE ⇕</th>
                <th className="th-subhead" style={{ borderRight: '1px solid #dbe6dc' }}>BOH LE ⇕</th>
                <th className="th-subhead">FOH LE ⇕</th>
                <th className="th-subhead" style={{ borderRight: '1px solid #dbe6dc' }}>BOH LE ⇕</th>
              </tr>
            </thead>
            <tbody>
              {loading && venuesList.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '36px', color: '#6b7280' }}>
                    Loading venues…
                  </td>
                </tr>
              ) : venuesList.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '36px', color: '#6b7280' }}>
                    No venues found matching the selected filters.
                  </td>
                </tr>
              ) : (
                venuesList.map(venue => {
                  const wp = venue.weeklyPlan;
                  const mp = venue.monthlyPlan;

                  return (
                    <tr key={venue.id}>
                      {/* Venue Name & Region */}
                      <td className="col-venue-cell">
                        <a
                          href={`/staffing?venueId=${venue.id}&week=${weekISO}`}
                          className="venue-name-link"
                          title="Open venue schedule"
                        >
                          {venue.name}
                        </a>
                        <span className="venue-region-sub">{venue.region || 'Ungrouped'}</span>
                      </td>

                      {/* Weekly Plan FOH */}
                      <td className="metric-cell">
                        <div className="metric-val-row">
                          <span className="metric-val">—</span>
                          <span className="metric-pending-badge" title="Pending ADP timecard actuals">Pending ADP</span>
                        </div>
                        <span className="metric-target-sub">
                          {wp.fohTarget != null ? (
                            <span className="target-available">Target {wp.fohTarget.toFixed(2)}</span>
                          ) : (
                            <span className="target-unavailable">Target unavailable</span>
                          )}
                        </span>
                      </td>

                      {/* Weekly Plan BOH */}
                      <td className="metric-cell" style={{ borderRight: '1px solid #f3f4f6' }}>
                        <div className="metric-val-row">
                          <span className="metric-val">—</span>
                          <span className="metric-pending-badge" title="Pending ADP timecard actuals">Pending ADP</span>
                        </div>
                        <span className="metric-target-sub">
                          {wp.bohTarget != null ? (
                            <span className="target-available">Target {wp.bohTarget.toFixed(2)}</span>
                          ) : (
                            <span className="target-unavailable">Target unavailable</span>
                          )}
                        </span>
                      </td>

                      {/* Monthly Plan FOH */}
                      <td className="metric-cell">
                        <div className="metric-val-row">
                          <span className="metric-val">—</span>
                          <span className="metric-pending-badge" title="Pending ADP timecard actuals">Pending ADP</span>
                        </div>
                        <span className="metric-target-sub">
                          {mp.fohTarget != null ? (
                            <span className="target-available">Target {mp.fohTarget.toFixed(2)}</span>
                          ) : (
                            <span className="target-unavailable">Target unavailable</span>
                          )}
                        </span>
                      </td>

                      {/* Monthly Plan BOH */}
                      <td className="metric-cell" style={{ borderRight: '1px solid #f3f4f6' }}>
                        <div className="metric-val-row">
                          <span className="metric-val">—</span>
                          <span className="metric-pending-badge" title="Pending ADP timecard actuals">Pending ADP</span>
                        </div>
                        <span className="metric-target-sub">
                          {mp.bohTarget != null ? (
                            <span className="target-available">Target {mp.bohTarget.toFixed(2)}</span>
                          ) : (
                            <span className="target-unavailable">Target unavailable</span>
                          )}
                        </span>
                      </td>

                      {/* GM Workspace Link */}
                      <td className="col-gm-cell">
                        <a
                          href={`/staffing?venueId=${venue.id}&week=${weekISO}`}
                          className="btn-open-workspace"
                        >
                          Open scheduling app
                        </a>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Manage Regions Toggle Link */}
        <div className="manage-regions-toggle-row">
          <button
            type="button"
            className="btn-manage-regions-link"
            onClick={() => setShowRegionSettings(!showRegionSettings)}
          >
            {showRegionSettings ? 'Hide region settings' : 'Manage regions'}
          </button>
        </div>

        {/* Collapsible Reporting Regions Section */}
        {showRegionSettings && (
          <section className="reporting-regions-drawer">
            <div className="regions-drawer-header">
              <h2 className="regions-drawer-title">Reporting regions</h2>
              <button
                type="button"
                className="btn-create-region"
                onClick={() => setIsModalOpen(true)}
              >
                Create region
              </button>
            </div>

            <div className="regions-pills-grid">
              {regions.map(r => {
                const isActive = (selectedRegion === r.name);
                return (
                  <button
                    key={r.name}
                    type="button"
                    className={`region-count-pill ${isActive ? 'active' : ''}`}
                    onClick={() => setSelectedRegion(r.name)}
                    title={`Filter by ${r.name}`}
                  >
                    {r.name} · {r.venueCount}
                  </button>
                );
              })}
            </div>
          </section>
        )}
      </main>

      {/* Create Region Modal */}
      <CreateRegionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        allVenues={allVenues}
        onSaveRegion={handleSaveRegion}
        saving={savingRegion}
      />
    </div>
  );
}
