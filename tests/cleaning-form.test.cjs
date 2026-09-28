const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function nodes(element) {
  if (!element || typeof element !== 'object') return [];
  return [element, ...[element.props?.children].flat(Infinity).flatMap(nodes)];
}
function harness(fetch, chatContext) {
  const values = [];
  let cursor = 0;
  const metrics = [];
  const react = { ...require('react'), useEffect() {}, useState(initial) {
    const index = cursor++;
    if (!(index in values)) values[index] = initial;
    return [values[index], value => { values[index] = value; }];
  }, useRef(initial) {
    const index = cursor++;
    if (!(index in values)) values[index] = { current: initial };
    return values[index];
  } };
  const source = fs.readFileSync(require('node:path').join(__dirname, '../src/CommercialCleaning.tsx'), 'utf8').replaceAll(/import\.meta\.env\.\w+/g, 'undefined');
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 } }).outputText;
  const context = { exports: {}, fetch, AbortSignal, crypto: require('node:crypto').webcrypto,
    FormData: class { constructor(fields) { this.fields = fields; } get(name) { return this.fields[name] || null; } },
    require: id => id === 'react' ? react : id === '@/lib/cleaningCampaign' ? campaign : id === '@/lib/attribution' ? { getAttribution: () => ({ first: { utm_campaign: 'cleaning-test' } }), trackMetric: (...args) => metrics.push(args) } : id === '@/copy' ? { waLink: () => 'https://example.invalid' } : id.startsWith('@/') ? {} : require(id),
  };
  const campaignContext = { exports: {}, URLSearchParams };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(require('node:path').join(__dirname, '../src/lib/cleaningCampaign.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, campaignContext);
  const campaign = campaignContext.exports;
  vm.runInNewContext(js, context);
  const render = () => { cursor = 0; return context.exports.GrowthForm({ chatContext }); };
  const submit = (contact = 'test@example.invalid', intent = 'contact') => render().props.onSubmit({ preventDefault() {}, currentTarget: { name: 'Test Owner', contact }, nativeEvent: { submitter: { value: intent } } });
  return { render, submit, metrics };
}

test('cleaning form sends campaign details and records a conversion only after acceptance', async () => {
  let payload;
  const form = harness(async (_, options) => { payload = JSON.parse(options.body); return { ok: true, json: async () => ({ accepted: true }) }; });
  await form.submit();
  assert.equal(form.render().props.role, 'status');
  assert.equal(payload.company, undefined);
  assert.equal(payload.service_mix, undefined);
  assert.equal(payload.contact, 'test@example.invalid');
  assert.equal(payload.landing, 'commercial_cleaning');
  assert.equal(payload.attribution.first.utm_campaign, 'cleaning-test');
  assert.deepEqual(form.metrics, [['generate_lead', 'en', 'form', 'commercial_cleaning']]);
});

test('a 200 response without acceptance keeps the form and does not count a conversion', async () => {
  const form = harness(async () => ({ ok: true, json: async () => ({ accepted: false }) }));
  await form.submit();
  assert.equal(form.render().type, 'form');
  assert.match(nodes(form.render()).find(node => node.props.role === 'alert').props.children, /not been saved/);
  assert.equal(form.metrics.length, 0);
});

test('unified contact box detects phone and sends a callback request', async () => {
  let payload;
  const form = harness(async (_, options) => { payload = JSON.parse(options.body); return { ok: true, json: async () => ({ accepted: true }) }; });
  const required = nodes(form.render()).filter(n => n.type === 'input' && n.props.required).map(n => n.props.name);
  assert.deepEqual(required, ['name', 'contact']);
  await form.submit('+1 305 555 0123');
  assert.equal(payload.contact, '+1 305 555 0123');
  assert.equal(payload.response_channel, 'callback');
  assert.equal(payload.company, undefined);
  assert.equal(payload.email, undefined);
});
test('form has only full name and a unified contact input', () => {
  const form = harness(async () => {});
  const required = nodes(form.render()).filter(n => n.type === 'input' && n.props.required).map(n => n.props.name);
  assert.deepEqual(required, ['name', 'contact']);
});
test('invalid contact stays in the form without transmission or conversion', async () => {
  let calls = 0;
  const form = harness(async () => { calls++; });
  await form.submit('not a contact');
  assert.equal(calls, 0);
  assert.equal(form.metrics.length, 0);
  assert.match(nodes(form.render()).find(n => n.props.role === 'alert').props.children, /phone|email/);
});
test('demo button saves demo intent instead of claiming an appointment', async () => {
  let payload;
  const form = harness(async (_, options) => { payload = JSON.parse(options.body); return { ok: true, json: async () => ({ accepted: true }) }; });
  await form.submit('test@example.invalid', 'demo');
  assert.equal(payload.request_kind, 'demo');
});

test('explicit chat handoff saves only the selected summary and never the full transcript', async () => {
  let payload;
  const form = harness(async (_, options) => { payload = JSON.parse(options.body); return { ok: true, json: async () => ({ accepted: true }) }; }, { serviceMix: 'commercial', channel: 'email', summary: 'Self-reported: Miami-Dade; more inquiries; capacity available.' });
  await form.submit();
  assert.match(payload.detail, /Self-reported: Miami-Dade/);
  assert.equal(payload.messages, undefined);
  assert.equal(payload.share_chat, undefined);
});
