import React from 'react';

export default function EventDetailsModal({ event, isOpen, onClose }) {
  if (!isOpen || !event) return null;

  const q = event.catering || {};
  const guestCount = event.guestCount || 0;
  const under21 = event.under21Count ? `${event.under21Count} under 21` : '';

  // Timing helpers
  const ceremonyTime = event.ceremonyStartTime || '';
  const ceremonyLocation = event.ceremonyLocation || '';
  const mealTime = event.mealServiceTime || '';
  const mealStyle = q.mealPackage || event.packageName || '';
  const barService = q.barService || (event.hasBar ? 'Open Bar' : 'No bar listed');
  const barLocation = event.barLocation || '';
  const receptionTime = (event.startTime && event.endTime) ? `${event.startTime} – ${event.endTime}` : '';
  const appetizers = q.appetizers && q.appetizers.length > 0 ? q.appetizers.join(' · ') : 'None listed';
  const signatureDrinks = event.signatureDrinks || 'None listed';
  const champagne = q.champagne ? `${q.champagne} (${q.champagneQty || 'Yes'})` : 'No';
  const photoBooth = event.photoBooth ? (event.photoboothStaffed ? 'Yes · Staffed' : 'Yes') : 'No';
  const tableSettings = [];
  if (q.champagneFlutesNeeded) tableSettings.push('Flutes: Yes');
  if (q.wineGlassesNeeded) tableSettings.push('Wine: Yes');
  if (event.chargerPlates) tableSettings.push(`Chargers: ${event.chargerPlates}`);

  return (
    <section className="planning-inputs-card" id="planning-inputs-container">
      <div className="planning-header">
        <div className="planning-header-left">
          <span>Planning inputs · <strong>{event.name}</strong></span>
          <span className="quote-number-tag">{q.quoteNumber ? `Salesforce Quote: ${q.quoteNumber}` : 'Salesforce CPQ Quote'}</span>
        </div>
        <button
          type="button"
          className="btn-close-planning"
          onClick={onClose}
          aria-label="Close details"
        >
          ✕ Close
        </button>
      </div>

      <div className="planning-grid">
        <div className="planning-cell">
          <div className="cell-label">Guests</div>
          <div className="cell-val">{guestCount} guests</div>
          {under21 && <div className="cell-sub">{under21}</div>}
        </div>

        <div className="planning-cell">
          <div className="cell-label">Ceremony</div>
          <div className="cell-val">{ceremonyLocation || 'Ceremony Lawn'}</div>
          {ceremonyTime && <div className="cell-sub">{ceremonyTime}</div>}
        </div>

        <div className="planning-cell">
          <div className="cell-label">Meal</div>
          <div className="cell-val">{mealStyle || 'Buffet Service'}</div>
          {mealTime && <div className="cell-sub">{mealTime}</div>}
        </div>

        <div className="planning-cell">
          <div className="cell-label">Bar</div>
          <div className="cell-val">{barService}</div>
          {barLocation && <div className="cell-sub">{barLocation}</div>}
        </div>

        <div className="planning-cell">
          <div className="cell-label">Reception / Event</div>
          <div className="cell-val">{receptionTime || 'Standard evening'}</div>
        </div>

        <div className="planning-cell">
          <div className="cell-label">Appetizers</div>
          <div className="cell-val">{appetizers}</div>
        </div>

        <div className="planning-cell">
          <div className="cell-label">Signature Drinks</div>
          <div className="cell-val">{signatureDrinks}</div>
        </div>

        <div className="planning-cell">
          <div className="cell-label">Champagne / Wall</div>
          <div className="cell-val">{champagne}</div>
        </div>

        <div className="planning-cell">
          <div className="cell-label">Table Settings</div>
          <div className="cell-val">{tableSettings.length > 0 ? tableSettings.join(' · ') : 'Standard setup'}</div>
        </div>

        <div className="planning-cell">
          <div className="cell-label">Photo Booth</div>
          <div className="cell-val">{photoBooth}</div>
        </div>

        <div className="planning-cell full-span">
          <div className="cell-label">Extras / Notes</div>
          <div className="cell-val">{event.beoNotes || event.notes || 'No special notes'}</div>
        </div>

        <div className="full-width-cell">
          <span className="gm-note-label">GM working note:</span>
          <input
            type="text"
            className="gm-input-field"
            id="gm-note-input"
            placeholder="Add operational notes for this event..."
          />
        </div>
      </div>
    </section>
  );
}
