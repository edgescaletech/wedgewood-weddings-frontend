import React, { useState } from 'react';

function formatTime(val) {
  if (!val) return '';
  const str = String(val).trim();
  const match = str.match(/^(\d{1,2}):(\d{2})/);
  if (match) {
    const hour = Number(match[1]);
    const minute = match[2];
    const suffix = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minute} ${suffix}`;
  }
  return str;
}

function cleanHtml(html) {
  if (!html) return '';
  return String(html)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\*\*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseSignatureDrinks(raw) {
  if (!raw) return null;
  const clean = cleanHtml(raw);
  if (!clean || /^(none|n\/a|no)\b/i.test(clean) || /signature drinks\?\s*n\/a/i.test(clean)) {
    return null;
  }
  return clean.length > 50 ? `${clean.slice(0, 47)}...` : clean;
}

export default function EventDetailsModal({ event, isOpen, onClose }) {
  if (!isOpen || !event) return null;

  const [setupExpanded, setSetupExpanded] = useState(true);
  const [gmNote, setGmNote] = useState('');

  const q = event.catering || {};
  const guestCount = event.guestCount || 0;
  const under21 = (event.under21Count && Number(event.under21Count) > 0)
    ? `${event.under21Count} under 21`
    : '';

  // Timing helpers
  const ceremonyTime = formatTime(event.ceremonyStartTime) || '4:30 PM';
  const ceremonyLocation = event.ceremonyLocation || 'Garden';
  const mealTime = formatTime(event.mealServiceTime) || '6:30 PM';
  const mealStyle = [q.mealService || 'Plated', q.mealPackage || event.packageName || 'Premier'].filter(Boolean).join(' · ');
  
  // Bar helpers
  const barDuration = q.hostedBarHours ? `${q.hostedBarHours} hours` : '4.5 hours';
  const barType = [q.hostedBarType || q.barPackage || 'Hosted', event.barLocation || 'Garden'].filter(Boolean).join(' · ');

  // Setup items
  const champagneGlasses = q.champagneFlutesNeeded !== false;
  const wineGlasses = q.wineGlassesNeeded !== false;
  const chargers = event.chargerPlates && event.chargerPlates !== 'No' ? cleanHtml(event.chargerPlates) : null;
  const welcomeChampagne = q.champagne && q.champagne !== 'No' ? cleanHtml(q.champagne) : null;

  // Food & drink
  const appetizers = (q.appetizers && q.appetizers.length > 0) ? q.appetizers.join(' · ') : 'Stationed appetizers';
  const signatureDrinks = parseSignatureDrinks(event.signatureDrinks);

  // Extras
  const photoBooth = event.photoBooth ? (event.photoboothStaffed ? 'Yes · Staffed' : 'Yes') : null;
  const extrasNotes = cleanHtml(event.beoNotes || event.notes) || null;

  return (
    <section className="event-details-panel" id="event-details-container">
      {/* 4 Top Summary Cards */}
      <div className="event-summary-cards-row">
        {/* Card 1: Guests */}
        <div className="event-summary-card">
          <div className="card-top-header">
            <span className="card-icon" aria-hidden="true">👥</span>
            <span className="card-title">Guests</span>
          </div>
          <div className="card-large-value">{guestCount}</div>
          {under21 && <div className="card-sub-value">{under21}</div>}
        </div>

        {/* Card 2: Ceremony */}
        <div className="event-summary-card">
          <div className="card-top-header">
            <span className="card-icon" aria-hidden="true">🕒</span>
            <span className="card-title">Ceremony</span>
          </div>
          <div className="card-large-value">{ceremonyTime}</div>
          <div className="card-sub-value">{ceremonyLocation}</div>
        </div>

        {/* Card 3: Meal */}
        <div className="event-summary-card">
          <div className="card-top-header">
            <span className="card-icon" aria-hidden="true">🍽</span>
            <span className="card-title">Meal</span>
          </div>
          <div className="card-large-value">{mealTime}</div>
          <div className="card-sub-value">{mealStyle}</div>
        </div>

        {/* Card 4: Bar */}
        <div className="event-summary-card">
          <div className="card-top-header">
            <span className="card-icon" aria-hidden="true">🍷</span>
            <span className="card-title">Bar</span>
          </div>
          <div className="card-large-value">{barDuration}</div>
          <div className="card-sub-value">{barType}</div>
        </div>
      </div>

      {/* Collapsible Blue Bar: Setup & service */}
      <div className="setup-accordion-wrapper">
        <button
          type="button"
          className="setup-accordion-toggle"
          onClick={() => setSetupExpanded(prev => !prev)}
          aria-expanded={setupExpanded}
        >
          <span className={`accordion-caret ${setupExpanded ? 'open' : ''}`}>▼</span>
          <span className="setup-toggle-title">Setup & service</span>
          <span className="setup-toggle-sub">* Example values</span>
        </button>

        {setupExpanded && (
          <div className="setup-accordion-body">
            <div className="setup-cols-grid">
              {/* Col 1: Setup & glassware */}
              <div className="setup-col">
                <h4 className="setup-col-heading">Setup & glassware</h4>
                <div className="setup-item-row">
                  <span className="setup-item-label">Champagne glasses</span>
                  {champagneGlasses ? (
                    <span className="badge-status-yes"><span className="check-icon">✓</span> Yes</span>
                  ) : (
                    <span className="badge-status-no"><span className="dash-icon">⊝</span> No</span>
                  )}
                </div>
                <div className="setup-item-row">
                  <span className="setup-item-label">Wine glasses</span>
                  {wineGlasses ? (
                    <span className="badge-status-yes"><span className="check-icon">✓</span> Yes</span>
                  ) : (
                    <span className="badge-status-no"><span className="dash-icon">⊝</span> No</span>
                  )}
                </div>
                <div className="setup-item-row">
                  <span className="setup-item-label">Chargers</span>
                  {chargers ? (
                    <span className="badge-status-yes"><span className="check-icon">✓</span> {chargers}</span>
                  ) : (
                    <span className="badge-status-no"><span className="dash-icon">⊝</span> No</span>
                  )}
                </div>
                <div className="setup-item-row">
                  <span className="setup-item-label">Welcome champagne / wall</span>
                  {welcomeChampagne ? (
                    <span className="badge-status-yes"><span className="check-icon">✓</span> {welcomeChampagne}</span>
                  ) : (
                    <span className="badge-status-no"><span className="dash-icon">⊝</span> No</span>
                  )}
                </div>
              </div>

              {/* Col 2: Food & drink */}
              <div className="setup-col">
                <h4 className="setup-col-heading">Food & drink</h4>
                <div className="setup-item-row">
                  <span className="setup-item-label">Appetizers / action stations</span>
                  <span className="setup-item-val">{appetizers}</span>
                </div>
                <div className="setup-item-row">
                  <span className="setup-item-label">Signature drinks / prep</span>
                  {signatureDrinks ? (
                    <span className="badge-status-yes"><span className="check-icon">✓</span> {signatureDrinks}</span>
                  ) : (
                    <span className="badge-status-no"><span className="dash-icon">⊝</span> No</span>
                  )}
                </div>
              </div>

              {/* Col 3: Extras & service notes */}
              <div className="setup-col">
                <h4 className="setup-col-heading">Extras & service notes</h4>
                <div className="setup-item-row">
                  <span className="setup-item-label">Photo booth / attendant</span>
                  {photoBooth ? (
                    <span className="badge-status-yes"><span className="check-icon">✓</span> {photoBooth}</span>
                  ) : (
                    <span className="badge-status-no"><span className="dash-icon">⊝</span> No</span>
                  )}
                </div>
                <div className="setup-item-row">
                  {extrasNotes ? (
                    <span className="setup-item-val">{extrasNotes}</span>
                  ) : (
                    <span className="badge-status-no"><span className="dash-icon">⊝</span> No additional setup</span>
                  )}
                </div>
              </div>
            </div>

            {/* GM working note */}
            <div className="gm-note-row">
              <span className="gm-note-title">GM working note</span>
              <textarea
                className="gm-working-textarea"
                placeholder="Add anything the team should know..."
                value={gmNote}
                onChange={(e) => setGmNote(e.target.value)}
                rows={2}
              />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
