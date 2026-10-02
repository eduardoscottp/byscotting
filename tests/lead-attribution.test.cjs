const { test } = require('node:test');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const load = () => import(pathToFileURL(path.join(__dirname, '../server/mvp.mjs')));
const env = { AIRTABLE_TOKEN: 'test-token', AIRTABLE_BASE_ID: 'appTest', AIRTABLE_LEADS_TABLE_ID: 'tblTest', LEAD_SIGNING_SECRET: 'test-only-secret-with-at-least-32-characters' };
const lead = { submission_id: '705621f9-a693-469e-bf85-e0667b637a95', name: 'Test visitor', contact: 'visitor@example.invalid', lang: 'en' };

async function capture(body) {
  const { saveLead } = await load();
  let fields;
  const result = await saveLead(body, { env, fetch: async (_url, options) => {
    fields = JSON.parse(options.body).records[0].fields;
    return Response.json({ records: [{ id: 'recTest' }] });
  } });
  return { result, fields };
}

test('cleaning inquiry exposes last-touch UTMs and actual conversion page as Airtable columns', async () => {
  const first = { utm_campaign: 'first-campaign', utm_source: 'newsletter' };
  const last = { utm_source: 'google', utm_medium: 'cpc', utm_campaign: 'cleaning-leads', utm_id: '12345', utm_content: 'follow-up', utm_term: 'cleaning marketing', adgroup_id: '987', landing_id: 'earlier-page', gclid: 'sample-click-id' };
  const { result, fields } = await capture({ ...lead, landing: 'commercial_cleaning', capture_surface: 'form', response_channel: 'email', headline_variant: 'follow-up', attribution: { first, last } });
  assert.equal(result.body.accepted, true);
  assert.equal(fields['Scotting Lead Origin'], 'website');
  assert.equal(fields['Scotting Capture Surface'], 'form');
  assert.equal(fields['Scotting Landing Page ID'], 'commercial_cleaning');
  assert.equal(fields['Scotting Landing Page Path'], '/landingpage_leads');
  assert.equal(fields['Scotting Headline Variant'], 'follow-up');
  for (const [field, key] of Object.entries({ 'Scotting UTM Source': 'utm_source', 'Scotting UTM Medium': 'utm_medium', 'Scotting UTM Campaign': 'utm_campaign', 'Scotting UTM ID': 'utm_id', 'Scotting UTM Content': 'utm_content', 'Scotting UTM Term': 'utm_term', 'Scotting Ad Group ID': 'adgroup_id' })) assert.equal(fields[field], last[key]);
  assert.deepEqual(JSON.parse(fields['Scotting Attribution']), { first, last });
  assert.equal(fields.Source, undefined, 'Do not overwrite existing prospecting source');
});

test('untagged English and Spanish inquiries retain page identity without invented campaign data', async () => {
  for (const [lang, id, pagePath] of [['en', 'homepage_en', '/en'], ['es', 'homepage_es', '/']]) {
    const { fields } = await capture({ ...lead, lang, landing: 'homepage', capture_surface: 'chat' });
    assert.equal(fields['Scotting Landing Page ID'], id);
    assert.equal(fields['Scotting Landing Page Path'], pagePath);
    assert.equal(fields['Scotting Capture Surface'], 'chat');
    assert.equal(fields['Scotting UTM Campaign'], undefined);
    assert.equal(fields['Scotting UTM Source'], undefined);
    assert.equal(fields['Scotting Headline Variant'], undefined);
  }
});

test('missing last-touch values are not filled from a different first-touch campaign', async () => {
  const { fields } = await capture({ ...lead, attribution: { first: { utm_source: 'google', utm_campaign: 'old' }, last: { utm_campaign: 'new' } } });
  assert.equal(fields['Scotting UTM Campaign'], 'new');
  assert.equal(fields['Scotting UTM Source'], undefined);
  assert.equal(fields['Scotting Capture Surface'], undefined);
});

test('unknown conversion pages and capture surfaces are rejected before CRM writes', async () => {
  for (const change of [{ landing: 'invented-page' }, { capture_surface: 'admin' }]) {
    const { result, fields } = await capture({ ...lead, ...change });
    assert.equal(result.status, 400);
    assert.equal(fields, undefined);
  }
});
