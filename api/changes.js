const { getSupabase, cors } = require('./_supabase');

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const supabase = getSupabase();
  const id = req.query.id;

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('changes')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) return res.status(500).json({ error: error.message });

    const result = data.map(c => ({
      id: c.id,
      guestName: c.guest_name,
      type: c.type,
      dateRequested: c.date_requested,
      billDate: c.bill_date,
      currentTier: c.current_tier,
      newTier: c.new_tier,
      freezeDuration: c.freeze_duration,
      freezeOtherNote: c.freeze_other_note,
      notes: c.notes,
      status: c.status,
      outcome: c.outcome,
      outcomeNotes: c.outcome_notes,
      freezeOverride: c.freeze_override,
      needsFollowup: c.needs_followup,
      outreachOutcome: c.outreach_outcome,
      checklist: c.checklist || {},
      submittedBy: c.submitted_by || null,
      retainSessionAccess: c.retain_session_access,
      createdAt: c.created_at
    }));

    return res.status(200).json(result);
  }

  if (req.method === 'POST') {
    const b = req.body;
    const { error } = await supabase.from('changes').insert({
      id: b.id,
      guest_name: b.guestName,
      type: b.type,
      date_requested: b.dateRequested,
      bill_date: b.billDate,
      current_tier: b.currentTier,
      new_tier: b.newTier || null,
      freeze_duration: b.freezeDuration || null,
      freeze_other_note: b.freezeOtherNote || null,
      notes: b.notes || '',
      status: b.status || 'open',
      outcome: b.outcome || 'pending',
      outcome_notes: b.outcomeNotes || '',
      freeze_override: b.freezeOverride || false,
      needs_followup: b.needsFollowup || false,
      outreach_outcome: b.outreachOutcome || null,
      checklist: b.checklist || {},
      submitted_by: b.submittedBy || null,
      retain_session_access: (b.retainSessionAccess === undefined ? null : b.retainSessionAccess)
    });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json({ ok: true });
  }

  if (req.method === 'PUT') {
    if (!id) return res.status(400).json({ error: 'Missing id' });
    const b = req.body;
    const updates = {};
    if (b.guestName !== undefined) updates.guest_name = b.guestName;
    if (b.type !== undefined) updates.type = b.type;
    if (b.dateRequested !== undefined) updates.date_requested = b.dateRequested;
    if (b.billDate !== undefined) updates.bill_date = b.billDate;
    if (b.currentTier !== undefined) updates.current_tier = b.currentTier;
    if (b.newTier !== undefined) updates.new_tier = b.newTier;
    if (b.freezeDuration !== undefined) updates.freeze_duration = b.freezeDuration;
    if (b.freezeOtherNote !== undefined) updates.freeze_other_note = b.freezeOtherNote;
    if (b.notes !== undefined) updates.notes = b.notes;
    if (b.status !== undefined) updates.status = b.status;
    if (b.outcome !== undefined) updates.outcome = b.outcome;
    if (b.outcomeNotes !== undefined) updates.outcome_notes = b.outcomeNotes;
    if (b.freezeOverride !== undefined) updates.freeze_override = b.freezeOverride;
    if (b.needsFollowup !== undefined) updates.needs_followup = b.needsFollowup;
    if (b.outreachOutcome !== undefined) updates.outreach_outcome = b.outreachOutcome;
    if (b.checklist !== undefined) updates.checklist = b.checklist;
    if (b.submittedBy !== undefined) updates.submitted_by = b.submittedBy;
    if (b.retainSessionAccess !== undefined) updates.retain_session_access = b.retainSessionAccess;

    const { error } = await supabase.from('changes').update(updates).eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'DELETE') {
    if (!id) return res.status(400).json({ error: 'Missing id' });
    const { error } = await supabase.from('changes').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
