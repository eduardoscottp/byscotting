const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(globals = {}) {
  const file = require('node:path').join(__dirname, '../src/lib/attribution.ts');
  const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const context = { exports: {}, URL, Date, ...globals }; vm.runInNewContext(js, context); return context.exports;
}
test('tagged visits preserve first touch and update last touch', () => {
  const { updateAttribution } = load(); const now = Date.now();
  const first = updateAttribution(null, 'https://byscotting.com/en?utm_campaign=first', now);
  const next = updateAttribution(first, 'https://byscotting.com/en?utm_campaign=second', now + 1000);
  assert.equal(next.first.utm_campaign, 'first'); assert.equal(next.last.utm_campaign, 'second');
});
test('direct visits preserve campaign and expired attribution resets', () => {
  const { updateAttribution } = load(); const now = Date.now();
  const first = updateAttribution(null, 'https://byscotting.com/?utm_campaign=first', now);
  assert.equal(updateAttribution(first, 'https://byscotting.com/', now + 1000).last.utm_campaign, 'first');
  assert.equal(updateAttribution(first, 'https://byscotting.com/', now + 91 * 86400000), null);
});
test('attribution excludes arbitrary query fields and full URLs', () => {
  const { updateAttribution } = load();
  const value = updateAttribution(null, 'https://byscotting.com/?utm_campaign=test&email=secret@example.invalid&message=private');
  assert.equal(value.first.email, undefined); assert.equal(value.first.message, undefined);
  assert.equal(value.first.url, undefined);
});
test('analytics initializes a Google tag only for a valid measurement ID', () => {
  let appended;
  const window = {};
  const document = {
    createElement: () => ({}),
    head: { appendChild: (node) => { appended = node; } },
  };
  const { initializeAnalytics } = load({ window, document });
  assert.equal(initializeAnalytics('G-0M55Y01EM0'), true);
  assert.match(appended.src, /googletagmanager\.com\/gtag\/js\?id=G-0M55Y01EM0/);
  assert.equal(initializeAnalytics('not-an-id'), false);
});
