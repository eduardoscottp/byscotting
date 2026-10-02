import { createHmac } from 'node:crypto';

const failure = (status, error) => ({ status, body: { error } });
const text = (value, limit) => typeof value === 'string' && value.length <= limit ? value.trim() : null;
// Website is inert lead data: validate syntax only, never resolve or fetch it.
export function sanitizeWebsite(value) {
  const raw = text(value, 300);
  if (raw === null || /[\u0000-\u0020<>]/u.test(raw)) return null;
  if (raw === '') return '';
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || !url.hostname.includes('.') || url.hostname.endsWith('.local')) return null;
    return url.href.length <= 300 ? url.href : null;
  } catch { return null; }
}
const ATTRIBUTION_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_id', 'utm_content', 'utm_term', 'gclid', 'gbraid', 'wbraid', 'adgroup_id', 'landing_id', 'offer_id', 'experiment_id', 'variant_id', 'at'];

export function sanitizeAttribution(value) {
  const result = {};
  for (const touch of ['first', 'last']) {
    if (!value?.[touch] || typeof value[touch] !== 'object') continue;
    const clean = {};
    for (const key of ATTRIBUTION_KEYS) {
      const item = text(value[touch][key], 250);
      if (item) clean[key] = item;
    }
    if (Object.keys(clean).length) result[touch] = clean;
  }
  return result;
}

function cleanMessages(value) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 24) return null;
  const messages = [];
  for (const item of value) {
    const content = text(item?.content, item?.role === 'assistant' ? 8000 : 2000);
    if (!['user', 'assistant'].includes(item?.role) || !content) return null;
    messages.push({ role: item.role, content });
  }
  return messages.reduce((sum, m) => sum + m.content.length, 0) <= 14000 ? messages : null;
}

function hermesChatUrl(value) {
  const configured = text(value, 500);
  if (!configured) return null;
  try {
    const url = new URL(configured);
    const localHost = new Set(['127.0.0.1', 'localhost', '::1']).has(url.hostname);
    if (url.username || url.password || url.search || url.hash) return null;
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && localHost)) return null;
    const basePath = url.pathname.replace(/\/+$/, '');
    url.pathname = `${basePath.endsWith('/v1') ? basePath : `${basePath}/v1`}/chat/completions`;
    return url.toString();
  } catch { return null; }
}

export async function chat(body, { env = process.env, fetch: request = globalThis.fetch, sessionId } = {}) {
  const messages = cleanMessages(body?.messages);
  if (!messages || messages.at(-1)?.role !== 'user') return failure(400, 'invalid_messages');
  const endpoint = hermesChatUrl(env.HERMES_AGENT_URL);
  const apiKey = text(env.HERMES_AGENT_KEY, 512);
  const model = text(env.HERMES_AGENT_MODEL, 128) || 'chatbotlandingpage';
  if (!endpoint || !apiKey || apiKey.length < 32) return failure(503, 'chat_unavailable');
  try {
    const response = await request(endpoint, {
      method: 'POST',
      headers: { Authorization: ['Bearer', apiKey].join(' '), 'Content-Type': 'application/json', ...(sessionId ? { 'X-Hermes-Session-Id': sessionId } : {}) },
      body: JSON.stringify({ model, stream: false, messages }),
      signal: AbortSignal.timeout(45000),
    });
    if (!response.ok) return failure(502, 'chat_unavailable');
    const data = await response.json();
    const reply = text(data?.choices?.[0]?.message?.content, 8000);
    if (!reply) return failure(502, 'chat_unavailable');
    return { status: 200, body: { reply } };
  } catch { return failure(502, 'chat_unavailable'); }
}

