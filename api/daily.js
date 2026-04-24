const { getSupabase, cors } = require('./_supabase');

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const supabase = getSupabase();
  const resource = req.query.resource; // 'tasks' or 'logs'
  const date = req.query.date; // YYYY-MM-DD
  const staffId = req.query.staffId;
  const taskKey = req.query.taskKey;

  if (resource === 'tasks') {
    if (req.method === 'GET') {
      if (!date) return res.status(400).json({ error: 'Missing date' });
      const { data, error } = await supabase
        .from('daily_task_completions')
        .select('*')
        .eq('date', date);
      if (error) return res.status(500).json({ error: error.message });
      const result = data.map(t => ({
        date: t.date,
        taskKey: t.task_key,
        completedBy: t.completed_by,
        completedAt: t.completed_at,
        taskData: t.task_data || null
      }));
      return res.status(200).json(result);
    }
    if (req.method === 'POST') {
      const b = req.body;
      const { error } = await supabase.from('daily_task_completions').upsert({
        date: b.date,
        task_key: b.taskKey,
        completed_by: b.completedBy,
        completed_at: b.completedAt || new Date().toISOString(),
        task_data: b.taskData || null
      }, { onConflict: 'date,task_key' });
      if (error) return res.status(500).json({ error: error.message });
      // Side-effect: email Cintas levels to Amanda when the Cintas task is logged
      if (b.taskKey === 'cintas' && b.taskData) {
        sendCintasEmail(b).catch(e => console.warn('Cintas email failed:', e.message));
      }
      return res.status(201).json({ ok: true });
    }
    if (req.method === 'DELETE') {
      if (!date || !taskKey) return res.status(400).json({ error: 'Missing date or taskKey' });
      const { error } = await supabase.from('daily_task_completions').delete().match({ date, task_key: taskKey });
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ ok: true });
    }
  }

  if (resource === 'logs') {
    if (req.method === 'GET') {
      const { month, dateFrom, dateTo } = req.query;
      let query = supabase.from('daily_logs').select('*');
      if (month) {
        // month is YYYY-MM. Fetch all dates in that month.
        const [y, m] = month.split('-');
        const first = `${y}-${m}-01`;
        const lastDay = new Date(parseInt(y), parseInt(m), 0).getDate();
        const last = `${y}-${m}-${String(lastDay).padStart(2,'0')}`;
        query = query.gte('log_date', first).lte('log_date', last);
      } else if (dateFrom && dateTo) {
        query = query.gte('log_date', dateFrom).lte('log_date', dateTo);
      } else if (date) {
        query = query.eq('log_date', date);
      } else {
        return res.status(400).json({ error: 'Missing date, month, or dateFrom/dateTo' });
      }
      const { data, error } = await query;
      if (error) return res.status(500).json({ error: error.message });
      const result = data.map(l => ({
        staffId: l.staff_id,
        date: l.log_date,
        opportunities: l.opportunities || 0,
        firstVisitsBooked: l.first_visits_booked || 0,
        membershipSales: l.membership_sales || 0,
        packageSales: l.package_sales || 0,
        outboundCalls: l.outbound_calls || 0,
        preBooked: l.pre_booked || 0,
        contactLogsDone: l.contact_logs_done || false,
        axleFollowupsDone: l.axle_followups_done || false,
        updatedAt: l.updated_at
      }));
      return res.status(200).json(result);
    }
    if (req.method === 'PUT') {
      if (!date || !staffId) return res.status(400).json({ error: 'Missing date or staffId' });
      const b = req.body;
      const updates = { staff_id: staffId, log_date: date, updated_at: new Date().toISOString() };
      if (b.opportunities !== undefined) updates.opportunities = b.opportunities;
      if (b.firstVisitsBooked !== undefined) updates.first_visits_booked = b.firstVisitsBooked;
      if (b.membershipSales !== undefined) updates.membership_sales = b.membershipSales;
      if (b.packageSales !== undefined) updates.package_sales = b.packageSales;
      if (b.outboundCalls !== undefined) updates.outbound_calls = b.outboundCalls;
      if (b.preBooked !== undefined) updates.pre_booked = b.preBooked;
      if (b.contactLogsDone !== undefined) updates.contact_logs_done = b.contactLogsDone;
      if (b.axleFollowupsDone !== undefined) updates.axle_followups_done = b.axleFollowupsDone;
      const { error } = await supabase.from('daily_logs').upsert(updates, { onConflict: 'staff_id,log_date' });
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ ok: true });
    }
  }

  return res.status(400).json({ error: 'Invalid resource. Use ?resource=tasks or ?resource=logs' });
};

