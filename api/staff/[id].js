const { getSupabase, cors } = require('../_supabase');

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { id } = req.query;
  const supabase = getSupabase();

  if (req.method === 'PUT') {
    const updates = {};
    if (req.body.name !== undefined) updates.name = req.body.name;
    if (req.body.active !== undefined) updates.active = req.body.active;

    const { error } = await supabase.from('staff').update(updates).eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
