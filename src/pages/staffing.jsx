import React, { useState, useEffect, useCallback, useRef } from 'react';
import { API_BASE_URL } from '../config.js';
import { useAuth } from '../context/AuthContext.jsx';
import { hasVenuePermission } from '../context/identity-permissions.js';
import AppHeader from '../components/Header/AppHeader.jsx';
import StatusBanner from '../components/Schedule/StatusBanner.jsx';
import LaborGoalsAccordion from '../components/Schedule/LaborGoalsAccordion.jsx';
import WeekRibbon from '../components/Schedule/WeekRibbon.jsx';
import DayActionBar from '../components/Schedule/DayActionBar.jsx';
import EventDetailsModal from '../components/Schedule/EventDetailsModal.jsx';
import BeoPdfModal from '../components/Schedule/BeoPdfModal.jsx';
import TimelineGrid from '../components/Schedule/TimelineGrid.jsx';
import WeekScheduleGrid from '../components/Schedule/WeekScheduleGrid.jsx';
import styles from './staffing.css?inline';
export { styles };

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getMondayFor(dateValue) {
  const date = dateValue ? new Date(`${dateValue}T12:00:00`) : new Date();
  if (Number.isNaN(date.getTime())) return dateKey(new Date());
  const day = date.getDay();
  date.setDate(date.getDate() - ((day + 6) % 7));
  return dateKey(date);
}

function formatWeekRange(weekStart) {
  if (!weekStart) return '';
  const start = new Date(`${weekStart}T12:00:00`);
  if (Number.isNaN(start.getTime())) return '';
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const startLabel = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const endLabel = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return `${startLabel} – ${endLabel}`;
}

function getWeekOfMonthLabel(weekStart) {
  const date = new Date(`${weekStart}T12:00:00`);
  if (Number.isNaN(date.getTime())) return '';
  const weekOfMonth = Math.ceil(date.getDate() / 7);
  return `${date.toLocaleDateString('en-US', { month: 'long' })} · week ${weekOfMonth}`;
}

function shiftWeek(weekStart, amount) {
  const date = new Date(`${weekStart}T12:00:00`);
  if (Number.isNaN(date.getTime())) return weekStart;
  date.setDate(date.getDate() + amount * 7);
  return dateKey(date);
}

