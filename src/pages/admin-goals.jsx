import React, { useState, useRef } from 'react';
import { API_BASE_URL } from '../config.js';
import styles from './admin-goals.css?inline';

export { styles };

const apiBase = API_BASE_URL || '';
const LABOR_TARGETS_URL = `${apiBase}/api/admin/labor-goals/upload`;
const ACCOUNTING_PERIODS_URL = `${apiBase}/api/admin/accounting-periods/upload`;


// Sample template CSV for Wedgewood venues
const CSV_TEMPLATE = `Venue,Month,Basis,FOH guests per labor hour,BOH guests per labor hour
Boulder Ridge,2027-01,2027 forecast,2.23,3.51
Boulder Ridge,2027-02,2027 forecast,2.22,3.69
Carmel Fields,2027-01,2027 forecast,2.33,4.04
Eagle Ridge,2027-01,2027 forecast,2.69,4.33
Clayton House,2027-01,2027 forecast,2.50,3.82
Galway Downs,2027-01,2027 forecast,2.15,3.76
Fallbrook Estate,2027-01,2027 forecast,2.44,5.83`;

// Sample template CSV for Wedgewood 4-4-5 Accounting Periods
const ACCOUNTING_PERIODS_TEMPLATE = `Year,Period Number,Period Key,Month Name,Start Date,End Date,Weeks Count,Days Count
2026,1,2026-01,January,2026-01-01,2026-02-01,5,32
2026,2,2026-02,February,2026-02-02,2026-03-01,4,28
2026,3,2026-03,March,2026-03-02,2026-04-05,5,35
2026,4,2026-04,April,2026-04-06,2026-05-03,4,28
2026,5,2026-05,May,2026-05-04,2026-05-31,4,28
2026,6,2026-06,June,2026-06-01,2026-07-05,5,35
2026,7,2026-07,July,2026-07-06,2026-08-02,4,28
2026,8,2026-08,August,2026-08-03,2026-08-30,4,28
2026,9,2026-09,September,2026-08-31,2026-10-04,5,35
2026,10,2026-10,October,2026-10-05,2026-11-01,4,28
2026,11,2026-11,November,2026-11-02,2026-11-29,4,28
2026,12,2026-12,December,2026-11-30,2026-12-31,5,32`;


