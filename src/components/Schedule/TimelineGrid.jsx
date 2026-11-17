import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';

const DEFAULT_FOH_WORKERS = [
  { id: 'w1', name: 'Leslie Knope', hours: '25.5 h', startTime: '5 PM', endTime: '1:30 AM', role: 'Banquet Captain', shiftBar: '5–1:30 +1 day', leftPct: 56, widthPct: 35 },
  { id: 'w2', name: 'Ted Lasso', hours: '0 h', startTime: '', endTime: '', role: 'Banquet Captain', shiftBar: null },
  { id: 'w3', name: 'Roy Kent', hours: '19.5 h', startTime: '6 PM', endTime: '12:30 AM', role: 'Bartender', shiftBar: '6–12:30 +1 day', leftPct: 62, widthPct: 27 },
  { id: 'w4', name: 'Monica Geller', hours: '0 h', startTime: '', endTime: '', role: 'Bartender', shiftBar: null },
  { id: 'w5', name: 'Ben Wyatt', hours: '13 h', startTime: '', endTime: '', role: 'Server', shiftBar: null },
  { id: 'w6', name: 'Jim Halpert', hours: '21 h', startTime: '6 PM', endTime: '1 AM', role: 'Server', shiftBar: '6–1 +1 day', leftPct: 62, widthPct: 29 },
  { id: 'w7', name: 'Pam Beesly', hours: '19.5 h', startTime: '7 PM', endTime: '1:30 AM', role: 'Server', shiftBar: '7–1:30 +1 day', leftPct: 68, widthPct: 27 },
  { id: 'w8', name: 'Rebecca Welton', hours: '6.5 h', startTime: '', endTime: '', role: 'Server', shiftBar: null },
  { id: 'w9', name: 'Keeley Jones', hours: '0 h', startTime: '', endTime: '', role: 'Server', shiftBar: null },
  { id: 'w10', name: 'Chandler Bing', hours: '0 h', startTime: '', endTime: '', role: 'Server', shiftBar: null },
];

const DEFAULT_BOH_WORKERS = [
  { id: 'w11', name: 'Phoebe Buffay', hours: '27 h', startTime: '2 PM', endTime: '11 PM', role: 'Banquet Chef', shiftBar: '2–11', leftPct: 37, widthPct: 37 },
  { id: 'w12', name: 'Rachel Green', hours: '0 h', startTime: '', endTime: '', role: 'Prep Cook', shiftBar: null },
  { id: 'w13', name: 'Ross Geller', hours: '6.5 h', startTime: '', endTime: '', role: 'Dishwasher', shiftBar: null },
  { id: 'w14', name: 'Joey Tribbiani', hours: '14 h', startTime: '', endTime: '', role: 'Cook', shiftBar: null },
  { id: 'w15', name: 'Jake Peralta', hours: '0 h', startTime: '', endTime: '', role: 'Cook', shiftBar: null },
  { id: 'w16', name: 'Amy Santiago', hours: '24 h', startTime: '5:30 PM', endTime: '1:30 AM', role: 'Kitchen Utility', shiftBar: '5:30–1:30 +1 day', leftPct: 59, widthPct: 33 },
];

