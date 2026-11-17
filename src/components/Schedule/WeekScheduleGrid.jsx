import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';

const ROLE_GROUPS = [
  {
    roleTitle: 'FOH · Banquet Captain',
    dept: 'foh',
    workers: [
      { id: 'w1', name: 'Leslie Knope', hours: '0 h', shifts: {} },
      { id: 'w2', name: 'Ted Lasso', hours: '0 h', shifts: { 3: { type: 'off', label: 'Off · all day' } } },
    ],
  },
  {
    roleTitle: 'FOH · Bartender',
    dept: 'foh',
    workers: [
      { id: 'w3', name: 'Roy Kent', hours: '0 h', shifts: {} },
      { id: 'w4', name: 'Monica Geller', hours: '0 h', shifts: {} },
    ],
  },
  {
    roleTitle: 'FOH · Server',
    dept: 'foh',
    workers: [
      { id: 'w5', name: 'Ben Wyatt', hours: '0 h', shifts: {} },
      { id: 'w6', name: 'Jim Halpert', hours: '0 h', shifts: {} },
      { id: 'w7', name: 'Pam Beesly', hours: '0 h', shifts: {} },
      { id: 'w8', name: 'Rebecca Welton', hours: '0 h', shifts: {} },
      { id: 'w9', name: 'Keeley Jones', hours: '0 h', shifts: {} },
      { id: 'w10', name: 'Chandler Bing', hours: '0 h', shifts: {} },
    ],
  },
  {
    roleTitle: 'BOH · Banquet Chef',
    dept: 'boh',
    workers: [
      { id: 'w11', name: 'Phoebe Buffay', hours: '0 h', shifts: {} },
    ],
  },
  {
    roleTitle: 'BOH · Prep Cook',
    dept: 'boh',
    workers: [
      { id: 'w12', name: 'Rachel Green', hours: '0 h', shifts: {} },
    ],
  },
  {
    roleTitle: 'BOH · Dishwasher',
    dept: 'boh',
    workers: [
      { id: 'w13', name: 'Ross Geller', hours: '0 h', shifts: {} },
    ],
  },
  {
    roleTitle: 'BOH · Cook',
    dept: 'boh',
    workers: [
      { id: 'w14', name: 'Joey Tribbiani', hours: '0 h', shifts: {} },
      { id: 'w15', name: 'Jake Peralta', hours: '0 h', shifts: {} },
    ],
  },
  {
    roleTitle: 'BOH · Kitchen Utility',
    dept: 'boh',
    workers: [
      { id: 'w16', name: 'Amy Santiago', hours: '0 h', shifts: {} },
    ],
  },
];

export default function WeekScheduleGrid({ weekStart, events = [] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('all');
  const { hasPermission } = useAuth();
  const canEditSchedules = hasPermission('edit_schedule');

  const startDate = new Date(`${weekStart}T12:00:00`);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    const dayEvts = events.filter(e => e.eventDate === dateStr);
    return {
      index: i,
      dateStr,
      dayLabel,
      events: dayEvts,
    };
  });

  const filterRoleGroups = () => {
    return ROLE_GROUPS.filter(rg => {
      if (selectedDept !== 'all' && rg.dept !== selectedDept) return false;
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      if (rg.roleTitle.toLowerCase().includes(term)) return true;
      return rg.workers.some(w => w.name.toLowerCase().includes(term));
    }).map(rg => {
      if (!searchTerm) return rg;
      const term = searchTerm.toLowerCase();
      return {
        ...rg,
        workers: rg.workers.filter(w =>
          w.name.toLowerCase().includes(term) || rg.roleTitle.toLowerCase().includes(term)
        ),
      };
    });
  };

  const filteredGroups = filterRoleGroups();

  return (
    <section className="week-schedule-container">
      <div style={{ background: '#fef2f2', borderBottom: '1px solid #fecaca', padding: '6px 16px', fontSize: '11px', color: '#dc2626', fontWeight: 'bold' }}>
        ⚠️ Values highlighted in red are static simulated data (ADP employee roster & shift scheduling integration pending)
      </div>
      <div className="week-schedule-header-bar">
        <h2 className="week-schedule-title">Week schedule</h2>
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
          <button type="button" className="editing-help-link" onClick={() => alert('Click + in any cell to schedule a shift for that worker on that day.')}>
            Editing help
          </button>
        </div>
      </div>

      {/* Week Matrix Table */}
      <div className="week-matrix-table-wrapper">
        <table className="week-matrix-table">
          <thead>
            <tr>
              <th className="worker-header-cell">Worker / week hours</th>
              {days.map(day => {
                const primary = day.events[0];
                return (
                  <th key={day.dateStr} className="day-col-header-cell">
                    <div className="col-day-title">{day.dayLabel}</div>
                    <div className="col-day-event" title={primary?.name || 'No events'}>
                      {primary ? primary.name : 'No events'}
                    </div>
                    <div className="col-day-shifts-tag">
                      <span className="warning-icon">⚠</span> No shifts
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {filteredGroups.map(group => (
              <React.Fragment key={group.roleTitle}>
                <tr className="role-group-header-row">
                  <td colSpan={8} className="role-group-header-cell">
                    {group.roleTitle}
                  </td>
                </tr>
                {group.workers.map(w => (
                  <tr key={w.id} className="worker-matrix-row">
                    <td className="worker-label-cell">
                      <div className="worker-meta">
                        <span className="worker-name" style={{ color: '#dc2626' }}>{w.name}</span>
                        <span className="worker-hours" style={{ color: '#dc2626' }}>{w.hours}</span>
                      </div>
                    </td>
                    {days.map(day => {
                      const shift = w.shifts[day.index];
                      return (
                        <td key={day.dateStr} className="day-matrix-cell">
                          {shift ? (
                            shift.type === 'off' ? (
                              <div className="cell-off-badge" style={{ color: '#dc2626' }}>
                                {shift.label}
                              </div>
                            ) : (
                              <div className="cell-shift-badge" style={{ color: '#dc2626' }}>
                                {shift.label}
                              </div>
                            )
                          ) : (
                            <button
                              type="button"
                              className="btn-add-cell-shift"
                              disabled={!canEditSchedules}
                              title={`Add shift for ${w.name} on ${day.dayLabel}`}
                            >
                              +
                            </button>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

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
