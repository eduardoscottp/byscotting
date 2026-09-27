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
    require: id => id === 'react' ? react : id === '@/lib/attribution' ? { getAttribution: () => ({ first: { utm_campaign: 'cleaning-test' } }), trackMetric: (...args) => metrics.push(args) } : id === '@/copy' ? { waLink: () => 'https://example.invalid' } : id.startsWith('@/') ? {} : require(id),
  };
  vm.runInNewContext(js, context);
  const render = () => { cursor = 0; return context.exports.GrowthForm({ chatContext }); };
  const mix = value => nodes(render()).find(node => node.type === 'select').props.onChange({ target: { value } });
  const submit = () => render().props.onSubmit({ preventDefault() {}, currentTarget: { name: 'Test Owner', email: 'test@example.invalid', company: 'TEST ONLY Cleaning', detail: 'Integration test' } });
  return { render, mix, submit, metrics };
}

test('cleaning form sends campaign details and records a conversion only after acceptance', async () => {
  let payload;
  const form = harness(async (_, options) => { payload = JSON.parse(options.body); return { ok: true, json: async () => ({ accepted: true }) }; });
  form.mix('commercial');
  await form.submit();
  assert.equal(form.render().props.role, 'status');
  assert.equal(payload.company, 'TEST ONLY Cleaning');
  assert.equal(payload.landing, 'commercial_cleaning');
  assert.equal(payload.attribution.first.utm_campaign, 'cleaning-test');
  assert.deepEqual(form.metrics, [['generate_lead', 'en', 'form', 'commercial_cleaning']]);
});

test('a 200 response without acceptance keeps the form and does not count a conversion', async () => {
  const form = harness(async () => ({ ok: true, json: async () => ({ accepted: false }) }));
  form.mix('mixed');
  await form.submit();
  assert.equal(form.render().type, 'form');
  assert.match(nodes(form.render()).find(node => node.props.role === 'alert').props.children, /not been saved/);
  assert.equal(form.metrics.length, 0);
});

test('out-of-scope service mix prevents transmission', async () => {
  let calls = 0;
  const form = harness(async () => { calls++; });
  form.mix('residential');
  await form.submit();
  assert.equal(calls, 0);
});

test('explicit chat handoff saves only the selected summary and never the full transcript', async () => {
  let payload;
  const form = harness(async (_, options) => { payload = JSON.parse(options.body); return { ok: true, json: async () => ({ accepted: true }) }; }, { serviceMix: 'commercial', channel: 'email', summary: 'Self-reported: Miami-Dade; more inquiries; capacity available.' });
  form.mix('commercial'); await form.submit();
  assert.match(payload.detail, /Self-reported: Miami-Dade/);
  assert.equal(payload.messages, undefined);
  assert.equal(payload.share_chat, undefined);
});
