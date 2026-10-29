const allowedWebhookHost = 'services.leadconnectorhq.com';

function field(value, max) {
  if (value == null) return '';
  if (typeof value !== 'string' || value.trim().length > max) throw new Error('INVALID_FIELD');
  return value.trim();
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Use POST to submit an inquiry.' });
  }
  const host = req.headers.host;
  const origin = req.headers.origin;
  if (!host || !origin || !['https://' + host, 'http://' + host].includes(origin)) {
    return res.status(403).json({ error: 'Submit from the Meridian Hill website.' });
  }
  if (!req.headers['content-type']?.startsWith('application/json')) {
    return res.status(415).json({ error: 'Invalid submission format.' });
  }
  if (Number(req.headers['content-length']) > 8192) {
    return res.status(413).json({ error: 'Inquiry is too large.' });
  }
  const webhook = process.env.GHL_WEBHOOK_URL;
  let destination;
  try {
    destination = new URL(webhook);
    if (destination.protocol !== 'https:' || destination.hostname !== allowedWebhookHost) throw new Error('INVALID_WEBHOOK');
  } catch {
    return res.status(503).json({ error: 'Inquiries are temporarily unavailable. Please try again later.' });
  }
  try {
    const data = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (!data || typeof data !== 'object' || Array.isArray(data) || JSON.stringify(data).length > 8192) {
      return res.status(400).json({ error: 'Invalid inquiry.' });
    }
    if (field(data.website, 200)) return res.status(400).json({ error: 'Invalid inquiry.' });
    const interest = field(data.interest, 120);
    const eventDate = field(data.event_date, 10);
    const flexibility = field(data.date_flexibility, 80);
    const guests = Number(data.guest_count);
    const support = field(data.planning_support, 100);
    const name = field(data.name, 120);
    const email = field(data.email, 254);
    const phone = field(data.phone, 40);
    const details = field(data.details, 1500);
    const sourcePage = new URL(field(data.page_url, 1000));
    if (!interest || !flexibility || !name || !/^\S+@\S+\.\S+$/.test(email) ||
        !Number.isInteger(guests) || guests < 1 || guests > 10000 ||
        (phone && !/^\+?[\d().\s-]{10,40}$/.test(phone)) ||
        (eventDate && (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate) ||
          new Date(eventDate).toISOString().slice(0, 10) !== eventDate)) ||
        sourcePage.origin !== origin || sourcePage.pathname !== '/') {
      return res.status(400).json({ error: 'Check the required event and contact details.' });
    }
    const utm = {};
    for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']) {
      utm[key] = field(data[key], 150);
    }
    const parts = name.split(/\s+/);
    const firstName = parts.shift();
    const payload = {
      brand: 'Meridian Hill',
      form_name: 'Event Inquiry',
      interest,
      event_type: interest,
      event_date: eventDate,
      date_flexibility: flexibility,
      guest_count: guests,
      planning_support: support,
      name,
      first_name: firstName,
      last_name: parts.join(' '),
      email,
      phone,
      details,
      message: details,
      page_url: sourcePage.href,
      ...utm,
      email_consent: 'no',
      sms_consent: 'no'
    };
    const upstream = await fetch(destination, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000)
    });
    if (!upstream.ok) {
      console.error('Meridian Hill GHL delivery failed with status', upstream.status);
      return res.status(502).json({ error: 'We could not confirm delivery. Please try again later.' });
    }
    return res.status(200).json({ ok: true });
  } catch (error) {
    if (error instanceof SyntaxError || error?.message === 'INVALID_FIELD' || error instanceof TypeError || error instanceof RangeError) {
      return res.status(400).json({ error: 'Check the inquiry details and try again.' });
    }
    console.error('Meridian Hill GHL delivery failed', error?.name || 'Unknown error');
    return res.status(502).json({ error: 'We could not confirm delivery. Please try again later.' });
  }
};
