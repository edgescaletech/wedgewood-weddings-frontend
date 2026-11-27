import React, { useState, useEffect } from "react";
import { API_BASE_URL as apiBase } from "../config.js";
import { useAuth } from "../context/AuthContext.jsx";
import styles from "./goals.css?inline";

export { styles };

// 4-4-5 Calendar Definitions for fallback
const DEFAULT_PERIODS = {
  "2026": [
    { periodNumber: 1,  monthName: "January",   dates: "Jan 1–Feb 1",   sub: "32 days · year boundary", basis: "Actual",   fohTarget: null, fohActual: 2.31, bohTarget: null, bohActual: 5.51 },
    { periodNumber: 2,  monthName: "February",  dates: "Feb 2–Mar 1",   sub: "28 days · 4 weeks",       basis: "Actual",   fohTarget: null, fohActual: 2.28, bohTarget: null, bohActual: 5.14 },
    { periodNumber: 3,  monthName: "March",     dates: "Mar 2–Apr 5",   sub: "35 days · 5 weeks",       basis: "Actual",   fohTarget: null, fohActual: 2.51, bohTarget: null, bohActual: 5.59 },
    { periodNumber: 4,  monthName: "April",     dates: "Apr 6–May 3",   sub: "28 days · 4 weeks",       basis: "Actual",   fohTarget: null, fohActual: 2.58, bohTarget: null, bohActual: 6.40 },
    { periodNumber: 5,  monthName: "May",       dates: "May 4–May 31",  sub: "28 days · 4 weeks",       basis: "Actual",   fohTarget: null, fohActual: 2.04, bohTarget: null, bohActual: 4.88 },
    { periodNumber: 6,  monthName: "June",      dates: "Jun 1–Jul 5",   sub: "35 days · 5 weeks",       basis: "Actual",   fohTarget: null, fohActual: 2.85, bohTarget: null, bohActual: 6.53 },
    { periodNumber: 7,  monthName: "July",      dates: "Jul 6–Aug 2",   sub: "28 days · 4 weeks",       basis: "Actual",   fohTarget: null, fohActual: 2.67, bohTarget: null, bohActual: 6.22 },
    { periodNumber: 8,  monthName: "August",    dates: "Aug 3–Aug 30",  sub: "28 days · 4 weeks",       basis: "Actual",   fohTarget: null, fohActual: 2.52, bohTarget: null, bohActual: 5.52 },
    { periodNumber: 9,  monthName: "September", dates: "Aug 31–Oct 4",  sub: "35 days · 5 weeks",       basis: "Actual",   fohTarget: null, fohActual: 2.53, bohTarget: null, bohActual: 5.77 },
    { periodNumber: 10, monthName: "October",   dates: "Oct 5–Nov 1",   sub: "28 days · 4 weeks",       basis: "Forecast", fohTarget: 2.34, fohActual: null, bohTarget: 5.20, bohActual: null },
    { periodNumber: 11, monthName: "November",  dates: "Nov 2–Nov 29",  sub: "28 days · 4 weeks",       basis: "Forecast", fohTarget: 2.49, fohActual: null, bohTarget: 5.53, bohActual: null },
    { periodNumber: 12, monthName: "December",  dates: "Nov 30–Dec 31", sub: "32 days · year boundary", basis: "Forecast", fohTarget: 3.19, fohActual: null, bohTarget: 7.02, bohActual: null },
  ],
  "2027": [
    { periodNumber: 1,  monthName: "January",   dates: "Jan 1–Jan 31",  sub: "31 days · 5 weeks",       basis: "Target",   fohTarget: 2.44, fohActual: null, bohTarget: 5.83, bohActual: null },
    { periodNumber: 2,  monthName: "February",  dates: "Feb 1–Feb 28",  sub: "28 days · 4 weeks",       basis: "Target",   fohTarget: 2.51, fohActual: null, bohTarget: 5.83, bohActual: null },
    { periodNumber: 3,  monthName: "March",     dates: "Mar 1–Apr 4",   sub: "35 days · 5 weeks",       basis: "Target",   fohTarget: 2.55, fohActual: null, bohTarget: 5.83, bohActual: null },
    { periodNumber: 4,  monthName: "April",     dates: "Apr 5–May 2",   sub: "28 days · 4 weeks",       basis: "Target",   fohTarget: 2.53, fohActual: null, bohTarget: 5.83, bohActual: null },
    { periodNumber: 5,  monthName: "May",       dates: "May 3–May 30",  sub: "28 days · 4 weeks",       basis: "Target",   fohTarget: 2.57, fohActual: null, bohTarget: 5.83, bohActual: null },
    { periodNumber: 6,  monthName: "June",      dates: "May 31–Jul 4",  sub: "35 days · 5 weeks",       basis: "Target",   fohTarget: 2.51, fohActual: null, bohTarget: 5.83, bohActual: null },
    { periodNumber: 7,  monthName: "July",      dates: "Jul 5–Aug 1",   sub: "28 days · 4 weeks",       basis: "Target",   fohTarget: 2.47, fohActual: null, bohTarget: 5.83, bohActual: null },
    { periodNumber: 8,  monthName: "August",    dates: "Aug 2–Aug 29",  sub: "28 days · 4 weeks",       basis: "Target",   fohTarget: 2.42, fohActual: null, bohTarget: 5.83, bohActual: null },
    { periodNumber: 9,  monthName: "September", dates: "Aug 30–Oct 3",  sub: "35 days · 5 weeks",       basis: "Target",   fohTarget: 2.45, fohActual: null, bohTarget: 5.83, bohActual: null },
    { periodNumber: 10, monthName: "October",   dates: "Oct 4–Oct 31",  sub: "28 days · 4 weeks",       basis: "Target",   fohTarget: 2.46, fohActual: null, bohTarget: 5.83, bohActual: null },
    { periodNumber: 11, monthName: "November",  dates: "Nov 1–Nov 28",  sub: "28 days · 4 weeks",       basis: "Target",   fohTarget: 2.47, fohActual: null, bohTarget: 5.83, bohActual: null },
    { periodNumber: 12, monthName: "December",  dates: "Nov 29–Dec 31", sub: "33 days · 5 weeks",       basis: "Target",   fohTarget: 2.47, fohActual: null, bohTarget: 5.83, bohActual: null },
  ]
};

