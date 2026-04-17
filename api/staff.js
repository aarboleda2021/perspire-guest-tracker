const { getSupabase, cors } = require('./_supabase');

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const supabase = getSupabase();
  const id = req.query.id;

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('staff')
      .select('*')
      .order('name', { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    const result = data.map(s => ({
      id: s.id,
      name: s.name,
      active: s.active,
      membershipGoal: s.membership_goal !== null && s.membership_goal !== undefined ? s.membership_goal : (s.id === 'victor' ? 5 : 10),
      packageGoal: s.package_goal !== null && s.package_goal !== undefined ? s.package_goal : (s.id === 'victor' ? 3 : 5),
      createdAt: s.created_at
    }));
    return res.status(200).json(result);
  }

  if (req.method === 'POST') {
    const { id: nid, name, active } = req.body;
    const { error } = await supabase.from('staff').insert({
      id: nid,
      name,
      active: active !== undefined ? active : true
    });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json({ ok: true });
  }

  if (req.method === 'PUT') {
    if (!id) return res.status(400).json({ error: 'Missing id' });
    const updates = {};
    if (req.body.name !== undefined) updates.name = req.body.name;
    if (req.body.active !== undefined) updates.active = req.body.active;
    if (req.body.membershipGoal !== undefined) updates.membership_goal = req.body.membershipGoal;
    if (req.body.packageGoal !== undefined) updates.package_goal = req.body.packageGoal;

    const { error } = await supabase.from('staff').update(updates).eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
