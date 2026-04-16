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
      if (!date) return res.status(400).json({ error: 'Missing date' });
      const { data, error } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('log_date', date);
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
