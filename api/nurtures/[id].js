const { getSupabase, cors } = require('../_supabase');

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { id } = req.query;
  const supabase = getSupabase();

  if (req.method === 'PUT') {
    const b = req.body;
    const updates = {};
    if (b.guestName !== undefined) updates.guest_name = b.guestName;
    if (b.type !== undefined) updates.type = b.type;
    if (b.oldTier !== undefined) updates.old_tier = b.oldTier;
    if (b.newTier !== undefined) updates.new_tier = b.newTier;
    if (b.startDate !== undefined) updates.start_date = b.startDate;
    if (b.logs !== undefined) updates.logs = b.logs;
    if (b.status !== undefined) updates.status = b.status;
    if (b.assignedStaff !== undefined) updates.assigned_staff = b.assignedStaff;

    const { error } = await supabase.from('nurtures').update(updates).eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'DELETE') {
    const { error } = await supabase.from('nurtures').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
