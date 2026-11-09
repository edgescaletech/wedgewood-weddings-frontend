/**
 * Wedgewood Weddings · Venue Scheduling Frontend Controller
 * Connects directly to Go backend (/api/events) backed by live Salesforce data.
 */

// Configurable API base URL:
// - When running frontend independently in local dev (e.g. port 3000, 5500), calls backend at :8080
// - In production, can be set via window.API_BASE_URL or defaults to current origin
const API_BASE_URL = window.API_BASE_URL || (
  window.location.port !== '8080' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:8080'
    : ''
);

// Application State
const state = {
  currentMonday: null,    // Date object representing Monday of active week
  events: [],             // Events fetched from Salesforce for active week
  selectedEventId: null,  // Currently inspected event
  selectedVenue: 'ALL',   // Active venue filter ('ALL' or property name)
  searchQuery: '',        // Real-time search filter for venue or couple name
  isLoading: false,
};


// ============================================================================
// Date & Time Helpers
// ============================================================================

function getMonday(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(d, days) {
  const res = new Date(d);
  res.setDate(res.getDate() + days);
  return res;
}

function toISODate(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatShortDate(d) {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatWeekRange(start) {
  const end = addDays(start, 6);
  const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return `${startStr} – ${endStr}`;
}

function formatEventDateHeader(dateStr, dayOfWeek) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    const month = d.toLocaleDateString('en-US', { month: 'short' });
    const day = d.getDate();
    return `${dayOfWeek || ''} ${day} ${month}`.trim();
  }
  return dateStr;
}

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

  const start = parseTime(startTimeStr);
  const end = parseTime(endTimeStr);
  if (!start || !end) return null;

  let diffMs = end.getTime() - start.getTime();
  if (diffMs < 0) {
    // Crosses midnight (e.g. 9:00 PM to 2:00 AM)
    diffMs += 24 * 60 * 60 * 1000;
  }
  const hours = Math.round(diffMs / (60 * 60 * 1000));
  return hours > 0 ? hours : null;
}

function formatBar(evt) {
  if (!evt.hasBar) return 'No bar';
  const hours = calculateHours(evt.startTime, evt.endTime);
  const locPrefix = evt.barLocation ? `${evt.barLocation} · ` : '';
  if (hours) {
    return `${locPrefix}Hosted · ${hours} hours`;
  }
  return `${locPrefix}Hosted`;
}

// ============================================================================
// API Calls
// ============================================================================

