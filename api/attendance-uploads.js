const { getSupabase, cors } = require('./_supabase');

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const supabase = getSupabase();

  if (req.method === 'GET') {
    // Return the most recent upload only — that's all any consumer needs.
    const { data, error } = await supabase
      .from('attendance_uploads')
      .select('id, uploaded_at, uploaded_by, file_name, row_count, parsed_data')
      .order('uploaded_at', { ascending: false })
      .limit(1);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data?.[0] || null);
  }

  if (req.method === 'POST') {
    const b = req.body || {};
    if (!b.parsed_data || !Array.isArray(b.parsed_data.rows)) {
      return res.status(400).json({ error: 'Missing parsed_data.rows' });
    }
    const { error } = await supabase.from('attendance_uploads').insert({
      uploaded_by: b.uploaded_by || null,
      file_name: b.file_name || null,
      row_count: b.parsed_data.rows.length,
      parsed_data: b.parsed_data,
    });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
