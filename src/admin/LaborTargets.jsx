import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { API_BASE_URL } from '../config.js';
import { transformTargetsToVenuesData } from '../utils/goals-transform.js';
import './labor-targets.css';

const apiBase = API_BASE_URL || '';
const LABOR_TARGETS_URL = `${apiBase}/api/admin/labor-goals/upload`;
const ACCOUNTING_PERIODS_URL = `${apiBase}/api/admin/accounting-periods/upload`;
const VENUES_URL = `${apiBase}/api/venues`;
const TARGETS_URL = `${apiBase}/api/labor-goals/targets`;


// Sample template CSV for Wedgewood venues
const CSV_TEMPLATE = `Venue,Month,FOH guests per labor hour,BOH guests per labor hour
Boulder Ridge,2027-01,2.23,3.51
Boulder Ridge,2027-02,2.22,3.69
Carmel Fields,2027-01,2.33,4.04
Eagle Ridge,2027-01,2.69,4.33
Clayton House,2027-01,2.50,3.82
Galway Downs,2027-01,2.15,3.76
Fallbrook Estate,2027-01,2.44,5.83`;

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
  const [activeTab, setActiveTab] = useState('12m'); // '12m', '3m', '1m', 'custom'
  const [selectedYear, setSelectedYear] = useState(2026);
  const [selectedRegion, setSelectedRegion] = useState('All regions');
  const [selectedVenue, setSelectedVenue] = useState('all');
  const [dataSource, setDataSource] = useState('live'); // 'live' or 'examples'
  const [expandedDetails, setExpandedDetails] = useState({});

  // Dynamic DB state
  const [dbVenues, setDbVenues] = useState([]);
  const [dbTargets, setDbTargets] = useState([]);
  const [loadingTargets, setLoadingTargets] = useState(true);
  const [targetsError, setTargetsError] = useState('');
  const targetsRequest = useRef(null);

  // Upload type: 'labor_targets' or 'accounting_periods'
  const [uploadType, setUploadType] = useState('labor_targets');

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);  // { imported, updated, skipped, errors[] }
  const [toast, setToast] = useState(null);
  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(null), 6500);
    return () => window.clearTimeout(timeout);
  }, [toast]);
  const [importHistory, setImportHistory] = useState([]);   // [{ ts, type, imported, updated, skipped }]
  const fileInputRef = useRef(null);

  const activeUrl = uploadType === 'labor_targets' ? LABOR_TARGETS_URL : ACCOUNTING_PERIODS_URL;
  const activeTemplate = uploadType === 'labor_targets' ? CSV_TEMPLATE : ACCOUNTING_PERIODS_TEMPLATE;
  const activeFilename = uploadType === 'labor_targets'
    ? 'wedgewood_labor_goals_template.csv'
    : 'wedgewood_accounting_periods_template.csv';

  // ── Load Venues from API ──────────────────────────────────────────────────
  async function loadVenues() {
    try {
      const res = await fetch(VENUES_URL, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        if (data.venues && Array.isArray(data.venues)) {
          setDbVenues(data.venues);
        }
      }
    } catch (e) {
      console.warn('Failed to load venues:', e);
    }
  }

  // ── Load Targets from API ─────────────────────────────────────────────────
  const loadTargets = useCallback(async () => {
    targetsRequest.current?.abort();
    const controller = new AbortController();
    targetsRequest.current = controller;
    const isCurrent = () => targetsRequest.current === controller && !controller.signal.aborted;
    setLoadingTargets(true);
    setTargetsError('');
    setDbTargets([]);
    try {
      const url = `${TARGETS_URL}?year=${selectedYear}`;
      const res = await fetch(url, { credentials: 'include', signal: controller.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data.targets)) throw new Error('Invalid targets response');
      if (isCurrent()) setDbTargets(data.targets);
    } catch (e) {
      if (isCurrent()) setTargetsError('Could not load labor targets. Please try again.');
    } finally {
      if (isCurrent()) setLoadingTargets(false);
    }
  }, [selectedYear]);

  useEffect(() => {
    loadVenues();
  }, []);

  useEffect(() => {
    loadTargets();
    return () => targetsRequest.current?.abort();
  }, [loadTargets]);

  const handleSwitchUploadType = (type) => {
    setUploadType(type);
    setUploadResult(null);

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
        setToast({ message: errorMsg, error: true });
      } else if (!json) {
        setToast({ message: 'The server returned no import result. Try again.', error: true });
      } else {
        setUploadResult(json);
        // Refresh targets and venues dynamically right after upload
        loadTargets();
        loadVenues();
        setToast({ message: `Import complete. ${json.imported} imported, ${json.updated ?? 0} updated, ${json.skipped} skipped.` });
        setImportHistory(prev => [
          {
            ts: new Date().toLocaleString(),
            type: uploadType === 'labor_targets' ? 'Labor Targets' : 'Accounting Periods',
            ...json,
          },
          ...prev,
        ]);
      }
    } catch {
      setToast({ message: 'Could not reach the server. Try the import again.', error: true });
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

  // Track expanders independently per venue (default open)
  const [expandedPeriodDetails, setExpandedPeriodDetails] = useState({});
  const [expandedFinanceTargets, setExpandedFinanceTargets] = useState({});

  const togglePeriodDetails = (venueId) => {
    setExpandedPeriodDetails(prev => ({
      ...prev,
      [venueId]: prev[venueId] === undefined ? false : !prev[venueId]
    }));
  };

  const toggleFinanceTargets = (venueId) => {
    setExpandedFinanceTargets(prev => ({
      ...prev,
      [venueId]: prev[venueId] === undefined ? false : !prev[venueId]
    }));
  };

  // ── Group and transform DB targets into cards ───────────────────────────
  const dynamicVenuesData = useMemo(() => {
    if (dataSource === 'examples') {
      return INITIAL_VENUES_DATA;
    }
    return transformTargetsToVenuesData(dbTargets, selectedYear);
  }, [dbTargets, dataSource, selectedYear]);

  // Dynamic available regions
  const availableRegions = useMemo(() => {
    const list = dataSource === 'examples'
      ? INITIAL_VENUES_DATA.map(v => v.region)
      : (dynamicVenuesData.length > 0
          ? dynamicVenuesData.map(v => v.region)
          : dbVenues.map(v => v.region));
    const unique = Array.from(new Set(list.filter(Boolean))).sort();
    return ['All regions', ...unique];
  }, [dynamicVenuesData, dbVenues, dataSource]);

  // Available venues for dropdown
  const availableVenues = useMemo(() => {
    const source = dataSource === 'examples'
      ? INITIAL_VENUES_DATA
      : (dynamicVenuesData.length > 0 ? dynamicVenuesData : dbVenues);
    if (selectedRegion === 'All regions') return source;
    return source.filter(v => v.region === selectedRegion);
  }, [dynamicVenuesData, dbVenues, selectedRegion, dataSource]);

  // Filtered venues to display
  // ── Compute which months to show based on the active pill tab ────────────
  // The Wedgewood year runs Nov (prior year) – Oct (selected year).
  // Month numbers here are 1-based calendar months (Jan=1 … Dec=12).
  // periodDetailsRows for a year are built Jan–Dec (months 1–12).
  //
  // "Last 12 months" = all 12 months (default, no filtering)
  // "Last 3 months"  = last 3 months that have *any* data (result or target)
  // "Last month"     = last 1 month that has any data
  // "custom"         = all months (until a date picker is wired)
  const monthWindow = useMemo(() => {
    // Returns a Set of monthNums (1-12) that should be visible.
    // null = show all.
    if (activeTab === '12m' || activeTab === 'custom' || activeTab === 'month') {
      return null; // show all 12 months
    }

    // Determine the latest month index (1-12) to anchor "Last 3 months" or "Last month".
    // 1) Find the latest month that has any Actual/Forecast/Target in dynamicVenuesData
    let maxMonthWithData = 0;
    for (const v of dynamicVenuesData) {
      if (v.periodDetailsRows) {
        for (const r of v.periodDetailsRows) {
          if (r.fohResult != null || r.fohTarget != null) {
            if (r.monthNum > maxMonthWithData) {
              maxMonthWithData = r.monthNum;
            }
          }
        }
      }
    }

    // If no data found yet, default to October (month 10) for 2026/2027 Wedgewood calendar, or current month
    const anchorMonth = maxMonthWithData > 0 ? maxMonthWithData : (new Date().getMonth() + 1);

    if (activeTab === '1m') {
      return new Set([anchorMonth]);
    }
    if (activeTab === '3m') {
      const months = new Set();
      for (let i = 0; i < 3; i++) {
        let m = anchorMonth - i;
        if (m >= 1 && m <= 12) {
          months.add(m);
        }
      }
      return months;
    }
    return null;
  }, [activeTab, dynamicVenuesData]);

  // Filtered venues to display — also slices chart/table data by monthWindow
  const venuesToDisplay = useMemo(() => {
    if (dataSource === 'live' && (loadingTargets || targetsError)) return [];
    let base = dataSource === 'examples' ? INITIAL_VENUES_DATA : dynamicVenuesData;

    base = base.filter(v => {
      if (selectedRegion !== 'All regions' && v.region !== selectedRegion) return false;
      if (selectedVenue !== 'all' && v.id !== selectedVenue) return false;
      return true;
    });

    // Apply monthWindow slice to chart and table rows
    if (monthWindow === null) return base;

    return base.map(v => {
      if (!v.periodDetailsRows) return v;
      const filteredRows = v.periodDetailsRows.filter(r => monthWindow.has(r.monthNum));
      const filteredFoh = (v.fohChartPoints || []).filter(p => monthWindow.has(p.idx + 1));
      const filteredBoh = (v.bohChartPoints || []).filter(p => monthWindow.has(p.idx + 1));
      // Re-index so the chart x-positions are contiguous
      return {
        ...v,
        periodDetailsRows: filteredRows,
        fohChartPoints: filteredFoh.map((p, i) => ({ ...p, idx: i })),
        bohChartPoints: filteredBoh.map((p, i) => ({ ...p, idx: i })),
      };
    });
  }, [dynamicVenuesData, selectedRegion, selectedVenue, dataSource, monthWindow, loadingTargets, targetsError]);






  return (
    <main id="labor-targets-workspace" className="ux-page labor-targets">
      <header className="rm-heading">
        <div>
          <h1>Labor efficiency targets</h1>
          <p className="admin-page-subtitle">Guests per labor hour, by venue.</p>
        </div>
        <div className="labor-targets-controls">
          <>
            <span style={{ color: '#6b7280', fontWeight: '600', fontSize: '12px' }}>Year:</span>
            {[2026, 2027].map(yr => (
              <button
                key={yr}
                type="button"
                onClick={() => setSelectedYear(yr)}
                style={{
                  padding: '3px 10px',
                  borderRadius: '12px',
                  border: '1px solid',
                  borderColor: selectedYear === yr ? '#166534' : '#d1d5db',
                  background: selectedYear === yr ? '#166534' : '#ffffff',
                  color: selectedYear === yr ? '#ffffff' : '#374151',
                  fontWeight: selectedYear === yr ? '700' : '400',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                {yr}
              </button>
            ))}
          </>
        <button type="button" className={showUpload ? undefined : "primary"}
          aria-expanded={showUpload} onClick={() => setShowUpload(!showUpload)}>
          {showUpload ? "Close upload" : "Upload targets"}
        </button>
        </div>
      </header>
      {toast && (
        <div className="ux-toast" role={toast.error ? "alert" : "status"}>{toast.message}</div>
      )}

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
            {uploadResult && (
              <div style={{
                background: uploadResult.skipped > 0 ? '#fffbeb' : '#dcfce7',
                border: uploadResult.skipped > 0 ? '1px solid #fde68a' : '1px solid #bbf7d0',
                color: uploadResult.skipped > 0 ? '#92400e' : '#166534',
                padding: '10px 14px',
                borderRadius: '6px',
                marginBottom: '8px',
                fontSize: '13px'
              }}>
                <strong>{uploadResult.skipped > 0 ? '⚠ Imported with warnings' : '✓ Import complete'}</strong> — {uploadResult.imported} row{uploadResult.imported !== 1 ? 's' : ''} imported
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

        {/* Time Tabs - Exactly matching Prototype Screenshot 1 */}
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
            className={`time-tab-pill ${activeTab === '3m' ? 'active' : ''}`}
            onClick={() => setActiveTab('3m')}
          >
            Last 3 months
          </button>
          <button
            type="button"
            className={`time-tab-pill ${activeTab === '1m' ? 'active' : ''}`}
            onClick={() => setActiveTab('1m')}
          >
            Last month
          </button>
          <button
            type="button"
            className={`time-tab-pill ${activeTab === 'custom' ? 'active' : ''}`}
            onClick={() => setActiveTab('custom')}
          >
            Custom Date Range
          </button>
        </div>

        {/* Filters Card - Exactly 2 clean dropdown columns matching Prototype Screenshot 1 */}
        <div className="filters-bar-card" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div className="filter-field-group">
            <label className="filter-label" htmlFor="filter-region">Region</label>
            <select
              id="filter-region"
              className="filter-select"
              value={selectedRegion}
              onChange={(e) => {
                setSelectedRegion(e.target.value);
                setSelectedVenue('all');
              }}
            >
              {availableRegions.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
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
              <option value="all">All venues in region</option>
              {availableVenues.map(v => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Region Section */}
        <section className="region-section">
          <div className="region-section-header">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 className="region-heading">{selectedRegion}</h2>
              {dataSource === 'live' && loadingTargets && <span style={{ fontSize: '13px', color: '#166534' }}>Loading live targets…</span>}
            </div>
            <div className="region-meta-sub">
              {venuesToDisplay.length} venue{venuesToDisplay.length === 1 ? '' : 's'} ·{' '}
              {selectedYear === 2026
                ? `Jan ${selectedYear} – Dec ${selectedYear} · Actual & Forecast`
                : `Nov ${selectedYear - 1} – Oct ${selectedYear} · Finance targets`}
            </div>

            <div className="region-legend" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '14px', margin: '10px 0 6px 0', fontSize: '12px' }}>
              <span style={{ background: '#dcfce7', color: '#166534', fontWeight: '700', padding: '2px 8px', borderRadius: '4px', fontSize: '11px' }}>
                At or above target
              </span>
              <span style={{ background: '#fee2e2', color: '#b91c1c', fontWeight: '700', padding: '2px 8px', borderRadius: '4px', fontSize: '11px' }}>
                Below target
              </span>
              <span>● Actual</span>
              <span>◆ Forecast</span>
              <span>○ Estimated</span>
              <span>---- Target</span>
              <span style={{ color: '#6b7280' }}>...... Estimated target</span>
            </div>
            <div style={{ fontSize: '11.5px', color: '#6b7280', margin: '4px 0 16px 0' }}>
              Finance reports actuals by accounting month. Hollow points show estimates. The {selectedYear} target line uses Finance’s hours at target. Gaps indicate an unavailable target.
            </div>
          </div>

          {dataSource === 'examples' && <p role="status">Example data — these are sample figures.</p>}
          {dataSource === 'live' && targetsError && (
            <div role="alert">
              <p>{targetsError}</p>
              <button type="button" onClick={loadTargets}>Retry</button>
            </div>
          )}
          {dataSource === 'live' && !loadingTargets && !targetsError && venuesToDisplay.length === 0 && (
            <p role="status">No labor targets available for the selected year and filters.</p>
          )}

          {/* Venue Cards */}
          <div className="venue-cards-grid">
            {venuesToDisplay.map((venue) => {
              const isPeriodDetailsOpen = expandedPeriodDetails[venue.id] !== false; // default open
              const isFinanceTargetsOpen = expandedFinanceTargets[venue.id] !== false; // default open

              return (
                <article key={venue.id} className="venue-card">
                  {/* Card Top: Venue Name (left), Region (right) */}
                  <div className="venue-card-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '1px solid #f3f4f6', paddingBottom: '12px', marginBottom: '16px' }}>
                    <h3 className="venue-name-heading" style={{ fontSize: '18px', fontWeight: '800', margin: 0, color: '#111827' }}>
                      {venue.name}
                    </h3>
                    <span style={{ fontSize: '12px', color: '#6b7280' }}>
                      {venue.region}
                    </span>
                  </div>

                  {/* FOH and BOH Columns */}
                  <div className="venue-departments-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
                    {/* Front of House */}
                    <div className="dept-column">
                      <div className="dept-header-line" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '13px', fontWeight: '700', color: '#374151' }}>Front of house</span>
                        <span style={{ fontSize: '11px', color: '#9ca3af', fontWeight: '600' }}>FOH</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '20px', marginBottom: '12px' }}>
                        <div>
                          <span style={{ fontSize: venue.fohActualStr === 'Not available' ? '14px' : '26px', fontWeight: venue.fohActualStr === 'Not available' ? '600' : '800', color: venue.fohActualStr === 'Not available' ? '#6b7280' : '#111827' }}>
                            {venue.fohActualStr}
                          </span>
                          <span style={{ fontSize: '11px', color: '#6b7280', marginLeft: '6px' }}>
                            Actual{venue.latestActualMonth && venue.latestActualMonth !== '—' ? ` · ${venue.latestActualMonth}` : ''}
                          </span>
                        </div>
                        <div>
                          <span style={{ fontSize: venue.fohForecastStr === 'Not available' ? '14px' : '26px', fontWeight: venue.fohForecastStr === 'Not available' ? '600' : '800', color: venue.fohForecastStr === 'Not available' ? '#6b7280' : '#111827' }}>
                            {venue.fohForecastStr}
                          </span>
                          <span style={{ fontSize: '11px', color: '#6b7280', marginLeft: '6px' }}>
                            Forecast{venue.latestForecastMonth && venue.latestForecastMonth !== '—' ? ` · ${venue.latestForecastMonth}` : ''}
                          </span>
                        </div>
                      </div>

                      {/* FOH Prototype Chart */}
                      <PrototypeTrendChart
                        points={venue.fohChartPoints}
                        target={venue.fohTargetAvg}
                        minVal={1.5}
                        maxVal={4.5}
                        yTicks={[4.5, 3.5, 2.5, 1.5]}
                      />
                    </div>

                    {/* Back of House */}
                    <div className="dept-column">
                      <div className="dept-header-line" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '13px', fontWeight: '700', color: '#374151' }}>Back of house</span>
                        <span style={{ fontSize: '11px', color: '#9ca3af', fontWeight: '600' }}>BOH</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '20px', marginBottom: '12px' }}>
                        <div>
                          <span style={{ fontSize: venue.bohActualStr === 'Not available' ? '14px' : '26px', fontWeight: venue.bohActualStr === 'Not available' ? '600' : '800', color: venue.bohActualStr === 'Not available' ? '#6b7280' : '#111827' }}>
                            {venue.bohActualStr}
                          </span>
                          <span style={{ fontSize: '11px', color: '#6b7280', marginLeft: '6px' }}>
                            Actual{venue.latestActualMonth && venue.latestActualMonth !== '—' ? ` · ${venue.latestActualMonth}` : ''}
                          </span>
                        </div>
                        <div>
                          <span style={{ fontSize: venue.bohForecastStr === 'Not available' ? '14px' : '26px', fontWeight: venue.bohForecastStr === 'Not available' ? '600' : '800', color: venue.bohForecastStr === 'Not available' ? '#6b7280' : '#111827' }}>
                            {venue.bohForecastStr}
                          </span>
                          <span style={{ fontSize: '11px', color: '#6b7280', marginLeft: '6px' }}>
                            Forecast{venue.latestForecastMonth && venue.latestForecastMonth !== '—' ? ` · ${venue.latestForecastMonth}` : ''}
                          </span>
                        </div>
                      </div>

                      {/* BOH Prototype Chart */}
                      <PrototypeTrendChart
                        points={venue.bohChartPoints}
                        target={venue.bohTargetAvg}
                        minVal={2.0}
                        maxVal={10.0}
                        yTicks={[10.0, 7.33, 4.67, 2.0]}
                      />
                    </div>
                  </div>

                  {/* Table 1: Period details */}
                  <div style={{ marginTop: '20px', borderTop: '1px solid #e5e7eb', paddingTop: '12px' }}>
                    <button
                      type="button"
                      className="expander-btn"
                      onClick={() => togglePeriodDetails(venue.id)}
                    >
                      <span style={{ fontSize: '11px' }}>{isPeriodDetailsOpen ? '▼' : '▶'}</span>
                      <span style={{ fontWeight: '700', fontSize: '13px', color: '#111827' }}>Period details</span>
                    </button>

                    {isPeriodDetailsOpen && (
                      <table className="period-details-table">
                        <thead>
                          <tr>
                            <th rowSpan="2" className="col-period" style={{ verticalAlign: 'bottom' }}>PERIOD</th>
                            <th colSpan="3">FOH</th>
                            <th colSpan="3">BOH</th>
                          </tr>
                          <tr>
                            <th>RESULT</th>
                            <th>TARGET</th>
                            <th>GAP</th>
                            <th>RESULT</th>
                            <th>TARGET</th>
                            <th>GAP</th>
                          </tr>
                        </thead>
                        <tbody>
                          {venue.periodDetailsRows ? (
                            venue.periodDetailsRows.map((row) => (
                              <tr key={row.period}>
                                <td className="col-period">
                                  {row.period}
                                  {row.isEstimate && <span style={{ fontSize: '10px', color: '#6b7280', marginLeft: '3px' }}>Est.</span>}
                                  {row.isForecast && <span style={{ fontSize: '10px', color: '#6b7280', marginLeft: '3px' }}>Fcst</span>}
                                </td>
                                <td>{row.fohResult != null ? row.fohResult.toFixed(2) : '—'}</td>
                                <td>{row.fohTarget != null ? row.fohTarget.toFixed(2) : '—'}</td>
                                <td className={row.fohGap != null ? (row.fohGap >= 0 ? 'gap-cell-positive' : 'gap-cell-negative') : ''}>
                                  {row.fohGap != null ? `${row.fohGap >= 0 ? '+' : ''}${row.fohGap.toFixed(2)}` : '—'}
                                </td>
                                <td>{row.bohResult != null ? row.bohResult.toFixed(2) : '—'}</td>
                                <td>{row.bohTarget != null ? row.bohTarget.toFixed(2) : '—'}</td>
                                <td className={row.bohGap != null ? (row.bohGap >= 0 ? 'gap-cell-positive' : 'gap-cell-negative') : ''}>
                                  {row.bohGap != null ? `${row.bohGap >= 0 ? '+' : ''}${row.bohGap.toFixed(2)}` : '—'}
                                </td>
                              </tr>
                            ))
                          ) : null}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* Table 2: Finance hours at target */}
                  <div className="finance-hours-section">
                    <button
                      type="button"
                      className="expander-btn"
                      onClick={() => toggleFinanceTargets(venue.id)}
                    >
                      <span style={{ fontSize: '11px' }}>{isFinanceTargetsOpen ? '▼' : '▶'}</span>
                      <span style={{ fontWeight: '700', fontSize: '13px', color: '#111827' }}>
                        {selectedYear} Finance hours at target · {venue.name}
                      </span>
                    </button>

                    {isFinanceTargetsOpen && (
                      <div style={{ marginTop: '8px' }}>
                        <div className="finance-hours-subtitle">
                          Banquet LE is guests per labor hour.
                        </div>
                        <table className="finance-hours-table">
                          <thead>
                            <tr>
                              <th>Period</th>
                              <th className="col-num">FOH LE</th>
                              <th className="col-num">BOH LE</th>
                            </tr>
                          </thead>
                          <tbody>
                            {venue.monthlyFinanceRows ? (
                              venue.monthlyFinanceRows.map((m) => (
                                <tr key={m.monthNum}>
                                  <td>{m.monthName}</td>
                                  <td className="col-num">{m.foh != null ? m.foh.toFixed(2) : '—'}</td>
                                  <td className="col-num">{m.boh != null ? m.boh.toFixed(2) : '—'}</td>
                                </tr>
                              ))
                            ) : null}
                            <tr className="total-row">
                              <td>Full year</td>
                              <td className="col-num">{venue.annualFOHTarget != null ? venue.annualFOHTarget.toFixed(2) : '—'}</td>
                              <td className="col-num">{venue.annualBOHTarget != null ? venue.annualBOHTarget.toFixed(2) : '—'}</td>
                            </tr>
                          </tbody>
                        </table>
                        <div className="finance-hours-footnote">
                          Source: Finance’s {selectedYear} hours at target. A dash marks a value Finance left blank.
                        </div>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
    </main>
  );
}

// ── Prototype Trend Chart with Y-axis markers and dots ───────────────────────
function PrototypeTrendChart({ points = [], target = null, minVal = 1.5, maxVal = 4.5, yTicks = [4.5, 3.5, 2.5, 1.5] }) {
  const width = 420;
  const height = 130;
  const paddingLeft = 38;
  const paddingRight = 16;
  const paddingTop = 12;
  const paddingBottom = 26;

  const getY = (val) => {
    if (val == null) return null;
    const clamped = Math.max(minVal, Math.min(maxVal, val));
    const ratio = (clamped - minVal) / (maxVal - minVal);
    return height - paddingBottom - ratio * (height - paddingTop - paddingBottom);
  };

  const getX = (idx) => {
    if (points.length <= 1) return paddingLeft;
    return paddingLeft + (idx / (points.length - 1)) * (width - paddingLeft - paddingRight);
  };

  const targetY = target != null ? getY(target) : null;
  const validPoints = points.filter(p => p.val != null);
  const polylineStr = validPoints.map(p => `${getX(p.idx)},${getY(p.val)}`).join(' ');

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible', fontVariantNumeric: 'tabular-nums' }}>
      {/* Y-axis Ticks & Horizontal lines */}
      {yTicks.map(t => {
        const y = getY(t);
        return (
          <g key={t}>
            <text x={paddingLeft - 8} y={y + 3.5} textAnchor="end" fontSize="10" fill="#6b7280">
              {t.toFixed(t % 1 === 0 ? 0 : 2)}
            </text>
            <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="#f3f4f6" strokeWidth="1" />
          </g>
        );
      })}

      {/* Target dashed line — only drawn when an official target is provided */}
      {targetY != null && (
        <line
          x1={paddingLeft}
          y1={targetY}
          x2={width - paddingRight}
          y2={targetY}
          stroke="#374151"
          strokeWidth="1.5"
          strokeDasharray="4 3"
        />
      )}

      {/* Missing data state when actual performance data is not yet available */}
      {validPoints.length === 0 && (
        <text
          x={(width + paddingLeft - paddingRight) / 2}
          y={(height - paddingBottom + paddingTop) / 2}
          textAnchor="middle"
          fontSize="11"
          fill="#9ca3af"
        >
          Actual performance data not available
        </text>
      )}

      {/* Connecting line */}
      {polylineStr && (
        <polyline
          fill="none"
          stroke="#2d5a3c"
          strokeWidth="1.8"
          points={polylineStr}
        />
      )}

      {/* Data points */}
      {points.map((p, idx) => {
        const cx = getX(idx);
        if (p.val == null) {
          return (
            <text key={idx} x={cx} y={height - 6} textAnchor="middle" fontSize="9" fill="#9ca3af">
              {p.label.split(' ')[0]}
            </text>
          );
        }
        const cy = getY(p.val);
        const isAbove = target != null ? p.val >= target : true;
        const isForecast = p.isForecast;

        return (
          <g key={idx}>
            {isForecast ? (
              // Distinct Diamond for forecast
              <polygon
                points={`${cx},${cy - 5.5} ${cx + 5},${cy} ${cx},${cy + 5.5} ${cx - 5},${cy}`}
                fill={isAbove ? '#15803d' : '#b91c1c'}
                stroke="#ffffff"
                strokeWidth="1.2"
              />
            ) : isAbove ? (
              <circle cx={cx} cy={cy} r="3.5" fill="#15803d" stroke="#ffffff" strokeWidth="1" />
            ) : (
              <circle cx={cx} cy={cy} r="3.5" fill="#b91c1c" stroke="#ffffff" strokeWidth="1" />
            )}
            <text x={cx} y={height - 6} textAnchor="middle" fontSize="9" fill="#6b7280">
              {p.label.split(' ')[0]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
