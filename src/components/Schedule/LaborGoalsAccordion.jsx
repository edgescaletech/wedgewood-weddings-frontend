import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { API_BASE_URL as apiBase } from '../../config.js';

export default function LaborGoalsAccordion({
  venueId = '',
  eventId = '',
  weekStart = '2026-11-23',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [showEvents, setShowEvents] = useState(false);
  const [summary, setSummary] = useState(null);
  const { hasVenuePermission } = useAuth();
  const canCompareGoals = hasVenuePermission(venueId, 'labor_goals.view');

  useEffect(() => {
    if (!isOpen || !canCompareGoals) return;
    const controller = new AbortController();

    async function loadSummary() {
      try {
        const query = new URLSearchParams({ venueId, week: weekStart });
        const response = await fetch(`${apiBase}/api/labor-goals/summary?${query}`, {
          credentials: 'include',
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        if (response.status === 401) {
          window.location.replace('/login');
          return;
        }
        if (response.status === 403) {
          setSummary({ venueId, weekStart, error: 'You do not have access to Labor goals for this venue.' });
          return;
        }
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        if (!data?.weekPlan || !data.monthPlan) {
          throw new Error('Missing Labor plans');
        }
        if (!controller.signal.aborted) setSummary({ venueId, weekStart, data });
      } catch {
        if (!controller.signal.aborted) {
          setSummary({ venueId, weekStart, error: 'Could not load Labor goals. Close and reopen to try again.' });
        }
      }
    }

    loadSummary();
    return () => controller.abort();
  }, [isOpen, venueId, weekStart, canCompareGoals]);

  if (!canCompareGoals) return null;

  const currentSummary = summary?.venueId === venueId && summary.weekStart === weekStart ? summary : null;
  const { weekPlan, monthPlan } = currentSummary?.data ?? {};

  const formatRatio = (current, target) => {
    if (current > 0) {
      return `${current.toFixed(2)} / ${target.toFixed(1)}`;
    }
    return `— / ${target.toFixed(1)}`;
  };

  return (
    <section className="labor-goals-accordion">
      <button
        type="button"
        className="labor-goals-toggle"
        onClick={() => {
          setSummary(null);
          setIsOpen(!isOpen);
        }}
        aria-expanded={isOpen}
      >
        <span className={`accordion-caret ${isOpen ? 'open' : ''}`}>▶</span>
        <span className="accordion-title">Labor goals</span>
      </button>

      {isOpen && currentSummary?.error && (
        <p className="labor-plan-strip-inner" role="alert">{currentSummary.error}</p>
      )}
      {isOpen && !currentSummary && (
        <p className="labor-plan-strip-inner" role="status">Loading Labor goals…</p>
      )}
      {isOpen && weekPlan && monthPlan && (
        <div className="labor-plan-strip-inner">
          <div className="labor-goals-top-link">
            <a
              href={`/goals?eventId=${encodeURIComponent(eventId)}&week=${encodeURIComponent(weekStart)}&venueId=${encodeURIComponent(venueId)}`}
              className="goals-budget-link"
              id="link-goals-budgets"
            >
              Goals & budgets
            </a>
          </div>

          {/* This week's plan */}
          <div className="labor-plan-row">
            <div className="labor-plan-left">
              <h3 className="labor-plan-heading">{weekPlan.label}</h3>
              <span className="labor-plan-sub">{weekPlan.dates}</span>
            </div>

            <div className="labor-metrics-container">
              {/* FOH Card */}
              <div className="labor-metric-card">
                <div className="metric-header-line">
                  <span className="metric-cat-name">FOH LE</span>
                  <span className="metric-target-ratio">
                    {formatRatio(weekPlan.foh.currentLe, weekPlan.foh.targetLe)} <small>target</small>
                  </span>
                </div>
                <div className="metric-remaining-stat">
                  <strong>{weekPlan.foh.remainingHours.toFixed(2)} h</strong> remaining
                </div>
                <div className="metric-scheduled-detail">
                  {weekPlan.foh.scheduledHours} h scheduled / {weekPlan.foh.budgetHours.toFixed(2)} h budget · {weekPlan.foh.eventsWithStaffing}/{weekPlan.foh.totalEvents} events with staffing
                </div>
              </div>

              {/* BOH Card */}
              <div className="labor-metric-card">
                <div className="metric-header-line">
                  <span className="metric-cat-name">BOH LE</span>
                  <span className="metric-target-ratio">
                    {formatRatio(weekPlan.boh.currentLe, weekPlan.boh.targetLe)} <small>target</small>
                  </span>
                </div>
                <div className="metric-remaining-stat">
                  <strong>{weekPlan.boh.remainingHours.toFixed(2)} h</strong> remaining
                </div>
                <div className="metric-scheduled-detail">
                  {weekPlan.boh.scheduledHours} h scheduled / {weekPlan.boh.budgetHours.toFixed(2)} h budget · {weekPlan.boh.eventsWithStaffing}/{weekPlan.boh.totalEvents} events with staffing
                </div>
              </div>
            </div>
          </div>

          {/* This month's plan */}
          <div className="labor-plan-row monthly-row">
            <div className="labor-plan-left">
              <h3 className="labor-plan-heading">{monthPlan.label}</h3>
              <span className="labor-plan-sub">{monthPlan.dates}</span>
            </div>

            <div className="labor-metrics-container">
              {/* Month FOH Card */}
              <div className="labor-metric-card">
                <div className="metric-header-line">
                  <span className="metric-cat-name">FOH LE</span>
                  <span className="metric-target-ratio" style={{ color: monthPlan.foh.currentLe >= monthPlan.foh.targetLe ? '#15803d' : '#0f172a' }}>
                    {formatRatio(monthPlan.foh.currentLe, monthPlan.foh.targetLe)} <small>target</small>
                  </span>
                </div>
                <div className="metric-remaining-stat">
                  <strong>{monthPlan.foh.remainingHours.toFixed(2)} h</strong> remaining
                </div>
                <div className="metric-scheduled-detail">
                  {monthPlan.foh.scheduledHours} h scheduled / {monthPlan.foh.budgetHours.toFixed(2)} h budget · {monthPlan.foh.eventsWithStaffing}/{monthPlan.foh.totalEvents} events with staffing
                </div>
              </div>

              {/* Month BOH Card */}
              <div className="labor-metric-card">
                <div className="metric-header-line">
                  <span className="metric-cat-name">BOH LE</span>
                  <span className="metric-target-ratio" style={{ color: monthPlan.boh.currentLe >= monthPlan.boh.targetLe ? '#15803d' : '#0f172a' }}>
                    {formatRatio(monthPlan.boh.currentLe, monthPlan.boh.targetLe)} <small>target</small>
                  </span>
                </div>
                <div className="metric-remaining-stat">
                  <strong>{monthPlan.boh.remainingHours.toFixed(2)} h</strong> remaining
                </div>
                <div className="metric-scheduled-detail">
                  {monthPlan.boh.scheduledHours} h scheduled / {monthPlan.boh.budgetHours.toFixed(2)} h budget · {monthPlan.boh.eventsWithStaffing}/{monthPlan.boh.totalEvents} events with staffing
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
            >
              <span className={`accordion-caret ${showEvents ? 'open' : ''}`}>▶</span> Included events · {monthPlan.foh.totalEvents}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
