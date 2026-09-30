const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function nodes(element) {
  if (!element || typeof element !== 'object') return [];
  return [element, ...[element.props?.children].flat(Infinity).flatMap(nodes)];
}

test('restored chat uses the stateful endpoint, retains replies and forwards attribution', async () => {
  const values = []; let cursor = 0; const requests = [];
  const react = { ...require('react'), useEffect() {}, useState(initial) {
    const index = cursor++;
    if (!(index in values)) values[index] = initial;
    return [values[index], value => { values[index] = typeof value === 'function' ? value(values[index]) : value; }];
  }, useRef(initial) {
    const index = cursor++;
    if (!(index in values)) values[index] = { current: initial };
    return values[index];
  } };
  const source = fs.readFileSync(path.join(__dirname, '../src/components/ChatWidget.tsx'), 'utf8').replaceAll(/import\.meta\.env\.\w+/g, 'undefined');
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 } }).outputText;
  const context = { exports: {}, URL, Date, Intl, AbortSignal, fetch: async (url, init) => {
    requests.push({ url, body: JSON.parse(init.body) });
    return Response.json({ reply: 'Live agent reply', status: 'chat', state: 'server-state', bookingAvailable: true, lang: 'en' });
  }, require: id => id === 'react' ? react : id === '@/lib/attribution' ? { getAttribution: () => ({ last: { utm_campaign: 'restore-test' } }), trackMetric() {} } : id === '@/copy' ? { waLink: () => 'https://example.invalid' } : id.endsWith('.webp') ? 'eduardo.webp' : require(id) };
  vm.runInNewContext(js, context);
  const render = () => { cursor = 0; return context.exports.default({ lang: 'en', context: 'commercial_cleaning' }); };
  const get = predicate => nodes(render()).find(predicate);
  const entry = get(n => n.type === 'input' && n.props['aria-label'] === 'Write to start chatting');
  assert.ok(entry, 'Keep the restored deployment’s direct-entry chat bar');
  entry.props.onChange({ target: { value: 'What do you offer?' } });
  await get(n => n.type === 'form').props.onSubmit({ preventDefault() {} });
  assert.equal(requests[0].url, '/api/chat');
  assert.equal(requests[0].body.message, 'What do you offer?');
  assert.equal(requests[0].body.context, 'commercial_cleaning');
  assert.equal(requests[0].body.attribution.last.utm_campaign, 'restore-test');
  assert.ok(get(n => n.type === 'p' && Array.isArray(n.props.children) && n.props.children.includes('Live agent reply')));
  assert.ok(get(n => n.type === 'button' && n.props.children === 'Book a call'));
  assert.ok(get(n => n.type === 'section' && n.props.className.includes('sc-chat-panel')));
  assert.ok(get(n => n.type === 'details'), 'Keep collapsible privacy information');
  get(n => n.type === 'input').props.onChange({ target: { value: 'Tell me more' } });
  await get(n => n.type === 'form').props.onSubmit({ preventDefault() {} });
  assert.equal(requests[1].body.state, 'server-state');
  const growthPlan = get(n => n.type === 'button' && n.props.children === 'Request my growth plan');
  assert.ok(growthPlan, 'Growth-plan CTA must act inside the chat');
  await growthPlan.props.onClick();
  assert.equal(requests[2].body.message, 'I would like a growth plan for my commercial cleaning business. How can we get started?');
  assert.equal(requests[2].body.state, 'server-state');
  assert.equal(requests[2].body.attribution.last.utm_campaign, 'restore-test');
  assert.ok(get(n => n.type === 'section'), 'Chat remains open after the CTA');
  get(n => n.type === 'button' && n.props['aria-label'] === 'Minimize chat').props.onClick();
  assert.equal(get(n => n.type === 'section'), undefined);
  assert.ok(get(n => n.type === 'input' && n.props['aria-label'] === 'Write to start chatting'));
  get(n => n.type === 'button' && n.props['aria-controls']).props.onClick();
  assert.ok(get(n => n.type === 'p' && Array.isArray(n.props.children) && n.props.children.includes('Live agent reply')), 'Conversation survives minimize and reopen');
});

test('restored gateway rejects incomplete booking confirmations', async () => {
  const { phase1Gateway } = await import('../server/phase1-gateway.mjs');
  const result = await phase1Gateway({ action: 'check_booking', state: 'opaque' }, {
    env: { VERCEL: '1', SCOTTING_CHAT_BRIDGE_URL: 'https://chat.srv1237793.hstgr.cloud/v1/lead-chat', SCOTTING_CHAT_BRIDGE_KEY: 'test-only-bridge-key-at-least-32-characters' },
    fetch: async () => Response.json({ reply: 'Booked', state: 'next', status: 'booked' }),
  });
  assert.equal(result.status, 503);
  assert.deepEqual(result.body, { error: 'chat_unavailable' });
});
