const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const source = fs.readFileSync(require('node:path').join(__dirname, '../src/lib/cleaningCampaign.ts'), 'utf8');
const context = { exports: {}, URLSearchParams };
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, context);
const { contactChannel, selectCleaningHeadline } = context.exports;
test('C01 ad links select matching landing and browser titles without overriding legacy variants', () => {
  const headlines = ['Leads For Cleaning Companies', 'For Commercial Cleaning Firms', 'Commercial Cleaning Growth', 'Google Ads And Follow-Up', 'Built For Cleaning Owners', 'A Clear Next Step For Leads', 'Connect Ads And Your Pipeline', 'Less Manual Follow-Up', 'See Your Sales Pipeline', 'Request A Scotting Demo', 'Scotting Revenue Engine', 'Miami-Dade Business Owners'];
  for (const [index, title] of headlines.entries()) {
    const key = `c01-h${String(index + 1).padStart(2, '0')}`;
    assert.equal(selectCleaningHeadline(`?utm_campaign=sc_cleaning_leads_md_en&utm_content=${key}`), key);
    assert.equal(context.exports.cleaningHeadlines[key].title, title);
    assert.equal(context.exports.cleaningPageTitle(key), `${title} | Scotting`);
  }
  assert.equal(selectCleaningHeadline('?utm_campaign=sc_cleaning_leads_md_en'), 'more-leads');
  assert.equal(selectCleaningHeadline('?utm_campaign=sc_cleaning_leads_md_en&utm_content=unknown'), 'more-leads');
  assert.equal(selectCleaningHeadline('?utm_content=c01-h99'), 'default');
  assert.equal(context.exports.cleaningPageTitle('default'), 'Marketing for Commercial Cleaning Companies | Scotting');
});
test('contact detection accepts email or formatted phone and rejects incomplete contacts', () => {
  for (const value of [' owner@example.com ', 'name+tag@company.co']) assert.equal(contactChannel(value), 'email');
  for (const value of ['+1 (305) 555-0123', '3055550123']) assert.equal(contactChannel(value), 'callback');
  for (const value of ['', 'hello', 'owner@', '305', '1234567890123456', 'phone 3055550123']) assert.equal(contactChannel(value), null);
});
test('campaign copy has a safe default and explicit content precedence', () => {
  assert.equal(selectCleaningHeadline(''), 'default');
  assert.equal(selectCleaningHeadline('?utm_campaign=unknown'), 'default');
  assert.equal(selectCleaningHeadline('?utm_content=__proto__&utm_campaign=constructor'), 'default');
  assert.equal(selectCleaningHeadline('?utm_campaign=cleaning-leads'), 'more-leads');
  assert.equal(selectCleaningHeadline('?utm_campaign=cleaning-leads&utm_content=follow-up'), 'follow-up');
  assert.equal(selectCleaningHeadline('?utm_content=AI-AGENTS'), 'ai-agents');
  assert.equal(selectCleaningHeadline('?utm_content=%3Cscript%3E&utm_campaign=cleaning-walkthroughs'), 'walkthroughs');
});