export default function TimelineGrid({ activeEvent }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('all');
  const { hasPermission } = useAuth();
  const canEditSchedules = hasPermission('edit_schedule');

  const filterWorkers = (workers) => {
    return workers.filter(w => {
      const matchSearch = w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          w.role.toLowerCase().includes(searchTerm.toLowerCase());
      return matchSearch;
    });
  };

  const fohFiltered = selectedDept === 'boh' ? [] : filterWorkers(DEFAULT_FOH_WORKERS);
  const bohFiltered = selectedDept === 'foh' ? [] : filterWorkers(DEFAULT_BOH_WORKERS);

  const eventTitle = activeEvent?.name || 'Charlie + Quinn Wedding';
  const eventTimeText = (activeEvent?.startTime && activeEvent?.endTime)
    ? `Event ${activeEvent.startTime}–${activeEvent.endTime}`
    : null;
  const barTimeText = (activeEvent?.barStartTime && activeEvent?.barCloseTime)
    ? `Bar ${activeEvent.barStartTime}–${activeEvent.barCloseTime}`
    : null;

  return (
    <section className="roster-card">
      {/* Notice indicating static values highlighted in red */}
      <div style={{ background: '#fef2f2', borderBottom: '1px solid #fecaca', padding: '6px 16px', fontSize: '11px', color: '#dc2626', fontWeight: 'bold' }}>
        ⚠️ Values highlighted in red are static simulated data (ADP employee roster & shift scheduling integration pending)
      </div>

      <div className="roster-toolbar">
        <div className="roster-filter-controls">
          <input
            type="text"
            className="roster-search"
            placeholder="Find an employee..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Find an employee"
          />
          <select
            className="btn btn-outline dept-select"
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            aria-label="Filter by department"
          >
            <option value="all">All departments</option>
            <option value="foh">FOH (Front of House)</option>
            <option value="boh">BOH (Back of House)</option>
          </select>
        </div>
        <div className="toolbar-right">
          <button type="button" className="editing-help-link" onClick={() => alert('Drag timeline bars or click start/end times to edit shifts.')}>
            Editing help
          </button>
        </div>
      </div>

      <div className="timeline-header-row">
        <div className="worker-col-header">
          <span>Worker / week hours</span>
          <span className="role-sub-header">Start - End - Role</span>
        </div>
        <div className="hours-axis">
          <span>8 AM</span>
          <span>12 PM</span>
          <span>4 PM</span>
          <span>8 PM</span>
          <span>12 AM</span>
        </div>
      </div>

      <div className="event-span-row">
        <div className="event-span-info" title={eventTitle}>
          {eventTitle}
        </div>
        <div className="event-span-timeline">
          <div className="event-green-bar">
            {eventTimeText ? <span>{eventTimeText}</span> : <span style={{ color: '#dc2626' }}>Event 7 PM–12 AM</span>}
          </div>
          <div className="bar-sub-line">
            {barTimeText ? <span>{barTimeText}</span> : <span style={{ color: '#dc2626' }}>Bar 7 PM–11:30 PM</span>}
          </div>
        </div>
      </div>

      {fohFiltered.length > 0 && (
        <div className="dept-block">
          <div className="dept-header-row">
            <span className="dept-title">FOH</span>
            <span className="dept-count">{fohFiltered.length} workers</span>
          </div>
          {fohFiltered.map(w => (
            <WorkerRow key={w.id} worker={w} canEdit={canEditSchedules} />
          ))}
        </div>
      )}

      {bohFiltered.length > 0 && (
        <div className="dept-block">
          <div className="dept-header-row">
            <span className="dept-title">BOH</span>
            <span className="dept-count">{bohFiltered.length} workers</span>
          </div>
          {bohFiltered.map(w => (
            <WorkerRow key={w.id} worker={w} canEdit={canEditSchedules} />
          ))}
        </div>
      )}

      <footer className="timeline-footer">
        <span className="prototype-note">
          Prototype · <span style={{ color: '#dc2626' }}>ADP simulated</span> · <span style={{ color: '#dc2626' }}>Fictional venue, people, events and targets</span>
        </span>
        <button type="button" className="footer-link-button">
          Help, history & sync
        </button>
      </footer>
    </section>
  );
}

function WorkerRow({ worker, canEdit }) {
  const [role, setRole] = useState(worker.role);

  return (
    <div className="worker-row">
      <div className="worker-info-col">
        <div className="worker-identity">
          <span className="drag-handle" aria-hidden="true">⠿</span>
          {/* Static worker name in RED */}
          <span className="worker-name" style={{ color: '#dc2626' }}>{worker.name}</span>
          {/* Static worker hours in RED */}
          <span className="worker-hours" style={{ color: '#dc2626' }}>{worker.hours}</span>
        </div>
        <div className="worker-shift-fields">
          {/* Static time range in RED */}
          <div className="time-range-box" style={{ color: '#dc2626', borderColor: '#fca5a5' }}>
            <span>{worker.startTime || 'Start'}</span>
            <span className="dash">–</span>
            <span>{worker.endTime || 'End'}</span>
          </div>
          {/* Static role select in RED */}
          <select
            className="worker-role-select"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            disabled={!canEdit}
            style={{ color: '#dc2626', borderColor: '#fca5a5' }}
            aria-label={`Role for ${worker.name}`}
          >
            <option value="Banquet Captain">Banquet Captain</option>
            <option value="Bartender">Bartender</option>
            <option value="Server">Server</option>
            <option value="Banquet Chef">Banquet Chef</option>
            <option value="Prep Cook">Prep Cook</option>
            <option value="Cook">Cook</option>
            <option value="Dishwasher">Dishwasher</option>
            <option value="Kitchen Utility">Kitchen Utility</option>
          </select>
          {worker.shiftBar && (
            <button type="button" className="btn-clear-shift" title="Remove shift">✕</button>
          )}
        </div>
      </div>

      <div className="worker-timeline-col">
        {/* Static shift bar in RED */}
        {worker.shiftBar && (
          <div
            className="shift-block"
            style={{
              left: `${worker.leftPct}%`,
              width: `${worker.widthPct}%`,
              background: '#fef2f2',
              borderColor: '#f87171',
              color: '#dc2626',
            }}
          >
            <span>{worker.shiftBar}</span>
          </div>
        )}
        <div className="row-action-buttons">
          <button type="button" className="btn-row-add" title="Add shift">+</button>
          <button type="button" className="btn-row-more" title="More actions">···</button>
        </div>
      </div>
    </div>
  );
}
