const { getSupabase } = require('../_supabase');

// ── Holiday calculation (mirrors frontend logic) ────────────────────────
function easterDate(y){
  const a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),month=Math.floor((h+l-7*m+114)/31),day=((h+l-7*m+114)%31)+1;
  return`${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
}
function nthDayOfMonth(y,month,dow,n){
  const first=new Date(y,month-1,1).getDay();let d=1+(dow-first+7)%7;d+=(n-1)*7;return`${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}
function getClosedDates(y){
  const easter=easterDate(y);
  let memDay=nthDayOfMonth(y,5,1,4);
  const memD=parseInt(memDay.split('-')[1]);if(memD+7<=31)memDay=`05-${String(memD+7).padStart(2,'0')}`;
  const laborDay=nthDayOfMonth(y,9,1,1);
  const thanksgiving=nthDayOfMonth(y,11,4,4);
  const thanksgivingD=parseInt(thanksgiving.split('-')[1]);
  const thanksgivingEve=`11-${String(thanksgivingD-1).padStart(2,'0')}`;
  return{
    closed:['01-01',easter,memDay,'07-04',laborDay,thanksgiving,'12-24','12-25','12-31'],
    earlyClose:['10-31',thanksgivingEve]
  };
}
function mmdd(d){return`${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
function isClosedOrEarlyClose(d){
  const h=getClosedDates(d.getFullYear());
  const md=mmdd(d);
  return h.closed.includes(md)||h.earlyClose.includes(md);
}
function toDateStr(d){return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}

module.exports = async function handler(req, res) {
  // Verify this is a legitimate cron call (Vercel sends this header)
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const supabase = getSupabase();

  // Get tomorrow in Eastern Time
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Build list of dates to check: tomorrow + look ahead past any closure days
  // Example: if tomorrow is 5/25 (Memorial Day, closed), we also need to catch
  // bill dates on 5/26 because we can't process them while closed on 5/25.
  // So we check: 5/25, 5/26
  const datesToCheck = [toDateStr(tomorrow)];
  const closureDates = [];
  if (isClosedOrEarlyClose(tomorrow)) {
    closureDates.push(toDateStr(tomorrow));
    let lookAhead = new Date(tomorrow);
    while (true) {
      lookAhead.setDate(lookAhead.getDate() + 1);
      datesToCheck.push(toDateStr(lookAhead));
      if (isClosedOrEarlyClose(lookAhead)) {
        closureDates.push(toDateStr(lookAhead));
      } else {
        break;
      }
    }
  }

  // Query open change requests with bill dates in our window
  const { data: urgent, error } = await supabase
    .from('changes')
    .select('*')
    .in('bill_date', datesToCheck)
    .eq('status', 'open');

  if (error) {
    console.error('Supabase query error:', error.message);
    return res.status(500).json({ error: error.message });
  }

  if (!urgent || urgent.length === 0) {
    return res.status(200).json({ message: 'No urgent requests. No notifications sent.', datesChecked: datesToCheck });
  }

  // Format the list
  const tomorrowStr = toDateStr(tomorrow);
  const lines = urgent.map(c => {
    const label = c.bill_date === tomorrowStr ? 'tomorrow' : c.bill_date;
    return `- ${c.guest_name} (${c.type}) — bill date ${label}`;
  });

  const hasClosures = closureDates.length > 0;
  const summary = `${urgent.length} unprocessed request${urgent.length !== 1 ? 's' : ''} — process before ${hasClosures ? 'studio closure' : 'tomorrow\'s bill date'}`;
  const details = lines.join('\n');
  const closureNote = hasClosures ? `\n\nNote: The studio is closed or closing early on ${closureDates.join(', ')}, so these all need to be processed today.\n` : '';

  // ── SEND EMAIL via Resend ──────────────────────────────────────────────
  const emailResults = [];
  const recipients = [
    process.env.NOTIFY_EMAIL_1,
    process.env.NOTIFY_EMAIL_2
  ].filter(Boolean);

  if (process.env.RESEND_API_KEY && recipients.length) {
    const emailBody = `Hi team,\n\nThis is an automated alert from the Perspire Guest Tracker.\n\n⚠️ ${summary}:\n\n${details}${closureNote}\n\nPlease log in to the tracker and process these before the bill date:\nhttps://perspire-guest-tracker.vercel.app\n\n— Perspire Guest Tracker`;

    try {
      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
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

  return res.status(200).json({
    urgentCount: urgent.length,
    datesChecked: datesToCheck,
    emailResults
  });
};
