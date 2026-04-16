const { getSupabase, cors } = require('./_supabase');

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const supabase = getSupabase();
  const id = req.query.id;

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
      deactivatedReason: g.deactivated_reason || null,
      deactivatedNotes: g.deactivated_notes || null,
      totalVisits: g.total_visits || 0,
      visitsUpdatedAt: g.visits_updated_at || null,
      milestonesCompleted: g.milestones_completed || {},
      logs: logsByGuest[g.id] || {},
      createdAt: g.created_at
    }));

    return res.status(200).json(result);
  }

  if (req.method === 'POST') {
    const { id: nid, name, type, tier, contractStartDate, assignedStaff, visitStatus } = req.body;
    const { error } = await supabase.from('guests').insert({
      id: nid, name, type, tier,
      contract_start_date: contractStartDate,
      assigned_staff: assignedStaff,
      visit_status: visitStatus || 'healthy'
    });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json({ ok: true });
  }

  if (req.method === 'PUT') {
    if (!id) return res.status(400).json({ error: 'Missing id' });
    const body = req.body;
    const updates = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.type !== undefined) updates.type = body.type;
    if (body.tier !== undefined) updates.tier = body.tier;
    if (body.contractStartDate !== undefined) updates.contract_start_date = body.contractStartDate;
    if (body.assignedStaff !== undefined) updates.assigned_staff = body.assignedStaff;
    if (body.visitStatus !== undefined) updates.visit_status = body.visitStatus;
    if (body.deactivated !== undefined) updates.deactivated = body.deactivated;
    if (body.deactivatedReason !== undefined) updates.deactivated_reason = body.deactivatedReason;
    if (body.deactivatedNotes !== undefined) updates.deactivated_notes = body.deactivatedNotes;
    if (body.totalVisits !== undefined) updates.total_visits = body.totalVisits;
    if (body.visitsUpdatedAt !== undefined) updates.visits_updated_at = body.visitsUpdatedAt;
    if (body.milestonesCompleted !== undefined) updates.milestones_completed = body.milestonesCompleted;

    const { error } = await supabase.from('guests').update(updates).eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'DELETE') {
    if (!id) return res.status(400).json({ error: 'Missing id' });
    const { error } = await supabase.from('guests').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
