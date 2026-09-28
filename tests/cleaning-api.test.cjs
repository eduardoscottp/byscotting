const test = require('node:test');
const assert = require('node:assert/strict');
const env = { AIRTABLE_TOKEN: 'test', AIRTABLE_BASE_ID: 'appTest', AIRTABLE_LEADS_TABLE_ID: 'tblTest', LEAD_SIGNING_SECRET: 'test-signing-secret-at-least-32-characters', OPENAI_API_KEY: 'test', OPENAI_MODEL: 'test-model' };
const inquiry = { submission_id: '12345678-1234-1234-1234-123456789012', name: 'Test Owner', contact: 'owner@example.com', detail: 'More walkthroughs', lang: 'en', landing: 'commercial_cleaning', company: 'Test Cleaning', service_mix: 'commercial', response_channel: 'email' };

test('cleaning lead saves business and campaign context without overwriting unrelated CRM fields', async () => {
  const { saveLead } = await import('../server/mvp.mjs');
  let sent;
  const result = await saveLead(inquiry, { env, fetch: async (url, init) => { sent = JSON.parse(init.body); return { ok: true, json: async () => ({ records: [{ id: 'recTest' }] }) }; } });
  assert.equal(result.status, 200);
  assert.equal(sent.records[0].fields['Business Name'], 'Test Cleaning');
  const saved = JSON.parse(sent.records[0].fields['Scotting Inquiry']);
  assert.equal(saved.landing, 'commercial_cleaning');
  assert.equal(saved.response_channel, 'email');
  assert.equal(saved.service_mix, 'commercial');
  assert.equal(sent.records[0].fields['Status Flag'], undefined);
});
test('cleaning requests reject invalid contact, name, channel and supplied scope before provider access', async () => {
  const { saveLead } = await import('../server/mvp.mjs');
  for (const changes of [{ name: '' }, { service_mix: 'jobs' }, { response_channel: 'callback', phone: '' }, { response_channel: 'sms' }, { response_channel: 'email', contact: '+1 305 555 0123' }, { website_trap: 'spam' }]) {
    const result = await saveLead({ ...inquiry, ...changes }, { env, fetch: async () => { throw Error('must not send'); } });
    assert.equal(result.status, 400);
  }
});
test('minimal email and callback requests save only the selected contact without business fields', async () => {
  const { saveLead } = await import('../server/mvp.mjs');
  for (const [channel, contact, field] of [['email', 'owner@example.com', 'Email'], ['callback', '+1 305 555 0123', 'Phone']]) {
    let fields;
    const result = await saveLead({ submission_id: inquiry.submission_id, name: 'Sample Owner', contact, landing: 'commercial_cleaning', response_channel: channel }, { env, fetch: async (_, init) => { fields = JSON.parse(init.body).records[0].fields; return { ok: true, json: async () => ({ records: [{ id: 'recTest' }] }) }; } });
    assert.equal(result.status, 200);
    assert.equal(fields[field], contact);
    assert.equal(fields[field === 'Email' ? 'Phone' : 'Email'], undefined);
    assert.equal(fields['Business Name'], undefined);
    assert.equal(JSON.parse(fields['Scotting Inquiry']).service_mix, undefined);
  }
});
test('cleaning chat uses bounded vertical context and does not invent booking tools', async () => {
  const { chat } = await import('../server/mvp.mjs');
  let prompt;
  const result = await chat({ context: 'commercial_cleaning', messages: [{ role: 'user', content: 'Can this help my janitorial company?' }] }, { env, fetch: async (url, init) => { prompt = JSON.parse(init.body).instructions; return { ok: true, json: async () => ({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: 'Do you need more inquiries or better follow-up?' }] }] }) }; } });
  assert.equal(result.status, 200);
  assert.match(prompt, /commercial cleaning/i);
  assert.match(prompt, /walkthrough/i);
  assert.match(prompt, /no action tools/i);
  assert.match(prompt, /Approved FAQ library/);
  assert.match(prompt, /Pricing follows a review/);
  assert.match(prompt, /no live booking tool/);
});
