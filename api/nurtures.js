const { getSupabase, cors } = require('./_supabase');

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const supabase = getSupabase();

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('nurtures')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) return res.status(500).json({ error: error.message });

    const result = data.map(n => ({
      id: n.id,
      changeId: n.change_id,
      guestName: n.guest_name,
      type: n.type,
      oldTier: n.old_tier,
      newTier: n.new_tier,
      startDate: n.start_date,
      logs: n.logs || {},
      status: n.status,
      assignedStaff: n.assigned_staff || 'mohogany',
      createdAt: n.created_at
    }));

    return res.status(200).json(result);
  }

  if (req.method === 'POST') {
    const b = req.body;
    const { error } = await supabase.from('nurtures').insert({
      id: b.id,
      change_id: b.changeId || null,
      guest_name: b.guestName,
      type: b.type,
      old_tier: b.oldTier,
      new_tier: b.newTier || '',
      start_date: b.startDate,
      logs: b.logs || {},
      status: b.status || 'active',
      assigned_staff: b.assignedStaff || 'mohogany'
    });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
