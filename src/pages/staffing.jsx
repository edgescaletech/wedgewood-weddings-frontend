import React from "react";

import styles from "./staffing.css?inline";
export { styles };

export default function StaffingPage() {
  return (<>
<header className={"app-header"}>
    <div className={"header-left"}>
      <div className={"brand-logo"}>{"W"}</div>
      <div className={"venue-picker-header"}>
        <span className={"venue-title"} id={"active-venue-name"}>{"Loading venue..."}</span>
        <span className={"venue-sub"}>{"Schedule · Pacific Time"}</span>
      </div>
    </div>

    <div className={"week-controls-header"} aria-label={"Planning week controls"}>
      <button className={"week-header-arrow"} id={"prev-week"} aria-label={"Previous week"}>{"‹"}</button>
      <label className={"week-range-control"} htmlFor={"week-picker"}>
        <span className={"week-range-label"} id={"week-range-label"}>{"Selected week"}</span>
        <span className={"week-range-month"} id={"week-range-month"}></span>
        <input type={"date"} id={"week-picker"} aria-label={"Choose a date to view its week"} />
      </label>
      <button className={"week-header-arrow"} id={"next-week"} aria-label={"Next week"}>{"›"}</button>
      <button className={"this-week-button"} id={"this-week-button"} type={"button"}>{"This week"}</button>
    </div>

    
    <nav className={"flow-nav"}>
      <a href={"/"} className={"flow-step"}>
        <span className={"step-num"}>{"1"}</span>
        <span>{"Events"}</span>
      </a>
      <span style={{"color": "#cbd5e1"}}>{"·"}</span>
      <div className={"flow-step active"}>
        <span className={"step-num"}>{"2"}</span>
        <span>{"Staffing plan"}</span>
      </div>
      <span style={{"color": "#cbd5e1"}}>{"·"}</span>
      <div className={"flow-step"}>
        <span className={"step-num"}>{"3"}</span>
        <span>{"Review & publish"}</span>
      </div>
    </nav>

    
    <div className={"header-right"}>
      <span className={"badge-draft"}>{"Draft storage not connected"}</span>
      <button className={"btn btn-primary"} id={"btn-publish-adp"} disabled title={"ADP publishing is not connected"}>{"Publish to ADP"}</button>
    </div>
  </header>

  
  <section className={"labor-plan-strip"}>
    <div style={{"display": "flex", "justifyContent": "space-between", "alignItems": "center", "marginBottom": "8px"}}>
      <div className={"labor-plan-title"} style={{"marginBottom": "0"}}>{"Labor plan"}</div>
      <a href={"/goals/"} style={{"fontSize": "12px", "fontWeight": "700", "color": "#166534", "textDecoration": "underline"}} id={"link-goals-budgets"}>{"Goals & budgets"}</a>
    </div>
    <div className={"labor-plan-grid"}>
      <div className={"plan-period"}>
        <h3>{"This week’s plan"}</h3>
        <p id={"plan-week-dates"}>{"Selected week"}</p>
      </div>
      <div className={"metric-box"}>
        <div className={"metric-label"}>{"FOH LE"}</div>
        <div className={"metric-val"}><span>{"—"}</span></div>
        <div className={"metric-diff"}></div>
      </div>
      <div className={"metric-box"}>
        <div className={"metric-label"}>{"BOH LE"}</div>
        <div className={"metric-val"}><span>{"—"}</span></div>
        <div className={"metric-diff"}></div>
      </div>
      <div className={"metric-box"}>
        <div className={"metric-label"}>{"Pub budget"}</div>
        <div className={"metric-val"}><span>{"—"}</span></div>
        <div className={"metric-diff"}></div>
      </div>
    </div>
    <div className={"labor-plan-grid monthly-plan-row"}>
      <div className={"plan-period"}>
        <h3 id={"plan-month-label"}>{"This month"}</h3>
        <p>{"Monthly plan"}</p>
      </div>
      <div className={"metric-box"}><div className={"metric-label"}>{"FOH LE"}</div><div className={"metric-val"}><span>{"—"}</span></div><div className={"metric-diff"}></div></div>
      <div className={"metric-box"}><div className={"metric-label"}>{"BOH LE"}</div><div className={"metric-val"}><span>{"—"}</span></div><div className={"metric-diff"}></div></div>
      <div className={"metric-box"}><div className={"metric-label"}>{"Pub budget"}</div><div className={"metric-val"}><span>{"—"}</span></div><div className={"metric-diff"}></div></div>
    </div>
    <div className={"labor-source-state"}>{"Labor goals and budgets are unavailable until their data source is connected."}</div>
  </section>

  <div className={"staffing-view-bar"} role={"tablist"} aria-label={"Schedule view"}>
    <button className={"staffing-view-button active"} id={"day-view-button"} type={"button"} role={"tab"} aria-selected={"true"}>{"Day view"}</button>
    <button className={"staffing-view-button"} id={"week-view-button"} type={"button"} role={"tab"} aria-selected={"false"}>{"Week view"}</button>
    <button className={"staffing-view-button"} id={"staffing-view-button"} type={"button"} role={"tab"} aria-selected={"false"}>{"Staffing"}</button>
    <div className={"coverage-summary"}>{"Coverage gaps · "}<span id={"coverage-gap-value"}>{"—"}</span></div>
  </div>

  
  <section className={"week-days-strip"} id={"week-ribbon-container"}>
    
  </section>

  
  <main className={"workspace-main"}>

    
    <div className={"day-action-bar"}>
      <div className={"day-action-title"}>
        <h2 id={"current-day-heading"}>{"Loading Event..."}</h2>
        <p id={"current-day-summary"}>{"Loading event details..."}</p>
      </div>
      <div className={"day-controls"}>
        <select className={"btn btn-outline"} id={"event-selector-dropdown"}>
          
        </select>
        <button className={"btn btn-outline"} id={"btn-toggle-inputs"}>{"Hide planning inputs"}</button>
        <button className={"btn btn-outline"} id={"btn-beo-pdf"} title={"BEO PDF access is not connected"} disabled>{"BEO PDF"}</button>
        <button className={"btn btn-outline"} disabled title={"Staff roster is not connected"}>{"Focus roster"}</button>
      </div>
    </div>

    
    <section className={"planning-inputs-card"} id={"planning-inputs-container"}>
      <div className={"planning-header"}>
        <span>{"Planning inputs · "}<strong id={"planning-event-title"}>{"Loading..."}</strong></span>
        <span style={{"color": "#64748b", "fontSize": "11px"}} id={"quote-number-tag"}>{"Salesforce CPQ Quote"}</span>
      </div>

      <div className={"planning-grid"}>
        
        <div className={"planning-cell"}>
          <div className={"cell-label"}>
            <span>{"Guests"}</span>
            
          </div>
          <div className={"cell-val"} id={"val-guests"}>{"Loading..."}</div>
          <div className={"cell-sub"} id={"sub-guests"}></div>
        </div>

        
        <div className={"planning-cell"}>
          <div className={"cell-label"}>
            <span>{"Ceremony"}</span>
            
          </div>
          <div className={"cell-val"} id={"val-ceremony"}>{"Loading..."}</div>
          <div className={"cell-sub"} id={"sub-ceremony"}></div>
        </div>

        
        <div className={"planning-cell"}>
          <div className={"cell-label"}>
            <span>{"Meal"}</span>
            
          </div>
          <div className={"cell-val"} id={"val-meal"}>{"Loading..."}</div>
          <div className={"cell-sub"} id={"sub-meal"}></div>
        </div>

        
        <div className={"planning-cell"}>
          <div className={"cell-label"}>
            <span>{"Bar"}</span>
            
          </div>
          <div className={"cell-val"} id={"val-bar"}>{"Loading..."}</div>
          <div className={"cell-sub"} id={"sub-bar"}></div>
        </div>

        
        <div className={"planning-cell"}>
          <div className={"cell-label"}>
            <span>{"Reception / event"}</span>
            
          </div>
          <div className={"cell-val"} id={"val-reception"}>{"Loading..."}</div>
          <div className={"cell-sub"}></div>
        </div>

        
        <div className={"planning-cell"}>
          <div className={"cell-label"}>
            <span>{"Appetizers / action stations"}</span>
            
          </div>
          <div className={"cell-val"} id={"val-appetizers"}>{"Loading..."}</div>
          <div className={"cell-sub"}></div>
        </div>

        
        <div className={"planning-cell"}>
          <div className={"cell-label"}>
            <span>{"Signature drinks / prep"}</span>
            
          </div>
          <div className={"cell-val"} id={"val-signature-drinks"}>{"Loading..."}</div>
          <div className={"cell-sub"}></div>
        </div>

        
        <div className={"planning-cell"}>
          <div className={"cell-label"}>
            <span>{"Welcome champagne / wall"}</span>
            
          </div>
          <div className={"cell-val"} id={"val-champagne"}>{"Loading..."}</div>
          <div className={"cell-sub"}></div>
        </div>

        
        <div className={"planning-cell"}>
          <div className={"cell-label"}>
            <span>{"Table settings"}</span>
            
          </div>
          <div className={"cell-val"} id={"val-table-settings"} style={{"fontSize": "12.5px"}}>{"Loading..."}</div>
          <div className={"cell-sub"}></div>
        </div>

        
        <div className={"planning-cell"}>
          <div className={"cell-label"}>
            <span>{"Photo booth / attendant"}</span>
            
          </div>
          <div className={"cell-val"} id={"val-photobooth"}>{"Loading..."}</div>
          <div className={"cell-sub"}></div>
        </div>

        
        <div className={"planning-cell"} style={{"gridColumn": "span 2"}}>
          <div className={"cell-label"}>
            <span>{"Extras / special instructions"}</span>
            
          </div>
          <div className={"cell-val"} id={"val-extras"} style={{"fontSize": "12.5px"}}>{"Loading..."}</div>
          <div className={"cell-sub"}></div>
        </div>

        
        <div className={"full-width-cell"}>
          <span style={{"fontWeight": "700", "color": "#475569", "whiteSpace": "nowrap"}}>{"GM working note:"}</span>
          <input type={"text"} className={"gm-input-field"} id={"gm-note-input"} placeholder={"Notes unavailable until draft storage is connected"} disabled />
          <span className={"value-unavailable"}>{"Notes storage is not connected"}</span>
        </div>
      </div>
    </section>

    
    <section className={"roster-card"}>
      <div className={"roster-toolbar"}>
        <div style={{"display": "flex", "gap": "10px", "alignItems": "center"}}>
          <input type={"text"} className={"roster-search"} placeholder={"Find an employee..."} disabled aria-label={"Employee search unavailable"} />
          <select className={"btn btn-outline"} style={{"padding": "5px 10px"}} disabled aria-label={"Department filter unavailable"}>
            <option>{"All departments"}</option>
          </select>
        </div>
        <div></div>
      </div>
      <div className={"timeline-header-row"}>
        <div className={"worker-col-header"}>{"Worker / week hours · Role"}</div>
        <div className={"hours-axis"}><span>{"6 AM"}</span><span>{"10 AM"}</span><span>{"2 PM"}</span><span>{"6 PM"}</span><span>{"10 PM"}</span><span>{"2 AM +1"}</span><span>{"Status"}</span></div>
      </div>
      <div className={"event-span-row"}>
        <div style={{"paddingLeft": "16px", "color": "#065f46", "fontWeight": "800", "whiteSpace": "nowrap", "overflow": "hidden", "textOverflow": "ellipsis"}} id={"timeline-event-name"}>{"Selected event"}</div>
        <div style={{"position": "relative", "height": "26px"}}><div className={"event-span-bar"} id={"timeline-event-bar"}></div></div>
      </div>
      <div className={"adp-unavailable-state"} id={"adp-unavailable-state"}>{"\n        ADP is not connected. Employee availability, planned shifts, and coverage are not available yet.\n      "}</div>
      <div className={"timeline-departments"}>
        <div className={"dept-header-row"}><span>{"Open shifts"}</span><span></span></div>
        <div className={"worker-row"} aria-hidden={"true"}><div className={"worker-info"}></div><div className={"timeline-canvas"}></div></div>
        <div className={"dept-header-row"}><span>{"FOH"}</span><span>{"Front of house"}</span></div>
        <div className={"worker-row"} aria-hidden={"true"}><div className={"worker-info"}></div><div className={"timeline-canvas"}></div></div>
        <div className={"dept-header-row"}><span>{"BOH"}</span><span>{"Back of house"}</span></div>
        <div className={"worker-row"} aria-hidden={"true"}><div className={"worker-info"}></div><div className={"timeline-canvas"}></div></div>
        <div className={"dept-header-row"}><span>{"PUB"}</span><span>{"Bar"}</span></div>
        <div className={"worker-row"} aria-hidden={"true"}><div className={"worker-info"}></div><div className={"timeline-canvas"}></div></div>
        <div className={"dept-header-row"}><span>{"Bev Cart"}</span><span></span></div>
        <div className={"worker-row"} aria-hidden={"true"}><div className={"worker-info"}></div><div className={"timeline-canvas"}></div></div>
        <div className={"dept-header-row"}><span>{"Snack Bar"}</span><span></span></div>
        <div className={"worker-row"} aria-hidden={"true"}><div className={"worker-info"}></div><div className={"timeline-canvas"}></div></div>
      </div>
    </section>

  </main>
  </>);
}
