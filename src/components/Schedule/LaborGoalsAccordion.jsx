import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';

export default function LaborGoalsAccordion({
  weekDates = 'Nov 23–Nov 29',
  monthLabel = 'This month · November',
  eventId = '',
  weekStart = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [showEvents, setShowEvents] = useState(false);
  const { hasPermission } = useAuth();
  const canCompareGoals = hasPermission('compare_labor_goals');

  if (!canCompareGoals) return null;

  return (
    <section className="labor-goals-accordion">
      <button
        type="button"
        className="labor-goals-toggle"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <span className={`accordion-caret ${isOpen ? 'open' : ''}`}>▶</span>
        <span className="accordion-title">Labor goals</span>
      </button>

      {isOpen && (
        <div className="labor-plan-strip-inner">
          <div className="labor-goals-top-link">
            <a
              href={`/goals?eventId=${encodeURIComponent(eventId)}&week=${encodeURIComponent(weekStart)}`}
              className="goals-budget-link"
              id="link-goals-budgets"
            >
              Goals & budgets
            </a>
          </div>

          {/* This week's plan */}
          <div style={{ color: '#dc2626', fontSize: '11px', fontWeight: 'bold', margin: '8px 0' }}>
            ⚠️ Values highlighted in red are static targets & simulated budgets (Finance model pending)
          </div>

          <div className="labor-plan-row">
            <div className="labor-plan-left">
              <h3 className="labor-plan-heading">This week’s plan</h3>
              <span className="labor-plan-sub">{weekDates}</span>
            </div>

            <div className="labor-metrics-container">
              <div className="labor-metric-card">
                <div className="metric-header-line">
                  <span className="metric-cat-name">FOH LE</span>
                  <span className="metric-target-ratio" style={{ color: '#dc2626' }}>— / 2.1 <small>target</small></span>
                </div>
                <div className="metric-remaining-stat" style={{ color: '#dc2626' }}>
                  <strong>257.14 h</strong> remaining
                </div>
                <div className="metric-scheduled-detail" style={{ color: '#dc2626' }}>
                  0 h scheduled / 257.14 h budget · 0/4 events with staffing
                </div>
              </div>

              <div className="labor-metric-card">
                <div className="metric-header-line">
                  <span className="metric-cat-name">BOH LE</span>
                  <span className="metric-target-ratio" style={{ color: '#dc2626' }}>— / 3.5 <small>target</small></span>
                </div>
                <div className="metric-remaining-stat" style={{ color: '#dc2626' }}>
                  <strong>154.29 h</strong> remaining
                </div>
                <div className="metric-scheduled-detail" style={{ color: '#dc2626' }}>
                  0 h scheduled / 154.29 h budget · 0/4 events with staffing
                </div>
              </div>
            </div>
          </div>

          {/* This month's plan */}
          <div className="labor-plan-row monthly-row">
            <div className="labor-plan-left">
              <h3 className="labor-plan-heading">{monthLabel}</h3>
              <span className="labor-plan-sub">Nov 2–Nov 29</span>
            </div>

            <div className="labor-metrics-container">
              <div className="labor-metric-card">
                <div className="metric-header-line">
                  <span className="metric-cat-name">FOH LE</span>
                  <span className="metric-target-ratio" style={{ color: '#dc2626' }}>2.57 / 2.1 <small>target</small></span>
                </div>
                <div className="metric-remaining-stat" style={{ color: '#dc2626' }}>
                  <strong>327.86 h</strong> remaining
                </div>
                <div className="metric-scheduled-detail" style={{ color: '#dc2626' }}>
                  315 h scheduled / 642.86 h budget · 9/13 events with staffing
                </div>
              </div>

              <div className="labor-metric-card">
                <div className="metric-header-line">
                  <span className="metric-cat-name">BOH LE</span>
                  <span className="metric-target-ratio" style={{ color: '#dc2626' }}>3.78 / 3.5 <small>target</small></span>
                </div>
                <div className="metric-remaining-stat" style={{ color: '#dc2626' }}>
                  <strong>171.21 h</strong> remaining
                </div>
                <div className="metric-scheduled-detail" style={{ color: '#dc2626' }}>
                  214.5 h scheduled / 385.71 h budget · 9/13 events with staffing
                </div>
              </div>
            </div>
          </div>

          {/* Included events collapsible link */}
          <div className="included-events-line">
            <button
              type="button"
              className="btn-included-events"
              onClick={() => setShowEvents(!showEvents)}
              style={{ color: '#dc2626' }}
            >
              <span className={`accordion-caret ${showEvents ? 'open' : ''}`}>▶</span> Included events · 13
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
