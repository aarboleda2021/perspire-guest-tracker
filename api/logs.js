const { getSupabase, cors } = require('./_supabase');

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const supabase = getSupabase();

  if (req.method === 'POST') {
    const { guestId, tpIndex, channel, notes } = req.body;
    const { error } = await supabase.from('touchpoint_logs').upsert({
      guest_id: guestId,
      tp_index: tpIndex,
      channel,
      notes: notes || '',
      logged_at: new Date().toISOString()
    }, { onConflict: 'guest_id,tp_index' });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
