const { getSupabase } = require('../_supabase');

module.exports = async function handler(req, res) {
  // Verify this is a legitimate cron call (Vercel sends this header)
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const supabase = getSupabase();

  // Get tomorrow's date in YYYY-MM-DD format (Eastern Time)
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;

  // Also check for today (in case something was missed)
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // Query open change requests with bill date of today or tomorrow
  const { data: urgent, error } = await supabase
    .from('changes')
    .select('*')
    .in('bill_date', [todayStr, tomorrowStr])
    .eq('status', 'open');

  if (error) {
    console.error('Supabase query error:', error.message);
    return res.status(500).json({ error: error.message });
  }

  if (!urgent || urgent.length === 0) {
    return res.status(200).json({ message: 'No urgent requests. No notifications sent.' });
  }

  // Format the list
  const lines = urgent.map(c => {
    const billLabel = c.bill_date === todayStr ? 'TODAY' : 'TOMORROW';
    return `- ${c.guest_name} (${c.type}) — bill date ${billLabel} (${c.bill_date})`;
  });

  const summary = `${urgent.length} unprocessed request${urgent.length !== 1 ? 's' : ''} due TODAY or TOMORROW`;
  const details = lines.join('\n');

  // ── SEND EMAIL via Resend ──────────────────────────────────────────────
  const emailResults = [];
  const recipients = [
    process.env.NOTIFY_EMAIL_1,
    process.env.NOTIFY_EMAIL_2
  ].filter(Boolean);

  if (process.env.RESEND_API_KEY && recipients.length) {
    const emailBody = `Hi team,\n\nThis is an automated alert from the Perspire Guest Tracker.\n\n⚠️ ${summary}:\n\n${details}\n\nPlease log in to the tracker and process these before the bill date:\n${process.env.VERCEL_PROJECT_PRODUCTION_URL ? 'https://' + process.env.VERCEL_PROJECT_PRODUCTION_URL : 'https://perspire-guest-tracker.vercel.app'}\n\n— Perspire Guest Tracker`;

    try {
      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM_EMAIL || 'Perspire Tracker <notifications@resend.dev>',
          to: recipients,
          subject: `⚠️ Perspire: ${summary}`,
          text: emailBody
        })
      });
      const emailData = await emailRes.json();
      emailResults.push({ status: emailRes.ok ? 'sent' : 'failed', data: emailData });
    } catch (e) {
      emailResults.push({ status: 'error', message: e.message });
    }
  }

  // ── SEND SMS via Twilio ────────────────────────────────────────────────
  const smsResults = [];
  const phones = [
    process.env.NOTIFY_PHONE_1,
    process.env.NOTIFY_PHONE_2
  ].filter(Boolean);

  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER && phones.length) {
    const smsBody = `⚠️ Perspire Tracker: ${summary}. ${urgent.map(c => c.guest_name).join(', ')}. Please process ASAP.`;
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`;
    const auth = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');

    for (const phone of phones) {
      try {
        const smsRes = await fetch(twilioUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({
            To: phone,
            From: process.env.TWILIO_FROM_NUMBER,
            Body: smsBody
          }).toString()
        });
        const smsData = await smsRes.json();
        smsResults.push({ phone, status: smsRes.ok ? 'sent' : 'failed', sid: smsData.sid });
      } catch (e) {
        smsResults.push({ phone, status: 'error', message: e.message });
      }
    }
  }

  return res.status(200).json({
    urgentCount: urgent.length,
    emailResults,
    smsResults
  });
};
