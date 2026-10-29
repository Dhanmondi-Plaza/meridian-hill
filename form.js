const inquiryForm = document.querySelector('form');
const inquiryButton = inquiryForm.querySelector('button[type="submit"]');
const inquiryFeedback = inquiryForm.querySelector('.feedback');
let submitting = false;
let submitted = false;

inquiryForm.addEventListener('submit', async event => {
  event.preventDefault();
  if (submitting || submitted || !inquiryForm.reportValidity()) return;
  const data = new FormData(inquiryForm);
  const query = new URLSearchParams(location.search);
  const payload = {
    interest: data.get('Interest'),
    event_date: data.get('Preferred event date'),
    date_flexibility: data.get('Date flexibility'),
    guest_count: Number(data.get('Estimated guests')),
    planning_support: data.get('Planning support (optional)'),
    name: data.get('Name'),
    email: data.get('Email'),
    phone: data.get('Phone (optional)'),
    details: data.get('Details'),
    website: data.get('website'),
    page_url: location.href
  };
  for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']) {
    payload[key] = query.get(key) || '';
  }
  submitting = true;
  inquiryButton.disabled = true;
  inquiryButton.textContent = siteT('Sending inquiry…');
  inquiryFeedback.textContent = '';
  try {
    const response = await fetch('/api/lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!response.ok || result.ok !== true) throw new Error('DELIVERY_UNCONFIRMED');
    submitted = true;
    inquiryButton.textContent = siteT('Inquiry sent');
    inquiryFeedback.textContent = siteT('Thanks. Your inquiry was sent. Our team will follow up. This is not a reservation or date hold.');
    inquiryForm.reset();
  } catch {
    inquiryFeedback.textContent = siteT('We could not confirm delivery. Your details are still here; please try again later.');
    inquiryButton.textContent = siteT('Send event inquiry →');
    inquiryButton.disabled = false;
  } finally {
    submitting = false;
  }
});

document.addEventListener('site-language-change', () => {
  inquiryButton.textContent = siteT(submitted ? 'Inquiry sent' : submitting ? 'Sending inquiry…' : 'Send event inquiry →');
});
