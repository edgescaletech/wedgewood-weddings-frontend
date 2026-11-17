import React, { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '../config.js';
import { useAuth } from '../context/AuthContext.jsx';
import AppHeader from '../components/Header/AppHeader.jsx';
import StatusBanner from '../components/Schedule/StatusBanner.jsx';
import LaborGoalsAccordion from '../components/Schedule/LaborGoalsAccordion.jsx';
import WeekRibbon from '../components/Schedule/WeekRibbon.jsx';
import DayActionBar from '../components/Schedule/DayActionBar.jsx';
import EventDetailsModal from '../components/Schedule/EventDetailsModal.jsx';
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
  const { hasPermission } = useAuth();

  // URL parameters initialization
  const urlParams = new URLSearchParams(window.location.search);
  const initialWeekParam = urlParams.get('week');
  const initialEventParam = urlParams.get('eventId');
  const initialVenueParam = urlParams.get('venueId');

  const [weekStart, setWeekStart] = useState(() => getMondayFor(initialWeekParam));
  const [selectedDay, setSelectedDay] = useState('');
  const [weekEvents, setWeekEvents] = useState([]);
  const [activeEvent, setActiveEvent] = useState(null);
  const [venues, setVenues] = useState([]);
  const [currentVenue, setCurrentVenue] = useState(null);
  const [showEventDetails, setShowEventDetails] = useState(false);
  const [viewMode, setViewMode] = useState('day');
  const [loading, setLoading] = useState(true);

  // Fetch full details of a specific event
  const loadEventDetail = useCallback(async (eventId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/events/${encodeURIComponent(eventId)}`, {
        credentials: 'include',
      });
      if (response.status === 401 || response.status === 403) {
        window.location.replace('/login');
        return null;
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (err) {
      console.error('Error fetching event details:', err);
      return null;
    }
  }, []);

  // Fetch events for the week and extract venues
  const fetchWeekEvents = useCallback(async (targetWeek, targetEventId = '') => {
    setLoading(true);
    try {
      const query = new URLSearchParams({ week: targetWeek });
      const response = await fetch(`${API_BASE_URL}/api/events?${query.toString()}`, {
        credentials: 'include',
      });

      if (response.status === 401 || response.status === 403) {
        window.location.replace('/login');
        return;
      }

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const events = data.events || [];
      setWeekEvents(events);

      // Extract unique venues from all events
      const venueMap = new Map();
      events.forEach(e => {
        const vName = e.venue || 'Unknown Venue';
        const vId = e.venueId || vName;
        if (!venueMap.has(vId)) {
          venueMap.set(vId, { id: vId, name: vName, timezone: e.timezone || 'Central Time' });
        }
      });
      const uniqueVenues = Array.from(venueMap.values());
      setVenues(uniqueVenues);

      // Determine initial venue
      let chosenVenue = null;
      if (initialVenueParam && uniqueVenues.length > 0) {
        chosenVenue = uniqueVenues.find(v => v.id === initialVenueParam) || null;
      }
      if (!chosenVenue && targetEventId && events.length > 0) {
        const targetEvt = events.find(e => e.id === targetEventId);
        if (targetEvt) {
          chosenVenue = uniqueVenues.find(v => (v.id && v.id === targetEvt.venueId) || v.name === targetEvt.venue) || null;
        }
      }
      if (!chosenVenue && uniqueVenues.length > 0) {
        chosenVenue = currentVenue || uniqueVenues[0];
      }
      if (chosenVenue) {
        setCurrentVenue(chosenVenue);
      }

      // Filter events by chosen venue
      const venueFiltered = chosenVenue
        ? events.filter(e => (e.venueId && e.venueId === chosenVenue.id) || e.venue === chosenVenue.name)
        : events;

      if (venueFiltered.length > 0) {
        const selected = (targetEventId && venueFiltered.find(e => e.id === targetEventId)) || venueFiltered[0];
        setSelectedDay(selected.eventDate);

        const details = await loadEventDetail(selected.id);
        setActiveEvent(details || selected);

        const url = new URL(window.location.href);
        url.pathname = '/staffing';
        url.searchParams.set('week', targetWeek);
        url.searchParams.delete('eventId');
        if (chosenVenue) url.searchParams.set('venueId', chosenVenue.id);
        window.history.replaceState({}, '', url);
      } else {
        setActiveEvent(null);
        setSelectedDay(targetWeek);
      }
    } catch (err) {
      console.error('Error loading week events:', err);
    } finally {
      setLoading(false);
    }
  }, [loadEventDetail, initialVenueParam]);

  useEffect(() => {
    fetchWeekEvents(weekStart, initialEventParam);
  }, [weekStart, fetchWeekEvents, initialEventParam]);

  // Venue selection handler: updates current venue, selects its first event, and updates URL
  const handleVenueChange = (selected) => {
    setCurrentVenue(selected);
    const venueEvts = weekEvents.filter(e => (e.venueId && e.venueId === selected.id) || e.venue === selected.name);
    if (venueEvts.length > 0) {
      handleSelectEvent(venueEvts[0].id);
    } else {
      setActiveEvent(null);
    }
    const url = new URL(window.location.href);
    url.pathname = '/staffing';
    url.searchParams.set('venueId', selected.id);
    url.searchParams.delete('eventId');
    window.history.replaceState({}, '', url);
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

  const handleSelectDay = (dateStr) => {
    setSelectedDay(dateStr);
    const dayEvts = venueEvents.filter(e => e.eventDate === dateStr);
    if (dayEvts.length > 0) {
      handleSelectEvent(dayEvts[0].id);
    }
  };

  const handleSelectEvent = async (eventId) => {
    const details = await loadEventDetail(eventId);
    const chosen = details || weekEvents.find(e => e.id === eventId);
    if (chosen) {
      setActiveEvent(chosen);
      setSelectedDay(chosen.eventDate);

      const url = new URL(window.location.href);
      url.pathname = '/staffing';
      url.searchParams.delete('eventId');
      window.history.replaceState({}, '', url);
    }
  };

  // Filter events by currently selected venue
  const venueEvents = currentVenue
    ? weekEvents.filter(e => (e.venueId && e.venueId === currentVenue.id) || e.venue === currentVenue.name)
    : weekEvents;

  // Filter events for the selected day within this venue
  const dayEvents = selectedDay
    ? venueEvents.filter(e => e.eventDate === selectedDay)
    : (activeEvent ? [activeEvent] : []);

  return (
    <div className="staffing-application-container">
      <AppHeader
        venues={venues}
        currentVenue={currentVenue}
        onVenueChange={handleVenueChange}
        weekStart={weekStart}
        weekRangeLabel={formatWeekRange(weekStart)}
        weekRangeMonth={getWeekOfMonthLabel(weekStart)}
        onPrevWeek={handlePrevWeek}
        onNextWeek={handleNextWeek}
        onThisWeek={handleThisWeek}
        onDateChange={handleDateChange}
      />

      <StatusBanner
        publishedCount={venueEvents.length}
        totalEvents={venueEvents.length}
        coverageStatus="Coverage still needs review"
      />

      <LaborGoalsAccordion
        weekDates={formatWeekRange(weekStart)}
        monthLabel={`This month · ${new Date(`${weekStart}T12:00:00`).toLocaleDateString('en-US', { month: 'long' })}`}
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

      {viewMode === 'day' ? (
        <main className="workspace-main">
          <DayActionBar
            selectedDate={selectedDay || weekStart}
            events={dayEvents.length > 0 ? dayEvents : (activeEvent ? [activeEvent] : [])}
            activeEvent={activeEvent}
            onSelectEvent={handleSelectEvent}
            onToggleEventDetails={() => setShowEventDetails(prev => !prev)}
            showEventDetails={showEventDetails}
          />

          <EventDetailsModal
            event={activeEvent}
            isOpen={showEventDetails}
            onClose={() => setShowEventDetails(false)}
          />

          <TimelineGrid activeEvent={activeEvent} />
        </main>
      ) : (
        <main className="workspace-main">
          <WeekScheduleGrid weekStart={weekStart} events={venueEvents} />
        </main>
      )}
    </div>
  );
}