export default function StaffingPage() {
  const { access, loading: accessLoading, accessError, reloadAccess } = useAuth();
  const deniedEventIds = useRef(new Set());

  // URL parameters initialization
  const urlParams = new URLSearchParams(window.location.search);
  const initialWeekParam = urlParams.get('week');

  const [weekStart, setWeekStart] = useState(() => getMondayFor(initialWeekParam));
  const [selectedDay, setSelectedDay] = useState('');
  const [weekEvents, setWeekEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [eventDetails, setEventDetails] = useState(null);
  const [venues, setVenues] = useState(null);
  const [venueError, setVenueError] = useState('');
  const [eventsError, setEventsError] = useState('');
  const [eventDetailError, setEventDetailError] = useState('');
  const [currentVenueId, setCurrentVenueId] = useState('');
  const currentVenue = venues?.find(venue => venue.id === currentVenueId) ?? null;
  const matchingDetails = eventDetails?.id === selectedEvent?.id &&
    eventDetails?.venueId === selectedEvent?.venueId;
  const activeEvent = currentVenue && selectedEvent?.venueId === currentVenue.id
    ? (matchingDetails ? eventDetails : selectedEvent)
    : null;
  const [showEventDetails, setShowEventDetails] = useState(false);
  const [isBeoView, setIsBeoView] = useState(() => window.location.hash === '#beo');
  const [viewMode, setViewMode] = useState('day');
  const [loading, setLoading] = useState(true);

  // Sync hash changes (e.g. browser back/forward)
  useEffect(() => {
    function handleHashChange() {
      setIsBeoView(window.location.hash === '#beo');
    }
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleOpenBeoView = useCallback(() => {
    window.location.hash = 'beo';
    setIsBeoView(true);
  }, []);

  const handleBackToSchedule = useCallback(() => {
    if (window.location.hash === '#beo') {
      history.pushState(null, '', window.location.pathname + window.location.search);
    }
    setIsBeoView(false);
  }, []);

  useEffect(() => {
    if (!access) return;
    const controller = new AbortController();
    setVenueError('');
    async function loadVenues() {
      try {
        const response = await fetch(`${API_BASE_URL}/api/me/venues`, {
          credentials: 'include',
          cache: 'no-store',
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        if (response.status === 401 || response.status === 403) {
          window.location.replace('/login');
          return;
        }
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const directory = await response.json();
        if (!controller.signal.aborted) {
          setVenues(directory.filter(venue => hasVenuePermission(access, venue.id, 'schedules.view')));
        }
      } catch {
        if (!controller.signal.aborted) setVenueError('Could not load your venues. Reload the page to try again.');
      }
    }
    loadVenues();
    return () => controller.abort();
  }, [access]);

  useEffect(() => {
    if (!venues?.length) return;
    const controller = new AbortController();
    setLoading(true);
    setEventsError('');
    setWeekEvents([]);
    setSelectedEvent(null);

    async function loadWeek() {
      try {
        const query = new URLSearchParams({ week: weekStart });
        const response = await fetch(`${API_BASE_URL}/api/events?${query}`, {
          credentials: 'include',
          cache: 'no-store',
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        if (response.status === 401) {
          window.location.replace('/login');
          return;
        }
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const { events: week = [] } = await response.json();
        if (controller.signal.aborted) return;

        const venueIds = new Set(venues.map(venue => venue.id));
        const events = week.filter(event => venueIds.has(event.venueId) && !deniedEventIds.current.has(event.id));
        const url = new URL(window.location.href);
        const eventId = url.searchParams.get('eventId');
        const linkedEvent = events.find(event => event.id === eventId);
        const venue = venues.find(item => item.id === url.searchParams.get('venueId'))
          ?? venues.find(item => item.id === linkedEvent?.venueId)
          ?? venues[0];
        const event = linkedEvent?.venueId === venue.id
          ? linkedEvent
          : events.find(item => item.venueId === venue.id);

        setCurrentVenueId(venue.id);
        setWeekEvents(events);
        setSelectedEvent(event ?? null);
        setSelectedDay(event?.eventDate ?? weekStart);
        url.pathname = '/staffing';
        url.searchParams.set('week', weekStart);
        url.searchParams.set('venueId', venue.id);
        url.searchParams.delete('eventId');
        window.history.replaceState(window.history.state, '', url);
      } catch {
        if (!controller.signal.aborted) setEventsError('Could not load events for this week.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadWeek();
    return () => controller.abort();
  }, [venues, weekStart]);

  const selectedEventId = activeEvent?.id;
  useEffect(() => {
    setEventDetails(null);
    if (!selectedEventId) return;
    const controller = new AbortController();
    async function loadDetail() {
      try {
        const response = await fetch(`${API_BASE_URL}/api/events/${encodeURIComponent(selectedEventId)}`, {
          credentials: 'include',
          cache: 'no-store',
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        if (response.status === 401) {
          window.location.replace('/login');
          return;
        }
        if (response.status === 403 || response.status === 404) {
          // The refreshed list can still contain an event whose detail was denied.
          deniedEventIds.current.add(selectedEventId);
          setVenues(null);
          setCurrentVenueId('');
          setWeekEvents([]);
          setSelectedEvent(null);
          setEventDetails(null);
          setShowEventDetails(false);
          handleBackToSchedule();
          setEventDetailError('This event is no longer available.');
          reloadAccess();
          return;
        }
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const details = await response.json();
        if (!controller.signal.aborted) setEventDetails(details);
      } catch (error) {
        if (!controller.signal.aborted) console.error('Error fetching event details:', error);
      }
    }
    loadDetail();
    return () => controller.abort();
  }, [selectedEventId, handleBackToSchedule, reloadAccess]);

  const handleVenueChange = (venue) => {
    const event = weekEvents.find(item => item.venueId === venue.id);
    setCurrentVenueId(venue.id);
    setSelectedEvent(event ?? null);
    setSelectedDay(event?.eventDate ?? weekStart);
    setShowEventDetails(false);
    setEventDetailError('');
    const url = new URL(window.location.href);
    url.pathname = '/staffing';
    url.searchParams.set('venueId', venue.id);
    url.searchParams.delete('eventId');
    window.history.replaceState(window.history.state, '', url);
  };

  const handlePrevWeek = () => {
    setWeekStart(prev => shiftWeek(prev, -1));
  };

  const handleNextWeek = () => {
    setWeekStart(prev => shiftWeek(prev, 1));
  };

  const handleThisWeek = () => {
    setWeekStart(getMondayFor());
  };

  const handleDateChange = (dateString) => {
    if (!dateString) return;
    setWeekStart(getMondayFor(dateString));
  };

  const venueEvents = currentVenue
    ? weekEvents.filter(event => event.venueId === currentVenue.id)
    : [];

  const handleSelectDay = (dateStr) => {
    setEventDetailError('');
    setSelectedDay(dateStr);
    setSelectedEvent(venueEvents.find(event => event.eventDate === dateStr) ?? null);
  };

  const handleSelectEvent = (eventId) => {
    const event = venueEvents.find(item => item.id === eventId);
    if (!event) return;
    setEventDetailError('');
    setSelectedEvent(event);
    setSelectedDay(event.eventDate);
  };

  // Filter events for the selected day within this venue
  const dayEvents = selectedDay
    ? venueEvents.filter(e => e.eventDate === selectedDay)
    : (activeEvent ? [activeEvent] : []);

  return (
    <div className="staffing-application-container">
      <AppHeader
        venues={venues ?? []}
        currentVenue={currentVenue}
        onVenueChange={handleVenueChange}
        weekStart={weekStart}
        weekRangeLabel={formatWeekRange(weekStart)}
        weekRangeMonth={getWeekOfMonthLabel(weekStart)}
        onPrevWeek={handlePrevWeek}
        onNextWeek={handleNextWeek}
        onThisWeek={handleThisWeek}
        onDateChange={handleDateChange}
        isBeoView={isBeoView}
        onBackToSchedule={handleBackToSchedule}
      />

      <nav className="sub-nav-bar">
        <button
          type="button"
          className="sub-nav-tab active"
          onClick={handleBackToSchedule}
        >
          Schedule
        </button>
        {hasVenuePermission(access, currentVenue?.id, 'labor_goals.view') && (
          <a href={`/goals?venueId=${encodeURIComponent(currentVenue.id)}`} className="sub-nav-tab">
            Goals & budgets
          </a>
        )}

        <button
          type="button"
          className="sub-nav-tab"
          style={{ color: '#94a3b8' }}
          onClick={() => alert("Help, history & sync (simulated prototype documentation)")}
        >
          Help, history & sync
        </button>
        <button
          type="button"
          className="sub-nav-tab"
          style={{ color: '#94a3b8' }}
          onClick={() => alert("Prototype controls (simulated demo options)")}
        >
          Prototype controls
        </button>
      </nav>

      {eventDetailError && <p className="workspace-main" role="alert">{eventDetailError}</p>}

      {venueError || accessError || (!accessLoading && !access) || eventsError ? (
        <p className="workspace-main" role="alert">{venueError || eventsError || 'Could not check your access.'}</p>
      ) : accessLoading || !venues || (venues.length > 0 && loading) ? (
        <p className="workspace-main" role="status">Loading schedule…</p>
      ) : !currentVenue ? (
        <p className="workspace-main">No venues are available for scheduling.</p>
      ) : isBeoView && activeEvent ? (
        <BeoPdfModal
          event={activeEvent}
          currentVenue={currentVenue}
          isOpen={true}
          onClose={handleBackToSchedule}
        />
      ) : (
        <>
          <StatusBanner
            publishedCount={venueEvents.length}
            totalEvents={venueEvents.length}
            coverageStatus="Coverage still needs review"
          />

          <LaborGoalsAccordion
            venueId={currentVenue?.id || ''}
            eventId={activeEvent?.id || ''}
            weekStart={weekStart}
          />

          <WeekRibbon
            weekStart={weekStart}
            events={venueEvents}
            selectedDay={selectedDay}
            onSelectDay={handleSelectDay}
            activeEventId={activeEvent?.id}
            onSelectEvent={handleSelectEvent}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />

          {venueEvents.length === 0 && <p className="workspace-main">No events scheduled at this venue this week.</p>}
          {venueEvents.length > 0 && (viewMode === 'day' ? (
            <main className="workspace-main">
              <DayActionBar
                selectedDate={selectedDay || weekStart}
                events={dayEvents.length > 0 ? dayEvents : (activeEvent ? [activeEvent] : [])}
                activeEvent={activeEvent}
                onSelectEvent={handleSelectEvent}
                onToggleEventDetails={() => setShowEventDetails(prev => !prev)}
                showEventDetails={showEventDetails}
                onOpenBeoPdf={handleOpenBeoView}
              />

              <EventDetailsModal
                event={activeEvent}
                isOpen={showEventDetails}
                onClose={() => setShowEventDetails(false)}
              />

              <TimelineGrid activeEvent={activeEvent} venueId={currentVenue?.id} />
            </main>
          ) : (
            <main className="workspace-main">
              <WeekScheduleGrid weekStart={weekStart} events={venueEvents} venueId={currentVenue?.id} />
            </main>
          ))}
        </>
      )}
    </div>
  );
}
