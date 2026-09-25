const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Readable } = require('node:stream');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const load = () => import(pathToFileURL(path.join(__dirname, '../server/http.mjs')));
const env = { SCOTTING_API_ENABLED: 'true', SCOTTING_ALLOWED_ORIGINS: 'https://byscotting.com' };
function req(body = {}, origin = 'https://byscotting.com') { const r = Readable.from([JSON.stringify(body)]); r.method = 'POST'; r.headers = { origin, 'content-type': 'application/json' }; r.socket = { remoteAddress: '127.0.0.1' }; return r; }
function res() { return { statusCode: 0, headers: {}, setHeader(k,v) { this.headers[k] = v; }, end(body) { this.body = body; } }; }
test('public API remains disabled by default', async () => { const { serve } = await load(); const response = res(); await serve(req(), response, async () => { throw Error('Must not run'); }, {}); assert.equal(response.statusCode, 503); });
test('unapproved origins cannot invoke handlers', async () => { const { serve } = await load(); const response = res(); await serve(req({}, 'https://evil.invalid'), response, async () => { throw Error('Must not run'); }, env); assert.equal(response.statusCode, 403); });
test('invalid JSON and oversized body are rejected', async () => { const { serve } = await load(); const response = res(); await serve(req({ value: 'x'.repeat(40000) }), response, async () => { throw Error('Must not run'); }, env); assert.equal(response.statusCode, 413); });
test('same-origin request returns a private no-store response', async () => { const { serve } = await load(); const response = res(); await serve(req(), response, async () => ({ status: 200, body: { accepted: true } }), env); assert.equal(response.statusCode, 200); assert.equal(response.headers['Cache-Control'], 'no-store'); assert.deepEqual(JSON.parse(response.body), { accepted: true }); });
