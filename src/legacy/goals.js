export function mount() {
// Carry over active venue name from localStorage if available
    try {
      const activeEvt = JSON.parse(localStorage.getItem('wedgewood_selected_event') || '{}');
      if (activeEvt.venueProperty || activeEvt.venue) {
        document.getElementById('goals-venue-name').textContent = activeEvt.venueProperty || activeEvt.venue;
      }
    } catch (e) {}
}
