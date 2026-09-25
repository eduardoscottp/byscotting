const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, globals = {}, modules = {}) {
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8')
    .replace('import.meta.env.VITE_FORM_ENDPOINT', 'TEST_ENDPOINT');
  const js = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020
  } }).outputText;
  const context = { exports: {}, require: id => modules[id] || require(id), ...globals };
  vm.runInNewContext(js, context);
  return context.exports;
}
const copyModule = load('src/copy.ts');
const copy = copyModule.copy;
function nodes(element) {
  if (!element || typeof element !== 'object') return [];
  return [element, ...[element.props?.children].flat(Infinity).flatMap(nodes)];
}
function text(element) {
  if (element == null || typeof element === 'boolean') return '';
  if (typeof element !== 'object') return String(element);
  if (Array.isArray(element)) return element.map(text).join(' ');
  return text(element.props?.children);
}
function form({ endpoint = 'https://example.invalid/contact', fetch = async () => new Response(null, { status: 202 }), lang = 'en' } = {}) {
  const state = [];
  let cursor = 0;
  const opened = [];
  const react = { ...require('react'), useState(initial) {
    const index = cursor++;
    if (!(index in state)) state[index] = initial;
    return [state[index], value => { state[index] = typeof value === 'function' ? value(state[index]) : value; }];
  } };
  const Component = load('src/components/PainForm.tsx', {
    TEST_ENDPOINT: endpoint, fetch, crypto: require('node:crypto').webcrypto, window: { open: (...args) => { opened.push(args); return null; } }
  }, { react, '@/copy': copyModule, '@/lib/attribution': { getAttribution: () => ({ first: { utm_campaign: 'pilot01' } }), trackMetric() {} } }).default;
  const t = { ...copy[lang].form, failure: 'Delivery failed', whatsappReady: 'Send the draft in WhatsApp', whatsappContinue: 'Continue in WhatsApp', whatsappRetry: 'Open WhatsApp' };
  const render = () => { cursor = 0; return Component({ t, lang }); };
  const select = () => nodes(render()).find(n => n.type === 'button' && n.props.type === 'button').props.onClick();
  const fill = (index, value) => nodes(render()).filter(n => n.type === 'input')[index].props.onChange({ target: { value } });
  const submit = () => render().props.onSubmit({ preventDefault() {} });
  return { render, select, fill, submit, opened, t };
}
function complete(f) { f.select(); f.fill(0, 'Please simplify weekly reporting'); f.fill(1, 'Test visitor'); f.fill(2, 'visitor@example.invalid'); }

test('HTTP failure keeps the form and entered details available', async () => {
  const f = form({ fetch: async () => new Response(null, { status: 500 }) });
  complete(f); await f.submit();
  assert.equal(f.render().type, 'form');
  assert.match(text(f.render()), /Delivery failed/);
  assert.equal(nodes(f.render()).filter(n => n.type === 'input')[2].props.value, 'visitor@example.invalid');
});
test('network failure displays an error rather than claiming success', async () => {
  const f = form({ fetch: async () => { throw new TypeError('Network unavailable'); } });
  complete(f); await assert.doesNotReject(() => f.submit());
  assert.equal(f.render().type, 'form');
  assert.match(text(f.render()), /Delivery failed/);
});
test('accepted submission displays confirmation with the visitor payload', async () => {
  let payload;
  const f = form({ fetch: async (_, options) => { payload = JSON.parse(options.body); return new Response(null, { status: 202 }); } });
  complete(f); await f.submit();
  assert.match(text(f.render()), /Thanks for reaching out|That.s exactly/);
  assert.equal(payload.contact, 'visitor@example.invalid');
  assert.equal(payload.lang, 'en');
  assert.match(payload.submission_id, /^[a-f0-9-]{36}$/i);
  assert.equal(payload.attribution.first.utm_campaign, 'pilot01');
});
test('WhatsApp draft is not presented as a delivered inquiry and can be reopened', async () => {
  const fallback = form({ endpoint: null });
  complete(fallback); await fallback.submit();
  assert.match(text(fallback.render()), /Send the draft in WhatsApp/);
  const link = nodes(fallback.render()).find(n => n.type === 'a');
  assert.ok(link, 'A visible link must remain when the popup does not open');
  const message = new URL(link.props.href).searchParams.get('text');
  assert.match(message, /visitor@example.invalid/);
  assert.match(message, /Please simplify weekly reporting/);
  assert.equal(fallback.opened.length, 1);
});
test('missing topic or contact prevents transmission', async () => {
  let calls = 0;
  const f = form({ fetch: async () => { calls++; return new Response(null, { status: 200 }); } });
  await f.submit(); assert.equal(calls, 0);
  f.select(); await f.submit(); assert.equal(calls, 0);
  assert.equal(f.render().type, 'form');
});
test('Spanish uses the same failure handling and retains its inputs', async () => {
  const f = form({ lang: 'es', fetch: async () => new Response(null, { status: 503 }) });
  complete(f); await f.submit();
  assert.equal(f.render().type, 'form');
  assert.match(text(f.render()), /Delivery failed/);
});
