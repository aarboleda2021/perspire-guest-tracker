const { getSupabase } = require('../_supabase');

// Studio tasks (mirror of frontend STUDIO_TASKS). days is 0=Sun..6=Sat
const STUDIO_TASKS = [
  { key:'call-green-stars', label:"Call tomorrow's Green ⭐ first-time visitors", days:[0,1,2,3,4,5,6] },
  { key:'listen360',         label:'Log all Listen360 scores & call respective guests', days:[0,1,2,3,4,5,6] },
  { key:'daily-cleaning',    label:'Daily cleaning tasks complete', days:[0,1,2,3,4,5,6] },
  { key:'halo-clean',        label:'Clean halotherapy machines', days:[2] },
  { key:'cintas',            label:'Cintas supplies check', days:[5] },
  { key:'fridge-front',      label:'Defrost front fridge at closing', days:[6] },
  { key:'fridge-back',       label:'Defrost back fridge at closing', days:[0] },
];

// Daily-shift goals (matches frontend LOG_COLS goal field)
const DAILY_GOALS = {
  firstVisitsBooked: 3,
  outboundCalls: 10,
  preBooked: 10
};

const LOG_COL_LABELS = {
  opportunities: 'Green ⭐ Opps',
  firstVisitsBooked: 'First Visits Booked',
  membershipSales: 'Memb Sold',
  packageSales: 'Pack Sold',
  outboundCalls: 'Outbound Calls',
  preBooked: 'Pre-booked'
};

