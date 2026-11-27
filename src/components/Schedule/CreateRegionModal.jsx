import React, { useState, useMemo } from 'react';

/**
 * Modal to create a new reporting region or reassign venues to a region.
 * Matches Screenshot 3.
 */
export default function CreateRegionModal({
  isOpen,
  onClose,
  allVenues = [],
  onSaveRegion,
  saving = false,
}) {
  const [regionName, setRegionName] = useState('');
  const [venueSearch, setVenueSearch] = useState('');
  const [selectedVenueIds, setSelectedVenueIds] = useState(new Set());
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const filteredVenues = useMemo(() => {
    const q = venueSearch.trim().toLowerCase();
    if (!q) return allVenues;
    return allVenues.filter(v =>
      (v.name || '').toLowerCase().includes(q) ||
      (v.venueNumber || '').toLowerCase().includes(q)
    );
  }, [allVenues, venueSearch]);

  const toggleVenue = (id) => {
    setSelectedVenueIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    const trimmed = regionName.trim();
    if (!trimmed) {
      setError('Please enter a region name.');
      return;
    }
    if (selectedVenueIds.size === 0) {
      setError('Please select at least one venue for this region.');
      return;
    }

    try {
      await onSaveRegion(trimmed, Array.from(selectedVenueIds));
      setRegionName('');
      setVenueSearch('');
      setSelectedVenueIds(new Set());
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save region.');
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">Create region</h2>

        <form onSubmit={handleSave}>
          <div className="modal-field">
            <label className="modal-label" htmlFor="region-name-input">Region name</label>
            <input
              id="region-name-input"
              type="text"
              className="modal-input"
              placeholder=""
              value={regionName}
              onChange={(e) => setRegionName(e.target.value)}
              disabled={saving}
              autoFocus
            />
          </div>

          <div className="modal-field">
            <label className="modal-label" htmlFor="find-venues-input">Find venues</label>
            <input
              id="find-venues-input"
              type="text"
              className="modal-input"
              placeholder="Venue name or number"
              value={venueSearch}
              onChange={(e) => setVenueSearch(e.target.value)}
              disabled={saving}
            />
          </div>

          <p className="modal-description">
            Regions organize reporting; they never grant or remove account access. A venue belongs to one primary region.
          </p>

          <div className="modal-venue-list">
            {filteredVenues.length === 0 ? (
              <div className="modal-venue-empty">No venues match search.</div>
            ) : (
              filteredVenues.map(venue => {
                const checked = selectedVenueIds.has(venue.id);
                return (
                  <label key={venue.id} className="modal-venue-row">
                    <input
                      type="checkbox"
                      className="modal-venue-checkbox"
                      checked={checked}
                      onChange={() => toggleVenue(venue.id)}
                      disabled={saving}
                    />
                    <span className="modal-venue-name">{venue.name}</span>
                    <span className="modal-venue-current">
                      Current: {venue.region || 'Ungrouped'}
                    </span>
                  </label>
                );
              })
            )}
          </div>

          <p className="modal-footnote">
            Selected venues will move from their current region. Removed venues become Ungrouped.
          </p>

          {error && <div className="modal-error-alert">{error}</div>}

          <div className="modal-actions-row">
            <button
              type="submit"
              className="btn-modal-save"
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Save region'}
            </button>
            <button
              type="button"
              className="btn-modal-cancel"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
