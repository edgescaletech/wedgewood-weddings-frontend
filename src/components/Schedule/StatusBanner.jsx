import React from 'react';

export default function StatusBanner({
  publishedCount = 3,
  totalEvents = 3,
  coverageStatus = 'Coverage still needs review'
}) {
  return (
    <div className="status-banner-strip">
      <span className="status-badge-published" style={{ color: '#dc2626' }}>Published (simulation)</span>
      <span className="status-text-details">
        <span style={{ color: '#dc2626' }}>{publishedCount} of {totalEvents} events started</span> · <span style={{ color: '#dc2626' }}>{coverageStatus}</span>
      </span>
    </div>
  );
}
