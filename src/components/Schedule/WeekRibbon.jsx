import React from 'react';

export default function WeekRibbon({
  weekStart,
  events = [],
  selectedDay,
  onSelectDay,
  activeEventId,
  onSelectEvent,
  viewMode = 'day',
  onViewModeChange,
}) {
  if (!weekStart) return null;

  const startDate = new Date(`${weekStart}T12:00:00`);
  if (Number.isNaN(startDate.getTime())) return null;

  // Generate 7 days from Monday to Sunday
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
    const monthDay = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const dayEvents = events.filter(e => e.eventDate === dateStr);
    return {
      dateStr,
      dayName,
      monthDay,
      events: dayEvents,
      isSelected: selectedDay === dateStr,
    };
  });

  return (
    <div className="week-ribbon-wrapper">
      <div className="view-switch-bar">
        <div className="view-toggle-group">
          <button
            type="button"
            className={`btn-view-toggle ${viewMode === 'day' ? 'active' : ''}`}
            onClick={() => onViewModeChange && onViewModeChange('day')}
          >
            Day view
          </button>
          <button
            type="button"
            className={`btn-view-toggle ${viewMode === 'week' ? 'active' : ''}`}
            onClick={() => onViewModeChange && onViewModeChange('week')}
          >
            Week view
          </button>
        </div>
      </div>

      <div className="week-days-strip" id="week-ribbon-container">
        {days.map(day => {
          const hasEvents = day.events.length > 0;
          const primaryEvent = day.events[0];
          const isSelected = day.isSelected;

          if (!hasEvents) {
            return (
              <div
                key={day.dateStr}
                className={`day-card empty-day ${isSelected ? 'selected' : ''}`}
                onClick={() => onSelectDay && onSelectDay(day.dateStr)}
              >
                <div className="day-card-header">
                  <span className="day-name">{day.dayName}</span>
                  <span className="day-date">{day.monthDay}</span>
                </div>
                <div className="day-card-body">
                  <div className="no-shifts-tag">
                    <span className="warning-icon" aria-hidden="true">⚠</span> No shifts
                  </div>
                  <div className="no-events-text">No events</div>
                </div>
              </div>
            );
          }

          return (
            <div
              key={day.dateStr}
              className={`day-card has-events ${isSelected ? 'active-day' : ''}`}
              onClick={() => {
                if (onSelectDay) onSelectDay(day.dateStr);
                if (primaryEvent && onSelectEvent) onSelectEvent(primaryEvent.id);
              }}
            >
              <div className="day-card-header">
                <span className="day-name">{day.dayName}</span>
                <span className="day-date">{day.monthDay}</span>
              </div>
              <div className="day-card-body">
                <div className="event-head-stat">
                  <span className="staff-count-icon">👥 {primaryEvent.guestCount ? Math.round(primaryEvent.guestCount / 10) : 6}</span>
                </div>
                <div className="day-event-title" title={primaryEvent.name}>
                  {primaryEvent.name}
                </div>
                <div className="day-event-meta">
                  {primaryEvent.guestCount ? `${primaryEvent.guestCount} guests` : '60 guests'} · 5 hours
                </div>
                  <div className="le-metrics-row">
                    <div className="le-stat">
                      <span className="le-label">FOH LE</span>
                      <span className="le-value" style={{ color: '#64748b' }}>—</span>
                    </div>
                    <div className="le-stat">
                      <span className="le-label">BOH LE</span>
                      <span className="le-value" style={{ color: '#64748b' }}>—</span>
                    </div>
                  </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
