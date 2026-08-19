// SINGLE SOURCE OF TRUTH for the studio task list.
//
// Both consumers use this file — change tasks HERE and both stay in sync:
//   1. Browser frontend  → loads via <script src="/studio-tasks-shared.js"></script>
//                          in public/index.html, then reads window.STUDIO_TASKS_SHARED
//   2. Daily-recap cron  → api/cron/daily-summary.js does require('../../public/studio-tasks-shared.js')
//
// UI-only fields (scripts, note, link, instructions) are safely ignored by the cron.
// The cron just uses: key, label, days, suggestedFor, season, targetWeek.

(function(root){
  const STUDIO_TASKS = [
    {key:'listen360',label:'Log all Listen360 scores & call respective guests',suggestedFor:'opening',days:[0,1,2,3,4,5,6],link:'https://docs.google.com/document/d/1tI5RBT6SHZBgFUiANK5zs83yZGxNDdRgbO99cFRRNMc/edit?tab=t.d188mtcl4pen'},
    {key:'mow-sign',label:'Update the Member of the Week sign at the front desk',suggestedFor:'closing',days:[0],season:{from:'06-01',to:'08-31'},note:'Get this week\'s member name from the Events & Promos section of the Daily Hub (Mohogany uploads it weekly). Write their name on the desk sign for the week ahead.'},
    {key:'mow-text',label:'Text this week\'s Member of the Week',suggestedFor:'opening',days:[1],season:{from:'06-01',to:'08-31'},scripts:'member-week-text',note:'Get this week\'s member name from the Events & Promos section. Send the text below encouraging them to book and come in for their free perk.'},
    {key:'call-green-stars',label:'Call tomorrow\'s Green ⭐ first-time visitors',suggestedFor:'closing',days:[0,1,2,3,4,5,6],scripts:'green-star'},
    {key:'call-yesterday-first-visits',label:'Follow up with yesterday\'s Green ⭐ first-time visitors',suggestedFor:'opening',days:[0,1,2,3,4,5,6],scripts:'yesterday-first-visit',instructions:'yesterday-first-visit'},
    {key:'text-yesterday-visits',label:'Text yesterday\'s visitors to help them book their next session',suggestedFor:'closing',days:[0,1,2,3,4,5,6],scripts:'yesterday-book-text',instructions:'yesterday-book-text'},
    {key:'sunday-cleaning-review',label:'Review the weekly cleaning list in the back — complete anything still outstanding',suggestedFor:'opening',days:[0],note:'Walk to the back and review the physical weekly cleaning checklist. Complete any items still unchecked before end of shift so we start the new week fresh.'},
    {key:'fridge-front',label:'Defrost front fridge at closing',days:[6],link:'https://docs.google.com/document/d/1X4fgZw_mgRCxw3ILLLBwYbwN33xf-_oeUvuKVZjiHH0/edit?tab=t.0#heading=h.tvjv9ryqveop'},
    {key:'fridge-back',label:'Defrost back fridge at closing',days:[0],link:'https://docs.google.com/document/d/1X4fgZw_mgRCxw3ILLLBwYbwN33xf-_oeUvuKVZjiHH0/edit?tab=t.0#heading=h.tvjv9ryqveop'},
  ];

  // Returns true if a task has no season restriction, or if the given YYYY-MM-DD
  // date falls within its month-day window. Recurs every year.
  function taskInSeason(task, viewDateStr){
    if(!task.season) return true;
    const md = (viewDateStr||'').slice(5); // "MM-DD"
    return md >= task.season.from && md <= task.season.to;
  }

  const cfg = { STUDIO_TASKS, taskInSeason };
  if (typeof module !== 'undefined' && module.exports) module.exports = cfg;
  else root.STUDIO_TASKS_SHARED = cfg;
})(typeof window !== 'undefined' ? window : this);
