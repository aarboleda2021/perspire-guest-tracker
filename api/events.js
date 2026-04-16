const { getSupabase, cors } = require('./_supabase');

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const supabase = getSupabase();
  const id = req.query.id;

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('start_date', { ascending: true });
    if (error) return res.status(500).json({ error: error.message });

    const result = data.map(e => ({
      id: e.id,
      title: e.title,
      eventType: e.event_type,
      startDate: e.start_date,
      endDate: e.end_date,
      description: e.description,
      volunteerNeeded: e.volunteer_needed,
      assignedStaff: e.assigned_staff,
      createdBy: e.created_by,
      createdAt: e.created_at
    }));

    return res.status(200).json(result);
  }

  if (req.method === 'POST') {
    const b = req.body;
    const { error } = await supabase.from('events').insert({
      id: b.id,
      title: b.title,
      event_type: b.eventType,
      start_date: b.startDate,
      end_date: b.endDate || null,
      description: b.description || '',
      volunteer_needed: b.volunteerNeeded || false,
      assigned_staff: b.assignedStaff || null,
      created_by: b.createdBy || null
    });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json({ ok: true });
  }

  if (req.method === 'PUT') {
    if (!id) return res.status(400).json({ error: 'Missing id' });
    const b = req.body;
    const updates = {};
    if (b.title !== undefined) updates.title = b.title;
    if (b.eventType !== undefined) updates.event_type = b.eventType;
    if (b.startDate !== undefined) updates.start_date = b.startDate;
    if (b.endDate !== undefined) updates.end_date = b.endDate;
    if (b.description !== undefined) updates.description = b.description;
    if (b.volunteerNeeded !== undefined) updates.volunteer_needed = b.volunteerNeeded;
    if (b.assignedStaff !== undefined) updates.assigned_staff = b.assignedStaff;

    const { error } = await supabase.from('events').update(updates).eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'DELETE') {
    if (!id) return res.status(400).json({ error: 'Missing id' });
    const { error } = await supabase.from('events').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
