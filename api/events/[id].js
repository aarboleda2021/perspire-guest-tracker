const { getSupabase, cors } = require('../_supabase');

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { id } = req.query;
  const supabase = getSupabase();

  if (req.method === 'PUT') {
    const b = req.body;
    const updates = {};
    if (b.title !== undefined) updates.title = b.title;
    if (b.eventType !== undefined) updates.event_type = b.eventType;
    if (b.startDate !== undefined) updates.start_date = b.startDate;
    if (b.endDate !== undefined) updates.end_date = b.endDate;
    if (b.description !== undefined) updates.description = b.description;
    if (b.volunteerNeeded !== undefined) updates.volunteer_needed = b.volunteerNeeded;
    if (b.assignedStaff !== undefined) updates.assigned_staff = b.assignedStaff;

    const { error } = await supabase.from('events').update(updates).eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'DELETE') {
    const { error } = await supabase.from('events').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
