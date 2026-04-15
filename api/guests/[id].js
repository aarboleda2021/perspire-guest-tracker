const { getSupabase, cors } = require('../_supabase');

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { id } = req.query;
  const supabase = getSupabase();

  if (req.method === 'PUT') {
    const updates = {};
    const body = req.body;
    if (body.name !== undefined) updates.name = body.name;
    if (body.type !== undefined) updates.type = body.type;
    if (body.tier !== undefined) updates.tier = body.tier;
    if (body.contractStartDate !== undefined) updates.contract_start_date = body.contractStartDate;
    if (body.assignedStaff !== undefined) updates.assigned_staff = body.assignedStaff;
    if (body.visitStatus !== undefined) updates.visit_status = body.visitStatus;
    if (body.deactivated !== undefined) updates.deactivated = body.deactivated;

    const { error } = await supabase.from('guests').update(updates).eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'DELETE') {
    const { error } = await supabase.from('guests').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
