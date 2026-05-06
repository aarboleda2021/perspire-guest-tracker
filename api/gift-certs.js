const { getSupabase, cors } = require('./_supabase');

// Combined route — handles certs + redemptions to stay under Vercel Hobby
// 12-function limit. Sub-route via ?action=redeem (POST) or ?action=void (PUT).

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const supabase = getSupabase();
  const id = req.query.id;
  const action = req.query.action;

  if (req.method === 'GET') {
    const { data: certs, error: cErr } = await supabase
      .from('gift_certificates')
      .select('*')
      .order('created_at', { ascending: false });
    if (cErr) return res.status(500).json({ error: cErr.message });

    const { data: reds, error: rErr } = await supabase
      .from('gift_cert_redemptions')
      .select('*')
      .order('redeemed_at', { ascending: false });
    if (rErr) return res.status(500).json({ error: rErr.message });

    const redsByCert = {};
    for (const r of reds) {
      if (!redsByCert[r.cert_id]) redsByCert[r.cert_id] = [];
      redsByCert[r.cert_id].push({
        id: r.id,
        certId: r.cert_id,
        quantity: r.quantity,
        redeemedByMember: r.redeemed_by_member,
        redeemedAt: r.redeemed_at,
        redeemedStaff: r.redeemed_staff,
        notes: r.notes || ''
      });
    }

    const result = certs.map(c => {
      const certReds = redsByCert[c.id] || [];
      const quantityRedeemed = certReds.reduce((sum, r) => sum + (r.quantity || 0), 0);
      return {
        id: c.id,
        giftedTo: c.gifted_to,
        redeemableFor: c.redeemable_for,
        redeemableUntil: c.redeemable_until,
        quantityIssued: c.quantity_issued,
        quantityRedeemed,
        quantityRemaining: Math.max(0, c.quantity_issued - quantityRedeemed),
        purpose: c.purpose,
        estimatedValueEach: c.estimated_value_each ? parseFloat(c.estimated_value_each) : null,
        notes: c.notes || '',
        issuedBy: c.issued_by,
        issuedDate: c.issued_date,
        voided: c.voided || false,
        voidedReason: c.voided_reason || null,
        redemptions: certReds,
        createdAt: c.created_at
      };
    });

    return res.status(200).json(result);
  }

  if (req.method === 'POST') {
    const b = req.body;
    // Sub-route: log a redemption against an existing cert
    if (action === 'redeem') {
      if (!id) return res.status(400).json({ error: 'Missing cert id' });
      const { error } = await supabase.from('gift_cert_redemptions').insert({
        cert_id: id,
        quantity: b.quantity || 1,
        redeemed_by_member: b.redeemedByMember || null,
        redeemed_staff: b.redeemedStaff || null,
        notes: b.notes || ''
      });
      if (error) return res.status(500).json({ error: error.message });
      return res.status(201).json({ ok: true });
    }
    // Default: create a new cert
    const { error } = await supabase.from('gift_certificates').insert({
      id: b.id,
      gifted_to: b.giftedTo,
      redeemable_for: b.redeemableFor,
      redeemable_until: b.redeemableUntil,
      quantity_issued: b.quantityIssued || 1,
      purpose: b.purpose || null,
      estimated_value_each: b.estimatedValueEach || null,
      notes: b.notes || '',
      issued_by: b.issuedBy || null,
      issued_date: b.issuedDate || new Date().toISOString().slice(0, 10)
    });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json({ ok: true });
  }

  if (req.method === 'PUT') {
    if (!id) return res.status(400).json({ error: 'Missing id' });
    const b = req.body;
    const updates = {};
    if (b.giftedTo !== undefined) updates.gifted_to = b.giftedTo;
    if (b.redeemableFor !== undefined) updates.redeemable_for = b.redeemableFor;
    if (b.redeemableUntil !== undefined) updates.redeemable_until = b.redeemableUntil;
    if (b.quantityIssued !== undefined) updates.quantity_issued = b.quantityIssued;
    if (b.purpose !== undefined) updates.purpose = b.purpose;
    if (b.estimatedValueEach !== undefined) updates.estimated_value_each = b.estimatedValueEach;
    if (b.notes !== undefined) updates.notes = b.notes;
    if (b.issuedBy !== undefined) updates.issued_by = b.issuedBy;
    if (b.issuedDate !== undefined) updates.issued_date = b.issuedDate;
    if (b.voided !== undefined) updates.voided = b.voided;
    if (b.voidedReason !== undefined) updates.voided_reason = b.voidedReason;

    const { error } = await supabase.from('gift_certificates').update(updates).eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'DELETE') {
    if (!id) return res.status(400).json({ error: 'Missing id' });
    // Sub-route: delete a single redemption row by ?action=redemption&redemptionId=N
    if (action === 'redemption') {
      const rid = req.query.redemptionId;
      if (!rid) return res.status(400).json({ error: 'Missing redemptionId' });
      const { error } = await supabase.from('gift_cert_redemptions').delete().eq('id', rid);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ ok: true });
    }
    // Default: delete the entire cert (cascades redemptions)
    const { error } = await supabase.from('gift_certificates').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
