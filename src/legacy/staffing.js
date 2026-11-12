export function mount() {
// Configurable API Base URL pointing to Go server (:8080) when frontend is on :3000
    const API_BASE_URL = window.API_BASE_URL || (
      window.location.port !== '8080' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        ? 'http://localhost:8080'
        : ''
    );

    // State management
    let currentEvent = null;
    let weekEvents = [];
    let currentWeekStart = '';

    // Helper functions
    function formatTime(str) {
      if (!str) return '';
      if (str.includes('T')) {
        const d = new Date(str);
        if (!isNaN(d.getTime())) {
          return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        }
      }
      return str;
    }

    function formatSalesforceTimeOnly(value) {
      if (!value) return '';
      const match = String(value).match(/^(\d{1,2}):(\d{2})/);
      if (!match) return '';
      const hour = Number(match[1]);
      const minute = match[2];
      const suffix = hour >= 12 ? 'PM' : 'AM';
      return `${hour % 12 || 12}:${minute} ${suffix}`;
    }

    function plainSalesforceText(value) {
      if (!value) return '';
      return new DOMParser().parseFromString(String(value), 'text/html').body.textContent.trim();
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

    function updateWeekHeader(weekStart) {
      const date = new Date(`${weekStart}T12:00:00`);
      if (Number.isNaN(date.getTime())) return;
      document.getElementById('week-range-label').textContent = formatWeekRange(weekStart);
      const weekOfMonth = Math.ceil(date.getDate() / 7);
      document.getElementById('week-range-month').textContent = `${date.toLocaleDateString('en-US', { month: 'long' })} · week ${weekOfMonth}`;
    }

    function dateKey(date) {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }

    function mondayFor(dateValue) {
      const date = new Date(`${dateValue}T12:00:00`);
      if (Number.isNaN(date.getTime())) return '';
      const day = date.getDay();
      date.setDate(date.getDate() - ((day + 6) % 7));
      return dateKey(date);
    }

    function shiftWeek(weekStart, amount) {
      const date = new Date(`${weekStart}T12:00:00`);
      if (Number.isNaN(date.getTime())) return weekStart;
      date.setDate(date.getDate() + amount * 7);
      return dateKey(date);
    }

    function calculateHours(startTimeStr, endTimeStr) {
      if (!startTimeStr || !endTimeStr) return null;
      const parseTime = (tStr) => {
        if (tStr.includes('T')) {
          const d = new Date(tStr);
          return isNaN(d.getTime()) ? null : d;
        }
        const match = tStr.match(/(\d+)(?::(\d+))?\s*(AM|PM)/i);
        if (!match) return null;
        let h = parseInt(match[1], 10);
        const m = match[2] ? parseInt(match[2], 10) : 0;
        const isPM = match[3].toUpperCase() === 'PM';
        if (isPM && h !== 12) h += 12;
        if (!isPM && h === 12) h = 0;
        return new Date(2000, 0, 1, h, m);
      };
      const d1 = parseTime(startTimeStr);
      const d2 = parseTime(endTimeStr);
      if (!d1 || !d2) return null;
      let diffMs = d2.getTime() - d1.getTime();
      if (diffMs < 0) diffMs += 24 * 60 * 60 * 1000;
      return Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10;
    }

    function renderPlanningInputs(evt) {
      if (!evt) return;

      currentEvent = evt;
      const q = evt.quote || {};
      const property = evt.venueProperty || evt.venue || '';

      // 1. Header & Titles
      document.getElementById('active-venue-name').textContent = property;
      document.getElementById('planning-event-title').textContent = evt.name;
      document.getElementById('current-day-heading').textContent = [evt.dayOfWeek, evt.eventDate].filter(Boolean).join(', ');
      if (evt.eventDate) {
        const eventDate = new Date(`${evt.eventDate}T12:00:00`);
        if (!Number.isNaN(eventDate.getTime())) {
          document.getElementById('plan-month-label').textContent = `This month · ${eventDate.toLocaleDateString('en-US', { month: 'long' })}`;
        }
      }
      const summaryParts = ['1 event'];
      if (Number.isFinite(evt.guestCount) && evt.guestCount > 0) summaryParts.push(`${evt.guestCount} guests`);
      document.getElementById('current-day-summary').textContent = summaryParts.join(' · ');
      document.getElementById('plan-week-dates').textContent = formatWeekRange(currentWeekStart);
        const weekDate = new Date(`${currentWeekStart}T12:00:00`);
        if (!Number.isNaN(weekDate.getTime())) {
          document.getElementById('plan-month-label').textContent = `This month · ${weekDate.toLocaleDateString('en-US', { month: 'long' })}`;
        }
      document.getElementById('quote-number-tag').textContent = q.quoteNumber ? `Salesforce Quote: ${q.quoteNumber} (Primary)` : '';

      // 2. Guests
      const guestParts = [];
      if (evt.guestCount > 0) guestParts.push(`${evt.guestCount} guests`);
      if (Number.isInteger(evt.under21Count)) guestParts.push(`${evt.under21Count} under 21`);
      document.getElementById('val-guests').textContent = guestParts.join(' · ');
      document.getElementById('sub-guests').textContent = evt.guestCount > 0 ? `Contracted covers on Event: ${evt.guestCount}` : '';

      // 3. Ceremony
      const cSpace = evt.ceremonyLocation ? `<span class="val-sf-ready">${evt.ceremonyLocation}</span>` : '';
      const cTimeValue = formatSalesforceTimeOnly(evt.ceremonyStartTime);
      const cTime = cTimeValue ? `<span class="val-sf-ready">${cTimeValue}</span>` : '';
      document.getElementById('val-ceremony').innerHTML = [cSpace, cTime].filter(Boolean).join(' · ');
      document.getElementById('sub-ceremony').textContent = '';

      // 4. Meal
      let mealServiceText = q.mealService ? `<span class="val-sf-ready">${q.mealService.toUpperCase()}</span>` : '';
      let mealPackageText = q.mealPackage ? `<span class="val-sf-ready">${q.mealPackage}</span>` : '';
      const mealTimeValue = formatSalesforceTimeOnly(evt.mealServiceTime);
      const mealTimeText = mealTimeValue ? `<span class="val-sf-ready">${mealTimeValue}</span>` : '';
      document.getElementById('val-meal').innerHTML = [mealServiceText, mealPackageText].filter(Boolean).join(' · ');
      document.getElementById('sub-meal').innerHTML = mealTimeText;

      // 5. Bar
      const noSFValue = 'No value in Salesforce';
      const barPackage = q.barPackage || q.hostedBarType || q.noHostBar || '';
      document.getElementById('val-bar').textContent = barPackage || noSFValue;
      const barDetails = [
        `Hosted duration: ${q.hostedBarHours != null && Number.isFinite(Number(q.hostedBarHours)) ? `${q.hostedBarHours} hours` : noSFValue}`,
        `Cocktail hour: ${formatSalesforceTimeOnly(evt.cocktailHourStartTime) || noSFValue}`,
        `Bar start: ${formatSalesforceTimeOnly(evt.barStartTime) || noSFValue}`,
        `Bar closes: ${formatSalesforceTimeOnly(evt.barCloseTime) || noSFValue}`,
        `Last call: ${formatSalesforceTimeOnly(evt.barLastCallTime) || noSFValue}`,
        `Location: ${evt.barLocation || noSFValue}`,
        `Anticipated activity: ${evt.anticipatedBarActivity || noSFValue}`,
        `Bar notes: ${plainSalesforceText(evt.otherBarNotes) || noSFValue}`,
        `Beverage cart: ${plainSalesforceText(evt.beverageCartDetails) || noSFValue}`,
        `Other bar items: ${Array.isArray(q.barItems) && q.barItems.length ? q.barItems.join(', ') : noSFValue}`
      ];
      document.getElementById('sub-bar').textContent = barDetails.join('\n');

      // 6. Reception / Event
      const sT = formatTime(evt.startTime);
      const eT = formatTime(evt.endTime);
      const duration = calculateHours(evt.startTime, evt.endTime);
      if (sT && eT) {
        document.getElementById('val-reception').innerHTML = `<span class="val-sf-ready">${sT} – ${eT}${duration ? ` · ${duration} hours` : ''}</span>`;
      } else {
        document.getElementById('val-reception').innerHTML = '';
      }

      // 7. Appetizers / Action Stations
      if (q.appetizers && q.appetizers.length > 0) {
        document.getElementById('val-appetizers').innerHTML = `<span class="val-sf-ready">${q.appetizers.join(' · ')}</span>`;
      } else document.getElementById('val-appetizers').innerHTML = '';

      // 8. Signature Drinks / Prep
      if (evt.signatureDrinks && evt.signatureDrinks.trim() !== '' && evt.signatureDrinks.toLowerCase() !== 'n/a') {
        document.getElementById('val-signature-drinks').innerHTML = `<span class="val-sf-ready">${evt.signatureDrinks}</span>`;
      } else document.getElementById('val-signature-drinks').innerHTML = '';

      // 9. Welcome Champagne / Wall
      if (q.champagne) {
        document.getElementById('val-champagne').innerHTML = `<span class="val-sf-ready">${q.champagne} (${q.champagneQty || 'Yes'})</span>`;
      } else document.getElementById('val-champagne').innerHTML = '';

      // 10. Table Settings (Glassware & Chargers)
      const tableSettings = [];
      if (q.champagneFlutesNeeded) tableSettings.push('Flutes: Yes');
      if (q.wineGlassesNeeded) tableSettings.push('Wine: Yes');
      if (evt.chargerPlates && evt.chargerPlates.toLowerCase() !== 'n/a') {
        tableSettings.push(`Chargers: Yes (${evt.chargerPlates})`);
      }
      document.getElementById('val-table-settings').textContent = tableSettings.join(' · ');

      // 11. Photo Booth
      if (evt.photoBooth === true) {
        if (evt.photoboothStaffed) {
          document.getElementById('val-photobooth').innerHTML = '<span class="val-sf-ready">YES · Staffed by Venue</span>';
        } else {
          document.getElementById('val-photobooth').innerHTML = '<span class="val-sf-ready">YES</span>';
        }
      } else if (evt.photoBooth === false) {
        document.getElementById('val-photobooth').innerHTML = '<span class="val-sf-ready">No</span>';
      } else {
        document.getElementById('val-photobooth').textContent = 'Not provided in Salesforce';
      }

      // 12. Extras / Special Instructions
      const extras = [];
      if (q.loveLetters) extras.push(`LOVE letters: Yes (${q.loveLetters})`);
      if (q.lateNightSnacks && q.lateNightSnacks.length > 0) extras.push(`Late snacks: ${q.lateNightSnacks.join(', ')}`);
      let notes = evt.beoNotes || evt.notes || '';
      if (notes) {
        notes = `<span class="val-sf-ready">${notes.replace(/<[^>]*>/g, '')}</span>`;
      }
      if (notes) extras.push(`Notes: ${notes}`);
      document.getElementById('val-extras').innerHTML = extras.join(' · ');

      // 13. GM Working Note
      document.getElementById('gm-note-input').value = '';

      // 14. Timeline Event Bar
      document.getElementById('timeline-event-name').innerHTML = `💍 ${evt.name}`;
      const timelineParts = [];
      if (sT && eT) timelineParts.push(`${sT}–${eT}`);
      if (property) timelineParts.push(property);
      document.getElementById('timeline-event-bar').textContent = timelineParts.join(': ');
    }

    function renderWeekRibbon(events, activeEvtId, onSelectEvent) {
      const container = document.getElementById('week-ribbon-container');
      container.innerHTML = '';

      const weekStart = new Date(`${currentWeekStart}T12:00:00`);
      if (Number.isNaN(weekStart.getTime())) return;

      Array.from({ length: 7 }, (_, idx) => {
        const dayDate = new Date(weekStart);
        dayDate.setDate(dayDate.getDate() + idx);
        const dayEvents = events.filter(event => event.eventDate === dateKey(dayDate));
        const dayLabel = dayDate.toLocaleDateString('en-US', { weekday: 'short' });
        const dateLabel = dayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const dayEvts = dayEvents;
        const hasActive = dayEvts.some(e => e.id === activeEvtId);
        const card = document.createElement('div');
        card.className = `day-tab-card ${hasActive ? 'active' : ''}`;

        let eventHTML = '';
        if (dayEvts.length > 0) {
          const first = dayEvts[0];
          const meta = [];
          if (Number.isFinite(first.guestCount) && first.guestCount > 0) meta.push(`${first.guestCount} guests`);
          if (first.startTime && first.endTime) meta.push(`${first.startTime}–${first.endTime}`);
          else if (first.startTime) meta.push(first.startTime);
          eventHTML = `
            <div class="event-card-name" title="${first.name}">${first.name}</div>
            <div class="event-card-meta">${meta.join(' · ')}</div>
          `;
        } else {
          eventHTML = `<div class="event-card-meta" style="font-weight: 700; color: #94a3b8; margin-top: 8px;">No events</div>`;
        }

        card.innerHTML = `
          <div>
            <div class="day-header-line">
              <span class="day-name">${dayLabel}</span>
              <span class="day-date">${dateLabel}</span>
            </div>
            ${eventHTML}
          </div>
          <div class="day-le-strip">
            <span>${dayEvts.length > 0 ? `${dayEvts.length} ${dayEvts.length === 1 ? 'event' : 'events'}` : 'Schedule'}</span>
            <span>${dayEvts.length > 0 && dayEvts.every(event => Number.isFinite(event.guestCount) && event.guestCount >= 0) ? `${dayEvts.reduce((sum, event) => sum + event.guestCount, 0)} covers` : ''}</span>
          </div>
        `;

        card.addEventListener('click', () => {
          if (dayEvts.length > 0 && typeof onSelectEvent === 'function') {
            onSelectEvent(dayEvts[0].id);
          }
        });

        container.appendChild(card);
      });
    }

    function initPage() {
      // 1. Parse URL params — set by Page 1 when user clicks an event
      const urlParams = new URLSearchParams(window.location.search);
      const eventIdParam = urlParams.get('eventId');
      const weekParam    = urlParams.get('week');

      const requestedWeek = weekParam || localStorage.getItem('wedgewood_active_monday') || dateKey(new Date());
      currentWeekStart = mondayFor(requestedWeek);
      document.getElementById('plan-week-dates').textContent = formatWeekRange(currentWeekStart);
      document.getElementById('week-picker').value = currentWeekStart;
      updateWeekHeader(currentWeekStart);
      let eventSelectionRequest = 0;

      function setupDropdown(activeEvt) {
        const select = document.getElementById('event-selector-dropdown');
        if (!select) return;
        select.innerHTML = '';
        const sameVenueEvts = currentEvent && currentEvent.venue
          ? weekEvents.filter(e => e.venue === currentEvent.venue)
          : weekEvents;
        const sameDayEvts = sameVenueEvts.filter(e => e.eventDate === activeEvt.eventDate);
        const optionsList = sameDayEvts.length > 0 ? sameDayEvts : [activeEvt];
        optionsList.forEach(e => {
          const opt = document.createElement('option');
          opt.value = e.id;
          opt.textContent = `${e.name}${e.guestCount > 0 ? ` (${e.guestCount} guests)` : ''}`;
          if (e.id === activeEvt.id) opt.selected = true;
          select.appendChild(opt);
        });
        select.onchange = (ev) => {
          const selectedId = ev.target.value;
          const requestNumber = ++eventSelectionRequest;
          loadEventDetail(selectedId)
            .then(chosen => {
              if (requestNumber !== eventSelectionRequest) return;
              applyEvent(chosen);
              const url = new URL(window.location.href);
              url.searchParams.set('eventId', selectedId);
              window.history.replaceState({}, '', url);
            })
            .catch(err => {
              if (requestNumber === eventSelectionRequest) {
                showErrorState(`Unable to load selected event details: ${err.message}`);
              }
            });
        };
      }

      function applyEvent(evt) {
        currentEvent = evt;
        document.getElementById('planning-inputs-container').style.display = '';
        document.querySelector('.roster-card').style.display = '';
        renderPlanningInputs(evt);
        setupDropdown(evt);

        // Filter week ribbon events by the venue of the current event so the 7-day strip represents this venue's schedule
        const venueEvents = (weekEvents && weekEvents.length > 0)
          ? weekEvents.filter(e => !evt.venue || e.venue === evt.venue)
          : [evt];
        renderWeekRibbon(venueEvents.length > 0 ? venueEvents : weekEvents, evt.id, targetId => {
          const requestNumber = ++eventSelectionRequest;
          loadEventDetail(targetId)
            .then(selectedEvent => {
              if (requestNumber !== eventSelectionRequest) return;
              applyEvent(selectedEvent);
              const url = new URL(window.location.href);
              url.searchParams.set('eventId', selectedEvent.id);
              window.history.replaceState({}, '', url);
            })
            .catch(err => {
              if (requestNumber === eventSelectionRequest) {
                showErrorState(`Unable to load selected event details: ${err.message}`);
              }
            });
        });

        // Keep Goals & budgets link parameters in sync with current view
        const goalsLink = document.getElementById('link-goals-budgets');
        if (goalsLink && evt.id) {
          goalsLink.href = `/goals/?eventId=${encodeURIComponent(evt.id)}&week=${encodeURIComponent(currentWeekStart)}`;
        }
      }

      function loadEventDetail(id) {
        return fetch(`${API_BASE_URL}/api/events/${encodeURIComponent(id)}`)
          .then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); });
      }

      function loadWeekEvents(weekStart) {
        const query = new URLSearchParams({ week: weekStart });
        return fetch(`${API_BASE_URL}/api/events?${query.toString()}`)
          .then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); })
          .then(data => data.events || []);
      }

      function showEmptyWeek() {
        currentEvent = null;
        document.getElementById('current-day-heading').textContent = 'No events this week';
        document.getElementById('current-day-summary').textContent = '';
        document.getElementById('planning-inputs-container').style.display = 'none';
        document.querySelector('.roster-card').style.display = '';
        document.getElementById('timeline-event-name').textContent = '';
        document.getElementById('timeline-event-bar').textContent = '';
        document.getElementById('event-selector-dropdown').innerHTML = '';
        renderWeekRibbon([], '', null);
      }

      function loadSelectedWeek(weekStart, preferredEventId = '') {
        eventSelectionRequest++;
        currentWeekStart = mondayFor(weekStart);
        document.getElementById('week-picker').value = currentWeekStart;
        document.getElementById('plan-week-dates').textContent = formatWeekRange(currentWeekStart);
        updateWeekHeader(currentWeekStart);
        const weekDate = new Date(`${currentWeekStart}T12:00:00`);
        if (!Number.isNaN(weekDate.getTime())) {
          document.getElementById('plan-month-label').textContent = `This month · ${weekDate.toLocaleDateString('en-US', { month: 'long' })}`;
        }
        const url = new URL(window.location.href);
        url.searchParams.set('week', currentWeekStart);
        url.searchParams.delete('eventId');
        window.history.replaceState({}, '', url);

        loadWeekEvents(currentWeekStart).then(events => {
          weekEvents = events;
          if (weekEvents.length === 0) {
            showEmptyWeek();
            return;
          }
          const selected = weekEvents.find(event => event.id === preferredEventId) || weekEvents[0];
          return loadEventDetail(selected.id).then(evt => {
            applyEvent(evt);
            url.searchParams.set('eventId', evt.id);
            window.history.replaceState({}, '', url);
          });
        }).catch(err => showErrorState(`Unable to load this week: ${err.message}`));
      }

      function setView(view) {
        const views = ['day', 'week', 'staffing'];
        views.forEach(name => {
          const button = document.getElementById(`${name}-view-button`);
          if (button) {
            const active = name === view;
            button.classList.toggle('active', active);
            button.setAttribute('aria-selected', String(active));
          }
        });

        const dayRoster = document.querySelector('.roster-card');
        let weekScheduleCard = document.getElementById('week-schedule-card');

        if (view === 'week') {
          if (dayRoster) dayRoster.style.display = 'none';
          if (!weekScheduleCard) {
            weekScheduleCard = document.createElement('section');
            weekScheduleCard.id = 'week-schedule-card';
            weekScheduleCard.className = 'roster-card';
            weekScheduleCard.style.marginTop = '16px';
            weekScheduleCard.innerHTML = `
              <div class="roster-toolbar">
                <div style="font-weight:800;color:#0f172a;font-size:14px;">Week schedule</div>
                <div style="font-size:11px;color:#64748b;">Employee shifts are supplied by ADP</div>
              </div>
              <div class="adp-unavailable-state">ADP is not connected. No employee names, availability, or shifts can be shown yet.</div>
              <div style="overflow-x:auto;">
                <table style="width:100%;border-collapse:collapse;font-size:11.5px;">
                  <thead><tr style="background:#f8fafc;border-bottom:2px solid #cbd5e1;text-align:left;color:#475569;">
                    <th style="padding:10px 14px;width:180px;border-right:1px solid #e2e8f0;">Worker / week hours</th>
                    <th style="padding:10px;">Mon</th><th style="padding:10px;">Tue</th><th style="padding:10px;">Wed</th>
                    <th style="padding:10px;">Thu</th><th style="padding:10px;">Fri</th><th style="padding:10px;">Sat</th><th style="padding:10px;">Sun</th>
                  </tr></thead>
                  <tbody><tr><td colspan="8" style="padding:18px;text-align:center;color:#64748b;">No schedule data available</td></tr></tbody>
                </table>
              </div>
            `;
            const main = document.querySelector('.workspace-main');
            if (main) main.appendChild(weekScheduleCard);
          }
          weekScheduleCard.style.display = '';
          weekScheduleCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
          if (weekScheduleCard) weekScheduleCard.style.display = 'none';
          if (dayRoster) dayRoster.style.display = '';
          const target = view === 'staffing'
            ? dayRoster
            : document.getElementById('planning-inputs-container');
          if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }

      function showLoadingState() {
        let overlay = document.getElementById('page2-loading-overlay');
        if (!overlay) {
          overlay = document.createElement('div');
          overlay.id = 'page2-loading-overlay';
          overlay.style.cssText = 'padding:40px;text-align:center;color:#6b7280;font-size:14px;';
          const container = document.getElementById('planning-inputs-container');
          if (container) container.prepend(overlay);
        }
        overlay.textContent = '⏳ Loading event data from Salesforce...';
        overlay.style.display = 'block';
        // Hide the actual grid while loading
        const grid = document.querySelector('#planning-inputs-container .planning-grid');
        if (grid) grid.style.display = 'none';
      }

      function hideLoadingState() {
        const overlay = document.getElementById('page2-loading-overlay');
        if (overlay) overlay.style.display = 'none';
        const grid = document.querySelector('#planning-inputs-container .planning-grid');
        if (grid) grid.style.display = '';
      }

      function showErrorState(msg) {
        let overlay = document.getElementById('page2-loading-overlay');
        if (!overlay) {
          overlay = document.createElement('div');
          overlay.id = 'page2-loading-overlay';
          overlay.style.cssText = 'padding:40px;text-align:center;font-size:14px;';
          const container = document.getElementById('planning-inputs-container');
          if (container) container.prepend(overlay);
        }
        overlay.style.color = '#ef4444';
        overlay.textContent = `⚠️ ${msg}`;
        overlay.style.display = 'block';
      }

      function applyEventAndReveal(evt) {
        applyEvent(evt);
        hideLoadingState();
      }

      showLoadingState();

      // Page 2 loads the selected event by ID and its week list separately.
      if (eventIdParam) {
        loadEventDetail(eventIdParam).then(evt => {
          if (evt.eventDate) {
            const eventMonday = mondayFor(evt.eventDate);
            if (eventMonday && (!weekParam || eventMonday !== currentWeekStart)) {
              currentWeekStart = eventMonday;
              document.getElementById('week-picker').value = currentWeekStart;
              document.getElementById('plan-week-dates').textContent = formatWeekRange(currentWeekStart);
              updateWeekHeader(currentWeekStart);
            }
          }
          return loadWeekEvents(currentWeekStart).then(events => {
            weekEvents = events;
            applyEventAndReveal(evt);
          });
        }).catch(err => {
          console.warn('Single-event API request failed:', err);
          showErrorState(`Unable to load event details: ${err.message}`);
        });
      } else {
        loadWeekEvents(currentWeekStart).then(events => {
          weekEvents = events;
          if (!weekEvents.length) {
            showEmptyWeek();
            return;
          }
          loadEventDetail(weekEvents[0].id).then(applyEventAndReveal)
            .catch(err => showErrorState(`Unable to load event details: ${err.message}`));
        }).catch(err => showErrorState(`Unable to load events: ${err.message}`));
      }

      document.getElementById('week-picker').addEventListener('change', event => {
        if (event.target.value) loadSelectedWeek(event.target.value, currentEvent?.id || '');
      });
      document.getElementById('prev-week').addEventListener('click', () => loadSelectedWeek(shiftWeek(currentWeekStart, -1), currentEvent?.id || ''));
      document.getElementById('next-week').addEventListener('click', () => loadSelectedWeek(shiftWeek(currentWeekStart, 1), currentEvent?.id || ''));
      document.getElementById('this-week-button').addEventListener('click', () => loadSelectedWeek(dateKey(new Date())));
      document.getElementById('day-view-button').addEventListener('click', () => setView('day'));
      document.getElementById('week-view-button').addEventListener('click', () => setView('week'));
      document.getElementById('staffing-view-button').addEventListener('click', () => setView('staffing'));

      // Collapse / Expand Planning Inputs
      const btnToggle = document.getElementById('btn-toggle-inputs');
      const container = document.getElementById('planning-inputs-container');
      let isCollapsed = false;

      btnToggle.addEventListener('click', () => {
        isCollapsed = !isCollapsed;
        if (isCollapsed) {
          container.style.display = 'none';
          btnToggle.textContent = 'Show planning inputs';
        } else {
          container.style.display = 'block';
          btnToggle.textContent = 'Hide planning inputs';
        }
      });
    }

    initPage();
}