function toDateStr(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
function escapeHtml(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

module.exports = async function handler(req, res) {
  // Accept auth via standard Authorization header (used by Vercel cron)
  // OR via ?key=CRON_SECRET query param (convenient for manual preview)
  const secret = process.env.CRON_SECRET;
  const headerOk = req.headers.authorization === `Bearer ${secret}`;
  const queryOk = secret && req.query && req.query.key === secret;
  if (!headerOk && !queryOk) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const supabase = getSupabase();

  // ── SUITE STATUS CLEANUP ──
  // Reset any suite_status rows whose for_slot is from before today's studio
  // day. The frontend already ignores these (the for_slot timestamps don't
  // match today's contextSlot), but clearing them keeps the DB tidy and avoids
  // any future code accidentally reading a leftover name or status.
  // 3am ET is well past the studio's last session (~9pm ET), so this is safe.
  try {
    const cutoffET = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
    cutoffET.setHours(0, 0, 0, 0); // midnight ET today
    const { data: cleared, error: cleanupError } = await supabase
      .from('suite_status')
      .update({
        status: null,
        guest_first_name: '',
        moved: false,
        halo_preset: false,
        sno_preset: false,
        for_slot: null,
        updated_at: new Date().toISOString()
      })
      .lt('for_slot', cutoffET.toISOString())
      .select('suite_num');
    if (cleanupError) console.error('suite_status cleanup error', cleanupError);
    else console.log(`suite_status cleanup: reset ${cleared?.length || 0} stale rows`);
  } catch (e) {
    console.error('suite_status cleanup threw', e);
    // Cleanup failure is non-blocking — continue to the email summary
  }

  // Get "today" in Eastern Time with 3am ET reset (matches frontend getTodayStr).
  // This way the cron reports the correct studio day even if Vercel runs it with
  // some scheduling jitter (e.g. 12:30am ET instead of 11:55pm ET).
  const nowET = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
  if (nowET.getHours() < 3) nowET.setDate(nowET.getDate() - 1);
  const todayStr = toDateStr(nowET);
  const dayOfWeek = nowET.getDay();
  const prettyDate = nowET.toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric' });

  // Compute a generous UTC window around the ET day, then filter to exact ET date in JS.
  // Avoids timezone bugs where UTC date boundaries miss ET evening hours (ET is UTC-4/-5).
  const [y, m, d] = todayStr.split('-').map(Number);
  const windowStart = new Date(Date.UTC(y, m - 1, d - 1, 0, 0, 0)).toISOString();
  const windowEnd = new Date(Date.UTC(y, m - 1, d + 2, 0, 0, 0)).toISOString();

  // Fetch all data in parallel
  const [tasksRes, logsRes, staffRes, notesRes] = await Promise.all([
    supabase.from('daily_task_completions').select('*').eq('date', todayStr),
    supabase.from('daily_logs').select('*').eq('log_date', todayStr),
    supabase.from('staff').select('*').eq('active', true).order('name'),
    supabase.from('shift_notes').select('*').gte('created_at', windowStart).lte('created_at', windowEnd)
  ]);

  if (tasksRes.error || logsRes.error || staffRes.error || notesRes.error) {
    const err = tasksRes.error || logsRes.error || staffRes.error || notesRes.error;
    return res.status(500).json({
      error: err.message,
      where: tasksRes.error ? 'tasks' : logsRes.error ? 'logs' : staffRes.error ? 'staff' : 'notes'
    });
  }

  const tasks = tasksRes.data || [];
  const logs = logsRes.data || [];
  const staff = (staffRes.data || []).filter(s => s.id !== 'mohogany');
  const allStaff = staffRes.data || [];
  // Filter notes to only those whose created_at falls on the target ET date
  const notes = (notesRes.data || []).filter(n => {
    if (!n.created_at) return false;
    const etDate = new Date(n.created_at).toLocaleDateString('en-US', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' });
    // toLocaleDateString returns "MM/DD/YYYY" — convert to "YYYY-MM-DD"
    const [mm, dd, yy] = etDate.split('/');
    return `${yy}-${mm}-${dd}` === todayStr;
  });

  // ── BUILD STUDIO TASKS SECTION ──
  const applicableTasks = STUDIO_TASKS.filter(t => t.days.includes(dayOfWeek));
  const tasksRows = applicableTasks.map(t => {
    const done = tasks.find(x => x.task_key === t.key);
    const staffName = done ? (allStaff.find(s => s.id === done.completed_by)?.name || done.completed_by || '?') : '';
    const time = done ? new Date(done.completed_at).toLocaleTimeString('en-US', { hour:'numeric', minute:'2-digit', timeZone:'America/New_York' }) : '';
    const status = done
      ? `<td style="color:#3D7A4F;font-weight:600;">✓ Completed</td><td>${escapeHtml(staffName)} at ${time}</td>`
      : `<td style="color:#B85C38;font-weight:600;">✗ Not completed</td><td style="color:#888;">—</td>`;
    return `<tr><td style="padding:8px 10px;border-bottom:1px solid #E8E0D8;">${escapeHtml(t.label)}</td>${status.replace(/<td>/g, '<td style="padding:8px 10px;border-bottom:1px solid #E8E0D8;">').replace(/<td style="padding/g, '<td style="padding')}</tr>`;
  }).join('');
  const incompleteTasks = applicableTasks.filter(t => !tasks.find(x => x.task_key === t.key)).length;

  // ── BUILD PER-STAFF DAILY LOG SECTION ──
  const colKeys = Object.keys(LOG_COL_LABELS);
  const goalCols = ['firstVisitsBooked', 'outboundCalls', 'preBooked'];
  const headerHtml = colKeys.map(k => {
    const goal = DAILY_GOALS[k] ? `<div style="font-size:10px;color:#9A9A9A;font-weight:400;">Goal: ${DAILY_GOALS[k]}</div>` : '';
    return `<th style="padding:6px 8px;background:#FAF7F2;border-bottom:2px solid #E8E0D8;text-align:center;font-size:11px;">${LOG_COL_LABELS[k]}${goal}</th>`;
  }).join('');

  const staffRows = staff.map(s => {
    const log = logs.find(l => l.staff_id === s.id) || {};
    const cells = colKeys.map(k => {
      const dbKey = k.replace(/[A-Z]/g, m => '_' + m.toLowerCase()); // camelCase -> snake_case
      const v = log[dbKey];
      const has = (v === 0 || v > 0);
      let cell;
      if (goalCols.includes(k) && has) {
        const goal = DAILY_GOALS[k];
        const met = v >= goal;
        const color = met ? '#3D7A4F' : (v >= goal * 0.5 ? '#B8761A' : '#B85C38');
        cell = `<span style="color:${color};font-weight:600;">${v}/${goal}</span>${met ? ' ✓' : ''}`;
      } else if (has) {
        cell = `<strong>${v}</strong>`;
      } else {
        cell = '<span style="color:#9A9A9A;">—</span>';
      }
      return `<td style="padding:8px;text-align:center;border-bottom:1px solid #E8E0D8;">${cell}</td>`;
    }).join('');
    const cl = log.contact_logs_done ? '<span style="color:#3D7A4F;">✓</span>' : '<span style="color:#9A9A9A;">—</span>';
    const ax = log.axle_followups_done ? '<span style="color:#3D7A4F;">✓</span>' : '<span style="color:#9A9A9A;">—</span>';
    const filledIn = colKeys.some(k => { const dbKey = k.replace(/[A-Z]/g, m => '_' + m.toLowerCase()); const v = log[dbKey]; return v === 0 || v > 0; });
    const nameStyle = filledIn ? '' : 'color:#B85C38;';
    return `<tr>
      <td style="padding:8px 10px;font-weight:600;border-bottom:1px solid #E8E0D8;${nameStyle}">${escapeHtml(s.name)}${!filledIn ? ' <span style="font-size:11px;font-weight:400;">(no log)</span>' : ''}</td>
      ${cells}
      <td style="padding:8px;text-align:center;border-bottom:1px solid #E8E0D8;">${cl}</td>
      <td style="padding:8px;text-align:center;border-bottom:1px solid #E8E0D8;">${ax}</td>
    </tr>`;
  }).join('');

  // Team totals row
  const totals = colKeys.reduce((acc, k) => {
    const dbKey = k.replace(/[A-Z]/g, m => '_' + m.toLowerCase());
    acc[k] = staff.reduce((sum, s) => { const log = logs.find(l => l.staff_id === s.id) || {}; const v = log[dbKey]; return sum + ((v === 0 || v > 0) ? v : 0); }, 0);
    return acc;
  }, {});
  const totalsCells = colKeys.map(k => `<td style="padding:8px;text-align:center;font-weight:700;background:#FAF7F2;">${totals[k]}</td>`).join('');
  const clCount = staff.filter(s => { const log = logs.find(l => l.staff_id === s.id); return log && log.contact_logs_done; }).length;
  const axCount = staff.filter(s => { const log = logs.find(l => l.staff_id === s.id); return log && log.axle_followups_done; }).length;

  // ── MISSED-GOAL EXPLANATIONS SECTION ──
  // Any staff/metric combo where they were below goal AND left a "why" note.
  // Lets Amanda + Mohogany spot patterns (e.g. "pre-book keeps failing on Sundays
  // because nobody replies to Saturday texts") without digging into the app.
  const missedGoalExplanations = [];
  staff.forEach(s => {
    const log = logs.find(l => l.staff_id === s.id);
    if (!log) return;
    const notes = log.metric_notes || {};
    goalCols.forEach(k => {
      const dbKey = k.replace(/[A-Z]/g, m => '_' + m.toLowerCase());
      const v = log[dbKey];
      const goal = DAILY_GOALS[k];
      if (!(v === 0 || v > 0)) return; // nothing logged
      if (v >= goal) return; // met the goal
      const note = notes[k]; // metric_notes uses camelCase keys (frontend LOG_COLS keys)
      if (!note || !String(note).trim()) return;
      missedGoalExplanations.push({
        staffName: s.name,
        metric: LOG_COL_LABELS[k],
        value: v,
        goal: goal,
        note: String(note).trim()
      });
    });
  });
  const missedGoalsSection = missedGoalExplanations.length
    ? `<div style="font-size:11px;font-weight:600;color:#9A9A9A;text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px;">Why Goals Were Missed (${missedGoalExplanations.length})</div>
       <div style="margin-bottom:24px;">
         ${missedGoalExplanations.map(m => `
           <div style="padding:10px 12px;margin-bottom:6px;background:#FFF3D6;border-left:3px solid #D4A017;border-radius:4px;">
             <div style="font-size:12px;font-weight:600;color:#5A3D0A;">${escapeHtml(m.staffName)} · ${escapeHtml(m.metric)}: <strong>${m.value}/${m.goal}</strong></div>
             <div style="font-size:13px;color:#2A2A2A;margin-top:4px;font-style:italic;">"${escapeHtml(m.note)}"</div>
           </div>
         `).join('')}
       </div>`
    : '';

  // ── SHIFT NOTES SECTION ──
  const notesHtml = notes.length
    ? notes.map(n => {
        const author = allStaff.find(s => s.id === n.created_by)?.name || n.created_by || 'Unknown';
        const assignedTo = n.assigned_to ? (allStaff.find(s => s.id === n.assigned_to)?.name || n.assigned_to) : null;
        const time = new Date(n.created_at).toLocaleTimeString('en-US', { hour:'numeric', minute:'2-digit', timeZone:'America/New_York' });
        const urgent = n.priority === 'urgent';
        return `<div style="padding:10px 12px;margin-bottom:8px;background:${urgent ? '#FBEAE5' : '#FAF7F2'};border-left:3px solid ${urgent ? '#C73E1D' : '#B85C38'};border-radius:4px;">
          <div style="font-size:13px;white-space:pre-wrap;">${escapeHtml(n.content)}</div>
          <div style="font-size:11px;color:#888;margin-top:4px;">${urgent ? '⚠ URGENT · ' : ''}${escapeHtml(author)}${assignedTo ? ` · For: ${escapeHtml(assignedTo)}` : ''} · ${time}${n.resolved_at ? ' · ✓ Resolved' : ''}</div>
        </div>`;
      }).join('')
    : '<div style="color:#888;font-style:italic;font-size:13px;">No new shift notes today.</div>';

  // ── COMPOSE EMAIL ──
  const subject = `Daily Recap: ${prettyDate}`;
  const html = `<!DOCTYPE html><html><body style="font-family:Arial,Helvetica,sans-serif;background:#FAF7F2;margin:0;padding:20px;color:#2A2A2A;">
    <div style="max-width:760px;margin:0 auto;background:white;border-radius:12px;padding:28px;border:1px solid #E8E0D8;">
      <div style="font-size:24px;font-weight:700;color:#B85C38;margin-bottom:4px;">Daily Recap</div>
      <div style="font-size:14px;color:#5C5C5C;margin-bottom:24px;">${escapeHtml(prettyDate)}</div>

      <div style="font-size:11px;font-weight:600;color:#9A9A9A;text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px;">Studio Tasks (${applicableTasks.length - incompleteTasks}/${applicableTasks.length} complete${incompleteTasks > 0 ? ` · ${incompleteTasks} missed` : ''})</div>
      ${applicableTasks.length ? `<table style="width:100%;border-collapse:collapse;margin-bottom:24px;font-size:13px;">
        <thead><tr><th style="padding:8px 10px;background:#FAF7F2;border-bottom:2px solid #E8E0D8;text-align:left;font-size:11px;">Task</th><th style="padding:8px 10px;background:#FAF7F2;border-bottom:2px solid #E8E0D8;text-align:left;font-size:11px;">Status</th><th style="padding:8px 10px;background:#FAF7F2;border-bottom:2px solid #E8E0D8;text-align:left;font-size:11px;">Completed by</th></tr></thead>
        <tbody>${tasksRows}</tbody>
      </table>` : '<div style="color:#888;font-style:italic;margin-bottom:24px;">No studio tasks scheduled for today.</div>'}

      <div style="font-size:11px;font-weight:600;color:#9A9A9A;text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px;">Per-Staff Daily Log</div>
      <div style="overflow-x:auto;margin-bottom:24px;">
        <table style="width:100%;border-collapse:collapse;font-size:12px;">
          <thead><tr>
            <th style="padding:8px 10px;background:#FAF7F2;border-bottom:2px solid #E8E0D8;text-align:left;font-size:11px;">Staff</th>
            ${headerHtml}
            <th style="padding:6px 8px;background:#FAF7F2;border-bottom:2px solid #E8E0D8;text-align:center;font-size:11px;">Contact Logs</th>
            <th style="padding:6px 8px;background:#FAF7F2;border-bottom:2px solid #E8E0D8;text-align:center;font-size:11px;">Axle</th>
          </tr></thead>
          <tbody>
            ${staffRows}
            <tr style="border-top:2px solid #E8E0D8;">
              <td style="padding:8px 10px;font-weight:700;background:#FAF7F2;">Team total</td>
              ${totalsCells}
              <td style="padding:8px;text-align:center;font-weight:700;background:#FAF7F2;">${clCount}/${staff.length}</td>
              <td style="padding:8px;text-align:center;font-weight:700;background:#FAF7F2;">${axCount}/${staff.length}</td>
            </tr>
          </tbody>
        </table>
      </div>

      ${missedGoalsSection}

      <div style="font-size:11px;font-weight:600;color:#9A9A9A;text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px;">New Shift Notes (${notes.length})</div>
      <div style="margin-bottom:24px;">${notesHtml}</div>

      <div style="border-top:1px solid #E8E0D8;padding-top:16px;font-size:11px;color:#888;text-align:center;">
        <a href="https://perspire-guest-tracker.vercel.app" style="color:#B85C38;text-decoration:none;">Open dashboard ↗</a><br>
        Perspire PTC Dashboard · Daily summary
      </div>
    </div>
  </body></html>`;

  // ── SEND EMAIL ──
  const recipient = process.env.DAILY_SUMMARY_EMAIL || process.env.NOTIFY_EMAIL_1;
  if (!process.env.RESEND_API_KEY || !recipient) {
    return res.status(200).json({ message: 'Email not configured (missing RESEND_API_KEY or DAILY_SUMMARY_EMAIL)', preview: { tasks: applicableTasks.length, staff: staff.length, notes: notes.length } });
  }

  try {
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
        to: [recipient],
        subject,
        html
      })
    });
    const emailData = await emailRes.json();
    return res.status(200).json({ status: emailRes.ok ? 'sent' : 'failed', date: todayStr, recipient, data: emailData });
  } catch (e) {
    return res.status(500).json({ status: 'error', message: e.message });
  }
};