async function fetchWeeklyEvents(monday, forceRefresh = false) {
  state.isLoading = true;
  renderSidebarLoading();

  const syncBtn = document.getElementById('btn-sync-sf');
  const syncIcon = document.getElementById('sync-icon');
  const syncText = document.getElementById('sync-text');
  if (syncBtn && forceRefresh) {
    syncBtn.disabled = true;
    if (syncIcon) syncIcon.textContent = '⏳';
    if (syncText) syncText.textContent = 'Syncing...';
  }

  const isoWeek = toISODate(monday);
  const url = forceRefresh 
    ? `${API_BASE_URL}/api/events?week=${isoWeek}&refresh=true` 
    : `${API_BASE_URL}/api/events?week=${isoWeek}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }
    const data = await response.json();
    state.events = data.events || [];
    
    // Auto-select the first event if available
    if (state.events.length > 0) {
      state.selectedEventId = state.events[0].id;
    } else {
      state.selectedEventId = null;
    }

    renderUI();

    if (syncBtn && forceRefresh) {
      if (syncIcon) syncIcon.textContent = '✓';
      if (syncText) syncText.textContent = 'Synced!';
      setTimeout(() => {
        syncBtn.disabled = false;
        if (syncIcon) syncIcon.textContent = '🔄';
        if (syncText) syncText.textContent = 'Sync from SF';
      }, 1800);
    }
  } catch (err) {
    console.error('Failed to load events:', err);
    renderSidebarError(err.message);
    if (syncBtn && forceRefresh) {
      syncBtn.disabled = false;
      if (syncIcon) syncIcon.textContent = '⚠️';
      if (syncText) syncText.textContent = 'Sync failed';
    }
  } finally {
    state.isLoading = false;
  }
}


// ============================================================================
// UI Rendering
// ============================================================================

function renderUI() {
  renderWeekHeader();
  renderWeekTabs();
  populateVenueFilter();
  renderSidebarEvents();
  renderEventDetail();
}

function populateVenueFilter() {
  const select = document.getElementById('venue-filter-select');
  if (!select) return;

  // Build count map of venues
  const venueCounts = {};
  state.events.forEach(e => {
    const v = e.venueProperty || e.venue || 'Unknown Property';
    venueCounts[v] = (venueCounts[v] || 0) + 1;
  });

  const sortedVenues = Object.keys(venueCounts).sort();
  const currentVal = state.selectedVenue;

  let optionsHTML = `<option value="ALL">🏢 All Venues (${state.events.length} events)</option>`;
  sortedVenues.forEach(v => {
    const isSelected = v === currentVal ? 'selected' : '';
    optionsHTML += `<option value="${escapeHTML(v)}" ${isSelected}>${escapeHTML(v)} (${venueCounts[v]})</option>`;
  });

  select.innerHTML = optionsHTML;
}

function renderWeekHeader() {
  const titleElem = document.getElementById('planning-week-title');
  const countSummary = document.getElementById('events-count-summary');
  const subVenueLabel = document.getElementById('sub-venue-label');
  const dateInput = document.getElementById('week-date-input');

  const rangeStr = formatWeekRange(state.currentMonday);
  titleElem.textContent = rangeStr;

  const count = state.events.length;
  countSummary.textContent = `${count} event${count === 1 ? '' : 's'} across the week · Select any event to review its inputs.`;
  
  const endMonday = addDays(state.currentMonday, 6);
  subVenueLabel.textContent = `VENUE EVENTS · ${state.currentMonday.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }).toUpperCase()}–${endMonday.getDate()}`;

  dateInput.value = toISODate(state.currentMonday);
}

function renderWeekTabs() {
  const tabsContainer = document.getElementById('week-tabs');
  tabsContainer.innerHTML = '';

  // Render 5 consecutive weekly tabs starting from current Monday
  for (let i = 0; i < 5; i++) {
    const tabMonday = addDays(state.currentMonday, i * 7);
    const tabSunday = addDays(tabMonday, 6);
    
    const card = document.createElement('div');
    card.className = `week-tab-card ${i === 0 ? 'active' : ''}`;
    
    const startMonth = tabMonday.toLocaleDateString('en-US', { month: 'short' });
    const endMonth = tabSunday.toLocaleDateString('en-US', { month: 'short' });
    const dateLabel = startMonth === endMonth
      ? `${startMonth} ${tabMonday.getDate()}–${tabSunday.getDate()}`
      : `${startMonth} ${tabMonday.getDate()}–${endMonth} ${tabSunday.getDate()}`;

    const subText = i === 0 ? 'Reference week' : `Next ${i} week${i > 1 ? 's' : ''}`;

    card.innerHTML = `
      <div class="tab-dates">${dateLabel}</div>
      <div class="tab-sub">${subText}</div>
    `;

    card.addEventListener('click', () => {
      setWeek(tabMonday);
    });

    tabsContainer.appendChild(card);
  }
}

function renderSidebarEvents() {
  const container = document.getElementById('events-list');
  const countBadge = document.getElementById('sidebar-count-badge');
  container.innerHTML = '';

  // 1. Filter by selected venue dropdown
  let filteredEvents = state.selectedVenue === 'ALL'
    ? state.events
    : state.events.filter(e => (e.venueProperty || e.venue) === state.selectedVenue);

  // 2. Filter by search query if user typed anything
  const q = (state.searchQuery || '').trim().toLowerCase();
  if (q) {
    filteredEvents = filteredEvents.filter(e => {
      const vName = (e.venueProperty || e.venue || '').toLowerCase();
      const cSpace = (e.ceremonyLocation || '').toLowerCase();
      const couple = (e.name || '').toLowerCase();
      const coord = (e.coordinator || '').toLowerCase();
      const gm = (e.venueGM || '').toLowerCase();
      return vName.includes(q) || cSpace.includes(q) || couple.includes(q) || coord.includes(q) || gm.includes(q);
    });
  }

  if (countBadge) {
    countBadge.textContent = filteredEvents.length;
  }

  if (filteredEvents.length === 0) {
    const emptyMsg = q 
      ? `No events match "${escapeHTML(q)}".`
      : 'No events found for this venue.';
    const subMsg = q
      ? 'Try typing another venue or couple name, or clear the search.'
      : 'Select "All Venues" or choose another property from the dropdown.';
    container.innerHTML = `
      <div class="empty-events-state">
        <p>${emptyMsg}</p>
        <span style="font-size: 11px; color: var(--color-text-light);">${subMsg}</span>
      </div>
    `;
    return;
  }


  // If currently selected event is not in filtered list, auto-select first filtered event
  if (!filteredEvents.some(e => e.id === state.selectedEventId)) {
    state.selectedEventId = filteredEvents[0].id;
    renderEventDetail();
  }

  filteredEvents.forEach(evt => {
    const card = document.createElement('div');
    card.className = `event-item-card ${evt.id === state.selectedEventId ? 'active' : ''}`;
    
    const venueName = evt.venue || 'Main Venue';
    const propertyName = evt.venueProperty || '';
    const ceremonySpace = evt.ceremonyLocation || '';
    
    // Main estate name
    const mainEstate = propertyName || venueName;
    // Display format: "Fallbrook Estate · Lakeside Arbor" or fallback to mainEstate
    const venueDisplay = ceremonySpace && ceremonySpace !== mainEstate
      ? `${mainEstate} · ${ceremonySpace}`
      : mainEstate;
    const guestLabel = evt.guestCount ? `${evt.guestCount} covers` : 'Covers TBD';
    const dateShort = formatEventDateHeader(evt.eventDate, evt.dayOfWeek);
    
    const sTime = formatTime(evt.startTime);
    const eTime = formatTime(evt.endTime);
    let timingStr = 'Timing not supplied';
    if (sTime && eTime) {
      timingStr = `${sTime}–${eTime}`;
    } else if (sTime) {
      timingStr = sTime;
    }

    const typeBadgeClass = (evt.eventType || '').toLowerCase().includes('wedding') ? 'wedding' : '';

    card.innerHTML = `
      <div class="card-title">${escapeHTML(evt.name)}</div>
      <div class="card-meta">${dateShort} · ${escapeHTML(venueDisplay)} · ${guestLabel}</div>
      <div class="card-footer">
        <span class="card-timing">${timingStr}</span>
        <span class="badge-tag ${typeBadgeClass}">${escapeHTML(evt.eventType || 'Event')}</span>
      </div>
    `;

    card.addEventListener('click', () => {
      state.selectedEventId = evt.id;
      // Re-highlight active card in sidebar
      document.querySelectorAll('.event-item-card').forEach(el => el.classList.remove('active'));
      card.classList.add('active');
      renderEventDetail();
    });

    container.appendChild(card);
  });
}

function valOrEmpty(val, emptyText = 'Not specified in Salesforce') {
  if (val && String(val).trim() !== '') {
    return escapeHTML(val);
  }
  return `<span class="value-empty">${escapeHTML(emptyText)}</span>`;
}

function detectRoomConflict(currentEvt) {
  if (!currentEvt || !currentEvt.ceremonyLocation) return null;
  const currentProp = currentEvt.venueProperty || currentEvt.venue;

  const conflicts = state.events.filter(other => {
    if (other.id === currentEvt.id) return false;
    if (other.eventDate !== currentEvt.eventDate) return false;
    const otherProp = other.venueProperty || other.venue;
    return otherProp === currentProp &&
           other.ceremonyLocation &&
           other.ceremonyLocation.toLowerCase() === currentEvt.ceremonyLocation.toLowerCase();
  });

  return conflicts.length > 0 ? conflicts : null;
}

function formatBEONotes(raw) {
  if (!raw || String(raw).trim() === '') {
    return `
      <div class="beo-card" style="border-left-color: #cbd5e1;">
        <div class="beo-card-title" style="color: #64748b;">📋 Staff-Facing BEO (Banquet Event Order) Notes</div>
        <div class="beo-empty-placeholder">
          <span>ℹ️</span>
          <span>No BEO notes entered in Salesforce for this event yet. (Details & Vision meeting pending).</span>
        </div>
      </div>
    `;
  }

  // Clean scripts and inline styles
  let clean = raw
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/style="[^"]*"/gi, '');

  // 1. Role Headers (Coord Notes / Captain Notes / Chef Notes)
  const hasRoleMarkers = /(?:Coord\s*Notes|Captain\s*Notes|Chef\s*Notes):/i.test(clean);
  if (hasRoleMarkers) {
    clean = clean
      .replace(/(Coord\s*Notes:)/gi, '<div class="beo-section-block"><span class="beo-section-tag coord">Coord Notes</span><div>')
      .replace(/(Captain\s*Notes:)/gi, '</div></div><div class="beo-section-block"><span class="beo-section-tag captain">Captain Notes</span><div>')
      .replace(/(Chef\s*Notes:)/gi, '</div></div><div class="beo-section-block"><span class="beo-section-tag chef">Chef Notes</span><div>');
    clean += '</div></div>';
    return `
      <div class="beo-card">
        <div class="beo-card-title">📋 Staff-Facing BEO (Banquet Event Order) Notes</div>
        <div class="beo-content">${clean}</div>
      </div>
    `;
  }

  // 2. Dated Log Entries (e.g. 6/28:, 10/19:)
  const hasDatedLogs = /\b\d{1,2}\/\d{1,2}\s*:/i.test(clean);
  if (hasDatedLogs) {
    // Convert date markers cleanly to styled chips without breaking div hierarchy
    clean = clean.replace(/(\b\d{1,2}\/\d{1,2}\s*:)/gi, (match) => {
      const dateText = match.replace(':', '').trim();
      return `<div class="timeline-entry"><span class="timeline-date-chip">${dateText}</span><span>`;
    });
    // Ensure all opened timeline spans are closed before next paragraphs or end
    clean = clean.replace(/<p>/gi, '').replace(/<\/p>/gi, '</span></div>');
    if (!clean.endsWith('</div>')) {
      clean += '</span></div>';
    }

    return `
      <div class="beo-card">
        <div class="beo-card-title">
          <span>📋 Staff-Facing BEO Notes</span>
          <span class="beo-section-tag timeline" style="margin: 0 0 0 8px;">Activity & Change Log</span>
        </div>
        <div class="beo-content">${clean}</div>
      </div>
    `;
  }

  // 3. Bullet Points (e.g. • Meg goes by Meg)
  const hasBullets = /(?:•|&bull;|\*|\-)\s+/i.test(clean);
  if (hasBullets) {
    return `
      <div class="beo-card">
        <div class="beo-card-title">
          <span>📋 Staff-Facing BEO Notes</span>
          <span class="beo-section-tag prefs" style="margin: 0 0 0 8px;">Couple Preferences & Formalities</span>
        </div>
        <div class="beo-content">${clean}</div>
      </div>
    `;
  }

  // 4. General / Single-line Notes (e.g. "Hector to officiate")
  return `
    <div class="beo-card">
      <div class="beo-card-title">
        <span>📋 Staff-Facing BEO Notes</span>
        <span class="beo-section-tag general" style="margin: 0 0 0 8px;">General Note</span>
      </div>
      <div class="beo-content" style="font-weight: 500;">${clean}</div>
    </div>
  `;
}

function cleanHTMLText(htmlStr) {
  if (!htmlStr) return '';
  return htmlStr
    .replace(/<[^>]+>/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function getGlasswareSetting(q) {
  if (!q) return 'Standard Setting';
  if (q.wineGlassesNeeded && q.champagneFlutesNeeded) {
    return '🍷 Wine Glasses & 🥂 Champagne Flutes';
  } else if (q.wineGlassesNeeded) {
    return '🍷 Wine Glasses required';
  } else if (q.champagneFlutesNeeded) {
    return '🥂 Champagne Flutes required';
  }
  return 'Standard Glassware';
}

function formatSignatureDrinks(raw) {
  if (!raw || cleanHTMLText(raw).toLowerCase() === 'n/a') {
    return `<span class="value-empty" style="font-size: 12px;">No signature drinks requested</span>`;
  }
  let clean = raw
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/style="[^"]*"/gi, '');
  return `<div class="signature-drinks-content">${clean}</div>`;
}

function formatCateringSection(evt) {
  const q = evt.quote;
  if (!q) {
    return `
      <div class="catering-card empty">
        <div class="catering-card-header">
          <span class="catering-card-title">🍽️ Catering, Menu & Bar Package</span>
          <span class="badge-tag" style="background: #f1f5f9; color: #64748b;">CPQ Quote Pending</span>
        </div>
        <div class="beo-empty-placeholder">
          <span>ℹ️</span>
          <span>No Primary Quote or menu selections entered in Salesforce CPQ for this event yet. (Details & Vision meeting pending).</span>
        </div>
      </div>
    `;
  }

  const quoteBadge = q.quoteNumber 
    ? `<span class="badge-tag wedding" style="font-size: 11px;">Quote ${escapeHTML(q.quoteNumber)}${q.isPrimary ? ' · Primary' : ''}</span>`
    : `<span class="badge-tag">Salesforce CPQ</span>`;

  // Key highlights (strictly reflect Salesforce values or explicit not-mentioned text)
  const mealPackageDisplay = q.mealPackage
    ? `${escapeHTML(q.mealPackage)}${q.mealPackageQty ? ` (${q.mealPackageQty} covers)` : ''}`
    : (q.mealService ? escapeHTML(q.mealService) : '<span class="value-empty">Not mentioned in Salesforce</span>');
  
  let hostedBarDisplay = '';
  if (q.hostedBarType) {
    hostedBarDisplay = escapeHTML(q.hostedBarType);
  } else if (q.noHostBar) {
    hostedBarDisplay = escapeHTML(q.noHostBar);
  } else if (q.barPackage) {
    hostedBarDisplay = escapeHTML(q.barPackage);
  } else {
    hostedBarDisplay = '<span class="value-empty">Not mentioned in Salesforce</span>';
  }

  const barHoursDisplay = q.hostedBarHours > 0 
    ? `${q.hostedBarHours} Hours Hosted` 
    : (q.hostedBarType || q.noHostBar ? 'Standard Hosted' : '<span class="value-empty">Not set in Salesforce</span>');
  const glasswareDisplay = getGlasswareSetting(q);

  // Helper for chip list
  const renderChips = (list, emptyMsg = 'None specified') => {
    if (!list || list.length === 0) {
      return `<span class="value-empty" style="font-size: 12px;">${emptyMsg}</span>`;
    }
    return `
      <div class="catering-chips-wrap">
        ${list.map(item => `<span class="catering-dish-chip">${escapeHTML(item)}</span>`).join('')}
      </div>
    `;
  };

  // Build Bar & Wine items
  const barElements = [];
  if (q.hostedBarType) {
    barElements.push(`🍸 ${q.hostedBarType}`);
  } else if (q.barPackage) {
    barElements.push(`🍸 ${q.barPackage}`);
  }
  if (q.hostedBarHours > 0) {
    barElements.push(`⏱️ ${q.hostedBarHours} Hours Hosted Bar`);
  }
  if (q.wine) {
    barElements.push(`🍷 ${q.wine}${q.wineQty ? ` (${q.wineQty} qty)` : ''}`);
  }
  if (q.champagne) {
    barElements.push(`🥂 ${q.champagne}${q.champagneQty ? ` (${q.champagneQty} qty)` : ''}`);
  }
  if (q.noHostBar) {
    barElements.push(`💵 No Host Bar: ${q.noHostBar}`);
  }
  if (q.barItems && q.barItems.length > 0) {
    q.barItems.forEach(item => {
      if (item !== q.wine && item !== q.champagne && item !== q.hostedBarType && item !== q.barPackage) {
        barElements.push(item);
      }
    });
  }

  // Combine Linens & Napkins & Chairs & Decor & Dessert
  const rentalItems = [];
  if (q.dessert) rentalItems.push(`🎂 ${q.dessert}`);
  if (q.chairs) rentalItems.push(q.chairs);
  if (q.linens && q.linens.length > 0) rentalItems.push(...q.linens);
  if (q.napkins) rentalItems.push(q.napkins);
  if (evt.chargerPlates && cleanHTMLText(evt.chargerPlates).toLowerCase() !== 'n/a') {
    rentalItems.push(`Chargers: ${cleanHTMLText(evt.chargerPlates)}`);
  }
  if (q.loveLetters) {
    rentalItems.push(`💌 ${q.loveLetters}${q.loveLettersQty ? ` (${q.loveLettersQty} qty)` : ''}`);
  }
  if (q.decorRentals && q.decorRentals.length > 0) rentalItems.push(...q.decorRentals);

  // Late night snacks (Munchies)
  const snacksHTML = (q.lateNightSnacks && q.lateNightSnacks.length > 0) ? `
    <div class="catering-subgroup">
      <div class="catering-subgroup-title">🌙 Late Night Snacks (Munchies)</div>
      ${renderChips(q.lateNightSnacks)}
    </div>
  ` : '';

  // Signature drinks block
  const sigDrinksHTML = evt.signatureDrinks && cleanHTMLText(evt.signatureDrinks).toLowerCase() !== 'n/a' ? `
    <div class="catering-subgroup full-width signature-drinks-card">
      <div class="catering-subgroup-title">🍹 Signature Drinks (Custom Cocktail Bar)</div>
      ${formatSignatureDrinks(evt.signatureDrinks)}
    </div>
  ` : '';

  return `
    <div class="catering-card">
      <div class="catering-card-header">
        <span class="catering-card-title">🍽️ Catering, Menu & Bar Package</span>
        ${quoteBadge}
      </div>

      <div class="catering-meta-strip">
        <div class="catering-meta-item">
          <span class="catering-meta-label">Meal Package & Style</span>
          <span class="catering-meta-val accent">${mealPackageDisplay}</span>
        </div>
        <div class="catering-meta-item">
          <span class="catering-meta-label">Hosted Bar Service</span>
          <span class="catering-meta-val">${hostedBarDisplay}</span>
        </div>
        <div class="catering-meta-item">
          <span class="catering-meta-label">Bar Hours</span>
          <span class="catering-meta-val">${barHoursDisplay}</span>
        </div>
        <div class="catering-meta-item">
          <span class="catering-meta-label">Table Settings</span>
          <span class="catering-meta-val">${escapeHTML(glasswareDisplay)}</span>
        </div>
      </div>

      <div class="catering-grid">
        <!-- Entrees / Mains -->
        <div class="catering-subgroup">
          <div class="catering-subgroup-title">🥩 Entrees & Mains</div>
          ${renderChips(q.entrees, 'No entrees selected yet')}
        </div>

        <!-- Appetizers & Hors d'oeuvres -->
        <div class="catering-subgroup">
          <div class="catering-subgroup-title">
            <span>🥟 Appetizers & Hors d'oeuvres</span>
            <span class="catering-subgroup-note">Stationed / passed determined on-site</span>
          </div>
          ${renderChips(q.appetizers, 'No appetizers selected yet')}
        </div>

        <!-- Sides & Salads -->
        <div class="catering-subgroup">
          <div class="catering-subgroup-title">🥗 Salads & Accompaniments</div>
          ${renderChips(q.sidesSalads, 'No sides or salads specified')}
        </div>

        <!-- Bar & Beverages -->
        <div class="catering-subgroup">
          <div class="catering-subgroup-title">🍸 Bar, Wine & Champagne</div>
          ${renderChips(barElements, 'No bar selections in quote')}
        </div>

        <!-- Late Night Snacks (if present) -->
        ${snacksHTML}

        <!-- Signature Drinks (if present) -->
        ${sigDrinksHTML}

        <!-- Linens, Chairs & Rentals -->
        <div class="catering-subgroup full-width">
          <div class="catering-subgroup-title">✨ Linens, Seating & Event Rentals</div>
          ${renderChips(rentalItems, 'No linens or decor rentals selected')}
        </div>
      </div>
    </div>
  `;
}

function renderEventDetail() {
  const panel = document.getElementById('event-detail-panel');
  const evt = state.events.find(e => e.id === state.selectedEventId);

  if (!evt) {
    panel.innerHTML = `
      <div class="empty-selection-state">
        <p>No event selected.</p>
      </div>
    `;
    return;
  }

  const propertyName = evt.venueProperty || evt.venue || 'Venue';
  const ceremonySpace = evt.ceremonyLocation || '';
  const barArea = evt.barLocation || '';
  const dateHeader = `${propertyName.toUpperCase()} · ${(evt.dayOfWeek || '').toUpperCase()}, ${evt.eventDate || ''}`;
  const sTime = formatTime(evt.startTime);
  const eTime = formatTime(evt.endTime);
  const timing = (sTime && eTime) ? `${sTime}–${eTime}` : (sTime || 'Timing not supplied');
  const covers = evt.guestCount ? `${evt.guestCount} guests` : 'Covers TBD';

  // Check for Room/Space Conflict
  const conflicts = detectRoomConflict(evt);
  let conflictBannerHTML = '';
  if (conflicts) {
    const conflictNames = conflicts.map(c => `<strong>${escapeHTML(c.name)}</strong>`).join(', ');
    conflictBannerHTML = `
      <div class="conflict-alert-card">
        <div class="conflict-alert-icon">⚠️</div>
        <div>
          <div class="conflict-alert-title">Concurrent Space Notice · Dual Booking Alert</div>
          <div class="conflict-alert-desc">
            ${conflictNames} is also booked at <strong>${escapeHTML(ceremonySpace)}</strong> at <strong>${escapeHTML(propertyName)}</strong> on this date (${evt.eventDate}). Please confirm space allocation or staggered operational timings.
          </div>
        </div>
      </div>
    `;
  }

  // Find concurrent / other events on the same day
  const allOtherEvents = state.events.filter(e => e.eventDate === evt.eventDate && e.id !== evt.id);
  const isExpanded = state.expandedOtherEventsDay === evt.eventDate;
  const displayedEvents = isExpanded ? allOtherEvents : allOtherEvents.slice(0, 10);

  let pillsHTML = '';
  if (allOtherEvents.length > 0) {
    const toggleBtnHTML = allOtherEvents.length > 10 ? `
      <button class="btn btn-outline btn-sm" id="btn-toggle-other-events" style="margin-top: 8px; font-size: 11px; padding: 4px 10px;">
        ${isExpanded ? '▲ Show fewer events' : `▼ View all ${allOtherEvents.length} events on ${evt.dayOfWeek || 'this day'}`}
      </button>
    ` : '';

    pillsHTML = `
      <div class="other-events-section">
        <div class="section-caption">Concurrent events on ${evt.dayOfWeek || 'this day'} (${allOtherEvents.length} total across org):</div>
        <div class="event-pills-wrap">
          ${displayedEvents.map(other => {
            const prop = other.venueProperty || other.venue || 'Venue';
            const space = other.ceremonyLocation ? ` (${other.ceremonyLocation})` : '';
            const isSameProp = prop === propertyName;
            const style = isSameProp ? 'border-color: var(--color-primary); background-color: var(--color-primary-light); font-weight: 600;' : '';
            return `
              <div class="event-pill" data-id="${other.id}" style="${style}" title="${escapeHTML(other.name)} · ${escapeHTML(prop + space)}">
                ${escapeHTML(other.name)} · ${escapeHTML(prop + space)}
              </div>`;
          }).join('')}
        </div>
        ${toggleBtnHTML}
      </div>
    `;
  }

  const contractBadge = evt.contractSigned
    ? `<span class="badge-tag wedding" style="font-size: 12px; padding: 4px 12px;">✓ Contract Signed</span>`
    : `<span class="badge-tag" style="font-size: 12px; padding: 4px 12px;">Contract Pending</span>`;

  // Photobooth display text
  let pbText = 'No';
  if (evt.photoboothStaffed) {
    pbText = '<span class="badge-tag wedding" style="font-size: 11px; padding: 2px 8px;">Yes · Staffed by Venue</span>';
  } else if (evt.photoBooth) {
    pbText = 'Yes (Client/Vendor)';
  }

  // Meal package / service text for overview card
  const mealPkgText = evt.quote && evt.quote.mealPackage
    ? `${escapeHTML(evt.quote.mealPackage)}${evt.quote.mealPackageQty ? ` (${evt.quote.mealPackageQty} covers)` : ''}`
    : (evt.quote && evt.quote.mealService ? escapeHTML(evt.quote.mealService) : valOrEmpty(null, 'Not finalized in CPQ'));

  // Bar display for overview card 3 (respecting No-Host Bar, Hosted type, and actual Salesforce hours)
  let barDisplay = '';
  if (evt.quote && evt.quote.noHostBar) {
    barDisplay = evt.quote.noHostBar;
  } else if (evt.quote && (evt.quote.hostedBarType || evt.quote.barPackage)) {
    const pkg = evt.quote.hostedBarType || evt.quote.barPackage;
    if (evt.quote.hostedBarHours > 0) {
      barDisplay = `${pkg} · ${evt.quote.hostedBarHours}h hosted`;
    } else {
      barDisplay = pkg;
    }
  } else {
    barDisplay = formatBar(evt);
  }

  const glasswareSetting = getGlasswareSetting(evt.quote);
  const cateringHTML = formatCateringSection(evt);
  const beoHTML = formatBEONotes(evt.beoNotes);

  panel.innerHTML = `
    <div class="detail-header-bar">
      <div class="detail-header-label">${escapeHTML(dateHeader)}</div>
      ${contractBadge}
    </div>
    <h2 class="detail-title">${escapeHTML(evt.name)}</h2>
    
    <div class="detail-summary-chips">
      <span class="summary-chip highlight">⏰ ${timing}</span>
      <span class="summary-chip highlight">👥 ${covers}</span>
      <span class="summary-chip">📦 ${valOrEmpty(evt.package, 'Package not specified')}</span>
      <span class="summary-chip">🏷️ ${valOrEmpty(evt.eventType, 'Event')}</span>
    </div>

    <!-- Space Conflict Alert (if any) -->
    ${conflictBannerHTML}

    <!-- 3-Column Section Cards Grid -->
    <div class="detail-sections-grid">
      <!-- Card 1: Venue & Spaces -->
      <div class="section-card">
        <div class="section-card-title">📍 Venue & Spaces</div>
        <div class="section-row">
          <span class="section-row-label">Main Property</span>
          <span class="section-row-val accent">${valOrEmpty(propertyName, 'Not specified')}</span>
        </div>
        <div class="section-row">
          <span class="section-row-label">Ceremony Space</span>
          <span class="section-row-val">${valOrEmpty(ceremonySpace, 'Not specified in Salesforce')}</span>
        </div>
        <div class="section-row">
          <span class="section-row-label">Cocktail / Bar Space</span>
          <span class="section-row-val">${valOrEmpty(barArea, 'Not specified in Salesforce')}</span>
        </div>
        <div class="section-row">
          <span class="section-row-label">Table Settings</span>
          <span class="section-row-val">${escapeHTML(glasswareSetting)}</span>
        </div>
        <div class="section-row">
          <span class="section-row-label">Decor Setup Time</span>
          <span class="section-row-val">${valOrEmpty(evt.decorSetupTime, 'Not specified in Salesforce')}</span>
        </div>
      </div>

      <!-- Card 2: Event Staff & Team -->
      <div class="section-card">
        <div class="section-card-title">👥 Event Team & Roles</div>
        <div class="section-row">
          <span class="section-row-label">Venue General Manager</span>
          <span class="section-row-val accent">${valOrEmpty(evt.venueGM, 'Not assigned in Salesforce')}</span>
        </div>
        <div class="section-row">
          <span class="section-row-label">Wedgewood Coordinator</span>
          <span class="section-row-val accent">${valOrEmpty(evt.coordinator, 'Not assigned in Salesforce')}</span>
        </div>
        <div class="section-row">
          <span class="section-row-label">DJ / Audio</span>
          <span class="section-row-val">${valOrEmpty(evt.djName, 'Not assigned in Salesforce')}</span>
        </div>
        <div class="section-row">
          <span class="section-row-label">Photo Booth</span>
          <span class="section-row-val">${pbText}</span>
        </div>
      </div>

      <!-- Card 3: Service & Guest Details -->
      <div class="section-card">
        <div class="section-card-title">🍸 Service & Guest Details</div>
        <div class="section-row">
          <span class="section-row-label">Meal Package</span>
          <span class="section-row-val accent">${mealPkgText}</span>
        </div>
        <div class="section-row">
          <span class="section-row-label">Bar Service</span>
          <span class="section-row-val">${escapeHTML(barDisplay)}</span>
        </div>
        <div class="section-row">
          <span class="section-row-label">Guest Count</span>
          <span class="section-row-val">${evt.guestCount ? `${evt.guestCount} covers` : '<span class="value-empty">Not supplied</span>'}</span>
        </div>
        <div class="section-row">
          <span class="section-row-label">Package Tier</span>
          <span class="section-row-val">${valOrEmpty(evt.package, 'Not specified in Salesforce')}</span>
        </div>
      </div>
    </div>

    <!-- Catering, Menu & Bar Package (CPQ Quote details) -->
    ${cateringHTML}

    <!-- BEO Notes Section (Formatted cleanly) -->
    ${beoHTML}

    <!-- Other Events on Same Day -->
    ${pillsHTML}

    <!-- Operational Notes Area -->
    <div class="notes-section">
      <div class="section-caption">Operational notes for this event:</div>
      <textarea class="notes-textarea" id="event-notes-input" placeholder="Add specific setup instructions or operational notes...">${escapeHTML(evt.notes || '')}</textarea>
      <div class="panel-actions">
        <button class="btn btn-outline" id="btn-save-note">Save event note</button>
        <button class="btn btn-primary" id="btn-view-shifts">View event shifts &rarr;</button>
      </div>
    </div>
  `;

  // Attach click listener to concurrent event pills
  panel.querySelectorAll('.event-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      const targetId = pill.getAttribute('data-id');
      if (targetId) {
        state.selectedEventId = targetId;
        renderSidebarEvents();
        renderEventDetail();
      }
    });
  });

  // Toggle expand/collapse for other events on this day
  const toggleBtn = document.getElementById('btn-toggle-other-events');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      if (state.expandedOtherEventsDay === evt.eventDate) {
        state.expandedOtherEventsDay = null;
      } else {
        state.expandedOtherEventsDay = evt.eventDate;
      }
      renderEventDetail();
    });
  }

  // Note save feedback
  const saveBtn = document.getElementById('btn-save-note');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const originalText = saveBtn.textContent;
      saveBtn.textContent = 'Saved!';
      setTimeout(() => { saveBtn.textContent = originalText; }, 1800);
    });
  }
}

function renderSidebarLoading() {
  const container = document.getElementById('events-list');
  const countSummary = document.getElementById('events-count-summary');
  if (countSummary) {
    countSummary.textContent = 'Syncing events from Salesforce...';
  }
  container.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <p style="font-weight: 600; color: var(--color-primary); margin-top: 8px;">Connecting to Salesforce...</p>
      <span style="font-size: 11px; color: var(--color-text-muted);">Fetching Opportunity & CPQ Quote records</span>
    </div>
  `;
}