export default function GoalsPage() {
  const { hasVenuePermission, loading: accessLoading, accessError } = useAuth();
  const [selectedYear, setSelectedYear] = useState("2026");
  const [rows, setRows] = useState(DEFAULT_PERIODS["2026"]);
  const [loading, setLoading] = useState(false);

  // Read search params
  const searchParams = new URLSearchParams(window.location.search);
  const venueId = searchParams.get("venueId") || "";
  const canViewGoals = hasVenuePermission(venueId, "labor_goals.view");
  const [requestError, setRequestError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function fetchTargets() {
      if (!canViewGoals) return;
      setLoading(true);
      setRequestError("");
      try {
        const queryParams = new URLSearchParams({ year: selectedYear });
        if (venueId) queryParams.set("venueId", venueId);

        const res = await fetch(`${apiBase}/api/labor-goals/targets?${queryParams.toString()}`, {
          credentials: 'include',
        });

        if (res.status === 401) {
          window.location.replace("/login");
          return;
        }
        if (res.status === 403) {
          if (!cancelled) setRequestError("You do not have permission to view goals for this venue.");
          return;
        }
        if (res.ok) {
          const json = await res.json();
          if (!cancelled && json.targets && json.targets.length > 0) {
            // Merge with default periods
            const base = DEFAULT_PERIODS[selectedYear] || DEFAULT_PERIODS["2026"];
            const merged = base.map((p, idx) => {
              const pKey = `${selectedYear}-${String(idx + 1).padStart(2, '0')}`;
              const found = json.targets.find(t => t.periodKey === pKey);
              if (found) {
                return {
                  ...p,
                  basis: found.basis,
                  fohTarget: found.fohTarget,
                  bohTarget: found.bohTarget,
                };
              }
              return p;
            });
            setRows(merged);
            return;
          }
        }
      } catch (err) {
        console.error("Failed to load targets from backend, using 4-4-5 definitions:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }

      // Default fallback
      if (!cancelled) {
        setRows(DEFAULT_PERIODS[selectedYear] || DEFAULT_PERIODS["2026"]);
      }
    }

    fetchTargets();
    return () => { cancelled = true; };
  }, [selectedYear, venueId, canViewGoals]);

  if (accessLoading) return <main role="status">Checking access…</main>;
  if (accessError) return <main role="alert">Unable to check your access. Reload the page to try again.</main>;
  if (!venueId) return <main role="alert">Select a venue from the schedule to view its goals.</main>;
  if (!canViewGoals || requestError) {
    return <main role="alert">{requestError || "You do not have permission to view goals for this venue."}</main>;
  }

  return (
    <>
      <header className={"app-header"}>
        <div className={"header-left"}>
          <div className={"brand-logo"}>{"W"}</div>
          <div className={"venue-picker-header"}>
            <span className={"venue-title"} id={"goals-venue-name"}>{"Wedgewood Weddings"}</span>
            <span className={"venue-sub"}>{"Schedule · Pacific Time"}</span>
          </div>
          <a href="/staffing" onClick={event => { event.preventDefault(); history.back(); }} className={"back-link"} style={{"marginLeft": "20px"}}>{"‹ Back to schedule"}</a>
        </div>
        <div style={{"fontSize": "12px", "color": "#64748b"}}>{"Draft saved"}</div>
      </header>

      <nav className={"sub-nav-bar"}>
        <a href={"/staffing"} className={"sub-nav-tab"}>{"Schedule"}</a>
        <div className={"sub-nav-tab active"}>{"Goals & budgets"}</div>

        <div className={"sub-nav-tab"} style={{"color": "#94a3b8"}}>{"Help, history & sync"}</div>
        <div className={"sub-nav-tab"} style={{"color": "#94a3b8"}}>{"Prototype controls"}</div>
      </nav>

      <main className={"goals-container"}>
        <div className={"goals-header-row"}>
          <h1 className={"goals-title"}>{"Goals & budgets"}</h1>
          <a href="/staffing" onClick={event => { event.preventDefault(); history.back(); }} className={"back-link"}>{"‹ Back to schedule"}</a>
        </div>

        <div className={"section-subtitle"}>{`${selectedYear} monthly results & targets`}</div>

        <div className={"year-selector-wrap"}>
          <div>
            <label htmlFor={"year-select"} style={{"fontSize": "11px", "fontWeight": "700", "color": "#64748b", "display": "block", "marginBottom": "4px"}}>{"Year"}</label>
            <select
              id={"year-select"}
              className={"year-select"}
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
            >
              <option value="2026">2026</option>
              <option value="2027">2027</option>
            </select>
          </div>
          <div>
            <a href={"#accounting-calendar"} className={"accounting-link"}>{"Accounting calendar"}</a>
          </div>
          <div>
            <a href={"#trevor-workbook"} className={"workbook-link"}>{"Trevor’s LE workbook"}</a>
          </div>
        </div>

        <p className={"description-text"}>
          Accounting periods use the dates below for both guests and hours. Weeks run Monday–Sunday in a 4–4–5 pattern; January starts Jan 1 and December ends Dec 31.
        </p>
        <p className={"description-text"}>
          {selectedYear === "2026"
            ? "No separate targets were set for 2026. Jan–Sep are recorded actuals; Oct–Dec forecasts are planning references."
            : "2027 targets are the approved monthly labor efficiency targets set by Corporate Finance."}
        </p>

        <div className={"goals-table-card"}>
          <table className={"goals-table"}>
            <thead>
              <tr>
                <th>{"Accounting month"}</th>
                <th>{"Dates included"}</th>
                <th>{"Basis"}</th>
                <th>{"FOH target / reference"}</th>
                <th>{"FOH actual"}</th>
                <th>{"BOH target / reference"}</th>
                <th>{"BOH actual"}</th>
                <th>{"Staffed draft plan"}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.monthName}>
                  <td>
                    <span className={"month-title"}>{row.monthName}</span>
                    <a href={"#"} className={"view-weeks-link"}>{"View weeks"}</a>
                  </td>
                  <td>
                    {row.dates}
                    <span className={"date-range-sub"}>{row.sub}</span>
                  </td>
                  <td>{row.basis}</td>
                  <td>
                    {row.fohTarget != null ? (
                      <strong>{Number(row.fohTarget).toFixed(2)}</strong>
                    ) : (
                      <span className={"placeholder-dash"}>{"—"}</span>
                    )}
                  </td>
                  <td>
                    {row.fohActual != null ? (
                      <strong>{Number(row.fohActual).toFixed(2)}</strong>
                    ) : (
                      <span className={"placeholder-dash"}>{"—"}</span>
                    )}
                  </td>
                  <td>
                    {row.bohTarget != null ? (
                      <strong>{Number(row.bohTarget).toFixed(2)}</strong>
                    ) : (
                      <span className={"placeholder-dash"}>{"—"}</span>
                    )}
                  </td>
                  <td>
                    {row.bohActual != null ? (
                      <strong>{Number(row.bohActual).toFixed(2)}</strong>
                    ) : (
                      <span className={"placeholder-dash"}>{"—"}</span>
                    )}
                  </td>
                  <td>
                    <span className={"staffed-note"}>
                      {row.monthName === "November" && selectedYear === "2026" ? "9/13 events staffed" : "No staff assigned"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
