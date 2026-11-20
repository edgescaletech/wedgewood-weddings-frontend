import React from 'react';

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
  if (!raw) return 'No';
  const clean = cleanHtml(raw);
  if (!clean || /^(none|n\/a|no)\b/i.test(clean) || /signature drinks\?\s*n\/a/i.test(clean)) {
    return 'No';
  }
  return clean.length > 60 ? `${clean.slice(0, 57)}...` : clean;
}

export default function BeoPdfModal({ event, currentVenue, isOpen, onClose }) {
  if (!isOpen || !event) return null;

  const venueName = currentVenue?.name || event.venue || 'Evergreen Grove';
  const q = event.catering || {};
  const guestCount = event.guestCount || 0;
  const under21 = (event.under21Count && Number(event.under21Count) > 0)
    ? `${event.under21Count} under 21`
    : '';

  // Formatted event timing
  const ceremonyTime = formatTime(event.ceremonyStartTime) || '16:30';
  const receptionTime = (event.startTime && event.endTime)
    ? `${event.startTime}–${event.endTime} · 5 hours`
    : '17:00–22:00 · 5 hours';
  const mealTime = formatTime(event.mealServiceTime) || '18:30';
  const mealType = q.mealService || 'Plated';
  const foodPackage = q.mealPackage || event.packageName || 'Premier';
  const appetizers = (q.appetizers && q.appetizers.length > 0)
    ? q.appetizers.join(' · ')
    : 'Stationed appetizers';
  const barService = q.barService || q.hostedBarType || (event.hasBar ? 'Hosted' : 'No bar listed');
  const signatureDrinks = parseSignatureDrinks(event.signatureDrinks);
  const champagne = q.champagne ? `Yes (${cleanHtml(q.champagne)})` : 'No';
  const photoBooth = event.photoBooth ? (event.photoboothStaffed ? 'Yes · Staffed' : 'Yes') : 'No';
  const extras = cleanHtml(event.beoNotes || event.notes) || 'No additional setup';

  const tableSettings = [];
  if (q.champagneFlutesNeeded !== false) tableSettings.push('Champagne glasses: Yes');
  if (q.wineGlassesNeeded !== false) tableSettings.push('Wine glasses: Yes');
  tableSettings.push('Chargers: No');

  const handleOpenPdf = () => {
    const printContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>BEO - ${event.name}</title>
  <style>
    @page { size: portrait; margin: 20mm; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      padding: 40px;
      color: #111827;
      line-height: 1.6;
      max-width: 650px;
      margin: 0 auto;
    }
    h1 { font-size: 16px; font-weight: 800; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.05em; }
    h2 { font-size: 15px; font-weight: 700; margin: 0 0 16px 0; }
    p { margin: 4px 0; font-size: 13.5px; }
    .footer-note { margin-top: 32px; font-size: 12px; color: #6b7280; font-style: italic; }
  </style>
</head>
<body>
  <h1>SAMPLE BEO - ${venueName.toUpperCase()}</h1>
  <h2>${event.name}</h2>
  <p>${event.eventDate || '2026-11-29'} | ${guestCount} guests</p>
  <p>Ceremony ${ceremonyTime} | ${event.ceremonyLocation || 'Garden'}</p>
  <p>Event ${event.startTime || '17:00'} - ${event.endTime || '22:00'}</p>
  <p>Bar ${event.barStartTime || '17:00'} - ${event.barCloseTime || '21:30'} | ${barService}</p>
  <p>Meal ${mealTime} | ${mealType} | ${foodPackage}</p>
  <p>Photo booth: ${photoBooth} | Pub: None</p>
  <p class="footer-note">Fictional information for this demo.</p>
  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 200);
    };
  </script>
</body>
</html>
    `;
    const blob = new Blob([printContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  const handleDownloadPdf = () => {
    handleOpenPdf();
  };

  return (
    <main className="beo-page-container">
      <div className="beo-view-card">
        {/* Row 1: Title and Back to schedule */}
        <div className="beo-top-header-row">
          <h1 className="beo-main-title">BEO PDF · {event.name}</h1>
          <button
            type="button"
            className="btn-back-schedule"
            onClick={onClose}
          >
            ‹ Back to schedule
          </button>
        </div>

        {/* Row 2: Subtitle and Action buttons */}
        <div className="beo-actions-row">
          <div className="beo-sample-subtitle">
            SAMPLE · {event.name} · {event.eventDate ? new Date(`${event.eventDate}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Nov 29, 2026'}
          </div>
          <div className="beo-action-buttons-group">
            <button
              type="button"
              className="btn-open-pdf"
              onClick={handleOpenPdf}
            >
              Open PDF
            </button>
            <button
              type="button"
              className="btn-download-pdf"
              onClick={handleDownloadPdf}
            >
              Download PDF
            </button>
          </div>
        </div>

        {/* Venue & Event Head */}
        <div className="beo-event-venue-heading">
          <h2>{venueName}</h2>
          <div className="beo-event-meta-line">
            {event.name} · {event.eventDate} · {guestCount} guests
          </div>
        </div>

        {/* 3-Column Specifications Grid */}
        <div className="beo-specs-grid">
          {/* Row 1 */}
          <div className="beo-spec-cell">
            <span className="beo-spec-label">Guests</span>
            <span className="beo-spec-value">{guestCount}{under21 ? ` · ${under21}` : ''}</span>
          </div>
          <div className="beo-spec-cell">
            <span className="beo-spec-label">Ceremony</span>
            <span className="beo-spec-value">{ceremonyTime}</span>
          </div>
          <div className="beo-spec-cell">
            <span className="beo-spec-label">Reception / event</span>
            <span className="beo-spec-value">{receptionTime}</span>
          </div>

          {/* Row 2 */}
          <div className="beo-spec-cell">
            <span className="beo-spec-label">Meal service</span>
            <span className="beo-spec-value">{mealType} · {mealTime}</span>
          </div>
          <div className="beo-spec-cell">
            <span className="beo-spec-label">Food package</span>
            <span className="beo-spec-value">{foodPackage}</span>
          </div>
          <div className="beo-spec-cell">
            <span className="beo-spec-label">Appetizers / action stations</span>
            <span className="beo-spec-value">{appetizers}</span>
          </div>

          {/* Row 3 */}
          <div className="beo-spec-cell">
            <span className="beo-spec-label">Bar service</span>
            <span className="beo-spec-value">{barService}</span>
          </div>
          <div className="beo-spec-cell">
            <span className="beo-spec-label">Signature drinks / prep</span>
            <span className="beo-spec-value">{signatureDrinks}</span>
          </div>
          <div className="beo-spec-cell">
            <span className="beo-spec-label">Welcome champagne / wall</span>
            <span className="beo-spec-value">{champagne}</span>
          </div>

          {/* Row 4 */}
          <div className="beo-spec-cell">
            <span className="beo-spec-label">Table settings</span>
            <span className="beo-spec-value">{tableSettings.join(' · ')}</span>
          </div>
          <div className="beo-spec-cell">
            <span className="beo-spec-label">Photo booth / attendant</span>
            <span className="beo-spec-value">{photoBooth}</span>
          </div>
          <div className="beo-spec-cell">
            <span className="beo-spec-label">Extras / special instructions</span>
            <span className="beo-spec-value">{extras}</span>
          </div>
        </div>

        {/* Demo note footer */}
        <div className="beo-demo-footer-note">
          Fictional event details for this demo. Bar service is part of the wedding; this venue has no pub.
        </div>
      </div>
    </main>
  );
}
