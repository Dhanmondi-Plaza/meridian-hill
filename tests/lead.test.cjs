const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const handler = require('../api/lead.js');

const oldFetch = global.fetch;
const oldWebhook = process.env.GHL_WEBHOOK_URL;
after(() => {
  global.fetch = oldFetch;
  if (oldWebhook === undefined) delete process.env.GHL_WEBHOOK_URL;
  else process.env.GHL_WEBHOOK_URL = oldWebhook;
});

function request(overrides = {}, headers = {}) {
  return {
    method: 'POST',
    headers: { host: 'meridian-hill.vercel.app', origin: 'https://meridian-hill.vercel.app', 'content-type': 'application/json', ...headers },
    body: {
      interest: 'Wedding / walima',
      event_date: '2027-04-18',
      date_flexibility: 'Flexible / exploring',
      guest_count: 120,
      planning_support: 'Space + setup / rentals',
      name: 'Meridian Integration Test',
      email: 'meridian-test@example.com',
      phone: '+1 718 555 0100',
      details: 'Controlled test inquiry',
      page_url: 'https://meridian-hill.vercel.app/?utm_source=test',
      utm_source: 'test',
      ...overrides
    }
  };
}

async function run(req) {
  const res = {
    headers: {},
    setHeader(key, value) { this.headers[key] = value; },
    status(code) { this.code = code; return this; },
    json(body) { this.body = body; return this; }
  };
  await handler(req, res);
  return res;
}

test('forwards the complete inquiry and returns success only after upstream acceptance', async () => {
  process.env.GHL_WEBHOOK_URL = 'https://services.leadconnectorhq.com/hooks/test';
  let sent;
  global.fetch = async (_url, options) => { sent = JSON.parse(options.body); return { ok: true }; };
  const result = await run(request());
  assert.equal(result.code, 200);
  assert.equal(result.body.ok, true);
  assert.equal(sent.brand, 'Meridian Hill');
  assert.equal(sent.event_type, 'Wedding / walima');
  assert.equal(sent.event_date, '2027-04-18');
  assert.equal(sent.guest_count, 120);
  assert.equal(sent.first_name, 'Meridian');
  assert.equal(sent.utm_source, 'test');
  assert.equal(sent.email_consent, 'no');
});

test('rejects invalid requests before forwarding', async () => {
  process.env.GHL_WEBHOOK_URL = 'https://services.leadconnectorhq.com/hooks/test';
  global.fetch = async () => { throw new Error('Should not forward'); };
  assert.equal((await run(request({ guest_count: 0 }))).code, 400);
  assert.equal((await run(request({ page_url: 'https://other.example/' }))).code, 400);
  assert.equal((await run(request({ website: 'spam' }))).code, 400);
  assert.equal((await run(request({}, { origin: 'https://other.example' }))).code, 403);
  assert.equal((await run({ ...request(), method: 'GET' })).code, 405);
});

test('fails closed when webhook is absent or GHL rejects the inquiry', async () => {
  delete process.env.GHL_WEBHOOK_URL;
  assert.equal((await run(request())).code, 503);
  process.env.GHL_WEBHOOK_URL = 'https://services.leadconnectorhq.com/hooks/test';
  global.fetch = async () => ({ ok: false, status: 500 });
  const result = await run(request());
  assert.equal(result.code, 502);
  assert.notEqual(result.body.ok, true);
});
