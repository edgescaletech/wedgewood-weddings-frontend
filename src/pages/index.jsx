import React from "react";

export const styles = "";

export default function IndexPage() {
  return (<>
<header className={"app-header"}>
    <div className={"header-left"}>
      <div className={"brand-logo"}>{"W"}</div>
      <div className={"brand-info"}>
        <span className={"brand-name"}>{"WEDGEWOOD"}</span>
        <span className={"brand-tagline"}>{"Venue scheduling"}</span>
      </div>
    </div>

    <nav className={"flow-nav"}>
      <div className={"flow-step active"}>
        <span className={"step-num"}>{"1"}</span>
        <span className={"step-title"}>{"Events"}</span>
      </div>
      <span className={"step-sep"}>{"·"}</span>
      <a href={"/staffing/"} className={"flow-step"} id={"step2Nav"} style={{"textDecoration": "none", "color": "inherit"}}>
        <span className={"step-num"}>{"2"}</span>
        <span className={"step-title"}>{"Staffing plan"}</span>
      </a>
      <span className={"step-sep"}>{"·"}</span>
      <div className={"flow-step"}>
        <span className={"step-num"}>{"3"}</span>
        <span className={"step-title"}>{"Review & publish"}</span>
      </div>
    </nav>

    <div className={"header-right"}>
      <button className={"btn btn-outline btn-sm"} id={"btn-venue-settings"}>{"Venue settings"}</button>
    </div>
  </header>

  
  <section className={"planning-strip"}>
    <div className={"planning-container"}>
      <div className={"planning-meta"}>
        <span className={"planning-label"}>{"PLANNING WEEK"}</span>
        <h2 className={"planning-week-title"} id={"planning-week-title"}>{"Loading..."}</h2>
      </div>

      <div className={"week-picker-control"}>
        <label htmlFor={"week-date-input"} className={"picker-label"}>{"Go to week starting"}</label>
        <div className={"picker-group"}>
          <button className={"nav-arrow"} id={"btn-prev-week"} title={"Previous week"}>{"←"}</button>
          <input type={"date"} id={"week-date-input"} />
          <button className={"nav-arrow"} id={"btn-next-week"} title={"Next week"}>{"→"}</button>
          <button className={"btn btn-outline btn-sm"} id={"btn-sync-sf"} title={"Fetch latest updates from Salesforce directly"} style={{"marginLeft": "8px", "fontSize": "12px", "padding": "6px 12px", "display": "inline-flex", "alignItems": "center", "gap": "5px", "fontWeight": "600"}}>
            <span id={"sync-icon"}>{"🔄"}</span>{" "}<span id={"sync-text"}>{"Sync from SF"}</span>
          </button>
        </div>
      </div>
    </div>

    
    <div className={"week-tabs-container"}>
      <div className={"week-tabs"} id={"week-tabs"}>
        
      </div>
    </div>
  </section>

  
  <section className={"sub-header-strip"}>
    <div className={"sub-header-container"}>
      <div>
        <span className={"sub-label"} id={"sub-venue-label"}>{"VENUE EVENTS"}</span>
        <h1 className={"page-title"}>{"Review the week's events"}</h1>
        <p className={"page-subtitle"} id={"events-count-summary"}>{"Loading events from Salesforce..."}</p>
      </div>
      <a href={"/staffing/"} className={"btn btn-primary"} id={"btn-continue"} style={{"textDecoration": "none", "display": "inline-flex", "alignItems": "center"}}>{"Continue to staffing plan →"}</a>
    </div>
  </section>

  
  <main className={"events-workspace"}>
    
    <aside className={"events-sidebar"}>
      <div className={"sidebar-header"} style={{"display": "flex", "flexDirection": "column", "gap": "8px"}}>
        <div style={{"display": "flex", "justifyContent": "space-between", "alignItems": "center"}}>
          <h3>{"Events this week"}</h3>
          <span className={"badge-tag"} id={"sidebar-count-badge"} style={{"fontWeight": "700"}}>{"0"}</span>
        </div>
        <div className={"sidebar-search-box"}>
          <span className={"search-icon"}>{"🔍"}</span>
          <input type={"text"} id={"venue-search-input"} placeholder={"Search venue or couple..."} autoComplete={"off"} />
          <button id={"btn-clear-search"} className={"clear-search-btn"} title={"Clear search"} style={{"display": "none"}}>{"✕"}</button>
        </div>
        <select id={"venue-filter-select"} className={"venue-select-dropdown"}>
          <option value={"ALL"}>{"🏢 All Venues"}</option>
        </select>
      </div>

      <div className={"events-list"} id={"events-list"}>
        
        <div className={"loading-state"}>
          <div className={"spinner"}></div>
          <p>{"Connecting to Salesforce..."}</p>
        </div>
      </div>
    </aside>

    
    <section className={"event-detail-panel"} id={"event-detail-panel"}>
      
      <div className={"empty-selection-state"}>
        <p>{"Select an event from the left sidebar to view its details."}</p>
      </div>
    </section>
  </main>

  <footer className={"app-footer"}>
    <div className={"footer-container"}>
      <span>{"Connected to Salesforce Org: "}<strong>{"wedgewoodweddings"}</strong></span>
      <span>{"Live SOQL Sync · Wedgewood Scheduling V1"}</span>
    </div>
  </footer>
  </>);
}