const INITIAL_VENUES_DATA = [
  {
    id: 'boulder-ridge',
    name: 'Boulder Ridge',
    region: 'CA Bay Area',
    asOf: 'Oct 2026 · Example',
    foh: {
      actual: 3.04,
      target: 2.94,
      diff: '+0.10 above target',
      isAbove: true,
      weeks: [
        { label: 'Oct 19', actual: 2.65, target: 2.94 },
        { label: 'Oct 26', actual: 2.82, target: 2.94 },
        { label: 'Nov 2', actual: 3.12, target: 2.94 },
        { label: 'Nov 9', actual: 3.45, target: 2.94 },
      ]
    },
    boh: {
      actual: 3.92,
      target: 4.03,
      diff: '0.11 below target',
      isAbove: false,
      weeks: [
        { label: 'Oct 19', actual: 4.52, target: 4.03 },
        { label: 'Oct 26', actual: 3.65, target: 4.03 },
        { label: 'Nov 2', actual: 3.60, target: 4.03 },
        { label: 'Nov 9', actual: 4.95, target: 4.03 },
      ]
    }
  },
  {
    id: 'carmel-fields',
    name: 'Carmel Fields',
    region: 'CA Bay Area',
    asOf: 'Oct 2026 · Example',
    foh: {
      actual: 2.44,
      target: 2.39,
      diff: '+0.05 above target',
      isAbove: true,
      weeks: [
        { label: 'Oct 19', actual: 2.30, target: 2.39 },
        { label: 'Oct 26', actual: 2.35, target: 2.39 },
        { label: 'Nov 2', actual: 2.48, target: 2.39 },
        { label: 'Nov 9', actual: 2.55, target: 2.39 },
      ]
    },
    boh: {
      actual: 4.55,
      target: 4.40,
      diff: '+0.15 above target',
      isAbove: true,
      weeks: [
        { label: 'Oct 19', actual: 4.20, target: 4.40 },
        { label: 'Oct 26', actual: 4.38, target: 4.40 },
        { label: 'Nov 2', actual: 4.62, target: 4.40 },
        { label: 'Nov 9', actual: 4.70, target: 4.40 },
      ]
    }
  },
  {
    id: 'eagle-ridge',
    name: 'Eagle Ridge',
    region: 'CA Bay Area',
    asOf: 'Oct 2026 · Example',
    foh: {
      actual: 2.89,
      target: 2.87,
      diff: '+0.02 above target',
      isAbove: true,
      weeks: [
        { label: 'Oct 19', actual: 2.75, target: 2.87 },
        { label: 'Oct 26', actual: 2.80, target: 2.87 },
        { label: 'Nov 2', actual: 2.92, target: 2.87 },
        { label: 'Nov 9', actual: 3.01, target: 2.87 },
      ]
    },
    boh: {
      actual: 5.16,
      target: 5.26,
      diff: '0.10 below target',
      isAbove: false,
      weeks: [
        { label: 'Oct 19', actual: 5.35, target: 5.26 },
        { label: 'Oct 26', actual: 5.10, target: 5.26 },
        { label: 'Nov 2', actual: 5.05, target: 5.26 },
        { label: 'Nov 9', actual: 5.18, target: 5.26 },
      ]
    }
  },
  {
    id: 'clayton-house',
    name: 'Clayton House',
    region: 'Arizona',
    asOf: 'Oct 2026 · Example',
    foh: {
      actual: 2.29,
      target: 2.50,
      diff: '0.21 below target',
      isAbove: false,
      weeks: [
        { label: 'Oct 19', actual: 2.10, target: 2.50 },
        { label: 'Oct 26', actual: 2.20, target: 2.50 },
        { label: 'Nov 2', actual: 2.35, target: 2.50 },
        { label: 'Nov 9', actual: 2.42, target: 2.50 },
      ]
    },
    boh: {
      actual: 4.05,
      target: 4.29,
      diff: '0.24 below target',
      isAbove: false,
      weeks: [
        { label: 'Oct 19', actual: 3.80, target: 4.29 },
        { label: 'Oct 26', actual: 3.95, target: 4.29 },
        { label: 'Nov 2', actual: 4.10, target: 4.29 },
        { label: 'Nov 9', actual: 4.20, target: 4.29 },
      ]
    }
  },
  {
    id: 'galway-downs',
    name: 'Galway Downs',
    region: 'CA Southern',
    asOf: 'Oct 2026 · Example',
    foh: {
      actual: 2.06,
      target: 2.10,
      diff: '0.04 below target',
      isAbove: false,
      weeks: [
        { label: 'Oct 19', actual: 1.95, target: 2.10 },
        { label: 'Oct 26', actual: 2.02, target: 2.10 },
        { label: 'Nov 2', actual: 2.12, target: 2.10 },
        { label: 'Nov 9', actual: 2.15, target: 2.10 },
      ]
    },
    boh: {
      actual: 3.51,
      target: 3.95,
      diff: '0.44 below target',
      isAbove: false,
      weeks: [
        { label: 'Oct 19', actual: 3.40, target: 3.95 },
        { label: 'Oct 26', actual: 3.45, target: 3.95 },
        { label: 'Nov 2', actual: 3.55, target: 3.95 },
        { label: 'Nov 9', actual: 3.65, target: 3.95 },
      ]
    }
  }
];

