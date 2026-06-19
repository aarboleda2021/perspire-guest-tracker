const { getSupabase, cors } = require('./_supabase');

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const supabase = getSupabase();
  const id = req.query.id;

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('shift_notes')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });

    const result = data.map(n => ({
      id: n.id,
      content: n.content,
      priority: n.priority,
      createdBy: n.created_by,
      createdAt: n.created_at,
      keepUntil: n.keep_until,
      resolvedAt: n.resolved_at,
      resolvedBy: n.resolved_by,
      assignedTo: n.assigned_to || null,
      acknowledgments: n.acknowledgments || {}
    }));

    return res.status(200).json(result);
  }

  if (req.method === 'POST') {
    const b = req.body;
    const { error } = await supabase.from('shift_notes').insert({
      id: b.id,
      content: b.content,
      priority: b.priority || 'fyi',
      created_by: b.createdBy || null,
      keep_until: b.keepUntil || null,
      resolved_at: null,
      resolved_by: null,
      assigned_to: b.assignedTo || null
    });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json({ ok: true });
  }

  if (req.method === 'PUT') {
    if (!id) return res.status(400).json({ error: 'Missing id' });
    const b = req.body;
    const updates = {};
    if (b.content !== undefined) updates.content = b.content;
    if (b.priority !== undefined) updates.priority = b.priority;
    if (b.keepUntil !== undefined) updates.keep_until = b.keepUntil;
    if (b.resolvedAt !== undefined) updates.resolved_at = b.resolvedAt;
    if (b.resolvedBy !== undefined) updates.resolved_by = b.resolvedBy;
    if (b.assignedTo !== undefined) updates.assigned_to = b.assignedTo;
    if (b.acknowledgments !== undefined) updates.acknowledgments = b.acknowledgments;

    const { error } = await supabase.from('shift_notes').update(updates).eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'DELETE') {
    if (!id) return res.status(400).json({ error: 'Missing id' });
    const { error } = await supabase.from('shift_notes').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