// ── Cintas levels email ───────────────────────────────────────────────
const CINTAS_ITEMS = [
  'Toilet Paper',
  'Paper Towel',
  'Hand Soap (Bathroom)',
  'Hand Sanitizer (At Towel drop)',
  'Chemical Levels (Disinfectant, Glass Cleaner, Floor Cleaner)',
  'Mop Heads (2 front Drawers)'
];
const STATUS_LABEL = { good: '✓ Good', half: '⚠ Half way', low: '⚠ Need More' };
const STATUS_COLOR = { good: '#3D7A4F', half: '#B8761A', low: '#C73E1D' };

async function sendCintasEmail(b) {
  const recipient = process.env.DAILY_SUMMARY_EMAIL || process.env.NOTIFY_EMAIL_1;
  if (!process.env.RESEND_API_KEY || !recipient) return;
  const data = b.taskData || {};
  const completedBy = b.completedBy || 'Unknown';
  const date = b.date || new Date().toISOString().slice(0, 10);
  const dateStr = new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  const rowsHtml = CINTAS_ITEMS.map((item, i) => {
    const d = data[i] || {};
    const status = d.status || '';
    const lbl = STATUS_LABEL[status] || '—';
    const color = STATUS_COLOR[status] || '#888';
    const notes = d.notes ? `<div style="font-size:12px;color:#5C5C5C;margin-top:4px;font-style:italic;">${String(d.notes).replace(/</g, '&lt;')}</div>` : '';
    return `<tr>
      <td style="padding:10px 12px;border-bottom:1px solid #E8E0D8;font-weight:600;">${item}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #E8E0D8;color:${color};font-weight:600;">${lbl}${notes}</td>
    </tr>`;
  }).join('');

  const html = `<!DOCTYPE html><html><body style="font-family:Arial,Helvetica,sans-serif;background:#FAF7F2;margin:0;padding:20px;color:#2A2A2A;">
    <div style="max-width:600px;margin:0 auto;background:white;border-radius:12px;padding:28px;border:1px solid #E8E0D8;">
      <div style="font-size:22px;font-weight:700;color:#B85C38;margin-bottom:4px;">📦 Cintas supply levels</div>
      <div style="font-size:13px;color:#5C5C5C;margin-bottom:18px;">${dateStr} · Logged by ${completedBy}</div>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead><tr>
          <th style="padding:10px 12px;background:#FAF7F2;border-bottom:2px solid #E8E0D8;text-align:left;font-size:11px;">Item</th>
          <th style="padding:10px 12px;background:#FAF7F2;border-bottom:2px solid #E8E0D8;text-align:left;font-size:11px;">Status</th>
        </tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>
      <div style="margin-top:18px;padding:12px;background:#FAF7F2;border-radius:8px;font-size:12px;color:#5C5C5C;line-height:1.5;">💡 Use this to cross-check your Cintas invoice and confirm we were only charged for items we needed.</div>
      <div style="margin-top:18px;border-top:1px solid #E8E0D8;padding-top:12px;font-size:11px;color:#888;text-align:center;">
        <a href="https://perspire-guest-tracker.vercel.app" style="color:#B85C38;text-decoration:none;">Open dashboard ↗</a><br>
        Perspire PTC Dashboard · Cintas check
      </div>
    </div>
  </body></html>`;

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
      to: [recipient],
      subject: `📦 Cintas levels logged · ${dateStr}`,
      html
    })
  });
}