export async function saveLead(body, { env = process.env, fetch: request = globalThis.fetch, chatConsent } = {}) {
  const submission = text(body?.submission_id, 36);
  const name = text(body?.name ?? '', 120);
  const contact = text(body?.contact, 254);
  const detail = text(body?.detail ?? '', 2000);
  const company = text(body?.company ?? '', 160);
  const website = body?.website === undefined ? undefined : sanitizeWebsite(body.website);
  if (company === null || /[\u0000-\u001f<>]/u.test(company) || website === null) return failure(400, 'invalid_inquiry');
  const email = contact && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact);
  const phone = contact && /^[+\d() .-]+$/.test(contact) && contact.replace(/\D/g, '').length >= 8 && contact.replace(/\D/g, '').length <= 15;
  const chips = Array.isArray(body?.chips) && body.chips.length <= 8 ? body.chips.map(c => text(c, 150)) : [];
  if (!submission || !/^[a-f0-9-]{36}$/i.test(submission) || name === null || detail === null || (!email && !phone) || chips.some(c => !c)) return failure(400, 'invalid_inquiry');
  if (body.landing !== undefined && !['homepage', 'commercial_cleaning'].includes(body.landing)) return failure(400, 'invalid_inquiry');
  if (body.capture_surface !== undefined && !['form', 'chat'].includes(body.capture_surface)) return failure(400, 'invalid_inquiry');
  let cleaning;
  if (body.landing === 'commercial_cleaning') {
    const company = text(body.company ?? '', 160);
    const callback = text(phone ? contact : body.phone ?? '', 40);
    if (company === null || !name || (body.service_mix !== undefined && !['commercial', 'mixed'].includes(body.service_mix)) || !['email', 'callback'].includes(body.response_channel)) return failure(400, 'invalid_inquiry');
    if (body.response_channel === 'email' && !email) return failure(400, 'invalid_inquiry');
    if (body.response_channel === 'callback' && (!callback || !/^[+\d() .-]+$/.test(callback) || callback.replace(/\D/g, '').length < 8 || callback.replace(/\D/g, '').length > 15)) return failure(400, 'invalid_inquiry');
    if (body.website_trap) return failure(400, 'invalid_inquiry');
    if (body.request_kind !== undefined && !['contact', 'demo'].includes(body.request_kind)) return failure(400, 'invalid_inquiry');
    if (body.headline_variant !== undefined && !['default', 'more-leads', 'follow-up', 'ai-agents', 'walkthroughs', 'c01-h01', 'c01-h02', 'c01-h03', 'c01-h04', 'c01-h05', 'c01-h06', 'c01-h07', 'c01-h08', 'c01-h09', 'c01-h10', 'c01-h11', 'c01-h12'].includes(body.headline_variant)) return failure(400, 'invalid_inquiry');
    cleaning = { landing: 'commercial_cleaning', ...(company ? { company } : {}), ...(body.service_mix ? { service_mix: body.service_mix } : {}), response_channel: body.response_channel, ...(body.response_channel === 'callback' ? { phone: callback } : {}) };
    if (body.request_kind) cleaning.request_kind = body.request_kind;
    if (body.headline_variant) cleaning.headline_variant = body.headline_variant;
  }
  const messages = body.share_chat === true ? cleanMessages(body.messages) : undefined;
  if (body.share_chat === true && !messages) return failure(400, 'invalid_messages');
  const missingConfig = [
    !env.AIRTABLE_TOKEN && 'AIRTABLE_TOKEN',
    !env.AIRTABLE_BASE_ID && 'AIRTABLE_BASE_ID',
    !env.AIRTABLE_LEADS_TABLE_ID && 'AIRTABLE_LEADS_TABLE_ID',
    (env.LEAD_SIGNING_SECRET?.length || 0) < 32 && 'LEAD_SIGNING_SECRET',
  ].filter(Boolean);
  if (missingConfig.length) {
    console.warn('lead_capture_config_missing', missingConfig);
    return failure(503, 'lead_capture_unavailable');
  }
  const inquiry = { project: 'scotting', name, contact, detail, topics: chips, language: body.lang === 'es' ? 'es' : 'en', ...(company ? { company } : {}), ...(website !== undefined ? { website } : {}), ...cleaning, ...(messages ? { shared_chat: messages } : {}), ...(chatConsent ? { consent: chatConsent, source: 'Landing page / chat web', stage: 'New inquiry — not qualified' } : {}) };
  const attribution = sanitizeAttribution(body.attribution);
  const landingId = body.landing === 'commercial_cleaning' ? 'commercial_cleaning' : body.lang === 'es' ? 'homepage_es' : 'homepage_en';
  const landingPath = landingId === 'commercial_cleaning' ? '/landingpage_leads' : landingId === 'homepage_es' ? '/' : '/en';
  const campaignFields = {};
  for (const [field, key] of Object.entries({ 'Scotting UTM Source': 'utm_source', 'Scotting UTM Medium': 'utm_medium', 'Scotting UTM Campaign': 'utm_campaign', 'Scotting UTM ID': 'utm_id', 'Scotting UTM Content': 'utm_content', 'Scotting UTM Term': 'utm_term', 'Scotting Ad Group ID': 'adgroup_id' })) {
    if (attribution.last?.[key]) campaignFields[field] = attribution.last[key];
  }
  // Bind the idempotency key to content so a changed payload cannot overwrite an unrelated inquiry.
  const key = createHmac('sha256', env.LEAD_SIGNING_SECRET).update(JSON.stringify({ submission, inquiry, attribution })).digest('hex');
  const fields = {
    'Scotting Submission ID': key,
    'Scotting Inquiry': JSON.stringify(inquiry),
    'Scotting Attribution': JSON.stringify(attribution),
    ...campaignFields,
    'Scotting Lead Origin': 'website',
    'Scotting Landing Page ID': landingId,
    'Scotting Landing Page Path': landingPath,
    ...(body.capture_surface ? { 'Scotting Capture Surface': body.capture_surface } : {}),
    ...(cleaning?.headline_variant ? { 'Scotting Headline Variant': cleaning.headline_variant } : {}),
    ...(chatConsent ? { 'Scotting Lead Origin': 'Landing page / chat web', 'Scotting Capture Surface': 'conversational_chat', 'Scotting Landing Page ID': chatConsent.context } : {}),
    ...(email ? { Email: contact } : { Phone: contact }),
    ...(name ? { 'Contact First Name': name.split(/\s+/)[0], 'Contact Last Name': name.split(/\s+/).slice(1).join(' ') } : {}),
    ...(company ? { 'Business Name': company } : {}),
    ...(cleaning?.phone ? { Phone: cleaning.phone } : {}),
  };
  try {
    const response = await request(`https://api.airtable.com/v0/${encodeURIComponent(env.AIRTABLE_BASE_ID)}/${encodeURIComponent(env.AIRTABLE_LEADS_TABLE_ID)}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${env.AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ performUpsert: { fieldsToMergeOn: ['Scotting Submission ID'] }, records: [{ fields }] }),
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) return failure(502, 'lead_capture_unavailable');
    const data = await response.json();
    if (data.records?.length !== 1 || !data.records[0]?.id) return failure(502, 'lead_capture_unavailable');
    return { status: 200, body: { accepted: true } };
  } catch { return failure(502, 'lead_capture_unavailable'); }
}