function renderSidebarError(msg) {
  const container = document.getElementById('events-list');
  container.innerHTML = `
    <div class="empty-events-state">
      <p style="color: #c53030;">Failed to fetch Salesforce events</p>
      <span style="font-size: 11px;">${escapeHTML(msg)}</span>
      <button class="btn btn-outline btn-sm" style="margin-top: 8px;" onclick="fetchWeeklyEvents(state.currentMonday)">Retry</button>
    </div>
  `;
}

function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ============================================================================
// Navigation Handlers
// ============================================================================

function setWeek(monday) {
  state.currentMonday = getMonday(monday);
  fetchWeeklyEvents(state.currentMonday);
}

function setupEventListeners() {
  document.getElementById('btn-prev-week').addEventListener('click', () => {
    setWeek(addDays(state.currentMonday, -7));
  });

  document.getElementById('btn-next-week').addEventListener('click', () => {
    setWeek(addDays(state.currentMonday, 7));
  });

  document.getElementById('week-date-input').addEventListener('change', (e) => {
    if (e.target.value) {
      const parts = e.target.value.split('-');
      if (parts.length === 3) {
        const pickedDate = new Date(parts[0], parts[1] - 1, parts[2]);
        setWeek(pickedDate);
      }
    }
  });

  const venueSelect = document.getElementById('venue-filter-select');
  if (venueSelect) {
    venueSelect.addEventListener('change', (e) => {
      state.selectedVenue = e.target.value;
      renderSidebarEvents();
    });
  }

  // Real-time Search Input
  const searchInput = document.getElementById('venue-search-input');
  const clearBtn = document.getElementById('btn-clear-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      if (clearBtn) {
        clearBtn.style.display = state.searchQuery ? 'inline-block' : 'none';
      }
      renderSidebarEvents();
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      state.searchQuery = '';
      if (searchInput) {
        searchInput.value = '';
        searchInput.focus();
      }
      clearBtn.style.display = 'none';
      renderSidebarEvents();
    });
  }

  const syncBtn = document.getElementById('btn-sync-sf');
  if (syncBtn) {
    syncBtn.addEventListener('click', () => {
      fetchWeeklyEvents(state.currentMonday, true);
    });
  }
}



// ============================================================================
// Application Boot
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();

  // Support ?week=YYYY-MM-DD in the URL for manual override (e.g. ?week=2026-10-05)
  const urlParams = new URLSearchParams(window.location.search);
  const weekParam = urlParams.get('week');

  let initialDate;
  if (weekParam) {
    const parts = weekParam.split('-');
    if (parts.length === 3) {
      initialDate = new Date(parts[0], parts[1] - 1, parts[2]);
    }
  }
  if (!initialDate || isNaN(initialDate.getTime())) {
    initialDate = new Date(); // Default: current week
  }

  setWeek(getMonday(initialDate));
});
