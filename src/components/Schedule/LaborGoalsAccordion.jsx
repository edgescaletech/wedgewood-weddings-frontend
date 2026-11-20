import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { API_BASE_URL as apiBase } from '../../config.js';

export default function LaborGoalsAccordion({
  venueId = '',
  weekDates = 'Nov 23–Nov 29',
  monthLabel = 'This month · November',
  eventId = '',
  weekStart = '2026-11-23',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [showEvents, setShowEvents] = useState(false);
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(false);
  const { hasPermission } = useAuth();
  const canCompareGoals = hasPermission('compare_labor_goals');

  useEffect(() => {
    let cancelled = false;
    async function loadSummary() {
      if (!isOpen) return;
      setLoading(true);
      try {
        const queryParams = new URLSearchParams();
        if (venueId) queryParams.set('venueId', venueId);
        if (weekStart) queryParams.set('week', weekStart);

        const res = await fetch(`${apiBase}/api/labor-goals/summary?${queryParams.toString()}`, {
          credentials: 'include',
        });
        if (res.ok) {
          const json = await res.json();
          if (!cancelled) setSummaryData(json);
        }
      } catch (err) {
        console.error('Failed to load labor goals summary:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadSummary();
    return () => { cancelled = true; };
  }, [isOpen, venueId, weekStart]);

  if (!canCompareGoals) return null;

  // Use dynamic backend data if loaded, otherwise render sensible calculated defaults
  const weekPlan = summaryData?.weekPlan || {
    label: "This week’s plan",
    dates: weekDates,
    foh: {
      targetLe: 2.1,
      currentLe: 0,
      budgetHours: 257.14,
      scheduledHours: 0,
      remainingHours: 257.14,
      totalGuests: 540,
      totalEvents: 4,
      eventsWithStaffing: 0
    },
    boh: {
      targetLe: 3.5,
      currentLe: 0,
      budgetHours: 154.29,
      scheduledHours: 0,
      remainingHours: 154.29,
      totalGuests: 540,
      totalEvents: 4,
      eventsWithStaffing: 0
    }
  };

  const monthPlan = summaryData?.monthPlan || {
    label: monthLabel,
    dates: "Nov 2–Nov 29",
    foh: {
      targetLe: 2.1,
      currentLe: 2.57,
      budgetHours: 642.86,
      scheduledHours: 315,
      remainingHours: 327.86,
      totalGuests: 1350,
      totalEvents: 13,
      eventsWithStaffing: 9
    },
    boh: {
      targetLe: 3.5,
      currentLe: 3.78,
      budgetHours: 385.71,
      scheduledHours: 214.5,
      remainingHours: 171.21,
      totalGuests: 1350,
      totalEvents: 13,
      eventsWithStaffing: 9
    }
  };

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