export default function AdminGoalsPage() {
  const [showUpload, setShowUpload] = useState(true);
  const [showPaste, setShowPaste] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [pastedCSV, setPastedCSV] = useState('');
  const [activeTab, setActiveTab] = useState('month'); // '12m', '12w', 'month'
  const [selectedRegion, setSelectedRegion] = useState('CA Bay Area');
  const [selectedVenue, setSelectedVenue] = useState('all');
  const [expandedDetails, setExpandedDetails] = useState({});

  // Upload type: 'labor_targets' or 'accounting_periods'
  const [uploadType, setUploadType] = useState('labor_targets');

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);  // { imported, updated, skipped, errors[] }
  const [uploadError, setUploadError] = useState('');
  const [importHistory, setImportHistory] = useState([]);   // [{ ts, type, imported, updated, skipped }]
  const fileInputRef = useRef(null);

  const activeUrl = uploadType === 'labor_targets' ? LABOR_TARGETS_URL : ACCOUNTING_PERIODS_URL;
  const activeTemplate = uploadType === 'labor_targets' ? CSV_TEMPLATE : ACCOUNTING_PERIODS_TEMPLATE;
  const activeFilename = uploadType === 'labor_targets'
    ? 'wedgewood_labor_goals_template.csv'
    : 'wedgewood_accounting_periods_template.csv';

  const handleSwitchUploadType = (type) => {
    setUploadType(type);
    setUploadResult(null);
    setUploadError('');
    setPastedCSV('');
  };

  const toggleDetails = (venueId) => {
    setExpandedDetails(prev => ({
      ...prev,
      [venueId]: !prev[venueId]
    }));
  };

  // ── Shared: post to backend and handle response ──────────────────────────
  async function submitUpload(fetchInit) {
    setUploading(true);
    setUploadResult(null);
    setUploadError('');
    try {
      const res = await fetch(activeUrl, {
        credentials: 'include',
        ...fetchInit,
      });

      const text = await res.text();
      let json = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        json = null;
      }

      if (!res.ok) {
        const errorMsg = json?.error || (text ? `Server error (${res.status}): ${text}` : `HTTP ${res.status} ${res.statusText}`);
        setUploadError(errorMsg);
      } else if (!json) {
        setUploadError(`Backend returned an empty response. Please check that the backend is running ('cd backend && make run').`);
      } else {
        setUploadResult(json);
        setImportHistory(prev => [
          {
            ts: new Date().toLocaleString(),
            type: uploadType === 'labor_targets' ? 'Labor Targets' : 'Accounting Periods',
            ...json,
          },
          ...prev,
        ]);
      }
    } catch (err) {
      setUploadError('Failed to connect to backend: ' + err.message + '. Please ensure the Go server is running (cd backend && make run).');
    } finally {
      setUploading(false);
    }
  }

  // ── File chooser upload ───────────────────────────────────────────────────
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    await submitUpload({ method: 'POST', body: form });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Paste CSV upload ──────────────────────────────────────────────────────
  const handleApplyPaste = async () => {
    if (!pastedCSV.trim()) return;
    await submitUpload({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csv: pastedCSV }),
    });
  };

  const handleDownloadTemplate = () => {
    const blob = new Blob([activeTemplate], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', activeFilename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleTryExample = () => {
    setPastedCSV(activeTemplate);
    setShowPaste(true);
  };

  // Filter venues
  const filteredVenues = INITIAL_VENUES_DATA.filter(v => {
    if (selectedRegion !== 'All regions' && v.region !== selectedRegion) return false;
    if (selectedVenue !== 'all' && v.id !== selectedVenue) return false;
    return true;
  });



  return (
    <div className="admin-goals-body">
      {/* Top App Header */}
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
            <a href="/staffing" className="admin-nav-item">Venues</a>
            <span className="admin-nav-item">Users & access</span>
            <span className="admin-nav-item active">Labor efficiency targets</span>
          </nav>
        </div>

        <div className="admin-header-right">
          <div className="user-profile-block">
            <div className="user-name">Dana Scully</div>
            <div className="user-role-label">Regional Manager · Admin</div>
          </div>
        </div>
      </header>

      {/* Demo Controls Bar */}
      <div className="demo-controls-bar">
        <span className="demo-pill">▶ Demo controls</span>
        <span>Regional Manager · Fictional data</span>
      </div>

      <main className="admin-container">
        {/* Title & Action Row */}
        <div className="admin-page-title-row">
          <div>
            <h1 className="admin-page-title">Labor efficiency targets</h1>
            <p className="admin-page-subtitle">Guests per labor hour, by venue.</p>
          </div>
          <button
            type="button"
            className="btn-upload-targets-toggle"
            onClick={() => setShowUpload(!showUpload)}
          >
            {showUpload ? 'Close upload' : 'Upload targets'}
          </button>
        </div>

        {/* Collapsible Upload targets Card */}
        {showUpload && (
          <section className="upload-targets-card">
            <div className="upload-card-header">
              <h2 className="upload-card-title">Upload data</h2>
              <button
                type="button"
                className="btn-card-close"
                onClick={() => setShowUpload(false)}
              >
                Close
              </button>
            </div>

            {/* Upload Type Switcher */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
              <button
                type="button"
                className={`time-tab-pill ${uploadType === 'labor_targets' ? 'active' : ''}`}
                style={{ padding: '6px 12px', fontSize: '13px' }}
                onClick={() => handleSwitchUploadType('labor_targets')}
              >
                Labor efficiency targets
              </button>
              <button
                type="button"
                className={`time-tab-pill ${uploadType === 'accounting_periods' ? 'active' : ''}`}
                style={{ padding: '6px 12px', fontSize: '13px' }}
                onClick={() => handleSwitchUploadType('accounting_periods')}
              >
                Accounting periods (4-4-5)
              </button>
            </div>

            <div className="upload-overwrite-banner">
              <div className="banner-lead">
                Applying this upload overwrites existing {uploadType === 'labor_targets' ? 'targets' : 'period dates'}.
              </div>
              <div className="banner-sub">
                {uploadType === 'labor_targets'
                  ? 'Rows match on venue name and accounting month. A row whose venue is not found is skipped and listed below.'
                  : 'Rows match on period key (e.g. 2026-01) and update calendar start and end dates. Weeks and days count are auto-calculated if omitted.'}
              </div>
            </div>

            {/* Result banner */}
            {uploadError && (
              <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#991b1b', padding: '10px 14px', borderRadius: '6px', marginBottom: '14px', fontSize: '13px' }}>
                ✗ {uploadError}
              </div>
            )}
            {uploadResult && (
              <div style={{ background: '#dcfce7', border: '1px solid #bbf7d0', color: '#166534', padding: '10px 14px', borderRadius: '6px', marginBottom: '8px', fontSize: '13px' }}>
                <strong>✓ Import complete</strong> — {uploadResult.imported} row{uploadResult.imported !== 1 ? 's' : ''} imported
                {uploadResult.skipped > 0 && `, ${uploadResult.skipped} skipped`}.
                {uploadResult.errors?.length > 0 && (
                  <details style={{ marginTop: '6px' }}>
                    <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
                      {uploadResult.errors.length} warning{uploadResult.errors.length !== 1 ? 's' : ''}
                    </summary>
                    <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                      {uploadResult.errors.map((e, i) => <li key={i}>{e}</li>)}
                    </ul>
                  </details>
                )}
              </div>
            )}

            <div className="upload-actions-row">
              <label className="btn-upload-file-label">
                <span>{uploading ? 'Uploading…' : 'Choose CSV file'}</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  style={{ display: 'none' }}
                  disabled={uploading}
                  onChange={handleFileChange}
                />
              </label>

              <button
                type="button"
                className="btn-sec-action"
                onClick={handleDownloadTemplate}
              >
                Download template
              </button>

              <button
                type="button"
                className="btn-sec-action"
                onClick={handleTryExample}
              >
                Try example CSV
              </button>
            </div>

            <div className="upload-accordions">
              <div>
                <button
                  type="button"
                  className="drawer-accordion-btn"
                  onClick={() => setShowPaste(!showPaste)}
                >
                  <span>{showPaste ? '▼' : '▶'}</span>
                  <span>Paste CSV ({uploadType === 'labor_targets' ? 'Targets' : 'Periods'})</span>
                </button>
                {showPaste && (
                  <div style={{ marginTop: '6px' }}>
                    <textarea
                      className="paste-csv-textarea"
                      rows={6}
                      placeholder={uploadType === 'labor_targets' ? "Paste labor targets CSV lines here..." : "Paste accounting periods CSV lines here..."}
                      value={pastedCSV}
                      onChange={(e) => setPastedCSV(e.target.value)}
                    />
                    <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        className="btn-sec-action"
                        style={{ background: '#1b4332', color: '#ffffff', borderColor: '#1b4332' }}
                        disabled={uploading || !pastedCSV.trim()}
                        onClick={handleApplyPaste}
                      >
                        {uploading ? 'Importing…' : 'Apply pasted CSV'}
                      </button>
                      <button
                        type="button"
                        className="btn-sec-action"
                        onClick={() => setPastedCSV('')}
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <button
                  type="button"
                  className="drawer-accordion-btn"
                  onClick={() => setShowHistory(!showHistory)}
                >
                  <span>{showHistory ? '▼' : '▶'}</span>
                  <span>Import history ({importHistory.length})</span>
                </button>
                {showHistory && (
                  <div style={{ fontSize: '12px', color: '#374151', padding: '6px 0' }}>
                    {importHistory.length === 0 ? (
                      <span style={{ color: '#6b7280' }}>No prior imports recorded for this session.</span>
                    ) : (
                      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                        <thead>
                          <tr style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>
                            <th style={{ padding: '4px 8px' }}>Time</th>
                            <th style={{ padding: '4px 8px' }}>Type</th>
                            <th style={{ padding: '4px 8px' }}>Imported</th>
                            <th style={{ padding: '4px 8px' }}>Skipped</th>
                            <th style={{ padding: '4px 8px' }}>Warnings</th>
                          </tr>
                        </thead>
                        <tbody>
                          {importHistory.map((h, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                              <td style={{ padding: '4px 8px' }}>{h.ts}</td>
                              <td style={{ padding: '4px 8px', fontWeight: 'bold' }}>{h.type}</td>
                              <td style={{ padding: '4px 8px' }}>{h.imported}</td>
                              <td style={{ padding: '4px 8px' }}>{h.skipped}</td>
                              <td style={{ padding: '4px 8px' }}>{h.errors?.length ?? 0}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Time Tabs */}
        <div className="time-tabs-row">
          <button
            type="button"
            className={`time-tab-pill ${activeTab === '12m' ? 'active' : ''}`}
            onClick={() => setActiveTab('12m')}
          >
            Last 12 months
          </button>
          <button
            type="button"
            className={`time-tab-pill ${activeTab === '12w' ? 'active' : ''}`}
            onClick={() => setActiveTab('12w')}
          >
            Last 12 weeks
          </button>
          <button
            type="button"
            className={`time-tab-pill ${activeTab === 'month' ? 'active' : ''}`}
            onClick={() => setActiveTab('month')}
          >
            Last month
          </button>
        </div>

        {/* Filters Card */}
        <div className="filters-bar-card">
          <div className="filter-field-group">
            <label className="filter-label" htmlFor="filter-region">Region</label>
            <select
              id="filter-region"
              className="filter-select"
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
            >
              <option value="All regions">All regions</option>
              <option value="CA Bay Area">CA Bay Area</option>
              <option value="Arizona">Arizona</option>
              <option value="CA Central">CA Central</option>
              <option value="CA Southern">CA Southern</option>
              <option value="Texas">Texas</option>
            </select>
          </div>

          <div className="filter-field-group">
            <label className="filter-label" htmlFor="filter-venue">Venue</label>
            <select
              id="filter-venue"
              className="filter-select"
              value={selectedVenue}
              onChange={(e) => setSelectedVenue(e.target.value)}
            >
              <option value="all">All venues in view</option>
              {INITIAL_VENUES_DATA.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>

          <div className="filter-field-group">
            <label className="filter-label" htmlFor="filter-data-source">Data source</label>
            <select id="filter-data-source" className="filter-select">
              <option>Illustrative examples</option>
              <option>Live targets</option>
            </select>
          </div>

          <div className="filter-field-group">
            <label className="filter-label" htmlFor="filter-as-of">As of</label>
            <input
              id="filter-as-of"
              type="text"
              className="filter-input-date"
              defaultValue="17/11/2026"
            />
          </div>
        </div>

        {/* Region Section */}
        <section className="region-section">
          <div className="region-section-header">
            <h2 className="region-heading">{selectedRegion}</h2>
            <div className="region-meta-sub">
              {filteredVenues.length} venue{filteredVenues.length === 1 ? '' : 's'} · Last completed accounting month and four most recent completed weeks · Oct 5 – Nov 15, 2026
            </div>
            <div className="region-illustrative-note">
              Illustrative data. Results and targets in this view are examples.
            </div>

            <div className="region-legend">
              <span className="legend-item">
                <span className="legend-dot-above">●</span> At or above target
              </span>
              <span className="legend-item">
                <span className="legend-dot-below">▼</span> Below target
              </span>
              <span className="legend-item">
                <span className="legend-line-target">----</span> Target
              </span>
            </div>
          </div>

          {/* Venue Cards */}
          <div className="venue-cards-grid">
            {filteredVenues.map((venue) => {
              const isDetailsOpen = !!expandedDetails[venue.id];
              return (
                <article key={venue.id} className="venue-card">
                  <div className="venue-card-top">
                    <h3 className="venue-name-heading">{venue.name}</h3>
                    <span className="venue-region-tag">{venue.region}</span>
                  </div>

                  <div className="venue-departments-row">
                    {/* Front of House */}
                    <div className="dept-column">
                      <div className="dept-header-line">
                        <span className="dept-title">Front of house</span>
                        <span className="dept-badge">FOH</span>
                      </div>
                      <div className="metric-main-val">{venue.foh.actual.toFixed(2)}</div>
                      <div className="metric-period-label">{venue.asOf}</div>
                      <div className="metric-target-reference">Example target {venue.foh.target.toFixed(2)}</div>
                      <div className={`status-badge-diff ${venue.foh.isAbove ? 'above' : 'below'}`}>
                        {venue.foh.diff}
                      </div>

                      <div className="sparkline-container">
                        <div className="sparkline-title">Last 4 completed weeks</div>
                        <TrendSparkline weeks={venue.foh.weeks} target={venue.foh.target} minVal={2.0} maxVal={4.0} />
                      </div>
                    </div>

                    {/* Back of House */}
                    <div className="dept-column">
                      <div className="dept-header-line">
                        <span className="dept-title">Back of house</span>
                        <span className="dept-badge">BOH</span>
                      </div>
                      <div className="metric-main-val">{venue.boh.actual.toFixed(2)}</div>
                      <div className="metric-period-label">{venue.asOf}</div>
                      <div className="metric-target-reference">Example target {venue.boh.target.toFixed(2)}</div>
                      <div className={`status-badge-diff ${venue.boh.isAbove ? 'above' : 'below'}`}>
                        {venue.boh.diff}
                      </div>

                      <div className="sparkline-container">
                        <div className="sparkline-title">Last 4 completed weeks</div>
                        <TrendSparkline weeks={venue.boh.weeks} target={venue.boh.target} minVal={3.0} maxVal={6.0} />
                      </div>
                    </div>
                  </div>

                  {/* Period Details Expander */}
                  <div className="period-details-expander">
                    <button
                      type="button"
                      className="expander-btn"
                      onClick={() => toggleDetails(venue.id)}
                    >
                      <span>{isDetailsOpen ? '▼' : '▶'}</span>
                      <span>Period details</span>
                    </button>

                    {isDetailsOpen && (
                      <table className="period-details-table">
                        <thead>
                          <tr>
                            <th>Week</th>
                            <th>FOH Target</th>
                            <th>FOH Actual</th>
                            <th>BOH Target</th>
                            <th>BOH Actual</th>
                          </tr>
                        </thead>
                        <tbody>
                          {venue.foh.weeks.map((w, idx) => (
                            <tr key={w.label}>
                              <td>{w.label}</td>
                              <td>{w.target.toFixed(2)}</td>
                              <td style={{ color: w.actual >= w.target ? '#15803d' : '#ea580c', fontWeight: 'bold' }}>
                                {w.actual.toFixed(2)}
                              </td>
                              <td>{venue.boh.weeks[idx].target.toFixed(2)}</td>
                              <td style={{ color: venue.boh.weeks[idx].actual >= venue.boh.weeks[idx].target ? '#15803d' : '#ea580c', fontWeight: 'bold' }}>
                                {venue.boh.weeks[idx].actual.toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}

// Sparkline SVG helper
function TrendSparkline({ weeks, target, minVal, maxVal }) {
  const width = 280;
  const height = 80;
  const paddingX = 30;
  const paddingY = 15;

  const getY = (val) => {
    const clamped = Math.max(minVal, Math.min(maxVal, val));
    const ratio = (clamped - minVal) / (maxVal - minVal);
    return height - paddingY - ratio * (height - 2 * paddingY);
  };

  const getX = (idx) => {
    return paddingX + (idx / (weeks.length - 1)) * (width - 2 * paddingX);
  };

  const targetY = getY(target);
  const pointsString = weeks.map((w, idx) => `${getX(idx)},${getY(w.actual)}`).join(' ');

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
      {/* Target dashed line */}
      <line
        x1={paddingX}
        y1={targetY}
        x2={width - paddingX}
        y2={targetY}
        stroke="#6b7280"
        strokeWidth="1.5"
        strokeDasharray="4 3"
      />

      {/* Actual connected line */}
      <polyline
        fill="none"
        stroke="#2d5a3c"
        strokeWidth="2"
        points={pointsString}
      />

      {/* Data points */}
      {weeks.map((w, idx) => {
        const cx = getX(idx);
        const cy = getY(w.actual);
        const isAbove = w.actual >= w.target;

        return (
          <g key={w.label}>
            {isAbove ? (
              <circle cx={cx} cy={cy} r="4.5" fill="#15803d" stroke="#ffffff" strokeWidth="1" />
            ) : (
              <polygon
                points={`${cx},${cy - 5} ${cx - 5},${cy + 4} ${cx + 5},${cy + 4}`}
                fill="#ea580c"
              />
            )}
            <text
              x={cx}
              y={height - 2}
              textAnchor="middle"
              fontSize="9"
              fill="#6b7280"
            >
              {w.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
