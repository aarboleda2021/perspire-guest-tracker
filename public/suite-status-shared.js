// Shared schedule + state logic for the Suite Status feature.
// Used by both the staff view (in index.html) and the lobby view (lobby.html).
//
// Schedule changes: edit the SCHEDULE constant below. To deploy a schedule change,
// commit + push to trigger a new Vercel deploy.

(function() {
  const SCHEDULE = {
    weekday: {
      1: ['07:00','08:05','09:10','10:15','11:20','12:25','13:30','14:35','15:40','16:45','17:50','18:55','20:00'],
      2: ['07:00','08:05','09:10','10:15','11:20','12:25','13:30','14:35','15:40','16:45','17:50','18:55','20:00'],
      3: ['07:15','08:20','09:25','10:30','11:35','12:40','13:45','14:50','15:55','17:00','18:05','19:10','20:15'],
      4: ['07:15','08:20','09:25','10:30','11:35','12:40','13:45','14:50','15:55','17:00','18:05','19:10','20:15'],
      5: ['07:30','08:35','09:40','10:45','11:50','12:55','14:00','15:05','16:10','17:15','18:20','19:25'],
      6: ['07:45','08:50','09:55','11:00','12:05','13:10','14:15','15:20','16:25','17:30','18:35','19:40']
    },
    weekend: {
      1: ['08:00','09:05','10:10','11:15','12:20','13:25','14:30','15:35','16:40','17:45'],
      2: ['08:00','09:05','10:10','11:15','12:20','13:25','14:30','15:35','16:40','17:45'],
      3: ['08:15','09:20','10:25','11:30','12:35','13:40','14:45','15:50','16:55','18:00'],
      4: ['08:15','09:20','10:25','11:30','12:35','13:40','14:45','15:50','16:55','18:00'],
      5: ['08:30','09:35','10:40','11:45','12:50','13:55','15:00','16:05','17:10','18:15'],
      6: ['08:45','10:00','11:05','12:10','13:15','14:20','15:25','16:30','17:35','18:40']
    }
  };

  const SESSION_LENGTH_MIN = 40;
  const WARMUP_LEAD_MIN = 15;

  function isWeekend(d) { return d.getDay() === 0 || d.getDay() === 6; }
  function getScheduleFor(d) { return isWeekend(d) ? SCHEDULE.weekend : SCHEDULE.weekday; }

  function parseSlotToToday(slot, refDate) {
    const [h, m] = slot.split(':').map(Number);
    const d = new Date(refDate);
    d.setHours(h, m, 0, 0);
    return d;
  }

  function formatTime(d) {
    let h = d.getHours();
    const m = d.getMinutes();
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12; if (h === 0) h = 12;
    return `${h}:${String(m).padStart(2, '0')} ${ampm}`;
  }

  // Returns the current state for a given suite, taking into account the loaded
  // override (if any). The override is only honored if it's tied to the current
  // context appointment slot.
  //
  // override format: { status, guest_first_name, moved, for_slot } where for_slot is a Date or null
  function getSuiteState(suiteNum, now, override) {
    const schedule = getScheduleFor(now);
    const slots = (schedule[suiteNum] || []).map(s => parseSlotToToday(s, now));

    if (slots.length === 0) return { type: 'closed', label: 'Closed', time: null };

    const firstWarmup = new Date(slots[0].getTime() - WARMUP_LEAD_MIN * 60000);
    if (now < firstWarmup) {
      return { type: 'pre-open', label: `Opens at ${formatTime(slots[0])}`, time: slots[0], status: 'warming-up' };
    }
    const lastEnd = new Date(slots[slots.length - 1].getTime() + SESSION_LENGTH_MIN * 60000);
    if (now >= lastEnd) {
      return { type: 'closed', label: 'Closed for today', time: null };
    }

    // Find the time-based ("natural") context slot.
    // A slot owns the time from the previous slot's session END (or WARMUP_LEAD_MIN
    // before the very first slot) all the way through its own session end. This way,
    // during the cleanup gap between sessions, edits flow to the *upcoming* slot —
    // not the one that just ended.
    let naturalSlotIdx = -1;
    for (let i = 0; i < slots.length; i++) {
      const winStart = i === 0
        ? new Date(slots[0].getTime() - WARMUP_LEAD_MIN * 60000)
        : new Date(slots[i - 1].getTime() + SESSION_LENGTH_MIN * 60000);
      const winEnd = new Date(slots[i].getTime() + SESSION_LENGTH_MIN * 60000);
      if (now >= winStart && now < winEnd) { naturalSlotIdx = i; break; }
    }
    if (naturalSlotIdx === -1) return { type: 'closed', label: 'Closed for today', time: null };

    const naturalSlot = slots[naturalSlotIdx];

    // If override.for_slot points to a later slot in today's schedule, the suite
    // has been manually "skipped ahead" (e.g. an early-arriving guest). Honor it.
    let contextSlot = naturalSlot;
    let isAdvanced = false;
    if (override && override.for_slot && override.for_slot.getTime() > naturalSlot.getTime()) {
      const isRealSlot = slots.some(s => s.getTime() === override.for_slot.getTime());
      if (isRealSlot) { contextSlot = override.for_slot; isAdvanced = true; }
    }

    const ctxIdx = slots.findIndex(s => s.getTime() === contextSlot.getTime());
    const nextSlot = ctxIdx >= 0 && ctxIdx < slots.length - 1 ? slots[ctxIdx + 1] : null;

    let status = 'warming-up';
    let guestName = '';
    let moved = false;
    let haloPreset = false;
    let snoPreset = false;

    if (override && override.for_slot && override.for_slot.getTime() === contextSlot.getTime()) {
      if (override.status) status = override.status;
      if (override.guest_first_name) guestName = override.guest_first_name;
      if (override.moved) moved = override.moved;
      if (override.halo_preset) haloPreset = override.halo_preset;
      if (override.sno_preset) snoPreset = override.sno_preset;
    }

    return { type: 'active', time: contextSlot, status, guestName, moved, haloPreset, snoPreset, naturalSlot, nextSlot, isAdvanced };
  }

  window.PerspireSuiteStatus = {
    SCHEDULE,
    SESSION_LENGTH_MIN,
    WARMUP_LEAD_MIN,
    isWeekend,
    getScheduleFor,
    parseSlotToToday,
    formatTime,
    getSuiteState
  };
})();
