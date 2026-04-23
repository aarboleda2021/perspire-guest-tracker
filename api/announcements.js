const { getSupabase, cors } = require('./_supabase');

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const supabase = getSupabase();
  const id = req.query.id;

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });

    const result = data.map(a => ({
      id: a.id,
      title: a.title,
      content: a.content,
      linkUrl: a.link_url || null,
      linkLabel: a.link_label || null,
      postedBy: a.posted_by,
      createdAt: a.created_at,
      acknowledgments: a.acknowledgments || {},
      resolvedAt: a.resolved_at || null,
      resolvedBy: a.resolved_by || null
    }));

    return res.status(200).json(result);
  }

  if (req.method === 'POST') {
    const b = req.body;
    const { error } = await supabase.from('announcements').insert({
      id: b.id,
      title: b.title,
      content: b.content,
      link_url: b.linkUrl || null,
      link_label: b.linkLabel || null,
      posted_by: b.postedBy,
      acknowledgments: b.acknowledgments || {}
    });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json({ ok: true });
  }

  if (req.method === 'PUT') {
    if (!id) return res.status(400).json({ error: 'Missing id' });
    const b = req.body;
    const updates = {};
    if (b.title !== undefined) updates.title = b.title;
    if (b.content !== undefined) updates.content = b.content;
    if (b.linkUrl !== undefined) updates.link_url = b.linkUrl;
    if (b.linkLabel !== undefined) updates.link_label = b.linkLabel;
    if (b.postedBy !== undefined) updates.posted_by = b.postedBy;
    if (b.acknowledgments !== undefined) updates.acknowledgments = b.acknowledgments;
    if (b.resolvedAt !== undefined) updates.resolved_at = b.resolvedAt;
    if (b.resolvedBy !== undefined) updates.resolved_by = b.resolvedBy;

    const { error } = await supabase.from('announcements').update(updates).eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'DELETE') {
    if (!id) return res.status(400).json({ error: 'Missing id' });
    const { error } = await supabase.from('announcements').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
