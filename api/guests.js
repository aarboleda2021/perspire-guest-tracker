const { getSupabase, cors } = require('./_supabase');

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const supabase = getSupabase();

  if (req.method === 'GET') {
    const { data: guests, error: gErr } = await supabase
      .from('guests')
      .select('*')
      .order('created_at', { ascending: true });
    if (gErr) return res.status(500).json({ error: gErr.message });

    const { data: logs, error: lErr } = await supabase
      .from('touchpoint_logs')
      .select('*');
    if (lErr) return res.status(500).json({ error: lErr.message });

    // Attach logs to each guest as { index: {date, channel, notes} }
    const logsByGuest = {};
    for (const log of logs) {
      if (!logsByGuest[log.guest_id]) logsByGuest[log.guest_id] = {};
      logsByGuest[log.guest_id][log.tp_index] = {
        date: log.logged_at,
        channel: log.channel,
        notes: log.notes || ''
      };
    }

    const result = guests.map(g => ({
      id: g.id,
      name: g.name,
      type: g.type,
      tier: g.tier,
      contractStartDate: g.contract_start_date,
      assignedStaff: g.assigned_staff,
      visitStatus: g.visit_status,
      deactivated: g.deactivated || false,
      logs: logsByGuest[g.id] || {},
      createdAt: g.created_at
    }));

    return res.status(200).json(result);
  }

  if (req.method === 'POST') {
    const { id, name, type, tier, contractStartDate, assignedStaff, visitStatus } = req.body;
    const { error } = await supabase.from('guests').insert({
      id,
      name,
      type,
      tier,
      contract_start_date: contractStartDate,
      assigned_staff: assignedStaff,
      visit_status: visitStatus || 'healthy'
    });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
