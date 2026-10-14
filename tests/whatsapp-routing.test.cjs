const { test } = require('node:test');
const assert = require('node:assert/strict');

test('WhatsApp links identify ByScotting and keep the selected interest in both languages', async () => {
  const { waLink } = await import('../src/copy.ts');
  for (const lang of ['es', 'en']) {
    const link = new URL(waLink(lang, 'Revenue Engine'));
    assert.equal(link.pathname, '/17865206981');
    assert.match(link.searchParams.get('text'), /^\[ByScotting\]/);
    assert.match(link.searchParams.get('text'), /Revenue Engine/);
  }
});
