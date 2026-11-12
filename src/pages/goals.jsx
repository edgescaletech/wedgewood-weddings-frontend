import React from "react";

import styles from "./goals.css?inline";
export { styles };

export default function GoalsPage() {
  return (<>
<header className={"app-header"}>
    <div className={"header-left"}>
      <div className={"brand-logo"}>{"W"}</div>
      <div className={"venue-picker-header"}>
        <span className={"venue-title"} id={"goals-venue-name"}>{"Wedgewood Weddings"}</span>
        <span className={"venue-sub"}>{"Schedule · Pacific Time"}</span>
      </div>
      <a href="/staffing/" onClick={event => { event.preventDefault(); history.back(); }} className={"back-link"} style={{"marginLeft": "20px"}}>{"‹ Back to schedule"}</a>
    </div>
    <div style={{"fontSize": "12px", "color": "#64748b"}}>{"\n      Draft saved\n    "}</div>
  </header>

  
  <nav className={"sub-nav-bar"}>
    <a href={"/staffing/"} className={"sub-nav-tab"}>{"Schedule"}</a>
    <div className={"sub-nav-tab active"}>{"Goals & budgets"}</div>
    <div className={"sub-nav-tab"} style={{"color": "#94a3b8"}}>{"Help, history & sync"}</div>
    <div className={"sub-nav-tab"} style={{"color": "#94a3b8"}}>{"Prototype controls"}</div>
  </nav>

  
  <main className={"goals-container"}>
    <div className={"goals-header-row"}>
      <h1 className={"goals-title"}>{"Goals & budgets"}</h1>
      <a href="/staffing/" onClick={event => { event.preventDefault(); history.back(); }} className={"back-link"}>{"‹ Back to schedule"}</a>
    </div>

    <div className={"section-subtitle"}>{"2026 monthly results & targets"}</div>

    <div className={"year-selector-wrap"}>
      <div>
        <label htmlFor={"year-select"} style={{"fontSize": "11px", "fontWeight": "700", "color": "#64748b", "display": "block", "marginBottom": "4px"}}>{"Year"}</label>
        <select id={"year-select"} className={"year-select"}>
          <option>{"2026"}</option>
          <option>{"2025"}</option>
        </select>
      </div>
      <div>
        <a href={"#accounting-calendar"} className={"accounting-link"}>{"Accounting calendar"}</a>
      </div>
      <div>
        <a href={"#trevor-workbook"} className={"workbook-link"}>{"Trevor’s LE workbook"}</a>
      </div>
    </div>

    <p className={"description-text"}>{"\n      Accounting periods use the dates below for both guests and hours. Weeks run Monday–Sunday in a 4–4–5 pattern; January starts Jan 1 and December ends Dec 31.\n    "}</p>
    <p className={"description-text"}>{"\n      No separate targets were set for 2026. Jan–Sep are recorded actuals; Oct–Dec forecasts are planning references.\n    "}</p>

    
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
          <tr>
            <td>
              <span className={"month-title"}>{"January"}</span>
              <a href={"#"} className={"view-weeks-link"}>{"View weeks"}</a>
            </td>
            <td>{"Jan 1–Feb 1"}<span className={"date-range-sub"}>{"32 days · year boundary"}</span></td>
            <td>{"Actual"}</td>
            <td><span className={"placeholder-dash"}>{"—"}</span></td>
            <td><strong>{"2.31"}</strong></td>
            <td><span className={"placeholder-dash"}>{"—"}</span></td>
            <td><strong>{"5.51"}</strong></td>
            <td><span className={"staffed-note"}>{"No staff assigned"}</span></td>
          </tr>
          <tr>
            <td>
              <span className={"month-title"}>{"February"}</span>
              <a href={"#"} className={"view-weeks-link"}>{"View weeks"}</a>
            </td>
            <td>{"Feb 2–Mar 1"}<span className={"date-range-sub"}>{"28 days · 4 weeks"}</span></td>
            <td>{"Actual"}</td>
            <td><span className={"placeholder-dash"}>{"—"}</span></td>
            <td><strong>{"2.28"}</strong></td>
            <td><span className={"placeholder-dash"}>{"—"}</span></td>
            <td><strong>{"5.14"}</strong></td>
            <td><span className={"staffed-note"}>{"No staff assigned"}</span></td>
          </tr>
          <tr>
            <td>
              <span className={"month-title"}>{"March"}</span>
              <a href={"#"} className={"view-weeks-link"}>{"View weeks"}</a>
            </td>
            <td>{"Mar 2–Apr 5"}<span className={"date-range-sub"}>{"35 days · 5 weeks"}</span></td>
            <td>{"Actual"}</td>
            <td><span className={"placeholder-dash"}>{"—"}</span></td>
            <td><strong>{"2.51"}</strong></td>
            <td><span className={"placeholder-dash"}>{"—"}</span></td>
            <td><strong>{"5.59"}</strong></td>
            <td><span className={"staffed-note"}>{"No staff assigned"}</span></td>
          </tr>
          <tr>
            <td>
              <span className={"month-title"}>{"April"}</span>
              <a href={"#"} className={"view-weeks-link"}>{"View weeks"}</a>
            </td>
            <td>{"Apr 6–May 3"}<span className={"date-range-sub"}>{"28 days · 4 weeks"}</span></td>
            <td>{"Actual"}</td>
            <td><span className={"placeholder-dash"}>{"—"}</span></td>
            <td><strong>{"2.58"}</strong></td>
            <td><span className={"placeholder-dash"}>{"—"}</span></td>
            <td><strong>{"6.40"}</strong></td>
            <td><span className={"staffed-note"}>{"No staff assigned"}</span></td>
          </tr>
          <tr>
            <td>
              <span className={"month-title"}>{"May"}</span>
              <a href={"#"} className={"view-weeks-link"}>{"View weeks"}</a>
            </td>
            <td>{"May 4–May 31"}<span className={"date-range-sub"}>{"28 days · 4 weeks"}</span></td>
            <td>{"Actual"}</td>
            <td><span className={"placeholder-dash"}>{"—"}</span></td>
            <td><strong>{"2.04"}</strong></td>
            <td><span className={"placeholder-dash"}>{"—"}</span></td>
            <td><strong>{"4.88"}</strong></td>
            <td><span className={"staffed-note"}>{"No staff assigned"}</span></td>
          </tr>
          <tr>
            <td>
              <span className={"month-title"}>{"June"}</span>
              <a href={"#"} className={"view-weeks-link"}>{"View weeks"}</a>
            </td>
            <td>{"Jun 1–Jul 5"}<span className={"date-range-sub"}>{"35 days · 5 weeks"}</span></td>
            <td>{"Actual"}</td>
            <td><span className={"placeholder-dash"}>{"—"}</span></td>
            <td><strong>{"2.85"}</strong></td>
            <td><span className={"placeholder-dash"}>{"—"}</span></td>
            <td><strong>{"6.53"}</strong></td>
            <td><span className={"staffed-note"}>{"No staff assigned"}</span></td>
          </tr>
          <tr>
            <td>
              <span className={"month-title"}>{"July"}</span>
              <a href={"#"} className={"view-weeks-link"}>{"View weeks"}</a>
            </td>
            <td>{"Jul 6–Aug 2"}<span className={"date-range-sub"}>{"28 days · 4 weeks"}</span></td>
            <td>{"Actual"}</td>
            <td><span className={"placeholder-dash"}>{"—"}</span></td>
            <td><strong>{"2.67"}</strong></td>
            <td><span className={"placeholder-dash"}>{"—"}</span></td>
            <td><strong>{"6.22"}</strong></td>
            <td><span className={"staffed-note"}>{"No staff assigned"}</span></td>
          </tr>
          <tr>
            <td>
              <span className={"month-title"}>{"August"}</span>
              <a href={"#"} className={"view-weeks-link"}>{"View weeks"}</a>
            </td>
            <td>{"Aug 3–Aug 30"}<span className={"date-range-sub"}>{"28 days · 4 weeks"}</span></td>
            <td>{"Actual"}</td>
            <td><span className={"placeholder-dash"}>{"—"}</span></td>
            <td><strong>{"2.52"}</strong></td>
            <td><span className={"placeholder-dash"}>{"—"}</span></td>
            <td><strong>{"5.52"}</strong></td>
            <td><span className={"staffed-note"}>{"No staff assigned"}</span></td>
          </tr>
        </tbody>
      </table>
    </div>
  </main>
  </>);
}
