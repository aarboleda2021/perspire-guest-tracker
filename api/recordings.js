const { getSupabase, cors } = require('./_supabase');

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const supabase = getSupabase();
  const id = req.query.id;

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('recordings')
      .select('*')
      .order('week_of', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });

    const result = data.map(r => ({
      id: r.id,
      title: r.title,
      weekOf: r.week_of,
      videoUrl: r.video_url,
      passcode: r.passcode || null,
      completions: r.completions || {},
      takeaways: r.takeaways || {},
      createdAt: r.created_at
    }));

    return res.status(200).json(result);
  }

  if (req.method === 'POST') {
    const b = req.body;
    const { error } = await supabase.from('recordings').insert({
      id: b.id,
      title: b.title,
      week_of: b.weekOf,
      video_url: b.videoUrl,
      passcode: b.passcode || null,
      completions: b.completions || {},
      takeaways: b.takeaways || {}
    });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json({ ok: true });
  }

  if (req.method === 'PUT') {
    if (!id) return res.status(400).json({ error: 'Missing id' });
    const b = req.body;
    const updates = {};
    if (b.title !== undefined) updates.title = b.title;
    if (b.weekOf !== undefined) updates.week_of = b.weekOf;
    if (b.videoUrl !== undefined) updates.video_url = b.videoUrl;
    if (b.passcode !== undefined) updates.passcode = b.passcode;
    if (b.completions !== undefined) updates.completions = b.completions;
    if (b.takeaways !== undefined) updates.takeaways = b.takeaways;

    const { error } = await supabase.from('recordings').update(updates).eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'DELETE') {
    if (!id) return res.status(400).json({ error: 'Missing id' });
    const { error } = await supabase.from('recordings').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
