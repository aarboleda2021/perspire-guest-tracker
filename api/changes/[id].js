const { getSupabase, cors } = require('../_supabase');

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { id } = req.query;
  const supabase = getSupabase();

  if (req.method === 'PUT') {
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

    const { error } = await supabase.from('changes').update(updates).eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'DELETE') {
    const { error } = await supabase.from('changes').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
