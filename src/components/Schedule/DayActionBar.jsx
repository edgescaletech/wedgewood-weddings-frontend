import { syncWarningText } from './event-sync.js';
import React from 'react';

export default function DayActionBar({
  selectedDate,
  events = [],
  activeEvent,
  onSelectEvent,
  onToggleEventDetails,
  showEventDetails = false,
  onOpenBeoPdf,
}) {
  const formattedDate = selectedDate ? new Date(`${selectedDate}T12:00:00`).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }) : 'Select a date';

  const eventName = activeEvent?.name || (events[0]?.name ?? 'Event');

  return (
    <div className="day-action-bar-wrapper">
      <div className="day-action-bar">
        <div className="day-action-title">
          <h2 id="current-day-heading">{formattedDate}</h2>
        </div>

        <div className="day-controls">
          {events.length > 1 ? (
            <select
              className="btn btn-outline event-dropdown"
              id="event-selector-dropdown"
              value={activeEvent?.id || ''}
              onChange={(e) => onSelectEvent && onSelectEvent(e.target.value)}
              aria-label="Select event"
            >
              {events.map(evt => (
                <option key={evt.id} value={evt.id}>
                  {evt.name}{evt.guestCount ? ` (${evt.guestCount} guests)` : ''}{syncWarningText(evt) ? ' · Unverified sync' : ''}
                </option>
              ))}
            </select>
          ) : (
            <div className="single-event-pill">
              {eventName}
            </div>
          )}

          <button
            type="button"
            className={`btn btn-outline ${showEventDetails ? 'btn-active' : ''}`}
            id="btn-toggle-inputs"
            onClick={onToggleEventDetails}
          >
            {showEventDetails ? 'Hide details' : 'Event details'}
          </button>

          <button
            type="button"
            className="btn btn-outline"
            id="btn-beo-pdf"
            title="BEO PDF download"
            onClick={onOpenBeoPdf}
          >
            BEO PDF
          </button>

          <button
            type="button"
            className="btn btn-outline"
            title="Focus roster"
            onClick={() => {
              const el = document.querySelector('.roster-card');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            Focus roster
          </button>
        </div>
      </div>

      <div className="event-scheduling-context-banner">
        <span>
          <strong>Scheduling {eventName}</strong>. New shifts are assigned to this event. Availability checks include all other shifts.
        </span>
      </div>
    </div>
  );
}
