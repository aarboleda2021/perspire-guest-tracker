const { getSupabase, cors } = require('../_supabase');

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { id } = req.query;
  const supabase = getSupabase();

  if (req.method === 'PUT') {
    const b = req.body;
    const updates = {};
    if (b.content !== undefined) updates.content = b.content;
    if (b.priority !== undefined) updates.priority = b.priority;
    if (b.keepUntil !== undefined) updates.keep_until = b.keepUntil;
    if (b.resolvedAt !== undefined) updates.resolved_at = b.resolvedAt;
    if (b.resolvedBy !== undefined) updates.resolved_by = b.resolvedBy;

    const { error } = await supabase.from('shift_notes').update(updates).eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'DELETE') {
    const { error } = await supabase.from('shift_notes').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
